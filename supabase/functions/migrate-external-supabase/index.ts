import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import postgres from "npm:postgres";

type GenericRow = Record<string, unknown>;

type TableColumn = {
  table_name: string;
  column_name: string;
  formatted_type: string;
  is_nullable: boolean;
  column_default: string | null;
  ordinal_position: number;
};

type TableInfo = {
  table_name: string;
  rls_enabled: boolean;
};

type ConstraintInfo = {
  table_name: string;
  constraint_name: string;
  definition: string;
  contype: string;
};

type DependencyInfo = {
  table_name: string;
  depends_on: string;
};

type SqlStatement = {
  schema_name: string;
  table_name: string;
  object_name: string;
  create_sql: string;
};

type BucketInfo = {
  id: string;
  name: string;
  public: boolean;
  file_size_limit: number | null;
  allowed_mime_types: string[] | null;
};

type StorageObjectInfo = {
  bucket_id: string;
  name: string;
  metadata: {
    mimetype?: string;
    cacheControl?: string;
    contentLength?: number;
    size?: number;
  } | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const qi = (value: string) => `"${value.replace(/"/g, '""')}"`;

const chunk = <T>(items: T[], size: number) => {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
};

const normalizeRoles = (roles: unknown): string => {
  if (Array.isArray(roles) && roles.length > 0) return roles.join(", ");
  if (typeof roles === "string" && roles.length > 0) {
    return roles.replace(/^{|}$/g, "") || "public";
  }
  return "public";
};

const topoSortTables = (tables: string[], dependencies: DependencyInfo[]) => {
  const nodes = new Set(tables);
  const incoming = new Map<string, number>(tables.map((table) => [table, 0]));
  const outgoing = new Map<string, string[]>(tables.map((table) => [table, []]));

  for (const dep of dependencies) {
    if (!nodes.has(dep.table_name) || !nodes.has(dep.depends_on) || dep.table_name === dep.depends_on) {
      continue;
    }

    incoming.set(dep.table_name, (incoming.get(dep.table_name) ?? 0) + 1);
    outgoing.set(dep.depends_on, [...(outgoing.get(dep.depends_on) ?? []), dep.table_name]);
  }

  const queue = tables.filter((table) => (incoming.get(table) ?? 0) === 0).sort();
  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const next of outgoing.get(current) ?? []) {
      const count = (incoming.get(next) ?? 0) - 1;
      incoming.set(next, count);
      if (count === 0) queue.push(next);
    }

    queue.sort();
  }

  const remaining = tables.filter((table) => !sorted.includes(table)).sort();
  return [...sorted, ...remaining];
};

const executeIfMissing = async (
  db: postgres.Sql,
  checkSql: string,
  statement: string,
) => {
  const result = await db.unsafe(checkSql);
  const exists = Array.isArray(result) && result.length > 0 && Object.values(result[0])[0];
  if (!exists) {
    await db.unsafe(statement);
  }
};

const createTableSql = (tableName: string, columns: TableColumn[]) => {
  const columnSql = columns
    .sort((a, b) => a.ordinal_position - b.ordinal_position)
    .map((column) => {
      const parts = [`${qi(column.column_name)} ${column.formatted_type}`];
      if (column.column_default) parts.push(`DEFAULT ${column.column_default}`);
      if (!column.is_nullable) parts.push("NOT NULL");
      return parts.join(" ");
    })
    .join(",\n  ");

  return `CREATE TABLE IF NOT EXISTS public.${qi(tableName)} (\n  ${columnSql}\n);`;
};

const buildPolicySql = (policy: Record<string, unknown>) => {
  const schemaname = String(policy.schemaname);
  const tablename = String(policy.tablename);
  const policyname = String(policy.policyname);
  const permissive = String(policy.permissive ?? "PERMISSIVE");
  const cmd = String(policy.cmd ?? "ALL");
  const roles = normalizeRoles(policy.roles);
  const qual = policy.qual ? ` USING (${String(policy.qual)})` : "";
  const withCheck = policy.with_check ? ` WITH CHECK (${String(policy.with_check)})` : "";

  return `CREATE POLICY ${qi(policyname)} ON ${qi(schemaname)}.${qi(tablename)} AS ${permissive} FOR ${cmd} TO ${roles}${qual}${withCheck};`;
};

