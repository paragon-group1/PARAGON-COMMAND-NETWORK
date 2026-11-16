(function () {
  'use strict';

  var clock = document.getElementById('hudClock');
  var lat   = document.getElementById('lat');
  var btn   = document.getElementById('enterBtn');
  var ov    = document.getElementById('overlay');
  var host  = document.getElementById('frameHost');
  var close = document.getElementById('closeBtn');
  var hint  = document.getElementById('audioHint');
  var open  = false;

  function tick() {
    var d = new Date();
    clock.textContent =
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0') + ':' +
      String(d.getSeconds()).padStart(2, '0');
    if (Math.random() < 0.15) lat.textContent = (7 + Math.floor(Math.random() * 19)) + ' ms';
  }
  tick();
  setInterval(tick, 1000);

  function dismissHint() { hint.classList.add('off'); }

  function enter() {
    if (open) return;
    open = true;

    var f = document.createElement('iframe');
    f.src = 'terminal.html?auto=1';
    f.title = 'Consola del sistema';
    f.allow = 'autoplay; fullscreen';
    f.setAttribute('scrolling', 'no');

    f.addEventListener('load', function () {
      try {
        var d = f.contentDocument;
        d.addEventListener('pointerdown', dismissHint, { once: true });
        d.addEventListener('keydown', dismissHint, { once: true });
        f.contentWindow.focus();
      } catch (e) {}
    });

    host.appendChild(f);
    ov.classList.add('open');
    ov.setAttribute('aria-hidden', 'false');
    document.body.classList.add('locked');
    close.focus();
  }

  function exit() {
    if (!open) return;
    open = false;
    ov.classList.remove('open');
    ov.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('locked');
    host.innerHTML = '';
    hint.classList.remove('off');
    btn.focus();
  }

  btn.addEventListener('click', enter);
  close.addEventListener('click', exit);
  ov.addEventListener('pointerdown', dismissHint, { once: true });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) { exit(); return; }
    if (e.key === 'Enter' && !open) { e.preventDefault(); enter(); }
  });

  btn.focus();
})();
