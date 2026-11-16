// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Live clock in header
const clock = document.getElementById("clock");
const tick = () => {
  const d = new Date();
  clock.textContent = d.toTimeString().slice(0, 8) + " LOCAL";
};
tick();
setInterval(tick, 1000);

// Count up [data-count] readouts once they scroll into view
const counters = document.querySelectorAll("[data-count]");
const countObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count);
      const start = performance.now();
      const dur = 900;
      const step = (now) => {
        const t = Math.min((now - start) / dur, 1);
        el.textContent = String(Math.round(target * t)).padStart(2, "0");
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
