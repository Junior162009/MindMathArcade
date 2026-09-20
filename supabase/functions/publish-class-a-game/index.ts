import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import JSZip from "npm:jszip@3.10.1";

const REPO = "Junior162009/MindMathArcade";
const BRANCH = "main";
const GH_API = "https://api.github.com";
const MAX_ZIP_BYTES = 100 * 1024 * 1024;
const MAX_UNZIPPED_BYTES = 300 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 2500;
const ALLOWED_IMAGE = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const SAFE_TEXT_EXT = new Set([".html", ".htm", ".css", ".js", ".mjs", ".cjs", ".json", ".txt", ".md", ".svg", ".xml", ".webmanifest", ".map"]);
const cors = {
  "Access-Control-Allow-Origin": "https://tecnomath.online",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

type Game = Record<string, unknown>;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

function cleanId(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function cleanFolder(value: unknown) {
  return cleanId(value).replace(/\.+/g, "").slice(0, 80) || "juego";
}

function safeRepoPath(value: string) {
  const p = value.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!p || p.includes("\0") || p.split("/").some(x => x === "..") || /^[A-Za-z]:/.test(p)) {
    throw new Error("Ruta insegura.");
  }
  return p.split("/").filter(Boolean).join("/");
}

function b64(bytes: Uint8Array) {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(out);
}

function fromB64(value: string) {
  const bin = atob(value.replace(/\n/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function textFrom(bytes: Uint8Array) {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function normalizeGame(input: Game): Game {
  const g: Game = { ...input };
  g.name = String(g.name ?? "").trim();
  g.desc = String(g.desc ?? g.description ?? "Juego educativo de TecnoMath").trim();
  g.description = String(g.description ?? g.desc).trim();
  g.id = cleanId(g.id || g.name);
  g.icon = String(g.icon || "🎮");
  g.category = String(g.category || "otros");
  g.deviceCompatibility = String(g.deviceCompatibility || "both");
  g.evento = g.evento || null;
  g.status = String(g.status || "published");
  g.allowVoting = g.allowVoting !== false;
  g.featured = g.featured === true;
  g.order = Number.isFinite(Number(g.order)) ? Number(g.order) : 9999;
  g.urlType = String(g.urlType || "internal");
  g.publishDate = g.publishDate || new Date().toISOString();
  g.authorName = String(g.authorName || "").trim();
  g.grade = String(g.grade || "").trim();
  return g;
}

function validateCatalog(catalog: Game[]) {
  const ids = new Set<string>();
  const names = new Set<string>();
  const urls = new Set<string>();
  for (const g of catalog) {
    const id = String(g.id || "");
    const name = String(g.name || "").trim().toLowerCase();
    const url = String(g.url || "").trim();
    if (!/^[a-z0-9._-]+$/i.test(id)) throw new Error("Catálogo inválido: ID inseguro.");
    if (!name) throw new Error("Catálogo inválido: juego sin nombre.");
    if (!url) throw new Error("Catálogo inválido: juego sin URL.");
    if (ids.has(id)) throw new Error("Catálogo inválido: ID duplicado: " + id);
    if (names.has(name)) throw new Error("Catálogo inválido: nombre duplicado: " + name);
    if (urls.has(url.toLowerCase())) throw new Error("Catálogo inválido: URL duplicada: " + url);
    ids.add(id); names.add(name); urls.add(url.toLowerCase());
    if (!["draft", "published", "hidden"].includes(String(g.status))) throw new Error("Estado inválido para " + id);
    if (!["both", "desktop", "mobile"].includes(String(g.deviceCompatibility))) throw new Error("Compatibilidad inválida para " + id);
  }
}

async function gh(path: string, init: RequestInit = {}) {
  const token = Deno.env.get("GITHUB_PUBLISH_TOKEN") || Deno.env.get("GITHUB_ACTIONS_TOKEN");
  if (!token) throw new Error("Falta configurar GITHUB_PUBLISH_TOKEN en los secretos de Supabase.");
  const res = await fetch(GH_API + path, {
    ...init,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + token,
      "X-GitHub-Api-Version": "2026-03-10",
      "User-Agent": "TecnoMath-Class-A-CMS",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await res.text();
  let data: any;
  try { data = body ? JSON.parse(body) : null; } catch { data = body; }
  if (!res.ok) {
    const detail = typeof data === "string" ? data : data?.message || res.statusText;
    const err = new Error("GitHub " + res.status + ": " + String(detail).slice(0, 500));
    (err as any).status = res.status;
    throw err;
  }
  return data;
}

async function getMainState() {
  const ref = await gh("/repos/" + REPO + "/git/ref/heads/" + BRANCH);
  const commit = await gh("/repos/" + REPO + "/git/commits/" + ref.object.sha);
  return { sha: ref.object.sha as string, treeSha: commit.tree.sha as string };
}

async function readGithubJson(path: string, refSha: string): Promise<Game[]> {
  const item = await gh("/repos/" + REPO + "/contents/" + path + "?ref=" + encodeURIComponent(refSha));
  if (!item?.content) throw new Error("No se pudo leer " + path);
  const parsed = JSON.parse(textFrom(fromB64(item.content)));
  if (!Array.isArray(parsed)) throw new Error(path + " no contiene un catálogo JSON.");
  return parsed.map(normalizeGame);
}

async function createBlob(bytes: Uint8Array) {
  const data = await gh("/repos/" + REPO + "/git/blobs", {
    method: "POST",
    body: JSON.stringify({ content: b64(bytes), encoding: "base64" }),
  });
  return data.sha as string;
}

async function createTree(baseTreeSha: string, entries: any[]) {
  return await gh("/repos/" + REPO + "/git/trees", {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTreeSha, tree: entries }),
  });
}

async function createCommit(parentSha: string, treeSha: string, message: string) {
  return await gh("/repos/" + REPO + "/git/commits", {
    method: "POST",
    body: JSON.stringify({ parents: [parentSha], tree: treeSha, message }),
  });
}

async function updateMain(commitSha: string) {
  return await gh("/repos/" + REPO + "/git/refs/heads/" + BRANCH, {
    method: "PATCH",
    body: JSON.stringify({ sha: commitSha, force: false }),
  });
}

function zipPath(raw: string) {
  const p = raw.replaceAll("\\", "/");
  const normalized = p.split("/").filter(Boolean);
  if (p.startsWith("/") || /^[A-Za-z]:/.test(p) || normalized.some(x => x === "..")) throw new Error("El ZIP contiene una ruta insegura.");
  return normalized.join("/");
}

async function downloadPackage(admin: any, path: string) {
  if (!path.startsWith("class-a-packages/") || !path.toLowerCase().endsWith(".zip")) throw new Error("Paquete de Storage no permitido.");
  const { data, error } = await admin.storage.from("game-submissions").download(path);
  if (error || !data) throw new Error("No se pudo leer el ZIP privado desde Storage.");
  if (data.size > MAX_ZIP_BYTES) throw new Error("El ZIP supera el límite de 100 MB.");
  return new Uint8Array(await data.arrayBuffer());
}

async function downloadManualLogo(admin: any, path: string) {
  if (!path.startsWith("logos/")) throw new Error("Ruta de logo no permitida.");
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_IMAGE.has(ext)) throw new Error("Formato de logo no permitido.");
  const { data, error } = await admin.storage.from("game-downloads").download(path);
  if (error || !data) throw new Error("No se pudo leer el logo.");
  if (data.size > 2 * 1024 * 1024) throw new Error("El logo supera 2 MB.");
  return { bytes: new Uint8Array(await data.arrayBuffer()), ext };
}

async function extractPackage(bytes: Uint8Array, gameId: string, folder: string) {
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
  const files = Object.values(zip.files).filter((f: any) => !f.dir && !f.name.startsWith("__MACOSX/") && !f.name.endsWith("/.DS_Store")) as any[];
  if (!files.length) throw new Error("El ZIP está vacío.");
  if (files.length > MAX_FILES) throw new Error("El ZIP contiene demasiados archivos.");
  let total = 0;
  const safeFiles: { file: any; path: string }[] = [];
  for (const file of files) {
    const p = zipPath(file.name);
    if (!p) continue;
    if ((file.unixPermissions & 0o170000) === 0o120000) throw new Error("Los enlaces simbólicos no están permitidos.");
    if (file.dir) continue;
    const declared = Number(file._data?.uncompressedSize ?? file._data?.compressedSize ?? 0);
    if (declared > MAX_FILE_BYTES) throw new Error("Un archivo del ZIP supera 25 MB.");
    total += declared;
    if (total > MAX_UNZIPPED_BYTES) throw new Error("El contenido descomprimido supera 300 MB.");
    safeFiles.push({ file, path: p });
  }
  const top = new Set(safeFiles.filter(x => x.path.includes("/")).map(x => x.path.split("/")[0]));
  const hasRootFile = safeFiles.some(x => !x.path.includes("/"));
  const stripRoot = top.size === 1 && !hasRootFile;
  const root = stripRoot ? [...top][0] + "/" : "";
  const result: { path: string; bytes: Uint8Array }[] = [];
  for (const item of safeFiles) {
    let p = item.path;
    if (stripRoot && p.startsWith(root)) p = p.slice(root.length);
    p = safeRepoPath(p);
    if (!p || p.startsWith(".")) continue;
    const data = await item.file.async("uint8array");
    if (data.length > MAX_FILE_BYTES) throw new Error("Un archivo descomprimido supera 25 MB.");
    result.push({ path: "games/" + folder + "/" + p, bytes: data });
  }
  const index = result.find(x => x.path.toLowerCase() === "games/" + folder + "/index.html")
    || result.find(x => x.path.toLowerCase().endsWith("/index.html"));
  if (!index) throw new Error("No se encontró index.html dentro del ZIP.");
  const images = result.filter(x => ALLOWED_IMAGE.has(x.path.slice(x.path.lastIndexOf(".")).toLowerCase()));
  const logo = images.find(x => /(^|\/)(logo|icon|cover|thumbnail|portada)([-_ ]|\.)/i.test(x.path.slice(x.path.lastIndexOf("/") + 1))) || images[0] || null;
  return { result, logo };
}

async function commitPublication(job: any, admin: any) {
  const payload = normalizeGame(job.payload || {});
  if (!payload.id) payload.id = cleanId(payload.name);
  if (!payload.name) throw new Error("Falta el nombre del juego.");
  const folder = cleanFolder(payload.folder || payload.id);
  payload.folder = folder;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const state = await getMainState();
      const catalog = await readGithubJson("data/games.json", state.sha);
      const existingIndex = catalog.findIndex(x => String(x.id) === String(payload.id));
      const existing = existingIndex >= 0 ? catalog[existingIndex] : null;
      if (existing && String(payload.status) === "published" && job.action === "publish" && !job.payload.editingId && existing.id === payload.id && existing.name !== payload.name) {
        throw new Error("El ID ya pertenece a otro juego.");
      }

      let fileEntries: any[] = [];
      if (payload.packageStoragePath) {
        const zipBytes = await downloadPackage(admin, String(payload.packageStoragePath));
        const extracted = await extractPackage(zipBytes, payload.id as string, folder);
        for (const f of extracted.result) {
          const sha = await createBlob(f.bytes);
          fileEntries.push({ path: f.path, mode: "100644", type: "blob", sha });
        }
        payload.entryFile = "index.html";
        payload.url = "games/" + folder + "/index.html";
        payload.urlType = "internal";
        if (!payload.logoStoragePath && extracted.logo) {
          const ext = extracted.logo.path.slice(extracted.logo.path.lastIndexOf(".")).toLowerCase();
          const logoSha = await createBlob(extracted.logo.bytes);
          fileEntries.push({ path: "img/logos/" + payload.id + ext, mode: "100644", type: "blob", sha: logoSha });
          payload.imageUrl = "img/logos/" + payload.id + ext;
        }
      }

      if (payload.logoStoragePath) {
        const logo = await downloadManualLogo(admin, String(payload.logoStoragePath));
        const sha = await createBlob(logo.bytes);
        fileEntries.push({ path: "img/logos/" + payload.id + logo.ext, mode: "100644", type: "blob", sha });
        payload.imageUrl = "img/logos/" + payload.id + logo.ext;
      }

      const next = [...catalog];
      const index = next.findIndex(x => String(x.id) === String(payload.id));
      const merged = existing ? { ...existing, ...payload } : payload;
      if (index >= 0) next[index] = merged; else next.push(merged);
      next.sort((a, b) => Number(a.order || 9999) - Number(b.order || 9999) || String(a.name).localeCompare(String(b.name), "es"));
      next.forEach((g, i) => { if (!Number.isFinite(Number(g.order)) || Number(g.order) >= 9999) g.order = i + 1; });

      validateCatalog(next);
      const catalogBytes = new TextEncoder().encode(JSON.stringify(next, null, 2) + "\n");
      const catalogSha = await createBlob(catalogBytes);
      fileEntries.push({ path: "data/games.json", mode: "100644", type: "blob", sha: catalogSha });
      fileEntries.push({ path: "games/published-games.json", mode: "100644", type: "blob", sha: catalogSha });

      const tree = await createTree(state.treeSha, fileEntries);
      const commit = await createCommit(state.sha, tree.sha, "feat: publish game " + String(merged.name));
      try {
        await updateMain(commit.sha);
      } catch (e) {
        const status = Number((e as any).status || 0);
        if (status === 409 || status === 422) {
          if (attempt < 3) continue;
        }
        throw e;
      }

      return {
        ok: true,
        status: "published",
        gameId: String(merged.id),
        commitSha: String(commit.sha),
        gamePath: String(merged.url || ("games/" + folder + "/index.html")),
        imagePath: String(merged.imageUrl || ""),
      };
    } catch (e) {
      const status = Number((e as any).status || 0);
      if ((status === 409 || status === 422) && attempt < 3) continue;
      throw e;
    }
  }
  throw new Error("No se pudo publicar después de varios intentos.");
}

async function processJob(job: any, admin: any) {
  if (!["publish", "hide", "reorder", "draft"].includes(String(job.action))) throw new Error("Acción no soportada.");
  if (job.action === "publish" || job.action === "draft") return await commitPublication(job, admin);
  if (job.action === "hide") {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const state = await getMainState();
        const catalog = await readGithubJson("data/games.json", state.sha);
        const idx = catalog.findIndex(x => String(x.id) === String(job.game_id));
        if (idx < 0) throw new Error("Juego no encontrado.");
        catalog[idx] = { ...catalog[idx], status: "hidden" };
        validateCatalog(catalog);
        const bytes = new TextEncoder().encode(JSON.stringify(catalog, null, 2) + "\n");
        const sha = await createBlob(bytes);
        const tree = await createTree(state.treeSha, [
          { path: "data/games.json", mode: "100644", type: "blob", sha },
          { path: "games/published-games.json", mode: "100644", type: "blob", sha },
        ]);
        const commit = await createCommit(state.sha, tree.sha, "chore: hide game " + String(catalog[idx].name));
        try { await updateMain(commit.sha); } catch (e) {
          if ([409, 422].includes(Number((e as any).status)) && attempt < 3) continue;
          throw e;
        }
        return { ok: true, status: "hidden", gameId: String(job.game_id), commitSha: String(commit.sha) };
      } catch (e) {
        if ([409, 422].includes(Number((e as any).status)) && attempt < 3) continue;
        throw e;
      }
    }
  }
  if (job.action === "reorder") {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const state = await getMainState();
        const catalog = await readGithubJson("data/games.json", state.sha);
        const orders = Array.isArray(job.payload?.orders) ? job.payload.orders : [];
        const rank = new Map(orders.map((x: any) => [String(x.id), Number(x.order)]));
        catalog.forEach(g => { if (rank.has(String(g.id))) g.order = rank.get(String(g.id)); });
        catalog.sort((a, b) => Number(a.order || 9999) - Number(b.order || 9999));
        catalog.forEach((g, i) => g.order = i + 1);
        validateCatalog(catalog);
        const bytes = new TextEncoder().encode(JSON.stringify(catalog, null, 2) + "\n");
        const sha = await createBlob(bytes);
        const tree = await createTree(state.treeSha, [
          { path: "data/games.json", mode: "100644", type: "blob", sha },
          { path: "games/published-games.json", mode: "100644", type: "blob", sha },
        ]);
        const commit = await createCommit(state.sha, tree.sha, "chore: reorder game catalog");
        try { await updateMain(commit.sha); } catch (e) {
          if ([409, 422].includes(Number((e as any).status)) && attempt < 3) continue;
          throw e;
        }
        return { ok: true, status: "published", commitSha: String(commit.sha) };
      } catch (e) {
        if ([409, 422].includes(Number((e as any).status)) && attempt < 3) continue;
        throw e;
      }
    }
  }
  throw new Error("No se pudo procesar el trabajo.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido." }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ ok: false, error: "Sesión no válida." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publishKey || !secretKey) return json({ ok: false, error: "Configuración segura incompleta." }, 500);

  const userClient = createClient(supabaseUrl, publishKey, { global: { headers: { Authorization: auth } } });
  const admin = createClient(supabaseUrl, secretKey);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ ok: false, error: "Sesión no válida." }, 401);

  const { data: classA, error: classError } = await userClient.rpc("tecnomath_is_class_a");
  if (classError || classA !== true) return json({ ok: false, error: "Solo un administrador Clase A puede publicar." }, 403);

  const body = await req.json().catch(() => ({}));
  const jobId = String(body.job_id || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) return json({ ok: false, error: "job_id inválido." }, 400);

  const { data: job, error: jobError } = await admin.from("tecnomath_catalog_jobs")
    .select("*").eq("id", jobId).eq("user_id", userData.user.id).maybeSingle();
  if (jobError || !job) return json({ ok: false, error: "Trabajo no encontrado." }, 404);
  if (!["pending", "draft"].includes(String(job.status))) return json({ ok: false, error: "El trabajo ya fue procesado." }, 409);

  await admin.from("tecnomath_catalog_jobs").update({ status: "processing", error_message: null }).eq("id", jobId);
  try {
    const result = await processJob(job, admin);
    await admin.from("tecnomath_catalog_jobs").update({
      status: result.status === "published" || result.status === "hidden" ? "done" : "done",
      processed_at: new Date().toISOString(),
      processed_commit: result.commitSha,
      error_message: null,
    }).eq("id", jobId);
    await admin.from("tecnomath_catalog_logs").insert({
      user_id: userData.user.id,
      action: job.action,
      game_id: result.gameId || job.game_id,
      game_name: String(job.payload?.name || job.game_id || "Catálogo"),
      changes: { ...job.payload, commitSha: result.commitSha },
    });
    return json(result, 200);
  } catch (e) {
    const message = String((e as Error)?.message || "Error de publicación").slice(0, 500);
    await admin.from("tecnomath_catalog_jobs").update({
      status: "error",
      error_message: message,
      processed_at: new Date().toISOString(),
    }).eq("id", jobId);
    console.error("publish-class-a-game:", message);
    return json({ ok: false, status: "error", error: message, jobId }, 500);
  }
});
