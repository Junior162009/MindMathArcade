/* TecnoMathAds — provider-neutral advertising foundation.
 * No ad-network script or identifier is loaded until a real provider is configured.
 */
(function (window, document) {
  'use strict';

  const CONFIG = Object.freeze({
    enabled: false,
    provider: null,
    showOnHome: true,
    showOnCatalog: true,
    showOnInfoPages: true,
    showOnGames: false,
    premiumRemovesAds: true,
    contextualOnly: true,
    reservedMinHeight: 90
  });

  const providers = Object.create(null);

  function registerProvider(name, adapter) {
    if (!name || !adapter || typeof adapter.render !== 'function') return;
    providers[name] = adapter;
  }

  function isPremium() {
    // Intentionally does not invent a Premium state. A future subscription
    // system can expose window.TecnoMathSubscription.isPremium().
    try {
      return Boolean(
        window.TecnoMathSubscription &&
        typeof window.TecnoMathSubscription.isPremium === 'function' &&
        window.TecnoMathSubscription.isPremium()
      );
    } catch (_) {
      return false;
    }
  }

  function shouldShow() {
    if (!CONFIG.enabled) return false;
    if (CONFIG.premiumRemovesAds && isPremium()) return false;
    return true;
  }

  function render(target, options) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (!element) return false;

    element.classList.add('tecnomath-ad-slot');
    element.setAttribute('aria-label', 'Publicidad');
    element.dataset.adsReady = 'true';

    if (!shouldShow()) {
      element.hidden = true;
      return false;
    }

    const providerName = (options && options.provider) || CONFIG.provider;
    const provider = providerName && providers[providerName];
    if (!provider) {
      // Keep the slot invisible until a real provider is configured.
      element.hidden = true;
      return false;
    }

    element.hidden = false;
    element.style.minHeight = `${CONFIG.reservedMinHeight}px`;
    element.innerHTML = '';
    provider.render(element, options || {});
    return true;
  }

  function hide(target) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (element) element.hidden = true;
  }

  function configure(next) {
    Object.assign(CONFIG, next || {});
  }

  window.TecnoMathAds = Object.freeze({
    config: CONFIG,
    registerProvider,
    render,
    hide,
    configure,
    isPremium,
    shouldShow
  });

  // Neutral adapter hook: a real provider can be registered later without
  // changing pages that already contain ad slots.
})(window, document);
