/**
 * Lazy-loads Prism.js and language plugins when a code block scrolls into view.
 * Replaces 8 deferred <script> tags and the injected CSS <link>.
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

    var head = document.head;
    scripts.forEach(function (src) {
      var s = document.createElement('script');
      s.src = src;
      s.defer = true;
      head.appendChild(s);
    });
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
