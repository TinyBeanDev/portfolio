// ---------- Night city scene ----------
// Buildings and windows are pre-rendered to offscreen canvases; trains, traffic,
// debris, rain and lightning are animated on top of them each frame.
const canvas = document.getElementById("city");
const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const NEON = ["#ff4d8d", "#5ee7ff", "#ffd166", "#56cf8a", "#b388ff"];
const CAR_COLORS = ["#2a2f45", "#5a1f2e", "#1f3b57", "#3d3d4a", "#c9d3e0", "#6b5b2e"];
const TRAIN_COLORS = ["#c9d3e0", "#3f5f8a", "#8a3b4f", "#2f6b5c"];
const WIND = -0.22; // horizontal slant of rain (negative = blowing left)

const LAYER_SPECS = [
  { top: 0.22, spread: 0.22, minW: 28, maxW: 58, bg: "#121a33", lit: 0.2, cell: [9, 12], win: 4, signs: false },
  { top: 0.36, spread: 0.24, minW: 44, maxW: 96, bg: "#0d1429", lit: 0.28, cell: [10, 14], win: 5, signs: true },
  { top: 0.52, spread: 0.22, minW: 70, maxW: 140, bg: "#080b1a", lit: 0.34, cell: [13, 18], win: 6, signs: true },
];

let W = 0, H = 0, dpr = 1, roadY = 0, railY = 0;
let layers = [], stars = [], clouds = [], lamps = [], rain = [], debris = [], trains = [], cars = [];
let trainTimer = 1, carTimer = 0.2, flashTimer = 6, flash = 0;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeLayer(spec, r) {
  const el = document.createElement("canvas");
  el.width = Math.round(W * dpr);
  el.height = Math.round(H * dpr);
  const g = el.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  const items = [];
  const [cw, ch] = spec.cell;
  let x = -40;
  while (x < W + 40) {
    const bw = spec.minW + r() * (spec.maxW - spec.minW);
    const top = H * (spec.top + r() * spec.spread);

    g.fillStyle = spec.bg;
    g.fillRect(x, top, bw, H - top);
    g.fillStyle = "rgba(140,170,255,0.18)";
    g.fillRect(x, top, bw, 2);
    if (r() < 0.25) g.fillRect(x + bw * 0.6, top - 18, 2, 18);

    for (let wy = top + 10; wy < roadY - 10; wy += ch) {
      for (let wx = x + 6; wx < x + bw - spec.win - 4; wx += cw) {
        const color = r() < 0.7 ? "#ffd27a" : "#9fdcff";
        const on = r() < spec.lit;
        const item = { x: wx, y: wy, w: spec.win, h: spec.win + 2, color, on };
        if (on) {
          g.fillStyle = color;
          g.fillRect(item.x, item.y, item.w, item.h);
        }
        items.push(item);
      }
    }

    if (spec.signs && r() < 0.14) {
      const color = NEON[Math.floor(r() * NEON.length)];
      const item = { x: x + bw * 0.15, y: top + 30 + r() * 80, w: bw * 0.7, h: 10, color, on: true };
      g.fillStyle = color;
      g.fillRect(item.x, item.y, item.w, item.h);
      items.push(item);
    }

    x += bw + 2 + r() * 6;
  }
  return { canvas: el, g, items, bg: spec.bg };
}

function toggle(layer, item) {
  item.on = !item.on;
  layer.g.fillStyle = item.on ? item.color : layer.bg;
  layer.g.fillRect(item.x, item.y, item.w, item.h);
}

function newDrop(anywhere) {
  const len = 12 + Math.random() * 16;
  return {
    x: Math.random() * (W + 200) - 100,
    y: anywhere ? Math.random() * H : -len,
    len,
    v: 900 + Math.random() * 500,
  };
}

function newDebris(anywhere) {
  return {
    x: anywhere ? Math.random() * W : W + 30,
    y: roadY - 20 - Math.random() * 260,
    vx: -(160 + Math.random() * 200),
    phase: Math.random() * 6,
    rot: Math.random() * 6,
    vr: (Math.random() - 0.5) * 6,
    w: 6 + Math.random() * 8,
    h: 4 + Math.random() * 6,
    color: Math.random() < 0.6 ? "#d8d2c0" : "#2b2d3a",
  };
}

