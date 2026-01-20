// app.js - entry point
// Adds light/dark toggle + persistence, then boots the app.

const THEME_KEY = "habits_theme"; // "dark" | "light"

function applyTheme(theme) {
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);

  const btn = document.getElementById("themeBtn");
  if (btn) {
    // Keep it simple + fun
    btn.textContent = t === "light" ? "☀️" : "🌙";
    btn.title = t === "light" ? "Switch to dark mode" : "Switch to light mode";
    btn.setAttribute("aria-label", btn.title);
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") {
    applyTheme(saved);
    return;
  }

  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)")?.matches;
  applyTheme(prefersLight ? "light" : "dark");
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "light" ? "dark" : "light";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  const btn = document.getElementById("themeBtn");
  if (btn) btn.addEventListener("click", toggleTheme);
});

// Boot your app exactly like before:
import "./js/main.js";