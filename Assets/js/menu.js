/* ═══════════════════════════════════════════
   menu.js — oulipo.xyz shared menu behavior
   ═══════════════════════════════════════════ */

function toggleMenu() {
  var menu = document.querySelector(".side-menu");
  var overlay = document.querySelector(".menu-overlay");
  var body = document.body;

  menu.classList.toggle("active");
  overlay.classList.toggle("active");
  body.classList.toggle("menu-open");
}

// Close menu on escape key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    var menu = document.querySelector(".side-menu");
    if (menu.classList.contains("active")) {
      toggleMenu();
    }
  }
});

// Hide header and menu toggle on scroll
(function () {
  var siteHeader = document.querySelector(".site-header");
  var menuToggle = document.querySelector(".menu-toggle");

  window.addEventListener("scroll", function () {
    if (window.scrollY > 50) {
      siteHeader.classList.add("hidden");
      menuToggle.classList.add("hidden");
    } else {
      siteHeader.classList.remove("hidden");
      menuToggle.classList.remove("hidden");
    }
  });
})();
