import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const lat = url.searchParams.get("lat") || "-23.5505";
    const lon = url.searchParams.get("lon") || "-46.6333";
    const cidadeQuery = url.searchParams.get("cidade");

    // Open-Meteo forecast (hoje)
    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.searchParams.set("latitude", lat);
    forecastUrl.searchParams.set("longitude", lon);
    forecastUrl.searchParams.set(
      "current",
      "temperature_2m,weather_code,precipitation",
    );
    forecastUrl.searchParams.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code",
    );
    forecastUrl.searchParams.set("timezone", "America/Sao_Paulo");
    forecastUrl.searchParams.set("forecast_days", "1");

    const forecastRes = await fetch(forecastUrl);
    if (!forecastRes.ok) throw new Error("Falha ao consultar clima");
    const forecast = await forecastRes.json();

    // Reverse geocoding (Nominatim é livre; open-meteo tem geocoding só por nome)
    let cidade = cidadeQuery || null;
    if (!cidade) {
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=pt-BR&zoom=10`,
          { headers: { "User-Agent": "MFM-Paisagismo/1.0" } },
        );
        if (nomRes.ok) {
          const j = await nomRes.json();
          cidade =
            j.address?.city ||
            j.address?.town ||
            j.address?.village ||
            j.address?.municipality ||
            j.address?.state ||
            null;
        }
      } catch {
        // graceful fallback: sem cidade
      }
    }

    const payload = {
      cidade,
      lat: Number(lat),
      lon: Number(lon),
      atual: {
        temperatura: forecast.current?.temperature_2m ?? null,
        codigo: forecast.current?.weather_code ?? null,
      },
      hoje: {
        max: forecast.daily?.temperature_2m_max?.[0] ?? null,
        min: forecast.daily?.temperature_2m_min?.[0] ?? null,
        chuva_mm: forecast.daily?.precipitation_sum?.[0] ?? null,
        chuva_prob: forecast.daily?.precipitation_probability_max?.[0] ?? null,
        codigo: forecast.daily?.weather_code?.[0] ?? null,
      },
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Erro ao carregar clima" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
