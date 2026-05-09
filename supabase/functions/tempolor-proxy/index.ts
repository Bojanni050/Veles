import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TEMPOLOR_BASE = "https://api.tempolor.com";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { path, body, method } = await req.json();

    if (!path || typeof path !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'path' in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: setting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "tempolor_api_key")
      .maybeSingle();

    if (!setting?.value) {
      return new Response(
        JSON.stringify({ error: "API key not configured. Set it in Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = setting.value;
    const httpMethod = (method || "POST").toUpperCase();

    const fetchOptions: RequestInit = {
      method: httpMethod,
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
    };

    if (httpMethod !== "GET" && httpMethod !== "HEAD") {
      fetchOptions.body = JSON.stringify(body || {});
    }

    const tempolorRes = await fetch(`${TEMPOLOR_BASE}${path}`, fetchOptions);

    const responseData = await tempolorRes.text();

    return new Response(responseData, {
      status: tempolorRes.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
