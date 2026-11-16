// Mouse-reactive effects: spotlight, a morphing cursor, card tilt with sheen,
// magnetic buttons and parallax on the background orbs.
// Skipped for reduced motion and touch-only devices.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fineMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// ---------- Cursor shapes ----------
// Each shape is a closed polygon. All shapes are resampled to the same number
// of points so the outline can be interpolated point by point.

const POINTS = 40;

// Shapes are in SVG units, with the pointer position at (0, 0).
const RING = Array.from({ length: 72 }, (_, i) => {
  const a = (i / 72) * Math.PI * 2 - Math.PI / 2;
  return [Math.cos(a) * 15, Math.sin(a) * 15];
});
// Arrow: tip at the origin
const ARROW = [
  [0, 0], [0, 17], [4.5, 12.8], [7.4, 19.4], [10.2, 18.2], [7.3, 11.8], [13.8, 11.8],
];
// Pointing hand: fingertip at the origin
// Index finger raised, the other fingers curled into a fist, thumb out on the left
const HAND = [
  [-2, 0], [2, 0], [2, 9], [4.6, 9.5], [6.4, 11], [7, 13.5], [7, 17], [6.2, 19.5],
  [5, 22.5], [1.5, 24], [-3, 24], [-5.5, 21.5], [-6, 17], [-7, 14], [-5.5, 11.2], [-2, 10.5],
];

function signedArea(poly) {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum;
}

// Resample a closed polygon to n evenly spaced points by perimeter length
function resample(poly, n) {
  const pts = [...poly, poly[0]];
  const seg = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    seg.push(d);
    total += d;
  }
  const out = [];
  for (let k = 0; k < n; k++) {
    let t = (k * total) / n;
    let i = 0;
    while (i < seg.length - 1 && t > seg[i]) {
      t -= seg[i];
      i++;
    }
    const f = seg[i] ? t / seg[i] : 0;
    out.push([
      pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f,
      pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f,
    ]);
  }
  return out;
}

// Same winding for every shape, so morphs don't twist
function prepare(poly) {
  const ref = signedArea(RING);
  const pts = resample(poly, POINTS);
  return signedArea(pts) * ref < 0 ? pts.reverse() : pts;
}

const SHAPE_RING = prepare(RING);
const SHAPE_ARROW = prepare(ARROW);
const SHAPE_HAND = prepare(HAND);

function mix(a, b, t) {
  return a.map((p, i) => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t]);
}

function toPath(pts) {
  return (
    "M" + pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" L") + " Z"
  );
}

function initFx() {
  document.body.classList.add("has-fx");

  const root = document.documentElement;
  const cursor = document.querySelector(".cursor");
  const cursorPath = cursor.querySelector(".cursor-shape");

  // Real pointer position, plus the eased position the cursor trails at
  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let cx = mx;
  let cy = my;

  // Morph stages: ring -> arrow (near a link), arrow -> hand (over a link)
  let toArrow = 0;
  let toHand = 0;

  window.addEventListener(
    "pointermove",
    (event) => {
      mx = event.clientX;
      my = event.clientY;
      root.style.setProperty("--mx", `${mx}px`);
      root.style.setProperty("--my", `${my}px`);
      cursor.classList.add("is-visible");

      // Parallax: orbs drift slightly opposite to the pointer
      const px = mx / window.innerWidth - 0.5;
      const py = my / window.innerHeight - 0.5;
      root.style.setProperty("--ox1", `${px * -90}px`);
      root.style.setProperty("--oy1", `${py * -90}px`);
      root.style.setProperty("--ox2", `${px * -50}px`);
      root.style.setProperty("--oy2", `${py * -50}px`);
      root.style.setProperty("--ox3", `${px * 70}px`);
      root.style.setProperty("--oy3", `${py * 70}px`);
    },
    { passive: true }
  );

  document.addEventListener("pointerleave", () => cursor.classList.remove("is-visible"));

  // Card tilt, magnetic buttons
  const tiltTargets = document.querySelectorAll(".card, .channel, .skills article, .dossier");
  tiltTargets.forEach((el) => {
    el.addEventListener("pointermove", (event) => {
      const rect = el.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      el.style.setProperty("--rx", `${(0.5 - y) * 9}deg`);
      el.style.setProperty("--ry", `${(x - 0.5) * 11}deg`);
      el.style.setProperty("--sx", `${x * 100}%`);
      el.style.setProperty("--sy", `${y * 100}%`);
      el.style.setProperty("--sheen", "1");
    });
    el.addEventListener("pointerleave", () => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--sheen", "0");
    });
  });

  const magnetic = document.querySelectorAll(".btn, .arrow");
  magnetic.forEach((el) => {
    el.addEventListener("pointermove", (event) => {
      const rect = el.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      el.style.setProperty("--bx", `${dx * 0.25}px`);
      el.style.setProperty("--by", `${dy * 0.25}px`);
    });
    el.addEventListener("pointerleave", () => {
      el.style.setProperty("--bx", "0px");
      el.style.setProperty("--by", "0px");
    });
  });

  // Cursor
  const clickables = Array.from(document.querySelectorAll("a, button"));
  const APPROACH_RANGE = 90; // px from an element's edge where the morph starts

  const distanceTo = (el, x, y) => {
    const r = el.getBoundingClientRect();
    const dx = Math.max(r.left - x, 0, x - r.right);
    const dy = Math.max(r.top - y, 0, y - r.bottom);
    return Math.hypot(dx, dy);
  };

  let lastPath = "";
  const animate = () => {
    cx += (mx - cx) * 0.2;
    cy += (my - cy) * 0.2;

    // Distance is measured from the real pointer, so the hand snaps on
    let nearest = Infinity;
    for (const el of clickables) {
      nearest = Math.min(nearest, distanceTo(el, mx, my));
      if (nearest === 0) break;
    }
    const near = Math.max(0, Math.min(1, 1 - nearest / APPROACH_RANGE));
    const targetArrow = near * near * (3 - 2 * near);
    const targetHand = nearest === 0 ? 1 : 0;
    toArrow += (targetArrow - toArrow) * 0.25;
    toHand += (targetHand - toHand) * 0.3;

    const shape = mix(mix(SHAPE_RING, SHAPE_ARROW, toArrow), SHAPE_HAND, toHand);
    const path = toPath(shape);
    if (path !== lastPath) {
      cursorPath.setAttribute("d", path);
      lastPath = path;
    }
    // The fill appears as the outline takes on the pointer shape
    cursorPath.style.fillOpacity = Math.max(toArrow, toHand).toFixed(3);

    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(animate);
  };
  animate();
}

// Start last, once the shape constants above are initialised
if (!reduceMotion && fineMouse) {
  initFx();
}
