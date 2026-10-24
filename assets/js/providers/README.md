# TecnoMathAds provider boundary

A provider is intentionally not configured yet.

When a real provider is approved, register an adapter without changing page code:

```js
TecnoMathAds.registerProvider('provider-name', {
  render(slot, options) {
    // Load/render the verified provider here.
    // Never put private credentials or server secrets in this file.
  }
});
```

Provider adapters must:
- avoid overlays over educational controls;
- respect the platform consent state;
- support contextual/non-personalized advertising where required;
- avoid collecting or persisting unnecessary student data;
- reserve layout space before loading creative content;
- fail closed when configuration is missing.
