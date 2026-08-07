/* ==========================================================================
   BIVAK - Shader Animation (pendekatan komponen "Shader Animation" 21st.dev)
   WebGL aurora + siluet punggungan gunung Sulsel, dirender di background hero.
   Zero dependency. Fallback otomatis ke CSS gradient bila WebGL tidak ada.
   ========================================================================== */
(function () {
  "use strict";

  var hero = document.querySelector(".hero");
  if (!hero) return;

  var prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function mountFallback() {
    if (hero.querySelector(".m-shader-fallback")) return;
    var div = document.createElement("div");
    div.className = "m-shader-fallback";
    div.setAttribute("aria-hidden", "true");
    hero.insertBefore(div, hero.firstChild);
  }

  var canvas = document.createElement("canvas");
  canvas.className = "m-shader-canvas";
  canvas.setAttribute("aria-hidden", "true");
  hero.insertBefore(canvas, hero.firstChild);

  var gl = null;
  try {
    gl =
      canvas.getContext("webgl", {
        antialias: false,
        alpha: true,
        premultipliedAlpha: false,
        powerPreference: "low-power"
      }) || canvas.getContext("experimental-webgl");
  } catch (e) {
    gl = null;
  }

  if (!gl) {
    canvas.remove();
    mountFallback();
    return;
  }

  var VERT = [
    "attribute vec2 aPos;",
    "void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }"
  ].join("\n");

  var FRAG = [
    "precision mediump float;",
    "uniform vec2  uRes;",
    "uniform float uTime;",
    "uniform vec2  uMouse;",

    // --- value noise + fbm ---
    "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }",
    "float noise(vec2 p){",
    "  vec2 i = floor(p); vec2 f = fract(p);",
    "  vec2 u = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),",
    "             mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);",
    "}",
    "float fbm(vec2 p){",
    "  float v = 0.0; float a = 0.5;",
    "  for(int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; }",
    "  return v;",
    "}",

    // --- pita aurora ---
    "float band(vec2 uv, float yc, float thick, float speed, float seed){",
    "  float w = fbm(vec2(uv.x * 1.8 + uTime * speed + seed, seed * 3.0)) - 0.5;",
    "  float d = abs(uv.y - (yc + w * 0.22));",
    "  return smoothstep(thick, 0.0, d);",
    "}",

    // --- punggungan gunung ---
    "float ridge(vec2 uv, float base, float amp, float freq, float drift){",
    "  float h = base + amp * fbm(vec2(uv.x * freq + drift, 7.0));",
    "  return smoothstep(h + 0.004, h - 0.004, uv.y);",
    "}",

    "void main(){",
    "  vec2 uv = gl_FragCoord.xy / uRes.xy;",
    "  vec2 p  = uv;",
    "  p.x *= uRes.x / uRes.y;",

    // parallax halus mengikuti kursor
    "  vec2 par = (uMouse - 0.5) * 0.06;",

    "  vec3 col = vec3(0.027, 0.047, 0.043);",

    // aurora emerald
    "  float b1 = band(p + par, 0.72, 0.16, 0.035, 1.0);",
    "  col += vec3(0.063, 0.725, 0.506) * b1 * 0.42;",

    // aurora sky/cyan
    "  float b2 = band(p + par * 1.6, 0.83, 0.12, 0.021, 4.7);",
    "  col += vec3(0.024, 0.714, 0.831) * b2 * 0.30;",

    // sapuan amber tipis di horizon
    "  float b3 = band(p + par * 0.7, 0.52, 0.10, 0.014, 9.3);",
    "  col += vec3(0.961, 0.620, 0.043) * b3 * 0.14;",

    // bintang
    "  float st = hash(floor(gl_FragCoord.xy * 0.72));",
    "  float tw = 0.5 + 0.5 * sin(uTime * 1.6 + st * 40.0);",
    "  col += vec3(0.85, 0.92, 1.0) * step(0.9975, st) * tw * uv.y * 0.75;",

    // tiga lapis punggungan gunung (jauh -> dekat)
    "  float r3 = ridge(p, 0.42, 0.085, 1.1, 12.0);",
    "  col = mix(col, vec3(0.043, 0.098, 0.090), r3 * 0.88);",
    "  float r2 = ridge(p, 0.31, 0.075, 1.9, 31.0);",
    "  col = mix(col, vec3(0.027, 0.067, 0.063), r2 * 0.92);",
    "  float r1 = ridge(p, 0.19, 0.060, 3.1, 55.0);",
    "  col = mix(col, vec3(0.016, 0.039, 0.035), r1);",

    // kabut lembah
    "  float mist = fbm(vec2(p.x * 2.2 + uTime * 0.012, p.y * 3.0)) * smoothstep(0.45, 0.12, uv.y);",
    "  col += vec3(0.063, 0.30, 0.24) * mist * 0.16;",

    // vignette + fade ke bawah supaya teks hero tetap kontras
    "  float vig = smoothstep(1.15, 0.25, length(uv - vec2(0.5)));",
    "  col *= 0.55 + 0.45 * vig;",

    "  float alpha = 0.92 * smoothstep(0.0, 0.28, uv.y);",
    "  gl_FragColor = vec4(col, alpha);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("[BIVAK shader]", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) {
    canvas.remove();
    mountFallback();
    return;
  }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    canvas.remove();
    mountFallback();
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );
  var aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  var uRes = gl.getUniformLocation(prog, "uRes");
  var uTime = gl.getUniformLocation(prog, "uTime");
  var uMouse = gl.getUniformLocation(prog, "uMouse");

  var mouse = { x: 0.5, y: 0.5 };
  var target = { x: 0.5, y: 0.5 };

  hero.addEventListener("pointermove", function (e) {
    var r = hero.getBoundingClientRect();
    target.x = (e.clientX - r.left) / r.width;
    target.y = 1 - (e.clientY - r.top) / r.height;
  });

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    var w = Math.max(1, Math.floor(hero.clientWidth * dpr));
    var h = Math.max(1, Math.floor(hero.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  var running = true;
  var start = performance.now();

  // Hemat baterai: berhenti saat hero keluar layar / tab tidak aktif
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      running = entries[0].isIntersecting;
      if (running) loop();
    }).observe(hero);
  }
  document.addEventListener("visibilitychange", function () {
    running = !document.hidden;
    if (running) loop();
  });

  var frameQueued = false;

  function render(now) {
    frameQueued = false;
    if (!running) return;
    resize();
    mouse.x += (target.x - mouse.x) * 0.06;
    mouse.y += (target.y - mouse.y) * 0.06;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!prefersReduced) loop();
  }

  function loop() {
    if (frameQueued || !running) return;
    frameQueued = true;
    requestAnimationFrame(render);
  }

  resize();
  requestAnimationFrame(function (t) {
    render(t);
    canvas.classList.add("m-shader-ready");
  });

  window.addEventListener("resize", function () {
    resize();
    loop();
  });
})();