const buildIndexSql = (indexdef: string) =>
  indexdef.replace(/^CREATE( UNIQUE)? INDEX /i, "CREATE$1 INDEX IF NOT EXISTS ");

const copyRows = async (
  source: postgres.Sql,
  target: postgres.Sql,
  schema: string,
  table: string,
) => {
  const rows = await source.unsafe(`SELECT * FROM ${qi(schema)}.${qi(table)}`) as GenericRow[];
  if (rows.length === 0) return 0;

  const columns = Object.keys(rows[0]);
  const columnList = columns.map(qi).join(", ");

  for (const batch of chunk(rows, 100)) {
    await target.unsafe(
      `INSERT INTO ${qi(schema)}.${qi(table)} (${columnList})
       SELECT ${columnList}
       FROM jsonb_populate_recordset(NULL::${qi(schema)}.${qi(table)}, $1::jsonb)
       ON CONFLICT DO NOTHING;`,
      [JSON.stringify(batch)],
    );
  }

  return rows.length;
};

const ensureBucketsAndObjects = async (
  sourceUrl: string,
  sourceServiceRoleKey: string,
  targetUrl: string,
  targetServiceRoleKey: string,
  buckets: BucketInfo[],
  objects: StorageObjectInfo[],
) => {
  for (const bucket of buckets) {
    await fetch(`${targetUrl}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${targetServiceRoleKey}`,
        apikey: targetServiceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: bucket.id,
        name: bucket.name,
        public: bucket.public,
        file_size_limit: bucket.file_size_limit,
        allowed_mime_types: bucket.allowed_mime_types,
      }),
    });
  }

  for (const object of objects) {
    const sourceFile = await fetch(
      `${sourceUrl}/storage/v1/object/${object.bucket_id}/${object.name}`,
      {
        headers: {
          Authorization: `Bearer ${sourceServiceRoleKey}`,
          apikey: sourceServiceRoleKey,
        },
      },
    );

    if (!sourceFile.ok) {
      throw new Error(`Falha ao baixar arquivo ${object.bucket_id}/${object.name}`);
    }

    const uploadResponse = await fetch(
      `${targetUrl}/storage/v1/object/${object.bucket_id}/${object.name}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${targetServiceRoleKey}`,
          apikey: targetServiceRoleKey,
          "x-upsert": "true",
          "Content-Type": object.metadata?.mimetype ?? "application/octet-stream",
          ...(object.metadata?.cacheControl ? { "cache-control": object.metadata.cacheControl } : {}),
        },
        body: await sourceFile.arrayBuffer(),
      },
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Falha ao enviar arquivo ${object.bucket_id}/${object.name}: ${errorText}`);
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sourceDbUrl = Deno.env.get("SUPABASE_DB_URL");
  const sourceServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const sourceUrl = Deno.env.get("SUPABASE_URL");
  const targetDbUrl = Deno.env.get("TARGET_SUPABASE_DB_URL");
  const targetServiceRoleKey = Deno.env.get("TARGET_SUPABASE_SERVICE_ROLE_KEY");

  if (!sourceDbUrl || !sourceServiceRoleKey || !sourceUrl || !targetDbUrl || !targetServiceRoleKey) {
    return new Response(JSON.stringify({ error: "Secrets de migração ausentes." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { targetUrl } = await req.json();
  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "targetUrl é obrigatório." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const source = postgres(sourceDbUrl, {
    ssl: "require",
    max: 1,
    prepare: false,
    connect_timeout: 30,
    idle_timeout: 10,
  });

  const target = postgres(targetDbUrl, {
    ssl: "require",
    max: 1,
    prepare: false,
    connect_timeout: 30,
    idle_timeout: 10,
  });

  try {
    try {
      await source`SELECT current_database(), current_user`;
    } catch (error) {
      throw new Error(`Falha na conexão com o banco de origem: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    }

    try {
      await target`SELECT current_database(), current_user`;
    } catch (error) {
      throw new Error(`Falha na conexão com o banco de destino: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    }

    const [
      tables,
      columns,
      constraints,
      dependencies,
      enums,
      functions,
      views,
      indexes,
      publicPolicies,
      storagePolicies,
      triggers,
      buckets,
      objects,
    ] = await Promise.all([
      source<TableInfo[]>`
        SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
        ORDER BY c.relname;
      `,
      source<TableColumn[]>`
        SELECT
          c.relname AS table_name,
          a.attname AS column_name,
          format_type(a.atttypid, a.atttypmod) AS formatted_type,
          NOT a.attnotnull AS is_nullable,
          pg_get_expr(ad.adbin, ad.adrelid) AS column_default,
          a.attnum AS ordinal_position
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.oid
        LEFT JOIN pg_attrdef ad ON ad.adrelid = c.oid AND ad.adnum = a.attnum
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND a.attnum > 0
          AND NOT a.attisdropped
        ORDER BY c.relname, a.attnum;
      `,
      source<ConstraintInfo[]>`
        SELECT
          c.conrelid::regclass::text AS table_name,
          c.conname AS constraint_name,
          pg_get_constraintdef(c.oid, true) AS definition,
          c.contype::text AS contype
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public'
        ORDER BY c.conrelid::regclass::text, c.conname;
      `,
      source<DependencyInfo[]>`
        SELECT
          child.relname AS table_name,
          parent.relname AS depends_on
        FROM pg_constraint c
        JOIN pg_class child ON child.oid = c.conrelid
        JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
        JOIN pg_class parent ON parent.oid = c.confrelid
        JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
        WHERE c.contype = 'f'
          AND child_ns.nspname = 'public'
          AND parent_ns.nspname = 'public';
      `,
      source<Record<string, string>[]>`
        SELECT
          t.typname AS enum_name,
          string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) AS enum_values
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        GROUP BY t.typname
        ORDER BY t.typname;
      `,
      source<SqlStatement[]>`
        SELECT
          'public' AS schema_name,
          '' AS table_name,
          p.proname AS object_name,
          pg_get_functiondef(p.oid) AS create_sql
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        ORDER BY p.proname;
      `,
      source<SqlStatement[]>`
        SELECT
          schemaname AS schema_name,
          viewname AS table_name,
          viewname AS object_name,
          'CREATE OR REPLACE VIEW ' || quote_ident(schemaname) || '.' || quote_ident(viewname) || ' AS ' || definition AS create_sql
        FROM pg_views
        WHERE schemaname = 'public'
        ORDER BY viewname;
      `,
      source<SqlStatement[]>`
        SELECT
          schemaname AS schema_name,
          tablename AS table_name,
          indexname AS object_name,
          indexdef AS create_sql
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
      `,
      source<Record<string, unknown>[]>`
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname;
      `,
      source<Record<string, unknown>[]>`
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'storage'
        ORDER BY tablename, policyname;
      `,
      source<SqlStatement[]>`
        SELECT
          n.nspname AS schema_name,
          c.relname AS table_name,
          t.tgname AS object_name,
          pg_get_triggerdef(t.oid, true) AS create_sql
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE NOT t.tgisinternal
          AND ((n.nspname = 'public') OR (n.nspname = 'auth' AND c.relname = 'users'))
        ORDER BY n.nspname, c.relname, t.tgname;
      `,
      source<BucketInfo[]>`
        SELECT id, name, public, file_size_limit, allowed_mime_types
        FROM storage.buckets
        ORDER BY id;
      `,
      source<StorageObjectInfo[]>`
        SELECT bucket_id, name, metadata
        FROM storage.objects
        ORDER BY bucket_id, name;
      `,
    ]);

    await target.unsafe('CREATE SCHEMA IF NOT EXISTS public;');

    for (const enumType of enums) {
      await target.unsafe(`DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'public' AND t.typname = '${String(enumType.enum_name).replace(/'/g, "''")}'
        ) THEN
          CREATE TYPE public.${qi(String(enumType.enum_name))} AS ENUM (${enumType.enum_values});
        END IF;
      END $$;`);
    }

    for (const table of tables) {
      const tableColumns = columns.filter((column) => column.table_name === table.table_name);
      await target.unsafe(createTableSql(table.table_name, tableColumns));
    }

    for (const table of tables) {
      if (table.rls_enabled) {
        await target.unsafe(`ALTER TABLE public.${qi(table.table_name)} ENABLE ROW LEVEL SECURITY;`);
      }
    }

    for (const constraint of constraints) {
      await executeIfMissing(
        target,
        `SELECT 1 FROM pg_constraint WHERE conname = '${constraint.constraint_name.replace(/'/g, "''")}' LIMIT 1;`,
        `ALTER TABLE ${constraint.table_name} ADD CONSTRAINT ${qi(constraint.constraint_name)} ${constraint.definition};`,
      );
    }

    for (const fn of functions) {
      await target.unsafe(fn.create_sql);
    }

    for (const view of views) {
      await target.unsafe(view.create_sql);
    }

    const authUsers = await source.unsafe('SELECT * FROM auth.users ORDER BY created_at') as GenericRow[];
    const authIdentities = await source.unsafe('SELECT * FROM auth.identities ORDER BY id') as GenericRow[];

    if (authUsers.length > 0) {
      const authUserColumns = Object.keys(authUsers[0]).map(qi).join(', ');
      for (const batch of chunk(authUsers, 50)) {
        await target.unsafe(
          `INSERT INTO auth.users (${authUserColumns})
           SELECT ${authUserColumns}
           FROM jsonb_populate_recordset(NULL::auth.users, $1::jsonb)
           ON CONFLICT (id) DO NOTHING;`,
          [JSON.stringify(batch)],
        );
      }
    }

    if (authIdentities.length > 0) {
      const authIdentityColumns = Object.keys(authIdentities[0]).map(qi).join(', ');
      for (const batch of chunk(authIdentities, 50)) {
        await target.unsafe(
          `INSERT INTO auth.identities (${authIdentityColumns})
           SELECT ${authIdentityColumns}
           FROM jsonb_populate_recordset(NULL::auth.identities, $1::jsonb)
           ON CONFLICT (id) DO NOTHING;`,
          [JSON.stringify(batch)],
        );
      }
    }

    const orderedTables = topoSortTables(
      tables.map((table) => table.table_name),
      dependencies,
    );

    const copiedRows: Record<string, number> = {};
    for (const tableName of orderedTables) {
      copiedRows[tableName] = await copyRows(source, target, 'public', tableName);
    }

    const constraintNames = new Set(constraints.map((constraint) => constraint.constraint_name));
    const indexesToCreate = indexes.filter((index) => !constraintNames.has(index.object_name));
    for (const index of indexesToCreate) {
      await target.unsafe(buildIndexSql(index.create_sql));
    }

    for (const policy of publicPolicies) {
      const dropSql = `DROP POLICY IF EXISTS ${qi(String(policy.policyname))} ON public.${qi(String(policy.tablename))};`;
      await target.unsafe(dropSql);
      await target.unsafe(buildPolicySql(policy));
    }

    for (const policy of storagePolicies) {
      const dropSql = `DROP POLICY IF EXISTS ${qi(String(policy.policyname))} ON storage.${qi(String(policy.tablename))};`;
      await target.unsafe(dropSql);
      await target.unsafe(buildPolicySql(policy));
    }

    await ensureBucketsAndObjects(
      sourceUrl,
      sourceServiceRoleKey,
      targetUrl,
      targetServiceRoleKey,
      buckets,
      objects,
    );

    for (const trigger of triggers) {
      const dropSql = `DROP TRIGGER IF EXISTS ${qi(trigger.object_name)} ON ${qi(trigger.schema_name)}.${qi(trigger.table_name)};`;
      await target.unsafe(dropSql);
      await target.unsafe(trigger.create_sql);
    }

    const targetTableCounts = await target.unsafe(`
      SELECT table_name,
        (xpath('/row/count/text()', query_to_xml(format('select count(*) as count from public.%I', table_name), false, true, '')))[1]::text::int AS row_count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `) as Array<{ table_name: string; row_count: number }>;

    const targetStorageCounts = await target.unsafe(`
      SELECT bucket_id, count(*)::int AS object_count
      FROM storage.objects
      GROUP BY bucket_id
      ORDER BY bucket_id;
    `) as Array<{ bucket_id: string; object_count: number }>;

    return new Response(
      JSON.stringify({
        success: true,
        migrated_tables: copiedRows,
        target_table_counts: targetTableCounts,
        target_storage_counts: targetStorageCounts,
        auth_users: authUsers.length,
        auth_identities: authIdentities.length,
        buckets: buckets.length,
        files: objects.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error('migrate-external-supabase error', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } finally {
    await source.end({ timeout: 5 });
    await target.end({ timeout: 5 });
  }
});
