import { createClient } from "jsr:@supabase/supabase-js@2";
const URL = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const clean = (v: unknown, max = 500) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
let cached: { expires: number; ids: Set<string> } = { expires: 0, ids: new Set() };
async function gameIds() {
  if (cached.expires > Date.now() && cached.ids.size) return cached.ids;
  const r = await fetch("https://raw.githubusercontent.com/Junior162009/MindMathArcade/main/data/games.json", { cache: "no-store" });
  if (!r.ok) throw new Error("No se pudo validar el catálogo.");
  const data = await r.json(); if (!Array.isArray(data)) throw new Error("Catálogo inválido.");
  const ids = new Set<string>();
  for (const g of data) if (g?.name && g?.url && (g?.evento == null || String(g.evento).trim() === "") && g?.allowVoting !== false) ids.add(String(g.url).trim());
  cached = { expires: Date.now() + 60000, ids }; return ids;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const send = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  if (req.method !== "POST") return send({ ok: false, error: "Método no permitido." }, 405);
  try {
    const b = await req.json().catch(() => ({}));
    const game_id = clean(b.game_id), student_id = clean(b.student_id, 80), grade_id = clean(b.grade_id, 80), score = Number(b.score);
    if (!game_id || !student_id || !grade_id || !Number.isInteger(score) || score < 1 || score > 5) return send({ ok:false, error:"Selecciona el estudiante y una calificación de 1 a 5 estrellas." }, 400);
    if (!(await gameIds()).has(game_id)) return send({ ok:false, error:"El juego no está disponible para calificar." }, 400);
    const { data: grade, error: ge } = await admin.from("tecnomath_voting_grades").select("id").eq("id", grade_id).eq("active", true).maybeSingle();
    if (ge) throw ge; if (!grade) return send({ok:false,error:"El grado no es válido."},400);
    const { data: student, error: se } = await admin.from("tecnomath_voting_students").select("id,grade_id,active").eq("id", student_id).eq("active", true).maybeSingle();
    if (se) throw se; if (!student || String(student.grade_id) !== String(grade.id)) return send({ok:false,error:"El estudiante no pertenece al grado seleccionado."},400);
    const { data, error } = await admin.from("game_ratings").insert({ game_id, student_id, grade_id, score }).select("id,game_id,score,created_at").single();
    if (error?.code === "23505") return send({ok:false,duplicate:true,error:"Este estudiante ya calificó este juego. Cada juego admite una sola calificación por estudiante."},409);
    if (error) throw error;
    return send({ok:true,rating:data});
  } catch (e) {
    console.error("submit-game-rating:", e);
    return send({ok:false,error:"No se pudo guardar la calificación. Inténtalo nuevamente."},500);
  }
});
