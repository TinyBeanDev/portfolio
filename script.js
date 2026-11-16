// ---------- Pixel night city (full-page background) ----------
// The city is drawn at 1/PIX resolution and scaled up with nearest-neighbour
// filtering, so every element is chunky pixel art. Buildings and windows are
// pre-rendered to offscreen canvases; trains, traffic, debris, rain and
// lightning are animated on top.
const PIX = 4; // CSS px per virtual pixel
const canvas = document.getElementById("city");
const ctx = canvas.getContext("2d");
const deskCanvas = document.getElementById("desk");
const dctx = deskCanvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const NEON = ["#ff4d8d", "#5ee7ff", "#ffd166", "#56cf8a", "#b388ff"];
const CAR_COLORS = ["#2a2f45", "#5a1f2e", "#1f3b57", "#3d3d4a", "#c9d3e0", "#6b5b2e"];
const TRAIN_COLORS = ["#c9d3e0", "#3f5f8a", "#8a3b4f", "#2f6b5c"];
const WIND = -0.22; // rain slant (negative = blowing left)

const LAYER_SPECS = [
  { top: 0.22, spread: 0.22, minW: 8, maxW: 16, bg: "#121a33", lit: 0.2, cell: [4, 5], win: 2, signs: false },
  { top: 0.36, spread: 0.24, minW: 14, maxW: 30, bg: "#0d1429", lit: 0.28, cell: [5, 6], win: 2, signs: true },
  { top: 0.52, spread: 0.22, minW: 22, maxW: 44, bg: "#080b1a", lit: 0.34, cell: [6, 8], win: 3, signs: true },
];

let W = 0, H = 0, roadY = 0, railY = 0;
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
  el.width = W;
  el.height = H;
  const g = el.getContext("2d");

  const items = [];
  const [cw, ch] = spec.cell;
  let x = -6;
  while (x < W + 6) {
    const bw = spec.minW + r() * (spec.maxW - spec.minW);
    const top = Math.floor(H * (spec.top + r() * spec.spread));

    g.fillStyle = spec.bg;
    g.fillRect(x, top, bw, H - top);
    g.fillStyle = "rgba(140, 170, 255, 0.25)";
    g.fillRect(x, top, bw, 1);
    if (r() < 0.25) g.fillRect(Math.floor(x + bw * 0.6), top - 4, 1, 4);

    for (let wy = top + 3; wy < roadY - 3; wy += ch) {
      for (let wx = x + 2; wx < x + bw - spec.win - 1; wx += cw) {
        const color = r() < 0.7 ? "#ffd27a" : "#9fdcff";
        const on = r() < spec.lit;
        const item = { x: Math.floor(wx), y: Math.floor(wy), w: spec.win, h: spec.win, color, on };
        if (on) {
          g.fillStyle = color;
          g.fillRect(item.x, item.y, item.w, item.h);
        }
        items.push(item);
      }
    }

    if (spec.signs && r() < 0.14) {
      const color = NEON[Math.floor(r() * NEON.length)];
      const item = {
        x: Math.floor(x + bw * 0.2),
        y: Math.floor(top + 4 + r() * 14),
        w: Math.max(3, Math.floor(bw * 0.6)),
        h: 3,
        color,
        on: true,
      };
      g.fillStyle = color;
      g.fillRect(item.x, item.y, item.w, item.h);
      items.push(item);
    }

    x += bw + 1 + r() * 2;
  }
  return { canvas: el, g, items, bg: spec.bg };
}

function toggle(layer, item) {
  item.on = !item.on;
  layer.g.fillStyle = item.on ? item.color : layer.bg;
  layer.g.fillRect(item.x, item.y, item.w, item.h);
}

function newDrop(anywhere) {
  const len = 3 + Math.floor(Math.random() * 4);
  return {
    x: Math.random() * (W + 60) - 30,
    y: anywhere ? Math.random() * H : -len,
    len,
    v: 110 + Math.random() * 60,
  };
}

function newDebris(anywhere) {
  return {
    x: anywhere ? Math.random() * W : W + 8,
    y: roadY - 6 - Math.random() * 60,
    vx: -(40 + Math.random() * 40),
    phase: Math.random() * 6,
    rot: Math.random() < 0.5 ? 0 : 1,
    w: 1 + Math.floor(Math.random() * 2),
    h: 1 + Math.floor(Math.random() * 2),
    color: Math.random() < 0.6 ? "#d8d2c0" : "#2b2d3a",
  };
}

