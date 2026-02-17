/**
 * View Transitions — Directional Navigation
 *
 * Adds 'forwards' or 'backwards' transition types based on
 * navigation order, enabling directional slide animations.
 * Degrades gracefully — no errors in unsupported browsers.
 */
(function () {
  // Navigation order for directional transitions
  var NAV_ORDER = {
    '/': 0,
    '/forms': 1,
    '/documentation': 2,
    '/login': 3,
    '/register': 3,
    '/registration': 3,
    '/dashboard': 4,
    '/table': 5,
    '/profile': 6
  };

  function getPageIndex(url) {
    try {
      var path = new URL(url).pathname.replace(/\/$/, '') || '/';
      // Check for documentation sub-pages
      if (path.startsWith('/documentation/')) return 2;
      return NAV_ORDER[path] !== undefined ? NAV_ORDER[path] : -1;
    } catch (e) {
      return -1;
    }
  }

  // pagereveal: fires on the NEW page before first render
  window.addEventListener('pagereveal', function (e) {
    if (!e.viewTransition) return;
    if (!navigation.activation) return;

    var fromIndex = getPageIndex(navigation.activation.from.url);
    var toIndex = getPageIndex(navigation.activation.entry.url);

    if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
      if (toIndex > fromIndex) {
        e.viewTransition.types.add('forwards');
      } else {
        e.viewTransition.types.add('backwards');
      }
    }
  });
})();
