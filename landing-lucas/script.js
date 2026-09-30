// ---------- Configuração ----------
// Troque o número / mensagem do WhatsApp aqui: todos os botões usam este link.
var WHATSAPP_NUMERO = "5511949845827";
var WHATSAPP_MENSAGEM = "Olá! Gostaria de mais informações sobre seu serviço";

(function () {
  var link = "https://wa.me/" + WHATSAPP_NUMERO + "?text=" + encodeURIComponent(WHATSAPP_MENSAGEM);
  document.querySelectorAll(".js-cta").forEach(function (a) {
    a.href = link;
    a.target = "_blank";
    a.rel = "noopener";
  });
})();

// ---------- Menu mobile ----------
(function () {
  var nav = document.getElementById("nav");
  var toggle = nav.querySelector(".nav-toggle");
  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  nav.querySelectorAll(".nav-menu a").forEach(function (a) {
    a.addEventListener("click", function () {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
})();

// ---------- Animações de entrada ----------
(function () {
  var items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("visible"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach(function (el) { io.observe(el); });
})();

// ---------- Partículas azuis + grão ----------
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var c1 = document.getElementById("particulas-canvas");
  var ctx1 = c1.getContext("2d");
  var c2 = document.getElementById("grain-canvas");
  var ctx2 = c2.getContext("2d");

  // Pré-gera alguns quadros de ruído pequenos e repete como padrão (bem mais leve
  // do que gerar ruído em tela cheia a cada frame).
  var grainFrames = [];
  for (var f = 0; f < 6; f++) {
    var tile = document.createElement("canvas");
    tile.width = tile.height = 160;
    var tctx = tile.getContext("2d");
    var img = tctx.createImageData(160, 160);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = (Math.random() * 255) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    grainFrames.push(tile);
  }

  function resize() {
    c1.width = c2.width = window.innerWidth;
    c1.height = c2.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  var N = window.innerWidth < 768 ? 80 : 150;
  var parts = [];
  for (var p = 0; p < N; p++) {
    parts.push({
      x: Math.random() * c1.width,
      y: Math.random() * c1.height,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      phase: Math.random() * Math.PI * 2
    });
  }

  function drawParticles() {
    ctx1.clearRect(0, 0, c1.width, c1.height);
    var t = Date.now() * 0.001;
    ctx1.shadowColor = "rgba(102,175,255,0.7)";
    ctx1.shadowBlur = 9;
    parts.forEach(function (p) {
      p.vx = Math.max(-1.8, Math.min(1.8, p.vx + (Math.random() - 0.5) * 0.15));
      p.vy = Math.max(-1.8, Math.min(1.8, p.vy + (Math.random() - 0.5) * 0.15));
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = c1.width;
      if (p.x > c1.width) p.x = 0;
      if (p.y < 0) p.y = c1.height;
      if (p.y > c1.height) p.y = 0;
      var alpha = 0.22 + 0.38 * Math.abs(Math.sin(t * 1.2 + p.phase));
      ctx1.beginPath();
      ctx1.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx1.fillStyle = "rgba(78,131,255," + alpha + ")";
      ctx1.fill();
    });
  }

  var frame = 0;
  function drawGrain() {
    ctx2.fillStyle = ctx2.createPattern(grainFrames[frame % grainFrames.length], "repeat");
    ctx2.fillRect(0, 0, c2.width, c2.height);
  }

  function loop() {
    frame++;
    drawParticles();
    if (frame % 3 === 0) drawGrain();
    requestAnimationFrame(loop);
  }
  loop();
})();
