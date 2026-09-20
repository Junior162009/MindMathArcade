import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const clean = (value: unknown, max: number) =>
  String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const allowedGrades = new Set(["6°", "7°", "8°", "9°", "10°", "11°"]);
let catalogCache: { expiresAt: number; ids: Set<string> } = {
  expiresAt: 0,
  ids: new Set()
};

async function getVotingGameIds(): Promise<Set<string>> {
  const now = Date.now();
  if (catalogCache.expiresAt > now && catalogCache.ids.size) return catalogCache.ids;

  const response = await fetch(
    "https://raw.githubusercontent.com/Junior162009/MindMathArcade/main/data/games.json",
    { cache: "no-store" }
  );
  if (!response.ok) throw new Error("No se pudo validar el catálogo de juegos.");

  const catalog = await response.json();
  if (!Array.isArray(catalog)) throw new Error("El catálogo de juegos no es válido.");

  const ids = new Set<string>();
  for (const game of catalog) {
    if (!game?.name || !game?.url) continue;
    if (game?.evento != null && String(game.evento).trim() !== "") continue;
    if (game?.allowVoting === false) continue;
    ids.add(String(game.url).trim());
  }

  if (!ids.size) throw new Error("No hay juegos disponibles para votación.");
  catalogCache = { expiresAt: now + 60_000, ids };
  return ids;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      ok: false,
      error: "Método no permitido."
    }), {
      status: 405,
      headers: { ...CORS, "Content-Type": "application/json" }
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const voterName = clean(body.voter_name, 80);
    const grade = clean(body.grade, 10);
    const gameId = clean(body.game_id, 500);

    if (voterName.length < 2) throw new Error("Escribe el nombre del votante.");
    if (!allowedGrades.has(grade)) throw new Error("Selecciona un grado válido.");
    if (!gameId) throw new Error("Selecciona un juego.");

    const validGameIds = await getVotingGameIds();
    if (!validGameIds.has(gameId)) throw new Error("El juego seleccionado no está disponible para votación.");

    const { data, error } = await admin
      .from("game_votes")
      .insert({
        game_id: gameId,
        voter_name: voterName,
        grade
      })
      .select("id, game_id, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return new Response(JSON.stringify({
          ok: false,
          duplicate: true,
          error: "Ese nombre y grado ya registraron un voto para este juego."
        }), {
          status: 409,
          headers: { ...CORS, "Content-Type": "application/json" }
        });
      }
      throw error;
    }

    return new Response(JSON.stringify({ ok: true, vote: data }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo registrar el voto."
    }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" }
    });
  }
});
