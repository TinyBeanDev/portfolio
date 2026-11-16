// Slide deck: one full-screen slide at a time, moving sideways.
// Navigation: arrow keys, Home/End, on-screen buttons and dots, nav links,
// horizontal swipe, and the mouse wheel. The URL hash tracks the current slide.

const deck = document.getElementById("deck");
const slides = Array.from(deck.querySelectorAll(".slide"));
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const dotsEl = document.getElementById("dots");
const counter = document.getElementById("counter");
const navLinks = Array.from(document.querySelectorAll("[data-go]"));

let current = 0;
let lastWheel = 0;

// Build the dot indicators
slides.forEach((slide, i) => {
  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", `Go to ${slide.getAttribute("aria-label")}`);
  btn.addEventListener("click", () => goTo(i));
  li.appendChild(btn);
  dotsEl.appendChild(li);
});
const dotButtons = Array.from(dotsEl.querySelectorAll("button"));

function pad(n) {
  return String(n).padStart(2, "0");
}

function goTo(index, { updateHash = true } = {}) {
  const max = slides.length - 1;
  const i = Math.max(0, Math.min(max, index));
  current = i;

  deck.style.transform = `translateX(${-i * 100}vw)`;

  slides.forEach((slide, idx) => {
    const active = idx === i;
    slide.classList.toggle("is-active", active);
    slide.toggleAttribute("inert", !active);
    slide.setAttribute("aria-hidden", String(!active));
  });

  dotButtons.forEach((btn, idx) => {
    btn.setAttribute("aria-current", String(idx === i));
  });

  prevBtn.disabled = i === 0;
  nextBtn.disabled = i === max;
  counter.textContent = `${pad(i + 1)} / ${pad(slides.length)}`;

  navLinks.forEach((link) => {
    const target = Number(link.dataset.go);
    link.classList.toggle("active", target === i && link.closest(".topbar") !== null);
  });

  if (updateHash) {
    history.replaceState(null, "", `#${slides[i].id}`);
  }
}

function step(delta) {
  goTo(current + delta);
}

// Buttons
prevBtn.addEventListener("click", () => step(-1));
nextBtn.addEventListener("click", () => step(1));

// Nav links and in-slide buttons: jump to their slide
navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    goTo(Number(link.dataset.go));
  });
});

// Keyboard
document.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
    case "PageDown":
      event.preventDefault();
      step(1);
      break;
    case "ArrowLeft":
    case "ArrowUp":
    case "PageUp":
      event.preventDefault();
      step(-1);
      break;
    case "Home":
      event.preventDefault();
      goTo(0);
      break;
    case "End":
      event.preventDefault();
      goTo(slides.length - 1);
      break;
  }
});

// Mouse wheel and trackpad: one slide per gesture, throttled
window.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    const now = performance.now();
    if (now - lastWheel < 700) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) < 12) return;
    lastWheel = now;
    step(delta > 0 ? 1 : -1);
  },
  { passive: false }
);

// Touch swipe (horizontal)
let touchX = null;
let touchY = null;
deck.addEventListener(
  "touchstart",
  (event) => {
    touchX = event.touches[0].clientX;
    touchY = event.touches[0].clientY;
  },
  { passive: true }
);
deck.addEventListener(
  "touchend",
  (event) => {
    if (touchX === null) return;
    const dx = event.changedTouches[0].clientX - touchX;
    const dy = event.changedTouches[0].clientY - touchY;
    touchX = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      step(dx < 0 ? 1 : -1);
    }
  },
  { passive: true }
);

// Start on the slide named in the URL, if any
const fromHash = slides.findIndex((s) => `#${s.id}` === location.hash);
goTo(fromHash >= 0 ? fromHash : 0, { updateHash: false });

window.addEventListener("hashchange", () => {
  const idx = slides.findIndex((s) => `#${s.id}` === location.hash);
  if (idx >= 0 && idx !== current) goTo(idx, { updateHash: false });
});

// Footer year and clock
document.getElementById("year").textContent = new Date().getFullYear();
const clock = document.getElementById("clock");
const tick = () => {
  clock.textContent = new Date().toTimeString().slice(0, 5);
};
tick();
setInterval(tick, 10000);