function build() {
  W = Math.ceil(window.innerWidth / PIX);
  H = Math.ceil(window.innerHeight / PIX);
  canvas.width = W;
  canvas.height = H;
  roadY = Math.floor(H * 0.78);
  railY = Math.floor(H * 0.6);

  const r = mulberry32(7); // seeded so the skyline is stable across resizes
  layers = LAYER_SPECS.map((spec) => makeLayer(spec, r));
  stars = Array.from({ length: 140 }, () => ({
    x: Math.floor(r() * W),
    y: Math.floor(r() * H * 0.6),
    p: r() * 6,
  }));
  clouds = Array.from({ length: 4 }, () => ({
    x: r() * W,
    y: H * (0.08 + r() * 0.3),
    w: 40 + Math.floor(r() * 30),
    v: 2 + r() * 3,
  }));
  lamps = [];
  for (let x = 20; x < W + 20; x += 60) lamps.push({ x });
  rain = Array.from({ length: Math.min(260, Math.round(W / 2)) }, () => newDrop(true));
  debris = Array.from({ length: 8 }, () => newDebris(true));
  trains = [];
  cars = [];
}

function spawnTrain() {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const n = 5 + Math.floor(Math.random() * 5);
  const len = n * 17;
  trains.push({
    dir,
    n,
    len,
    speed: 30 + Math.random() * 20,
    x: dir > 0 ? -len - 4 : W + 4,
    color: TRAIN_COLORS[Math.floor(Math.random() * TRAIN_COLORS.length)],
  });
}

