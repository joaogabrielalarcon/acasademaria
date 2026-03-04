import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import postgres from "npm:postgres";

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const qi = (value: string) => `"${value.replace(/"/g, '""')}"`;
const ql = (value: string) => `'${value.replace(/'/g, "''")}'`;

const normalizeRoles = (roles: unknown): string => {
  if (Array.isArray(roles) && roles.length > 0) return roles.map(String).join(", ");
  if (typeof roles === "string" && roles.length > 0) {
    return roles.replace(/^{|}$/g, "") || "public";
  }
  return "public";
};

const hasColumnReferenceInDefault = (defaultExpression: string, columns: TableColumn[], currentColumnName: string) => {
  const expression = defaultExpression.toLowerCase();
  return columns.some((candidate) => {
    if (candidate.column_name === currentColumnName) return false;
    const pattern = new RegExp(`(^|[^a-z0-9_])${candidate.column_name.toLowerCase()}([^a-z0-9_]|$)`);
    return pattern.test(expression);
  });
};

const isPortableDefaultExpression = (defaultExpression: string, columns: TableColumn[], currentColumnName: string) => {
  if (hasColumnReferenceInDefault(defaultExpression, columns, currentColumnName)) return false;

  const expression = defaultExpression.trim();
  const safePatterns = [
    /^gen_random_uuid\(\)$/i,
    /^now\(\)$/i,
    /^current_date$/i,
    /^current_timestamp$/i,
    /^(true|false)$/i,
    /^-?\d+(\.\d+)?$/,
    /^'.*'(::[a-zA-Z0-9_\.\[\]"]+)?$/s,
  ];

  return safePatterns.some((pattern) => pattern.test(expression));
};

const createTableSql = (tableName: string, columns: TableColumn[]) => {
  const columnSql = columns
    .sort((a, b) => a.ordinal_position - b.ordinal_position)
    .map((column) => {
      const parts = [`${qi(column.column_name)} ${column.formatted_type}`];
      if (column.column_default && isPortableDefaultExpression(column.column_default, columns, column.column_name)) {
        parts.push(`DEFAULT ${column.column_default}`);
      }
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

  return `DROP POLICY IF EXISTS ${qi(policyname)} ON ${qi(schemaname)}.${qi(tablename)};\nCREATE POLICY ${qi(policyname)} ON ${qi(schemaname)}.${qi(tablename)} AS ${permissive} FOR ${cmd} TO ${roles}${qual}${withCheck};`;
};

const buildIndexSql = (indexdef: string) =>
  indexdef.replace(/^CREATE( UNIQUE)? INDEX /i, "CREATE$1 INDEX IF NOT EXISTS ");

const buildBucketSql = (bucket: BucketInfo) => {
  const fileSizeLimit = bucket.file_size_limit === null ? "NULL" : String(bucket.file_size_limit);
  const allowedMimeTypes = bucket.allowed_mime_types === null
    ? "NULL"
    : `ARRAY[${bucket.allowed_mime_types.map(ql).join(", ")}]::text[]`;

  return [
    "INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)",
    `VALUES (${ql(bucket.id)}, ${ql(bucket.name)}, ${bucket.public}, ${fileSizeLimit}, ${allowedMimeTypes})`,
    "ON CONFLICT (id) DO UPDATE SET",
    "  name = EXCLUDED.name,",
    "  public = EXCLUDED.public,",
    "  file_size_limit = EXCLUDED.file_size_limit,",
    "  allowed_mime_types = EXCLUDED.allowed_mime_types;",
  ].join("\n");
};

const buildConstraintSql = (constraint: ConstraintInfo) =>
  `ALTER TABLE ${constraint.table_name} ADD CONSTRAINT ${qi(constraint.constraint_name)} ${constraint.definition};`;

const buildTriggerSql = (trigger: SqlStatement) =>
  `DROP TRIGGER IF EXISTS ${qi(trigger.object_name)} ON ${qi(trigger.schema_name)}.${qi(trigger.table_name)};\n${trigger.create_sql};`;

const section = (title: string, statements: string[]) => {
  if (statements.length === 0) return "";
  return [`-- ${title}`, ...statements, ""].join("\n");
};

const parseJsonBody = async (req: Request) => {
  if (req.method !== "POST") return {} as Record<string, unknown>;
  const text = await req.text();
  if (!text.trim()) return {} as Record<string, unknown>;
  return JSON.parse(text) as Record<string, unknown>;
};

const parsePositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sourceDbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!sourceDbUrl) {
    return new Response(JSON.stringify({ error: "Secret SUPABASE_DB_URL ausente." }), {
      status: 500,
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

  try {
    const body = await parseJsonBody(req);
    const url = new URL(req.url);
    const responseModeValue = body.response_mode ?? url.searchParams.get("response_mode");
    const fileNameValue = body.file_name ?? url.searchParams.get("file_name");
    const offsetValue = body.offset ?? url.searchParams.get("offset");
    const limitValue = body.limit ?? url.searchParams.get("limit");

    const responseMode = responseModeValue === "text" ? "text" : "json";
    const fileName = typeof fileNameValue === "string" && fileNameValue.trim()
      ? fileNameValue.trim()
      : "schema-only.sql";
    const offset = parsePositiveNumber(offsetValue, 0);
    const limit = Math.min(parsePositiveNumber(limitValue, 0), 20000);

    await source`SELECT current_database(), current_user`;

    const [
      tables,
      columns,
      constraints,
      enums,
      functions,
      views,
      indexes,
      publicPolicies,
      storagePolicies,
      triggers,
      buckets,
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
    ]);

    const constraintNames = new Set(constraints.map((constraint) => constraint.constraint_name));
    const indexesToCreate = indexes.filter((index) => !constraintNames.has(index.object_name));
    const baseConstraints = constraints.filter((constraint) => constraint.contype !== "f");
    const foreignKeyConstraints = constraints.filter((constraint) => constraint.contype === "f");

    const sqlSections = [
      `-- Schema export gerado em ${new Date().toISOString()}`,
      "-- Etapa 1: schema apenas (sem dados)",
      "BEGIN;",
      "",
      "CREATE SCHEMA IF NOT EXISTS public;",
      "CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;",
      "",
      section(
        "Enums",
        enums.map((enumType) => [
          "DO $$",
          "BEGIN",
          "  IF NOT EXISTS (",
          "    SELECT 1",
          "    FROM pg_type t",
          "    JOIN pg_namespace n ON n.oid = t.typnamespace",
          `    WHERE n.nspname = 'public' AND t.typname = ${ql(String(enumType.enum_name))}`,
          "  ) THEN",
          `    CREATE TYPE public.${qi(String(enumType.enum_name))} AS ENUM (${enumType.enum_values});`,
          "  END IF;",
          "END $$;",
        ].join("\n")),
      ),
      section(
        "Tabelas",
        tables.map((table) => createTableSql(
          table.table_name,
          columns.filter((column) => column.table_name === table.table_name),
        )),
      ),
      section("Constraints base", baseConstraints.map(buildConstraintSql)),
      section("Foreign keys", foreignKeyConstraints.map(buildConstraintSql)),
      section("Funções", functions.map((fn) => fn.create_sql.trim().endsWith(";") ? fn.create_sql.trim() : `${fn.create_sql.trim()};`)),
      section("Views", views.map((view) => view.create_sql.trim().endsWith(";") ? view.create_sql.trim() : `${view.create_sql.trim()};`)),
      section("Índices", indexesToCreate.map((index) => buildIndexSql(index.create_sql))),
      section(
        "RLS",
        tables.filter((table) => table.rls_enabled).map((table) => `ALTER TABLE public.${qi(table.table_name)} ENABLE ROW LEVEL SECURITY;`),
      ),
      section("Buckets de storage", buckets.map(buildBucketSql)),
      section("Policies (public)", publicPolicies.map(buildPolicySql)),
      section("Policies (storage)", storagePolicies.map(buildPolicySql)),
      section("Triggers", triggers.map(buildTriggerSql)),
      "COMMIT;",
      "",
    ].filter(Boolean);

    const schemaSql = sqlSections.join("\n");
    const chunkSql = limit > 0 ? schemaSql.slice(offset, offset + limit) : schemaSql;
    const nextOffset = limit > 0 && offset + limit < schemaSql.length ? offset + limit : null;

    if (responseMode === "text" && limit === 0) {
      return new Response(schemaSql, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/sql; charset=utf-8",
          "Content-Disposition": `attachment; filename=\"${fileName.replace(/\"/g, "")}\"`,
        },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      file_name: fileName,
      total_length: schemaSql.length,
      offset,
      next_offset: nextOffset,
      schema_sql: chunkSql,
      counts: {
        tables: tables.length,
        enums: enums.length,
        functions: functions.length,
        views: views.length,
        indexes: indexesToCreate.length,
        public_policies: publicPolicies.length,
        storage_policies: storagePolicies.length,
        triggers: triggers.length,
        buckets: buckets.length,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("migrate-external-supabase export error", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    await source.end({ timeout: 5 });
  }
});
