// Drawer + theme toggle. Wired by event delegation on the document so it works
// regardless of where the markup sits. Open state = [data-nav-open] on <html>.
(function () {
  var root = document.documentElement;
  var THEME_KEY = 'umami-guides-theme';

  function burger() { return document.querySelector('[data-nav-toggle]'); }
  function isOpen() { return root.hasAttribute('data-nav-open'); }

  function open() {
    root.setAttribute('data-nav-open', '');
    var b = burger();
    if (b) b.setAttribute('aria-expanded', 'true');
    var first = document.querySelector('#site-drawer nav a');
    if (first) first.focus();
  }

  function close() {
    if (!isOpen()) return;
    root.removeAttribute('data-nav-open');
    var b = burger();
    if (b) { b.setAttribute('aria-expanded', 'false'); b.focus(); }
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-nav-toggle]')) { isOpen() ? close() : open(); return; }
    if (t.closest('[data-nav-close]')) { close(); return; }
    if (t.closest('[data-theme-toggle]')) {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch (err) { /* storage unavailable */ }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) close();
  });
})();