function build() {
  W = window.innerWidth;
  H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  roadY = H * 0.78;
  railY = H * 0.6;

  const r = mulberry32(7); // seeded so the skyline is the same after a resize
  layers = LAYER_SPECS.map((spec) => makeLayer(spec, r));
  stars = Array.from({ length: 160 }, () => ({ x: r() * W, y: r() * H * 0.6, s: 1 + r() * 1.5, p: r() * 6 }));
  clouds = Array.from({ length: 4 }, () => ({
    x: r() * W,
    y: H * (0.08 + r() * 0.3),
    w: 160 + r() * 200,
    v: 6 + r() * 10,
  }));
  lamps = [];
  for (let x = 60; x < W + 60; x += 280) lamps.push({ x });
  rain = Array.from({ length: Math.min(420, Math.round(W / 4)) }, () => newDrop(true));
  debris = Array.from({ length: 12 }, () => newDebris(true));
  trains = [];
  cars = [];
}

function spawnTrain() {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const n = 5 + Math.floor(Math.random() * 5);
  const len = n * 74;
  trains.push({
    dir,
    n,
    len,
    speed: 170 + Math.random() * 130,
    x: dir > 0 ? -len - 20 : W + 20,
    color: TRAIN_COLORS[Math.floor(Math.random() * TRAIN_COLORS.length)],
  });
}

function spawnCar() {
  const dir = Math.random() < 0.5 ? 1 : -1;
  cars.push({
    dir,
    y: dir > 0 ? roadY + H * 0.07 : roadY + H * 0.14,
    v: 120 + Math.random() * 150,
    w: 56 + Math.random() * 22,
    color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    x: dir > 0 ? -100 : W + 100,
  });
}

function update(dt) {
  for (const layer of layers) {
    if (Math.random() < 0.4) {
      const item = layer.items[Math.floor(Math.random() * layer.items.length)];
      if (item) toggle(layer, item);
    }
  }

  trainTimer -= dt;
  if (trainTimer <= 0) {
    if (trains.length < 2) spawnTrain();
    trainTimer = 5 + Math.random() * 7;
  }
  for (const tr of trains) tr.x += tr.dir * tr.speed * dt;
  trains = trains.filter((tr) => tr.x < W + 60 && tr.x + tr.len > -60);

  carTimer -= dt;
  if (carTimer <= 0) {
    spawnCar();
    carTimer = 0.35 + Math.random() * 1.1;
  }
  for (const c of cars) c.x += c.dir * c.v * dt;
  cars = cars.filter((c) => c.x > -150 && c.x < W + 150);

  for (const d of debris) {
    d.x += d.vx * dt;
    d.phase += dt * 3;
    d.y += Math.sin(d.phase) * 14 * dt;
    d.rot += d.vr * dt;
    if (d.x < -30) Object.assign(d, newDebris(false));
  }

  for (const d of rain) {
    d.y += d.v * dt;
    d.x += WIND * d.v * dt;
    if (d.y > H) Object.assign(d, newDrop(false));
  }

  for (const c of clouds) {
    c.x += c.v * dt;
    if (c.x - c.w > W) c.x = -c.w;
  }

  flashTimer -= dt;
  if (flashTimer <= 0) {
    flash = 1;
    flashTimer = 7 + Math.random() * 12;
  }
  flash = Math.max(0, flash - dt * 2.5);
}

function drawTrain(tr) {
  const top = railY - 46;
  const bodyH = 34;
  for (let i = 0; i < tr.n; i++) {
    const cx = tr.x + i * 74;
    ctx.fillStyle = tr.color;
    ctx.fillRect(cx, top, 70, bodyH);
    ctx.fillStyle = "#0a0e1c";
    ctx.fillRect(cx + 4, top + 6, 62, 12);
    ctx.fillStyle = "#ffd27a";
    for (let k = 0; k < 4; k++) {
      if ((i + k) % 3 !== 0) ctx.fillRect(cx + 7 + k * 15, top + 9, 9, 7);
    }
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(cx, top + bodyH - 6, 70, 6);
  }
  const front = tr.dir > 0 ? tr.x + tr.len : tr.x;
  const back = tr.dir > 0 ? tr.x : tr.x + tr.len;
  ctx.fillStyle = "rgba(255,240,200,0.22)";
  ctx.fillRect(tr.dir > 0 ? front : front - 120, top + 12, 120, 10);
  ctx.fillStyle = "#fff6dc";
  ctx.fillRect(front - (tr.dir > 0 ? 3 : 0), top + 12, 3, 8);
  ctx.fillStyle = "#ff3b4e";
  ctx.fillRect(back - (tr.dir > 0 ? 0 : 3), top + 24, 3, 5);
}

