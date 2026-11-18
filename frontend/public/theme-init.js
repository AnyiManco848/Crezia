// Runs synchronously from <head>, before any style is painted. Keep the key in sync with src/presentation/theme/themeStorage.ts.
(function () {
  try {
    var theme = localStorage.getItem('crezia-theme');
    if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
  } catch {
    /* localStorage unavailable: the system preference decides. */
  }
})();
