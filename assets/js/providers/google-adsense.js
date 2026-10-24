/* Google AdSense adapter for TecnoMath.
 * The global AdSense library is included only on the public home/catalog page.
 * This adapter supports explicit ad units when a real data-ad-slot is provided.
 */
(function (window, document) {
  'use strict';
  const config = window.TECNOMATH_ADS || {};
  if (!window.TecnoMathAds || !config.enabled || config.provider !== 'google-adsense') return;

  window.TecnoMathAds.registerProvider('google-adsense', {
    render: function (container, options) {
      const slotId = String(options.slotId || container.getAttribute('data-ad-slot') || '').trim();
      if (!slotId || !config.publisherId) {
        container.hidden = true;
        return;
      }
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.style.width = '100%';
      ins.setAttribute('data-ad-client', config.publisherId);
      ins.setAttribute('data-ad-slot', slotId);
      ins.setAttribute('data-ad-format', options.format || 'auto');
      ins.setAttribute('data-full-width-responsive', 'true');
      container.replaceChildren(ins);
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (_) {
        container.hidden = true;
      }
    }
  });
})(window, document);
