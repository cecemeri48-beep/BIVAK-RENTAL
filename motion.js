/* ==========================================================================
   BIVAK - Motion Engine
   Mesin animasi spring bergaya Framer Motion, ditulis vanilla JS (zero deps).
   Dimuat SETELAH app.js. Tidak mengubah satu baris pun logika bisnis app.js.

   Isi:
   1. Spring solver  -> easing linear() presisi seperti framer-motion
   2. animate()      -> pembungkus tipis Web Animations API
   3. Reveal on scroll + stagger otomatis
   4. Counter angka (hero stats)
   5. Interactive 3D tilt + spotlight (pendekatan 21st.dev)
   6. Magnetic button + ripple
   7. Spring modal transition (open/close)
   8. FLIP layout animation saat filter katalog
   9. Scroll progress + navbar condense
   ========================================================================== */
(function () {
  "use strict";

  var html = document.documentElement;
  html.classList.add("m-js");

  var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  function reduced() {
    return mq.matches;
  }

  var isTouch = window.matchMedia("(hover: none)").matches;

  /* ------------------------------------------------------------------
     1. SPRING SOLVER
     Mensimulasikan pegas teredam lalu mengubahnya jadi CSS linear().
     Inilah yang bikin gerakan terasa "hidup", bukan ease-in-out kaku.
     ------------------------------------------------------------------ */
  var springCache = {};

  function spring(opts) {
    opts = opts || {};
    var stiffness = opts.stiffness || 170;
    var damping = opts.damping || 26;
    var mass = opts.mass || 1;
    var key = stiffness + "_" + damping + "_" + mass;
    if (springCache[key]) return springCache[key];

    var dt = 1 / 240;
    var x = 1; // simpangan dari target
    var v = 0;
    var samples = [];
    var t = 0;
    var maxT = 4;

    while (t < maxT) {
      var a = (-stiffness * x - damping * v) / mass;
      v += a * dt;
      x += v * dt;
      t += dt;
      samples.push(1 - x);
      if (Math.abs(x) < 0.0008 && Math.abs(v) < 0.0008) break;
    }
    if (!samples.length) samples = [0, 1];
    samples[samples.length - 1] = 1;

    // turunkan jumlah titik agar string easing tetap ringkas
    var maxPoints = 64;
    var out = [];
    var step = Math.max(1, Math.floor(samples.length / maxPoints));
    for (var i = 0; i < samples.length; i += step) {
      out.push(Math.round(samples[i] * 10000) / 10000);
    }
    if (out[out.length - 1] !== 1) out.push(1);

    var supported =
      window.CSS && CSS.supports && CSS.supports("animation-timing-function", "linear(0, 1)");

    var result = {
      easing: supported ? "linear(" + out.join(",") + ")" : "cubic-bezier(0.16, 1, 0.3, 1)",
      duration: Math.round(t * 1000)
    };
    springCache[key] = result;
    return result;
  }

  // Preset seperti di framer-motion
  var SPRING = {
    gentle: spring({ stiffness: 120, damping: 20 }),
    snappy: spring({ stiffness: 260, damping: 26 }),
    bouncy: spring({ stiffness: 300, damping: 18 }),
    stiff: spring({ stiffness: 400, damping: 34 })
  };

  /* ------------------------------------------------------------------
     2. animate() — pembungkus tipis WAAPI
     ------------------------------------------------------------------ */
  function animate(el, keyframes, options) {
    options = options || {};
    var preset = options.spring || SPRING.gentle;
    if (reduced() || !el.animate) {
      // Langsung ke state akhir, tanpa gerakan.
      var last = {};
      Object.keys(keyframes).forEach(function (k) {
        var val = keyframes[k];
        last[k] = Array.isArray(val) ? val[val.length - 1] : val;
      });
      Object.keys(last).forEach(function (k) {
        el.style[k] = last[k];
      });
      return null;
    }
    return el.animate(keyframes, {
      duration: options.duration || preset.duration,
      easing: options.easing || preset.easing,
      delay: options.delay || 0,
      fill: options.fill || "both"
    });
  }

  /* ------------------------------------------------------------------
     3. REVEAL ON SCROLL + STAGGER
     Elemen ditandai otomatis — tidak perlu menambah atribut di HTML.
     ------------------------------------------------------------------ */
  var REVEAL_TARGETS = [
    ".hero-tag",
    ".hero-title",
    ".hero-description",
    ".search-filter-card",
    ".hero-stats .stat-item",
    ".section-header",
    ".impact-banner > div",
    ".impact-item",
    "#panduan .container > div > div",
    ".footer-grid > div"
  ];

  function markReveal(el, variant, index) {
    if (!el || el.hasAttribute("data-m-reveal")) return;
    el.setAttribute("data-m-reveal", variant || "up");
    if (index != null) el.setAttribute("data-m-index", String(index));
  }

  var VARIANTS = {
    up: { transform: ["translate3d(0,26px,0)", "translate3d(0,0,0)"], opacity: [0, 1] },
    fade: { opacity: [0, 1] },
    scale: {
      transform: ["translate3d(0,18px,0) scale(0.96)", "translate3d(0,0,0) scale(1)"],
      opacity: [0, 1]
    },
    left: { transform: ["translate3d(-24px,0,0)", "translate3d(0,0,0)"], opacity: [0, 1] },
    right: { transform: ["translate3d(24px,0,0)", "translate3d(0,0,0)"], opacity: [0, 1] }
  };

  function playReveal(el, delay) {
    var variant = el.getAttribute("data-m-reveal") || "up";
    var kf = VARIANTS[variant] || VARIANTS.up;
    el.classList.add("m-revealed");
    var anim = animate(el, kf, { spring: SPRING.gentle, delay: delay || 0 });
    if (anim) {
      anim.onfinish = function () {
        el.style.opacity = "";
        el.style.transform = "";
        el.style.willChange = "";
        try {
          anim.cancel();
        } catch (e) {}
      };
    } else {
      el.style.opacity = "";
      el.style.transform = "";
    }
  }

  var revealObserver = null;
  if ("IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver(
      function (entries) {
        // urutkan supaya stagger mengikuti posisi visual, bukan urutan observer
        entries
          .filter(function (e) {
            return e.isIntersecting;
          })
          .sort(function (a, b) {
            return a.boundingClientRect.top - b.boundingClientRect.top;
          })
          .forEach(function (entry, i) {
            var el = entry.target;
            revealObserver.unobserve(el);
            var idx = parseInt(el.getAttribute("data-m-index") || i, 10);
            playReveal(el, Math.min(idx, 8) * 70);
          });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
  }

  function observeReveals(root) {
    root = root || document;
    REVEAL_TARGETS.forEach(function (sel) {
      var nodes = root.querySelectorAll(sel);
      Array.prototype.forEach.call(nodes, function (el, i) {
        markReveal(el, "up", i);
        if (revealObserver) revealObserver.observe(el);
        else playReveal(el, 0);
      });
    });
  }

  /* --- FAILSAFE ---------------------------------------------------
     Aturan emas: animasi tidak boleh pernah menyembunyikan konten.
     Kalau IntersectionObserver tidak jalan (browser lama, headless
     renderer, screenshot tool, JS error), semua konten dipaksa tampil.
     ----------------------------------------------------------------- */
  function revealNow(el) {
    if (!el || el.classList.contains("m-revealed")) return;
    if (revealObserver) {
      try {
        revealObserver.unobserve(el);
      } catch (e) {}
    }
    el.classList.add("m-revealed");
    el.style.opacity = "";
    el.style.transform = "";
  }

  function initRevealFailsafe() {
    // 1. Apapun yang sudah berada di dalam / di atas viewport saat load
    //    langsung ditampilkan — jangan menunggu scroll.
    function sweep() {
      document.querySelectorAll("[data-m-reveal]:not(.m-revealed)").forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 1.1) playReveal(el, 0);
      });
    }
    window.addEventListener("load", function () {
      setTimeout(sweep, 400);
    });
    window.addEventListener("resize", sweep);

    // 2. Jaring pengaman terakhir: kalau setelah 5 detik tidak ada satu pun
    //    elemen yang ter-reveal, sistemnya dianggap gagal — tampilkan semua.
    setTimeout(function () {
      var total = document.querySelectorAll("[data-m-reveal]").length;
      var shown = document.querySelectorAll("[data-m-reveal].m-revealed").length;
      if (total > 0 && shown === 0) {
        document.querySelectorAll("[data-m-reveal]").forEach(revealNow);
      }
    }, 5000);
  }

  /* ------------------------------------------------------------------
     4. COUNTER ANGKA
     Membaca nilai akhir dari DOM (diisi app.js), lalu menghitung naik.
     ------------------------------------------------------------------ */
  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function countUp(el) {
    if (!el || el.dataset.mCounted === "1") return;
    var raw = (el.textContent || "").trim();
    var target = parseInt(raw.replace(/[^\d]/g, ""), 10);
    if (!target || isNaN(target)) return;
    el.dataset.mCounted = "1";
    if (reduced()) return;

    var useSeparator = /[.,]/.test(raw);
    var dur = 1500;
    var t0 = performance.now();

    function tick(now) {
      var p = Math.min((now - t0) / dur, 1);
      var val = Math.round(target * easeOutExpo(p));
      el.textContent = useSeparator ? val.toLocaleString("id-ID") : String(val);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function initCounters() {
    var ids = ["statVendorsCount", "statDonationTotal"];
    var els = ids
      .map(function (id) {
        return document.getElementById(id);
      })
      .filter(Boolean);
    if (!els.length || !("IntersectionObserver" in window)) {
      els.forEach(countUp);
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            countUp(e.target);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    els.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ------------------------------------------------------------------
     5. INTERACTIVE 3D TILT + SPOTLIGHT
     Kartu dimiringkan mengikuti kursor, kembali dengan spring.
     ------------------------------------------------------------------ */
  var TILT_SELECTOR = ".vendor-card, .auction-card";
  var MAX_TILT = 7; // derajat — sengaja halus, bukan efek murahan

  function enhanceTilt(card) {
    if (isTouch || reduced()) return;
    if (card.dataset.mTilt === "1") return;
    card.dataset.mTilt = "1";
    card.classList.add("m-tilt");

    if (getComputedStyle(card).position === "static") {
      card.style.position = "relative";
    }

    var glare = document.createElement("div");
    glare.className = "m-glare";
    glare.setAttribute("aria-hidden", "true");
    card.appendChild(glare);

    var border = document.createElement("div");
    border.className = "m-spotlight-border";
    border.setAttribute("aria-hidden", "true");
    card.appendChild(border);

    var raf = null;
    var state = { rx: 0, ry: 0, tz: 0 };
    var goal = { rx: 0, ry: 0, tz: 0 };

    function frame() {
      state.rx += (goal.rx - state.rx) * 0.14;
      state.ry += (goal.ry - state.ry) * 0.14;
      state.tz += (goal.tz - state.tz) * 0.14;
      card.style.transform =
        "perspective(900px) rotateX(" +
        state.rx.toFixed(3) +
        "deg) rotateY(" +
        state.ry.toFixed(3) +
        "deg) translate3d(0," +
        (-state.tz * 0.9).toFixed(2) +
        "px,0) scale(" +
        (1 + state.tz * 0.0016).toFixed(4) +
        ")";
      var done =
        Math.abs(goal.rx - state.rx) < 0.01 &&
        Math.abs(goal.ry - state.ry) < 0.01 &&
        Math.abs(goal.tz - state.tz) < 0.01;
      if (done) {
        raf = null;
        if (goal.rx === 0 && goal.ry === 0 && goal.tz === 0) card.style.transform = "";
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    function kick() {
      if (!raf) raf = requestAnimationFrame(frame);
    }

    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      goal.ry = (px - 0.5) * 2 * MAX_TILT;
      goal.rx = -(py - 0.5) * 2 * MAX_TILT;
      goal.tz = 6;
      card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
      kick();
    });

    card.addEventListener("pointerleave", function () {
      goal.rx = 0;
      goal.ry = 0;
      goal.tz = 0;
      kick();
    });
  }

  function initTilt(root) {
    var nodes = (root || document).querySelectorAll(TILT_SELECTOR);
    Array.prototype.forEach.call(nodes, enhanceTilt);
  }

  /* ------------------------------------------------------------------
     6. MAGNETIC BUTTON + RIPPLE
     ------------------------------------------------------------------ */
  function initMagnetic() {
    if (isTouch || reduced()) return;
    document.addEventListener("pointermove", function (e) {
      var btn = e.target.closest && e.target.closest(".btn-primary, .btn-amber");
      if (!btn || btn.dataset.mMagnetOff === "1") return;
      // Jangan geser tombol di dalam modal: transform membuat pointerup
      // mendarat di luar tombol sehingga event CLICK tidak pernah terjadi.
      if (btn.closest(".modal-overlay")) return;
      var r = btn.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      btn.style.transform =
        "translate3d(" + (dx * 7).toFixed(2) + "px," + (dy * 5).toFixed(2) + "px,0)";
    });

    document.addEventListener(
      "pointerout",
      function (e) {
        var btn = e.target.closest && e.target.closest(".btn-primary, .btn-amber");
        if (!btn) return;
        if (btn.closest(".modal-overlay")) return;
        animate(btn, { transform: [btn.style.transform || "none", "translate3d(0,0,0)"] }, {
          spring: SPRING.bouncy
        });
        setTimeout(function () {
          btn.style.transform = "";
        }, 320);
      },
      true
    );
  }

  function initRipple() {
    document.addEventListener("pointerdown", function (e) {
      var btn = e.target.closest && e.target.closest(".btn");
      if (!btn || reduced()) return;
      var r = btn.getBoundingClientRect();
      var size = Math.max(r.width, r.height) * 2;
      var span = document.createElement("span");
      span.className = "m-ripple";
      // Wajib inline: aturan ".btn > * { position: relative }" di motion.css
      // menimpa ".m-ripple { position: absolute }". Tanpa ini, span ripple
      // menjadi flex-item selebar ratusan px yang menggeser tombol sebelum
      // pointerup, sehingga event click tidak pernah terjadi pada tombol.
      span.style.position = "absolute";
      span.style.pointerEvents = "none";
      span.style.width = span.style.height = size + "px";
      span.style.left = e.clientX - r.left - size / 2 + "px";
      span.style.top = e.clientY - r.top - size / 2 + "px";
      btn.appendChild(span);
      var a = span.animate(
        [
          { transform: "scale(0)", opacity: 0.5 },
          { transform: "scale(1)", opacity: 0 }
        ],
        { duration: 620, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
      );
      a.onfinish = function () {
        span.remove();
      };
    });
  }

  /* ------------------------------------------------------------------
     7. SPRING MODAL
     Membungkus openModal/closeModal milik app.js tanpa mengubahnya.
     ------------------------------------------------------------------ */
  function patchModals() {
    var originalOpen = window.openModal;
    var originalClose = window.closeModal;
    if (typeof originalOpen !== "function" || typeof originalClose !== "function") return;

    window.openModal = function (id) {
      originalOpen(id);
      var modal = document.getElementById(id);
      if (!modal) return;
      document.body.style.overflow = "hidden";
      var box = modal.querySelector(".modal-container");
      if (!box) return;
      animate(modal, { opacity: [0, 1] }, { duration: 220, easing: "ease-out" });
      animate(
        box,
        {
          transform: ["translate3d(0,32px,0) scale(0.94)", "translate3d(0,0,0) scale(1)"],
          opacity: [0, 1]
        },
        { spring: SPRING.snappy }
      );
      // fokus ke elemen pertama demi aksesibilitas
      var focusable = box.querySelector(
        "input, select, textarea, button:not(.modal-close)"
      );
      if (focusable) setTimeout(function () { focusable.focus(); }, 160);
    };

    window.closeModal = function (id) {
      var modal = document.getElementById(id);
      if (!modal || !modal.classList.contains("active")) {
        originalClose(id);
        return;
      }
      var box = modal.querySelector(".modal-container");
      document.body.style.overflow = "";

      if (reduced() || !box || !box.animate) {
        originalClose(id);
        return;
      }
      var a = box.animate(
        [
          { transform: "translate3d(0,0,0) scale(1)", opacity: 1 },
          { transform: "translate3d(0,18px,0) scale(0.96)", opacity: 0 }
        ],
        { duration: 190, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" }
      );
      modal.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 200,
        easing: "ease-in",
        fill: "forwards"
      });
      a.onfinish = function () {
        originalClose(id);
        modal.getAnimations().forEach(function (an) { an.cancel(); });
        box.getAnimations().forEach(function (an) { an.cancel(); });
      };
    };

    // Tutup lewat klik backdrop + tombol Escape (UX standar yang hilang)
    document.querySelectorAll(".modal-overlay").forEach(function (overlay) {
      overlay.addEventListener("mousedown", function (e) {
        if (e.target === overlay) window.closeModal(overlay.id);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var open = document.querySelector(".modal-overlay.active");
      if (open) window.closeModal(open.id);
    });
  }

  /* ------------------------------------------------------------------
     8. STAGGER + FLIP untuk grid katalog
     MutationObserver mendeteksi render ulang dari app.js.
     ------------------------------------------------------------------ */
  function staggerIn(container) {
    var children = Array.prototype.slice.call(container.children);
    children.forEach(function (child, i) {
      if (reduced()) return;
      animate(
        child,
        {
          opacity: [0, 1],
          transform: ["translate3d(0,24px,0) scale(0.97)", "translate3d(0,0,0) scale(1)"]
        },
        { spring: SPRING.gentle, delay: Math.min(i, 9) * 55 }
      );
    });
  }

  function watchGrid(id) {
    var container = document.getElementById(id);
    if (!container) return;

    var mo = new MutationObserver(function (mutations) {
      var added = mutations.some(function (m) {
        return m.addedNodes.length > 0;
      });
      if (!added) return;
      initTilt(container);
      staggerIn(container);
    });

    mo.observe(container, { childList: true });

    // render pertama sudah terjadi sebelum motion.js jalan
    initTilt(container);
    staggerIn(container);
  }

  /* ------------------------------------------------------------------
     9. SCROLL PROGRESS + NAVBAR CONDENSE
     ------------------------------------------------------------------ */
  function initScrollChrome() {
    var bar = document.createElement("div");
    bar.className = "m-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);

    var navbar = document.querySelector(".navbar");
    var ticking = false;

    function update() {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
      if (navbar) navbar.classList.toggle("m-scrolled", window.scrollY > 24);
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }

  /* ------------------------------------------------------------------
     10. Sentuhan konten: indikator "live" di kartu lelang
     ------------------------------------------------------------------ */
  function decorateAuctions() {
    document.querySelectorAll(".timer-box").forEach(function (box) {
      if (box.dataset.mLive === "1") return;
      box.dataset.mLive = "1";
      var dot = document.createElement("span");
      dot.className = "m-live-dot";
      dot.setAttribute("aria-hidden", "true");
      box.insertBefore(dot, box.firstChild);
    });
  }

  /* ------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------ */
  function boot() {
    observeReveals(document);
    initRevealFailsafe();
    initCounters();
    initMagnetic();
    initRipple();
    patchModals();
    initScrollChrome();
    watchGrid("vendorGridContainer");
    watchGrid("auctionGridContainer");
    decorateAuctions();

    var auctionGrid = document.getElementById("auctionGridContainer");
    if (auctionGrid) {
      new MutationObserver(decorateAuctions).observe(auctionGrid, { childList: true });
    }

    mq.addEventListener &&
      mq.addEventListener("change", function () {
        if (reduced()) {
          document.querySelectorAll("[data-m-reveal]").forEach(function (el) {
            el.classList.add("m-revealed");
            el.style.opacity = "";
            el.style.transform = "";
          });
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Ekspor kecil supaya bisa dipakai manual dari console / kode lain
  window.BivakMotion = { animate: animate, spring: spring, SPRING: SPRING };
})();
