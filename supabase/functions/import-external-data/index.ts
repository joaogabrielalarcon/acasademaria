import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOURCE_URL = "https://yjaqxhuqqpnxvvrpxjls.supabase.co";
const TABLES = ["fornecedores", "categorias_plantas", "plantas", "insumos", "historico_precos"] as const;
const PAGE = 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sourceKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");
  const destUrl = Deno.env.get("SUPABASE_URL");
  const destKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!sourceKey || !destUrl || !destKey) {
    return new Response(JSON.stringify({ error: "Missing secrets" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}
  const onlyTable: string | undefined = body.table;
  const dryRun: boolean = !!body.dry_run;
  const tablesToRun = onlyTable ? [onlyTable] : [...TABLES];

  const source = createClient(SOURCE_URL, sourceKey, { auth: { persistSession: false } });
  const dest = createClient(destUrl, destKey, { auth: { persistSession: false } });

  const results: Record<string, any> = {};

  for (const table of tablesToRun) {
    const r: any = { table };
    try {
      // Discover destination columns
      const { data: probe } = await dest.from(table).select("*").limit(1);
      // even if probe is empty we need dest schema; fetch via information_schema RPC alt: just use any row
      // We'll instead rely on source row keys filtered by attempting insert; simpler: filter by intersection with first source row keys

      const { count: srcCount, error: countErr } = await source
        .from(table).select("*", { count: "exact", head: true });
      if (countErr) throw countErr;
      r.source_count = srcCount;

      if (dryRun) {
        const { data: sample } = await source.from(table).select("*").limit(1);
        r.sample_columns = sample?.[0] ? Object.keys(sample[0]) : [];
        results[table] = r;
        continue;
      }

      // Get destination column set by querying one row OR via PostgREST OPTIONS
      // Fallback: fetch one source row to know columns, then intersect with a dummy insert attempt.
      // Simpler: just try insert all columns; if column doesn't exist, retry filtering.
      let destCols: Set<string> | null = null;
      if (probe && probe.length > 0) destCols = new Set(Object.keys(probe[0]));

      let inserted = 0;
      let from = 0;
      while (from < (srcCount ?? 0)) {
        const { data: rows, error } = await source
          .from(table).select("*").range(from, from + PAGE - 1);
        if (error) throw error;
        if (!rows || rows.length === 0) break;

        let payload = rows;
        if (destCols) {
          payload = rows.map(row => {
            const o: any = {};
            for (const k of Object.keys(row)) if (destCols!.has(k)) o[k] = row[k];
            return o;
          });
        }

        const { error: insErr } = await dest.from(table).upsert(payload, { onConflict: "id" });
        if (insErr) {
          // If column missing, learn dest cols from error and retry once
          const m = insErr.message.match(/column "([^"]+)" of relation/);
          if (m && !destCols) {
            // fetch a destination row again, this time after we know schema is empty — try a no-op
            // Best effort: drop the offending column and any unknown ones by fetching pg_meta? Skip — error out
          }
          throw insErr;
        }
        inserted += rows.length;
        from += rows.length;
      }

      const { count: destCount } = await dest.from(table).select("*", { count: "exact", head: true });
      r.processed = inserted;
      r.dest_count = destCount;
      results[table] = r;
    } catch (err: any) {
      r.error = err?.message || String(err);
      results[table] = r;
    }
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