function drawCar(c) {
  const front = c.dir > 0 ? c.x + c.w : c.x;
  const rear = c.dir > 0 ? c.x : c.x + c.w;
  ctx.fillStyle = c.color;
  ctx.fillRect(c.x, c.y - 8, c.w, 12);
  ctx.fillRect(c.x + c.w * 0.22, c.y - 14, c.w * 0.5, 7);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(c.x + c.w * 0.26, c.y - 13, c.w * 0.42, 4);

  const beam = ctx.createLinearGradient(front, 0, front + c.dir * 110, 0);
  beam.addColorStop(0, "rgba(255,244,214,0.35)");
  beam.addColorStop(1, "rgba(255,244,214,0)");
  ctx.fillStyle = beam;
  ctx.fillRect(Math.min(front, front + c.dir * 110), c.y - 6, 110, 8);

  ctx.fillStyle = "#fff4d6";
  ctx.fillRect(front - (c.dir > 0 ? 3 : 0), c.y - 6, 3, 3);
  ctx.fillStyle = "#ff3b4e";
  ctx.fillRect(rear - (c.dir > 0 ? 0 : 3), c.y - 4, 3, 3);
}

function draw(t) {
  ctx.clearRect(0, 0, W, H);

  // Sky, with a purple-orange city glow near the horizon
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#04050d");
  sky.addColorStop(0.5, "#101238");
  sky.addColorStop(0.78, "#3a1f4f");
  sky.addColorStop(1, "#16102a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  for (const s of stars) {
    ctx.fillStyle = `rgba(225,232,255,${0.35 + 0.5 * Math.abs(Math.sin(t * 0.9 + s.p))})`;
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }

  const mx = W * 0.82, my = H * 0.14, mr = Math.min(W, H) * 0.045;
  const glow = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 4);
  glow.addColorStop(0, "rgba(243,239,224,0.35)");
  glow.addColorStop(1, "rgba(243,239,224,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
  ctx.fillStyle = "#f3efe0";
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(110,120,170,0.12)";
  for (const c of clouds) {
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w, c.w * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Buildings, far to near
  for (const layer of layers) ctx.drawImage(layer.canvas, 0, 0, W, H);

  // Elevated rail with pillars, then trains
  ctx.fillStyle = "#0c1024";
  for (let px = 0; px < W; px += 180) ctx.fillRect(px, railY + 4, 8, roadY - railY - 4);
  ctx.fillStyle = "#2a3150";
  ctx.fillRect(0, railY, W, 4);
  for (const tr of trains) drawTrain(tr);

  // Street
  ctx.fillStyle = "#1a1d2e";
  ctx.fillRect(0, roadY - 6, W, 6);
  ctx.fillStyle = "#0a0b14";
  ctx.fillRect(0, roadY, W, H - roadY);
  ctx.fillStyle = "rgba(110,130,255,0.07)";
  ctx.fillRect(0, roadY, W, H - roadY);
  ctx.fillStyle = "rgba(255,210,120,0.45)";
  const dashOffset = (t * 120) % 60;
  for (let x = -dashOffset; x < W; x += 60) ctx.fillRect(x, roadY + H * 0.105, 26, 3);

  // Street lamps with light cones
  for (const lp of lamps) {
    ctx.fillStyle = "rgba(255,190,110,0.07)";
    ctx.beginPath();
    ctx.moveTo(lp.x + 2, roadY - 118);
    ctx.lineTo(lp.x - 40, roadY);
    ctx.lineTo(lp.x + 44, roadY);
    ctx.fill();
    ctx.fillStyle = "#0a0d1c";
    ctx.fillRect(lp.x, roadY - 120, 4, 120);
    ctx.fillRect(lp.x - 6, roadY - 122, 16, 3);
    ctx.fillStyle = "#ffd27a";
    ctx.fillRect(lp.x - 2, roadY - 119, 8, 2);
  }

  for (const c of cars) drawCar(c);

  for (const d of debris) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = d.color;
    ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
    ctx.restore();
  }

  // Rain streaks, slanted by the wind
  ctx.strokeStyle = "rgba(190,210,255,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const d of rain) {
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - WIND * d.len, d.y - d.len);
  }
  ctx.stroke();

  if (flash > 0) {
    ctx.fillStyle = `rgba(180,200,255,${0.22 * flash})`;
    ctx.fillRect(0, 0, W, H);
  }
}

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    build();
    if (reduceMotion) draw(0);
  }, 150);
});

build();
if (reduceMotion) {
  draw(0);
} else {
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt);
    draw(now / 1000);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

// ---------- Page bits ----------

// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Clock
const clock = document.getElementById("clock");
const tick = () => {
  clock.textContent = new Date().toTimeString().slice(0, 8);
};
tick();
setInterval(tick, 1000);

// Highlight nav link for the section in view
const sections = document.querySelectorAll("main section[id]");
const navLinks = document.querySelectorAll("nav a");
const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  },
  { rootMargin: "-50% 0px -50% 0px" }
);
sections.forEach((section) => navObserver.observe(section));
