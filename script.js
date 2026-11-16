// Set current year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// Highlight the nav link for the section currently in view
const sections = document.querySelectorAll("main section[id]");
const navLinks = document.querySelectorAll("nav a");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((link) => {
          link.style.color =
            link.getAttribute("href") === `#${entry.target.id}` ? "var(--text)" : "";
        });
      }
    });
  },
  { rootMargin: "-50% 0px -50% 0px" }
);

sections.forEach((section) => observer.observe(section));
