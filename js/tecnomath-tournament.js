/* TecnoMath Tournament Bridge
 * Add ?tournament=<UUID> to a game URL to enable tournament mode.
 * Games can call window.TecnomathTournament.submitScore(score, durationMs, metadata)
 * when their run ends. The bridge also provides a visible fallback button that
 * reads common score elements, so existing games can participate without a rewrite.
 */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const tournamentId = params.get('tournament');
  if (!tournamentId) return;

  let dbPromise = null;
  let startedAt = Date.now();
  let submitted = false;
  let lastScore = null;

  function getClient() {
    if (!dbPromise) {
      if (!window.TecnomathAuth || typeof window.TecnomathAuth.getClient !== 'function') {
        throw new Error('TecnomathAuth no está disponible.');
      }
      dbPromise = window.TecnomathAuth.getClient();
    }
    return dbPromise;
  }

  function numberFrom(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  function readScore() {
    const globals = [
      window.score, window.gameScore, window.currentScore,
      window.points, window.puntos, window.finalScore
    ];
    for (const value of globals) {
      const n = numberFrom(value);
      if (n !== null) return Math.max(0, Math.floor(n));
    }

    const selectors = [
      '#score', '#hud-score', '#game-score', '#scoreValue', '#score-value',
      '[data-score]', '.score', '.score-value', '.hud-score', '.points', '#points'
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const n = numberFrom(el.textContent || el.value || el.getAttribute('data-score'));
      if (n !== null) return Math.max(0, Math.floor(n));
    }
    return lastScore;
  }

  async function submitScore(score, durationMs, metadata) {
    if (submitted) return { ok: false, alreadySubmitted: true };
    const cleanScore = numberFrom(score);
    if (cleanScore === null || cleanScore < 0) throw new Error('Puntuación inválida.');

    const db = await getClient();
    const duration = Math.max(0, Math.floor(Number(durationMs) || (Date.now() - startedAt)));
    const payload = metadata && typeof metadata === 'object' ? metadata : {};
    const { data, error } = await db.rpc('tecnomath_submit_tournament_score', {
      p_tournament_id: tournamentId,
      p_score: Math.floor(cleanScore),
      p_duration_ms: duration,
      p_metadata: payload
    });
    if (error) throw error;
    submitted = true;
    lastScore = Math.floor(cleanScore);
    setStatus('✅ Resultado enviado al torneo.');
    return { ok: true, data };
  }

  function setStatus(text, error) {
    const box = document.getElementById('tm-tournament-status');
    if (!box) return;
    box.textContent = text;
    box.className = 'tm-tournament-status ' + (error ? 'error' : 'ok');
  }

  function createPanel() {
    if (document.getElementById('tm-tournament-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'tm-tournament-panel';
    panel.innerHTML = `
      <div class="tm-tournament-title">🏆 MODO TORNEO</div>
      <div class="tm-tournament-sub">Tu mejor puntuación de esta partida puede entrar al ranking.</div>
      <button id="tm-submit-tournament" type="button">🏁 ENVIAR RESULTADO</button>
      <div id="tm-tournament-status" class="tm-tournament-status">Listo para competir.</div>
    `;
    document.body.appendChild(panel);

    const style = document.createElement('style');
    style.textContent = `
      #tm-tournament-panel{position:fixed;z-index:2147483646;right:12px;bottom:12px;width:min(330px,calc(100vw - 24px));padding:12px;background:#0d0d1a;color:#fff;border:2px solid #ffd700;border-radius:14px;box-shadow:0 0 22px rgba(255,215,0,.25);font-family:Arial,sans-serif;text-align:center}
      .tm-tournament-title{font-weight:900;color:#ffd700;font-size:15px}.tm-tournament-sub{font-size:12px;color:#bbb;margin:6px 0 10px;line-height:1.35}
      #tm-submit-tournament{width:100%;border:0;border-radius:9px;padding:10px;background:#39ff14;color:#001;font-weight:900;cursor:pointer}
      #tm-submit-tournament:disabled{opacity:.55;cursor:not-allowed}.tm-tournament-status{font-size:12px;margin-top:8px;color:#ddd}.tm-tournament-status.ok{color:#7dff9b}.tm-tournament-status.error{color:#ff7788}
    `;
    document.head.appendChild(style);

    document.getElementById('tm-submit-tournament').addEventListener('click', async () => {
      const button = document.getElementById('tm-submit-tournament');
      const score = readScore();
      if (score === null) {
        setStatus('No pude detectar la puntuación. El juego debe llamar a TecnomathTournament.submitScore(score).', true);
        return;
      }
      button.disabled = true;
      try {
        await submitScore(score, Date.now() - startedAt, { source: 'tournament-bridge', page: location.pathname });
      } catch (e) {
        console.error(e);
        setStatus('❌ ' + friendlyError(e), true);
        button.disabled = false;
      }
    });
  }

  function friendlyError(e) {
    const m = String(e?.message || e);
    if (m.includes('login_required')) return 'Inicia sesión para competir.';
    if (m.includes('not_registered')) return 'Primero debes inscribirte en este torneo.';
    if (m.includes('tournament_closed')) return 'El torneo ya no está activo.';
    if (m.includes('participant_required')) return 'No estás inscrito en este torneo.';
    return m;
  }

  window.TecnomathTournament = {
    id: tournamentId,
    getScore: readScore,
    submitScore,
    isActive: () => !submitted
  };

  function boot() {
    createPanel();
    // Track common score DOM nodes so submitScore can use the latest value.
    const observer = new MutationObserver(() => {
      const s = readScore();
      if (s !== null) lastScore = s;
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
