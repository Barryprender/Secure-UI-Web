/**
 * Lazy-loads Prism.js and language plugins when a code block scrolls into view.
 * Scripts are loaded sequentially via onload chaining so language plugins always
 * execute after prism.min.js (dynamic script injection ignores the defer attribute).
 */
(function () {
  'use strict';

  var loaded = false;

  function loadPrism() {
    if (loaded) return;
    loaded = true;

    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/static/styles/prism/prism.min.css';
    document.head.appendChild(css);

    var scripts = [
      '/static/js/prism.min.js',
      '/static/js/prism-go.min.js',
      '/static/js/prism-javascript.min.js',
      '/static/js/prism-typescript.min.js',
      '/static/js/prism-bash.min.js',
      '/static/js/prism-json.min.js',
      '/static/js/prism-markup.min.js',
      '/static/js/prism-css.min.js',
    ];

    function loadNext(i) {
      if (i >= scripts.length) return;
      var s = document.createElement('script');
      s.src = scripts[i];
      s.onload = function () { loadNext(i + 1); };
      s.onerror = function () { loadNext(i + 1); };
      document.head.appendChild(s);
    }

    loadNext(0);
  }

  var blocks = document.querySelectorAll('code[class*="language-"]');
  if (!blocks.length) return;

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            loadPrism();
            observer.disconnect();
            return;
          }
        }
      },
      { rootMargin: '300px' }
    );
    blocks.forEach(function (el) { observer.observe(el); });
  } else {
    loadPrism();
  }
})();