function spawnCar() {
  const dir = Math.random() < 0.5 ? 1 : -1;
  cars.push({
    dir,
    y: Math.floor(dir > 0 ? roadY + H * 0.07 : roadY + H * 0.14),
    v: 30 + Math.random() * 30,
    w: 12 + Math.floor(Math.random() * 6),
    color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    x: dir > 0 ? -20 : W + 20,
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
  trains = trains.filter((tr) => tr.x < W + 10 && tr.x + tr.len > -10);

  carTimer -= dt;
  if (carTimer <= 0) {
    spawnCar();
    carTimer = 0.35 + Math.random() * 1.1;
  }
  for (const c of cars) c.x += c.dir * c.v * dt;
  cars = cars.filter((c) => c.x > -30 && c.x < W + 30);

  for (const d of debris) {
    d.x += d.vx * dt;
    d.phase += dt * 3;
    d.y += Math.sin(d.phase) * 3 * dt;
    if (d.x < -4) Object.assign(d, newDebris(false));
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
  const top = railY - 9;
  for (let i = 0; i < tr.n; i++) {
    const cx = Math.floor(tr.x + i * 17);
    ctx.fillStyle = tr.color;
    ctx.fillRect(cx, top, 15, 8);
    ctx.fillStyle = "#0a0e1c";
    ctx.fillRect(cx, top + 2, 15, 1);
    ctx.fillStyle = "#ffd27a";
    for (let k = 0; k < 4; k++) {
      if ((i + k) % 3 !== 0) ctx.fillRect(cx + 2 + k * 3, top + 4, 2, 2);
    }
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(cx, top + 7, 15, 1);
  }
  const front = tr.dir > 0 ? Math.floor(tr.x + tr.len) : Math.floor(tr.x);
  const back = tr.dir > 0 ? Math.floor(tr.x) : Math.floor(tr.x + tr.len);
  ctx.fillStyle = "rgba(255, 240, 200, 0.22)";
  ctx.fillRect(tr.dir > 0 ? front : front - 10, top + 3, 10, 3);
  ctx.fillStyle = "#fff6dc";
  ctx.fillRect(tr.dir > 0 ? front - 1 : front, top + 3, 1, 2);
  ctx.fillStyle = "#ff3b4e";
  ctx.fillRect(tr.dir > 0 ? back : back - 1, top + 6, 1, 1);
}

function drawCar(c) {
  const front = Math.floor(c.dir > 0 ? c.x + c.w : c.x);
  const rear = Math.floor(c.dir > 0 ? c.x : c.x + c.w);
  const x = Math.floor(c.x);
  ctx.fillStyle = c.color;
  ctx.fillRect(x, c.y - 2, c.w, 3);
  ctx.fillRect(Math.floor(x + c.w * 0.25), c.y - 4, Math.floor(c.w * 0.5), 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(Math.floor(x + c.w * 0.3), c.y - 4, Math.floor(c.w * 0.4), 1);

  ctx.fillStyle = "rgba(255, 244, 214, 0.18)";
  ctx.fillRect(Math.min(front, front + c.dir * 12), c.y - 2, 12, 2);
  ctx.fillStyle = "#fff4d6";
  ctx.fillRect(c.dir > 0 ? front - 1 : front, c.y - 1, 1, 1);
  ctx.fillStyle = "#ff3b4e";
  ctx.fillRect(c.dir > 0 ? rear : rear - 1, c.y - 1, 1, 1);
}

function drawRain() {
  ctx.fillStyle = "rgba(190, 210, 255, 0.45)";
  for (const d of rain) {
    for (let i = 0; i < d.len; i++) {
      ctx.fillRect(Math.round(d.x - WIND * i), Math.round(d.y - i), 1, 1);
    }
  }
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
    ctx.fillStyle = `rgba(225, 232, 255, ${(0.35 + 0.5 * Math.abs(Math.sin(t * 0.9 + s.p))).toFixed(2)})`;
    ctx.fillRect(s.x, s.y, 1, 1);
  }

  // Moon, drawn as a pixel disc
  const mx = Math.floor(W * 0.82), my = Math.floor(H * 0.14), mr = 5;
  ctx.fillStyle = "#f3efe0";
  for (let dy = -mr; dy <= mr; dy++) {
    const half = Math.floor(Math.sqrt(mr * mr - dy * dy));
    ctx.fillRect(mx - half, my + dy, half * 2 + 1, 1);
  }

  ctx.fillStyle = "rgba(110, 120, 170, 0.14)";
  for (const c of clouds) {
    ctx.fillRect(Math.floor(c.x), Math.floor(c.y), c.w, 3);
    ctx.fillRect(Math.floor(c.x + 6), Math.floor(c.y) - 2, Math.floor(c.w * 0.5), 2);
  }

  // Buildings, far to near
  for (const layer of layers) ctx.drawImage(layer.canvas, 0, 0);

  // Elevated rail with pillars, then trains
  ctx.fillStyle = "#0c1024";
  for (let px = 0; px < W; px += 45) ctx.fillRect(px, railY + 1, 2, roadY - railY - 1);
  ctx.fillStyle = "#2a3150";
  ctx.fillRect(0, railY, W, 1);
  for (const tr of trains) drawTrain(tr);

  // Street
  ctx.fillStyle = "#1a1d2e";
  ctx.fillRect(0, roadY - 1, W, 1);
  ctx.fillStyle = "#0a0b14";
  ctx.fillRect(0, roadY, W, H - roadY);
  ctx.fillStyle = "rgba(110, 130, 255, 0.08)";
  ctx.fillRect(0, roadY, W, H - roadY);
  ctx.fillStyle = "rgba(255, 210, 120, 0.5)";
  const dashOffset = Math.floor(t * 30) % 16;
  for (let x = -dashOffset; x < W; x += 16) ctx.fillRect(x, Math.floor(roadY + H * 0.105), 8, 1);

  // Street lamps
  for (const lp of lamps) {
    ctx.fillStyle = "rgba(255, 190, 110, 0.08)";
    ctx.beginPath();
    ctx.moveTo(lp.x + 0.5, roadY - 30);
    ctx.lineTo(lp.x - 10, roadY);
    ctx.lineTo(lp.x + 11, roadY);
    ctx.fill();
    ctx.fillStyle = "#0a0d1c";
    ctx.fillRect(lp.x, roadY - 30, 1, 30);
    ctx.fillRect(lp.x - 1, roadY - 31, 3, 1);
    ctx.fillStyle = "#ffd27a";
    ctx.fillRect(lp.x, roadY - 30, 1, 1);
  }

  for (const c of cars) drawCar(c);

  for (const d of debris) {
    ctx.fillStyle = d.color;
    ctx.fillRect(Math.floor(d.x), Math.floor(d.y), d.w, d.h);
  }

  drawRain();

  if (flash > 0) {
    ctx.fillStyle = `rgba(180, 200, 255, ${(0.22 * flash).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------- Desk scene (foreground) ----------
function drawDesk(t) {
  dctx.clearRect(0, 0, DESK_W, DESK_H);
  for (const [x, y, w, h, c] of deskOps(t)) {
    dctx.fillStyle = c;
    dctx.fillRect(x, y, w, h);
  }
}

// ---------- Loop ----------
let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    build();
    if (reduceMotion) {
      draw(0);
    }
  }, 150);
});

build();
drawDesk(0);
if (reduceMotion) {
  draw(0);
} else {
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt);
    draw(now / 1000);
    drawDesk(now / 1000);
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
