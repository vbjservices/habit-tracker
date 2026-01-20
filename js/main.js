import {
  loadData,
  saveData,
  addFolder,
  renameFolder,
  deleteFolder,
  toggleFolderOpen,
  addSheet,
  toggleCheck,
  exportJSON,
  importJSONFile,
} from "./store.js";

import { todayISOAmsterdam, addMonths } from "./time.js";
import {
  renderSidebar,
  renderDashboard,
  renderSheet,
  renderFolderOverview,
  setBreadcrumbs,
  setTopRightButton
} from "./ui.js";

const $ = (sel) => document.querySelector(sel);

const app = {
  data: loadData(),
  route: { view: "dashboard", folderId: null, sheetId: null },
  monthCursor: new Date(),
  lastIso: null,

  dashboardRange: "1D",
};

function persist() {
  saveData(app.data);
}

function isMobile() {
  return window.matchMedia("(max-width: 980px)").matches;
}

/* ===== Sidebar drawer ===== */
function openSidebar() {
  const sidebar = $("#sidebar");
  const overlay = $("#sidebarOverlay");
  if (!sidebar || !overlay) return;

  sidebar.classList.add("open");
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  const sidebar = $("#sidebar");
  const overlay = $("#sidebarOverlay");
  if (!sidebar || !overlay) return;

  sidebar.classList.remove("open");
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function toggleSidebarDrawer() {
  const sidebar = $("#sidebar");
  if (!sidebar) return;
  sidebar.classList.contains("open") ? closeSidebar() : openSidebar();
}

function closeSidebarIfMobile() {
  if (isMobile()) closeSidebar();
}

/* ===== Routing ===== */
function goDashboard() {
  app.route = { view: "dashboard", folderId: null, sheetId: null };
  render();
  closeSidebarIfMobile();
}

function openSheetRoute(folderId, sheetId) {
  app.route = { view: "sheet", folderId, sheetId };
  app.monthCursor = new Date();
  render();
  closeSidebarIfMobile();
}

function openFolderRoute(folderId) {
  app.route = { view: "folder", folderId, sheetId: null };
  app.monthCursor = new Date();
  render();
  closeSidebarIfMobile();
}

/* ===== Render pipeline ===== */
function render() {
  renderSidebar(app.route, app.data);
  setBreadcrumbs(app.route, app.data);
  setTopRightButton(app.route);

  if (app.route.view === "dashboard") {
    renderDashboard(app.data, app.dashboardRange);
    return;
  }

  if (app.route.view === "folder") {
    renderFolderOverview(app.route, app.data, app.monthCursor);
    return;
  }

  renderSheet(app.route, app.data, app.monthCursor);
}

/* ===== Events ===== */
function wireEvents() {
  const required = ["#sidebar", "#sidebarOverlay", "#menuBtn", "#brandBtn", "#addFolderBtn", "#topRightBtn", "#view", "#sidebarNav"];
  for (const sel of required) {
    if (!$(sel)) console.error("Missing required element:", sel);
  }

  $("#menuBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    toggleSidebarDrawer();
  });

  $("#sidebarOverlay")?.addEventListener("click", (e) => {
    e.preventDefault();
    closeSidebar();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSidebar();
  });

  window.addEventListener("resize", () => {
    if (!isMobile()) {
      closeSidebar();
      document.body.style.overflow = "";
    }
  });

  $("#brandBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    goDashboard();
  });

  $("#addFolderBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    const name = prompt("Naam van mapje (bv. fitness):");
    if (!name || !name.trim()) return;
    addFolder(app.data, name.trim());
    persist();
    render();
  });

  $("#topRightBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (app.route.view !== "dashboard") {
      goDashboard();
      return;
    }
    render();
  });

  $("#exportBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    exportJSON(app.data);
  });

  $("#importBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    $("#importFile")?.click();
  });

  $("#importFile")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importJSONFile(file, (parsed) => {
      app.data = parsed;
      persist();
      render();
      alert("Import gelukt!");
    });
    e.target.value = "";
  });

  // Sidebar delegation
  $("#sidebarNav")?.addEventListener("click", (e) => {
    // Folder collapse/expand (chevron button)
    const toggleBtn = e.target.closest("[data-toggle-folder='1']");
    if (toggleBtn) {
      e.preventDefault();
      e.stopPropagation();
      const folderId = toggleBtn.dataset.folder;
      toggleFolderOpen(app.data, folderId);
      persist();
      render();
      return;
    }

    // Folder actions buttons (add/rename/delete)
    const btn = e.target.closest("button[data-action]");
    if (btn) {
      e.preventDefault();
      e.stopPropagation();

      const action = btn.dataset.action;
      const folderId = btn.dataset.folder;

      if (action === "add-sheet") {
        const name = prompt("Naam van sheet (bv. joggen):");
        if (name && name.trim()) {
          addSheet(app.data, folderId, name.trim());
          persist();
          render();
        }
      }

      if (action === "rename-folder") {
        const folder = app.data.folders.find(f => f.id === folderId);
        const name = prompt("Nieuwe naam mapje:", folder?.name || "");
        if (name && name.trim()) {
          renameFolder(app.data, folderId, name.trim());
          persist();
          render();
        }
      }

      if (action === "delete-folder") {
        const folder = app.data.folders.find(f => f.id === folderId);
        const ok = confirm(`Mapje "${folder?.name || ""}" verwijderen (incl. sheets)?`);
        if (ok) {
          const wasInside = app.route.folderId === folderId;
          deleteFolder(app.data, folderId);
          persist();
          if (wasInside) goDashboard();
          else render();
        }
      }
      return;
    }

    // Open folder overview when clicking folder head (not the toggle button)
    const folderHead = e.target.closest("[data-folder-head='1']");
    if (folderHead) {
      const folderId = folderHead.dataset.folder;
      openFolderRoute(folderId);
      return;
    }

    // Open sheet
    const sheetRow = e.target.closest(".sheet[data-open-sheet='1']");
    if (sheetRow) {
      const folderId = sheetRow.dataset.folder;
      const sheetId = sheetRow.dataset.sheet;
      openSheetRoute(folderId, sheetId);
      return;
    }
  });

  // Main view delegation
  $("#view")?.addEventListener("click", (e) => {
    // Dashboard range selector
    const rangeBtn = e.target.closest("[data-range]");
    if (rangeBtn && app.route.view === "dashboard") {
      app.dashboardRange = rangeBtn.dataset.range;
      render();
      return;
    }

    // Month navigation (sheet + folder)
    const prev = e.target.closest("#prevMonthBtn");
    const next = e.target.closest("#nextMonthBtn");
    if (prev && (app.route.view === "sheet" || app.route.view === "folder")) {
      app.monthCursor = addMonths(app.monthCursor, -1);
      render();
      return;
    }
    if (next && (app.route.view === "sheet" || app.route.view === "folder")) {
      app.monthCursor = addMonths(app.monthCursor, 1);
      render();
      return;
    }

    // Folder overview cell toggle
    const fvCell = e.target.closest(".fv-cell");
    if (fvCell && app.route.view === "folder") {
      const folderId = fvCell.dataset.folder;
      const sheetId = fvCell.dataset.sheet;
      const isoKey = fvCell.dataset.iso;
      toggleCheck(app.data, folderId, sheetId, isoKey);
      persist();
      render();
      return;
    }

    // Sheet day toggle
    const day = e.target.closest(".day");
    if (day && app.route.view === "sheet") {
      const isoKey = day.dataset.iso;
      toggleCheck(app.data, app.route.folderId, app.route.sheetId, isoKey);
      persist();
      render();
      return;
    }
  });
}

/* ===== Auto day rollover (Amsterdam TZ) ===== */
function startAutoDayRollover() {
  app.lastIso = todayISOAmsterdam();

  setInterval(() => {
    const iso = todayISOAmsterdam();
    if (iso !== app.lastIso) {
      app.lastIso = iso;
      render();
    }
  }, 10_000);
}

/* ===== Init ===== */
document.addEventListener("DOMContentLoaded", () => {
  wireEvents();
  render();
  startAutoDayRollover();
});