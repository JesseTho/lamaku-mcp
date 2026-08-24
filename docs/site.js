// Collapse the section nav on phones. The markup ships open, so a reader with
// scripting off gets the full list rather than a control that cannot open.
(function () {
  var d = document.querySelector('.sidebar details');
  if (!d || !window.matchMedia) return;
  var narrow = window.matchMedia('(max-width:64rem)');
  var ours = false, touched = false;
  d.addEventListener('toggle', function () { if (!ours) touched = true; });
  function sync() {
    if (touched) return;
    ours = true; d.open = !narrow.matches; ours = false;
  }
  sync();
  if (narrow.addEventListener) narrow.addEventListener('change', sync);
})();

// Highlight the section currently in view, in both nav columns. Progressive
// enhancement: without JavaScript every link still works as an anchor.
(function () {
  var ids = Array.prototype.map.call(
    document.querySelectorAll('main h2[id]'), function (h) { return h.id; });
  var links = {};
  ids.forEach(function (id) {
    links[id] = document.querySelectorAll('a[href="#' + id + '"]');
  });
  if (!('IntersectionObserver' in window)) return;
  var seen = {};
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { seen[e.target.id] = e.isIntersecting; });
    var current = ids.filter(function (id) { return seen[id]; })[0];
    ids.forEach(function (id) {
      Array.prototype.forEach.call(links[id], function (a) {
        a.classList.toggle('here', id === current);
      });
    });
  }, { rootMargin: '0px 0px -75% 0px' });
  ids.forEach(function (id) { io.observe(document.getElementById(id)); });
})();

// Copy buttons on every code block. Built in script rather than shipped in the
// markup, so a reader without scripting never sees a control that cannot work.
(function () {
  if (!document.querySelector) return;
  var pres = document.querySelectorAll('pre');
  Array.prototype.forEach.call(pres, function (pre, i) {
    var wrap = document.createElement('div');
    wrap.className = 'cw';
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy this command to the clipboard');

    var live = document.createElement('span');
    live.setAttribute('aria-live', 'polite');
    live.style.position = 'absolute';
    live.style.left = '-9999px';

    var timer;
    function done(word) {
      btn.textContent = word;
      btn.setAttribute('data-done', '');
      live.textContent = word;
      clearTimeout(timer);
      timer = setTimeout(function () {
        btn.textContent = 'Copy';
        btn.removeAttribute('data-done');
        live.textContent = '';
      }, 2000);
    }

    btn.addEventListener('click', function () {
      var text = pre.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done('Copied'); },
                                                 function () { fallback(text); });
      } else {
        fallback(text);
      }
    });

    // execCommand is deprecated, but it is the only path on a page served over
    // anything but https, and this page is also read from a local checkout.
    function fallback(text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      done(ok ? 'Copied' : 'Press Ctrl-C');
    }

    wrap.appendChild(btn);
    wrap.appendChild(live);
  });
})();
