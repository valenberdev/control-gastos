// Fija el tema (claro u oscuro) antes del primer pintado, para evitar el parpadeo.
// Va en un archivo propio y no inline para que la política CSP no admita scripts inline.
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
    document.documentElement.dataset.theme = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta)
      meta.setAttribute("content", theme === "light" ? "#E9EDF7" : "#05070F");
  } catch (e) {}
})();
