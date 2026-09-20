import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const auth = req.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const githubToken = Deno.env.get("GITHUB_ACTIONS_TOKEN");

  if (!auth || !supabaseUrl || !anonKey) {
    return new Response(JSON.stringify({ error: "Configuración de autenticación incompleta." }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (!githubToken) {
    return new Response(JSON.stringify({
      error: "Falta configurar GITHUB_ACTIONS_TOKEN en los secretos de Supabase.",
      fallback: true
    }), {
      status: 503, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Sesión no válida." }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { data: isClassA, error: classError } = await supabase.rpc("tecnomath_is_class_a");
  if (classError || isClassA !== true) {
    return new Response(JSON.stringify({ error: "Solo un administrador Clase A puede iniciar este proceso." }), {
      status: 403, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const gh = await fetch(
    "https://api.github.com/repos/Junior162009/MindMathArcade/actions/workflows/process-class-a-game-manager.yml/dispatches",
    {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "TecnoMath-Class-A-Manager",
      },
      body: JSON.stringify({ ref: "main" }),
    },
  );

  if (!gh.ok) {
    const detail = await gh.text();
    return new Response(JSON.stringify({
      error: "No se pudo iniciar GitHub Actions.",
      detail: detail.slice(0, 500),
      fallback: true
    }), {
      status: 502, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    message: "Procesamiento del catálogo iniciado.",
    user_id: userData.user.id,
  }), {
    status: 202,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
