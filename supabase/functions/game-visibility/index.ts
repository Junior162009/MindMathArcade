import { withSupabase } from "npm:@supabase/server@^1";

const CATALOG_URL = "https://raw.githubusercontent.com/Junior162009/MindMathArcade/main/data/games.json";

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ ok: false, error: "Método no permitido." }, { status: 405 });
    }

    try {
      const actorId = ctx.userClaims?.sub || ctx.userClaims?.id;
      if (!actorId) return Response.json({ ok: false, error: "Sesión no válida." }, { status: 401 });

      const { data: profile, error: profileError } = await ctx.supabaseAdmin
        .from("tecnomath_profiles")
        .select("id,role,admin_class")
        .eq("id", actorId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (profile?.role !== "admin" || profile?.admin_class !== "A") {
        return Response.json({ ok: false, error: "Solo un administrador Clase A puede cambiar la visibilidad." }, { status: 403 });
      }

      const body = await req.json().catch(() => ({}));
      const gameId = String(body?.game_id || "").trim();
      const status = String(body?.status || "").trim().toLowerCase();

      if (!/^[A-Za-z0-9._-]{1,120}$/.test(gameId)) {
        return Response.json({ ok: false, error: "game_id inválido." }, { status: 400 });
      }
      if (!["published", "hidden"].includes(status)) {
        return Response.json({ ok: false, error: "Estado inválido." }, { status: 400 });
      }

      const catalogResponse = await fetch(CATALOG_URL, { cache: "no-store" });
      if (!catalogResponse.ok) {
        throw new Error("No se pudo validar el catálogo maestro.");
      }
      const catalog = await catalogResponse.json();
      const game = Array.isArray(catalog)
        ? catalog.find((item) => String(item?.id || "") === gameId)
        : null;

      if (!game) {
        return Response.json({ ok: false, error: "El juego no existe en el catálogo maestro." }, { status: 404 });
      }

      if (game.evento) {
        return Response.json({ ok: false, error: "Los eventos no se administran como juegos." }, { status: 400 });
      }

      const { data: saved, error: saveError } = await ctx.supabaseAdmin
        .from("game_visibility")
        .upsert({
          game_id: gameId,
          status,
          updated_at: new Date().toISOString(),
          updated_by: actorId
        }, { onConflict: "game_id" })
        .select("game_id,status,updated_at,updated_by")
        .single();

      if (saveError) throw saveError;

      const { error: logError } = await ctx.supabaseAdmin
        .from("tecnomath_catalog_logs")
        .insert({
          user_id: actorId,
          action: status === "hidden" ? "visibility_hidden" : "visibility_published",
          game_id: gameId,
          game_name: String(game.name || gameId),
          changes: {
            status,
            source: "admin-a-game-visibility"
          }
        });

      if (logError) throw logError;

      return Response.json({
        ok: true,
        game_id: gameId,
        status,
        updated_at: saved.updated_at,
        updated_by: actorId
      });
    } catch (error) {
      console.error("game-visibility:", error);
      return Response.json({
        ok: false,
        error: String(error?.message || error || "No se pudo actualizar la visibilidad.")
      }, { status: 400 });
    }
  })
};
