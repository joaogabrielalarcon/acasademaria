import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import postgres from "npm:postgres";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tables in FK-safe order
const TABLES = ["fornecedores", "plantas", "insumos", "historico_precos"] as const;
const BATCH_SIZE = 500;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sourceUrl = Deno.env.get("TARGET_SUPABASE_DB_URL");
  const destUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!sourceUrl || !destUrl) {
    return new Response(JSON.stringify({ error: "Missing TARGET_SUPABASE_DB_URL or SUPABASE_DB_URL" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* default */ }
  const onlyTable: string | undefined = body.table;
  const dryRun: boolean = !!body.dry_run;
  const tablesToRun = onlyTable ? [onlyTable] : [...TABLES];

  const source = postgres(sourceUrl, { ssl: "require", max: 1, prepare: false, connect_timeout: 30 });
  const dest = postgres(destUrl, { ssl: "require", max: 1, prepare: false, connect_timeout: 30 });

  const results: Record<string, any> = {};

  try {
    // Identify hosts (sanity)
    const [{ host: srcHost }] = await source`SELECT inet_server_addr()::text as host` as any;
    const [{ host: dstHost }] = await dest`SELECT inet_server_addr()::text as host` as any;
    results._hosts = { source: srcHost, dest: dstHost };

    for (const table of tablesToRun) {
      const tableResult: any = { table };
      try {
        // Get destination columns to filter only what exists locally
        const destCols = await dest`
          SELECT column_name FROM information_schema.columns
          WHERE table_schema='public' AND table_name=${table}
        ` as Array<{ column_name: string }>;
        const destColSet = new Set(destCols.map(c => c.column_name));

        const srcCols = await source`
          SELECT column_name FROM information_schema.columns
          WHERE table_schema='public' AND table_name=${table}
          ORDER BY ordinal_position
        ` as Array<{ column_name: string }>;
        const sharedCols = srcCols.map(c => c.column_name).filter(c => destColSet.has(c));
        if (sharedCols.length === 0) throw new Error(`No shared columns for ${table}`);

        const [{ count: totalCount }] = await source`SELECT COUNT(*)::int as count FROM public.${source(table)}` as any;
        tableResult.source_count = totalCount;

        if (dryRun) {
          tableResult.shared_columns = sharedCols;
          results[table] = tableResult;
          continue;
        }

        const colList = sharedCols.map(c => `"${c}"`).join(",");
        let inserted = 0;
        let offset = 0;

        while (offset < totalCount) {
          const rows = await source.unsafe(
            `SELECT ${colList} FROM public.${table} ORDER BY 1 LIMIT ${BATCH_SIZE} OFFSET ${offset}`
          ) as Array<Record<string, any>>;
          if (rows.length === 0) break;

          // Build multi-row insert
          const placeholders: string[] = [];
          const values: any[] = [];
          let p = 1;
          for (const row of rows) {
            const slots = sharedCols.map(c => { values.push(row[c]); return `$${p++}`; });
            placeholders.push(`(${slots.join(",")})`);
          }
          const sql = `INSERT INTO public.${table} (${colList}) VALUES ${placeholders.join(",")} ON CONFLICT (id) DO NOTHING`;
          await dest.unsafe(sql, values);
          inserted += rows.length;
          offset += rows.length;
        }

        const [{ count: destCount }] = await dest`SELECT COUNT(*)::int as count FROM public.${dest(table)}` as any;
        tableResult.processed = inserted;
        tableResult.dest_count = destCount;
        results[table] = tableResult;
      } catch (err) {
        tableResult.error = err instanceof Error ? err.message : String(err);
        results[table] = tableResult;
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown",
      results,
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } finally {
    await source.end({ timeout: 5 });
    await dest.end({ timeout: 5 });
  }
});
