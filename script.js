// Pixel sprites: each map is a grid of single characters, one per pixel.
// Legend: '.' = empty, other characters map to the palette below.
const PALETTE = {
  k: "#0b0b1a", // outline
  w: "#f4f1de", // highlight
  y: "#ffd23f", // gold
  o: "#ff9f1c", // orange
  r: "#ff4d6d", // red
  c: "#4cc9f0", // cyan
  b: "#3a86ff", // blue
  g: "#56cf8a", // green
  s: "#8d99ae", // grey
};

const SPRITES = {
  coin: [
    "..kkkk..",
    ".kyyyyk.",
    "kyyyywyk",
    "kyyyyyyk",
    "kyyyyyyk",
    "kyyyyyyk",
    ".kyyyyk.",
    "..kkkk..",
  ],
  star: [
    "....y....",
    "...yyy...",
    "yyyyyyyyy",
    ".yyyyyyy.",
    "..yyyyy..",
    "..yy.yy..",
    ".yy...yy.",
    ".y.....y.",
  ],
  heart: [
    ".rr...rr.",
    "rrrr.rrrr",
    "rwrrrrrrr",
    "rrrrrrrrr",
    ".rrrrrrr.",
    "..rrrrr..",
    "...rrr...",
    "....r....",
  ],
  bolt: [
    "....yyy..",
    "...yyy...",
    "..yyy....",
    ".yyyyyyy.",
    "....yyy..",
    "...yyy...",
    "..yy.....",
    ".y.......",
  ],
  gem: [
    "..ccccc..",
    ".cwccccc.",
    "ccccccccc",
    ".ccccccc.",
    "..ccccc..",
    "...ccc...",
    "....c....",
  ],
  ship: [
    ".....w.....",
    "....www....",
    "....wcw....",
    "...wwwww...",
    "..wwwwwww..",
    "wwwwwwwwwww",
    "wwwbbbbbwww",
    "..bbbbbbb..",
    "...oo.oo...",
    "....o.o....",
  ],
  monitor: [
    "kkkkkkkkkkkk",
    "kccccccccck.",
    "kcwccccccck.",
    "kcccccccccck",
    "kccccccccccck",
    "kcccccccccck",
    "kkkkkkkkkkkk",
    "....kkkk....",
    "...kkkkkk...",
  ],
};

// Render each sprite placeholder as a crisp SVG built from rects.
document.querySelectorAll("[data-sprite]").forEach((el) => {
  const map = SPRITES[el.dataset.sprite];
  if (!map) return;
  const h = map.length;
  const w = Math.max(...map.map((row) => row.length));
  const rects = [];
  map.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = PALETTE[ch];
      if (color) rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`);
    });
  });
  el.innerHTML =
    `<svg viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${rects.join("")}</svg>`;
});

// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Clock
const clock = document.getElementById("clock");
const tick = () => {
  clock.textContent = new Date().toTimeString().slice(0, 8);
};
tick();
setInterval(tick, 1000);

// Count up [data-count] readouts when visible
const counters = document.querySelectorAll("[data-count]");
const countObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count);
      const start = performance.now();
      const step = (now) => {
        const t = Math.min((now - start) / 900, 1);
        el.textContent = String(Math.round(target * t)).padStart(4, "0");
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      countObserver.unobserve(el);
    });
  },
  { threshold: 0.6 }
);
counters.forEach((el) => countObserver.observe(el));

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
