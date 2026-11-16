// Mouse-reactive effects: spotlight, custom cursor, card tilt with sheen,
// magnetic buttons and parallax orbs. Skipped for reduced motion and touch.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fineMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if (!reduceMotion && fineMouse) {
  initFx();
}

function initFx() {
  document.body.classList.add("has-fx");

  const root = document.documentElement;
  const cursor = document.querySelector(".cursor");

  // Current and eased cursor position (the ring trails the pointer slightly)
  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let cx = mx;
  let cy = my;

  window.addEventListener(
    "pointermove",
    (event) => {
      mx = event.clientX;
      my = event.clientY;
      root.style.setProperty("--mx", `${mx}px`);
      root.style.setProperty("--my", `${my}px`);
      cursor.classList.add("is-visible");

      // Parallax: orbs drift opposite to the pointer
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

  // Ring grows over interactive elements
  const interactive = "a, button, .dots button";
  document.addEventListener("pointerover", (event) => {
    cursor.classList.toggle("is-hover", Boolean(event.target.closest(interactive)));
  });

  const animate = () => {
    cx += (mx - cx) * 0.2;
    cy += (my - cy) * 0.2;
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(animate);
  };
  animate();

  // Tilt panels toward the pointer, with a sheen that follows it
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

  // Magnetic buttons pull gently toward the pointer
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
}
