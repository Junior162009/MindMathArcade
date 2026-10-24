/* TecnoMathAds — provider-neutral advertising layer. */
(function (window, document) {
  'use strict';
  const CONFIG = {
    enabled: true,
    provider: 'google-adsense',
    publisherId: 'ca-pub-9426294483156864',
    showOnHome: true,
    showOnCatalog: true,
    showOnInfoPages: true,
    showOnGames: false,
    premiumRemovesAds: true,
    contextualOnly: true,
    reservedMinHeight: 90
  };
  const providers = Object.create(null);

  function registerProvider(name, adapter) {
    if (name && adapter && typeof adapter.render === 'function') providers[name] = adapter;
  }
  function isPremium() {
    try {
      return Boolean(window.TecnoMathSubscription &&
        typeof window.TecnoMathSubscription.isPremium === 'function' &&
        window.TecnoMathSubscription.isPremium());
    } catch (_) { return false; }
  }
  function shouldShow() {
    return CONFIG.enabled && !(CONFIG.premiumRemovesAds && isPremium());
  }
  function render(target, options) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (!element || !shouldShow()) {
      if (element) element.hidden = true;
      return false;
    }
    const provider = providers[(options && options.provider) || CONFIG.provider];
    if (!provider) { element.hidden = true; return false; }
    element.classList.add('tecnomath-ad-slot');
    element.setAttribute('aria-label', 'Publicidad');
    element.style.minHeight = CONFIG.reservedMinHeight + 'px';
    element.hidden = false;
    provider.render(element, options || {});
    return true;
  }
  function hide(target) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (element) element.hidden = true;
  }
  function configure(next) { Object.assign(CONFIG, next || {}); }
  window.TecnoMathAds = Object.freeze({ config: CONFIG, registerProvider, render, hide, configure, isPremium, shouldShow });
})(window, document);
