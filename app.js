/* =========================
   Simple Habits MVP
   - Folders -> Sheets -> Calendar checks per day
   - Dashboard pie shows today's completion across ALL sheets
   - Storage: localStorage
========================= */

const STORAGE_KEY = "habitAppData_v1";

const $ = (sel) => document.querySelector(sel);

const state = {
  data: loadData(),
  route: { view: "dashboard", folderId: null, sheetId: null },
  monthCursor: new Date(), // used for calendar view
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtMonthTitle(d) {
  const months = [
    "januari","februari","maart","april","mei","juni",
    "juli","augustus","september","oktober","november","december"
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function daysInMonth(d) {
  return endOfMonth(d).getDate();
}

// Monday-first weekday index (Mon=0..Sun=6)
function weekdayIndexMonFirst(date) {
  const js = date.getDay(); // Sun=0..Sat=6
  return (js + 6) % 7;
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { folders: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { folders: [] };
    if (!Array.isArray(parsed.folders)) parsed.folders = [];
    return parsed;
  } catch {
    return { folders: [] };
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function findFolder(folderId) {
  return state.data.folders.find(f => f.id === folderId) || null;
}
function findSheet(folderId, sheetId) {
  const folder = findFolder(folderId);
  if (!folder) return null;
  return folder.sheets.find(s => s.id === sheetId) || null;
}

function allSheets() {
  const out = [];
  for (const f of state.data.folders) {
    for (const s of f.sheets) out.push({ folder: f, sheet: s });
  }
  return out;
}

/* =========================
   CRUD actions
========================= */

function addFolder(name) {
  state.data.folders.push({
    id: uid(),
    name,
    open: true,
    sheets: [],
  });
  saveData();
  render();
}

function renameFolder(folderId, name) {
  const folder = findFolder(folderId);
  if (!folder) return;
  folder.name = name;
  saveData();
  render();
}

function deleteFolder(folderId) {
  state.data.folders = state.data.folders.filter(f => f.id !== folderId);
  // if we were inside it, go dashboard
  if (state.route.folderId === folderId) {
    state.route = { view: "dashboard", folderId: null, sheetId: null };
  }
  saveData();
  render();
}

function toggleFolderOpen(folderId) {
  const folder = findFolder(folderId);
  if (!folder) return;
  folder.open = !folder.open;
  saveData();
  renderSidebar();
}

function addSheet(folderId, name) {
  const folder = findFolder(folderId);
  if (!folder) return;
  folder.sheets.push({
    id: uid(),
    name,
    checks: {}, // { "YYYY-MM-DD": true }
  });
  saveData();
  render();
}

function renameSheet(folderId, sheetId, name) {
  const sheet = findSheet(folderId, sheetId);
  if (!sheet) return;
  sheet.name = name;
  saveData();
  render();
}

function deleteSheet(folderId, sheetId) {
  const folder = findFolder(folderId);
  if (!folder) return;
  folder.sheets = folder.sheets.filter(s => s.id !== sheetId);

  if (state.route.sheetId === sheetId && state.route.folderId === folderId) {
    state.route = { view: "dashboard", folderId: null, sheetId: null };
  }
  saveData();
  render();
}

function toggleCheck(folderId, sheetId, isoDate) {
  const sheet = findSheet(folderId, sheetId);
  if (!sheet) return;
  sheet.checks[isoDate] = !sheet.checks[isoDate];
  if (!sheet.checks[isoDate]) delete sheet.checks[isoDate];
  saveData();
  render(); // updates dashboard too
}

/* =========================
   Routing + Rendering
========================= */

function goDashboard() {
  state.route = { view: "dashboard", folderId: null, sheetId: null };
  render();
}

function openSheet(folderId, sheetId) {
  state.route = { view: "sheet", folderId, sheetId };
  state.monthCursor = new Date(); // reset to current month when opening
  render();
}

function setBreadcrumbs() {
  const el = $("#breadcrumbs");
  if (state.route.view === "dashboard") {
    el.innerHTML = `<b>Dashboard</b> <span class="muted">— overzicht vandaag</span>`;
    return;
  }
  const folder = findFolder(state.route.folderId);
  const sheet = findSheet(state.route.folderId, state.route.sheetId);
  el.innerHTML = `
    <span class="muted">Mapje</span> <b>${escapeHtml(folder?.name || "")}</b>
    <span class="muted">/</span>
    <span class="muted">Sheet</span> <b>${escapeHtml(sheet?.name || "")}</b>
  `;
}

function render() {
  renderSidebar();
  setBreadcrumbs();

  const view = $("#view");
  if (state.route.view === "dashboard") {
    view.innerHTML = renderDashboardHTML();
    drawDashboardPie();
    return;
  }

  if (state.route.view === "sheet") {
    view.innerHTML = renderSheetHTML();
    return;
  }
}

function renderSidebar() {
  const nav = $("#sidebarNav");
  nav.innerHTML = "";

  if (state.data.folders.length === 0) {
    nav.innerHTML = `
      <div class="card">
        <h2>Geen mapjes</h2>
        <div class="muted">Klik op <b>+</b> om je eerste mapje te maken (bv. fitness).</div>
      </div>
    `;
    return;
  }

  for (const folder of state.data.folders) {
    const folderEl = document.createElement("div");
    folderEl.className = "folder";

    const head = document.createElement("div");
    head.className = "folder-head";

    head.innerHTML = `
      <div class="folder-title">
        <span class="chev">${folder.open ? "▼" : "▶"}</span>
        <span>📁 ${escapeHtml(folder.name)}</span>
      </div>
      <div class="folder-actions">
        <button class="small-btn" title="Nieuwe sheet" data-action="add-sheet" data-folder="${folder.id}">+</button>
        <button class="small-btn" title="Mapje hernoemen" data-action="rename-folder" data-folder="${folder.id}">✎</button>
        <button class="small-btn" title="Mapje verwijderen" data-action="delete-folder" data-folder="${folder.id}">🗑</button>
      </div>
    `;

    head.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) {
        toggleFolderOpen(folder.id);
      }
    });

    folderEl.appendChild(head);

    const sheetsWrap = document.createElement("div");
    sheetsWrap.className = "sheets";
    sheetsWrap.style.display = folder.open ? "flex" : "none";

    if (!folder.sheets || folder.sheets.length === 0) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.style.padding = "6px 10px 10px 10px";
      empty.textContent = "Nog geen sheets. Klik op +.";
      sheetsWrap.appendChild(empty);
    } else {
      for (const sheet of folder.sheets) {
        const row = document.createElement("div");
        row.className = "sheet";

        const isActive = (state.route.view === "sheet"
          && state.route.folderId === folder.id
          && state.route.sheetId === sheet.id);

        if (isActive) row.classList.add("active");

        const doneToday = !!sheet.checks[todayISO()];
        row.innerHTML = `
          <div class="sheet-name">🗒 ${escapeHtml(sheet.name)}</div>
          <div class="sheet-meta">${doneToday ? "✅ vandaag" : ""}</div>
        `;

        row.addEventListener("click", () => openSheet(folder.id, sheet.id));
        row.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          sheetContextMenu(folder.id, sheet.id);
        });

        sheetsWrap.appendChild(row);
      }
    }

    folderEl.appendChild(sheetsWrap);
    nav.appendChild(folderEl);
  }

  // wire folder action buttons (event delegation)
  nav.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const folderId = btn.dataset.folder;

      if (action === "add-sheet") {
        const name = prompt("Naam van sheet (bv. sporten):");
        if (name && name.trim()) addSheet(folderId, name.trim());
      }
      if (action === "rename-folder") {
        const folder = findFolder(folderId);
        const name = prompt("Nieuwe naam mapje:", folder?.name || "");
        if (name && name.trim()) renameFolder(folderId, name.trim());
      }
      if (action === "delete-folder") {
        const folder = findFolder(folderId);
        const ok = confirm(`Mapje "${folder?.name || ""}" verwijderen (incl. sheets)?`);
        if (ok) deleteFolder(folderId);
      }
    });
  });
}

function sheetContextMenu(folderId, sheetId) {
  const sheet = findSheet(folderId, sheetId);
  if (!sheet) return;

  const choice = prompt(
`Sheet opties:
1 = Hernoemen
2 = Verwijderen

Typ 1 of 2:`
  );

  if (choice === "1") {
    const name = prompt("Nieuwe naam sheet:", sheet.name);
    if (name && name.trim()) renameSheet(folderId, sheetId, name.trim());
  } else if (choice === "2") {
    const ok = confirm(`Sheet "${sheet.name}" verwijderen?`);
    if (ok) deleteSheet(folderId, sheetId);
  }
}

/* =========================
   Dashboard
========================= */

function computeTodayStats() {
  const iso = todayISO();
  const sheets = allSheets();
  const total = sheets.length;
  const done = sheets.filter(x => !!x.sheet.checks[iso]).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { iso, total, done, percent };
}

function renderDashboardHTML() {
  const { iso, total, done, percent } = computeTodayStats();

  return `
    <div class="card-grid">
      <div class="card">
        <h2>Vandaag (${iso})</h2>
        <div class="big">${percent}%</div>
        <div class="muted">${done} van ${total} gewoontes voltooid</div>
        <div style="height:10px"></div>

        <div class="pie-wrap">
          <canvas id="pie" width="180" height="180"></canvas>
          <div class="legend">
            <div class="pill"><span class="dot" style="background: var(--good)"></span> Done: <b>${done}</b></div>
            <div class="pill"><span class="dot" style="background: rgba(255,255,255,0.18)"></span> Over: <b>${Math.max(0, total - done)}</b></div>
          </div>
        </div>

        <div style="height:12px"></div>
        <div class="muted">
          Tip: maak een mapje (folder) en voeg sheets toe. Elke sheet telt mee als 1 “gewoonte” voor het dagpercentage.
        </div>
      </div>

      <div class="card">
        <h2>Overzicht</h2>
        ${renderDashboardList()}
      </div>
    </div>
  `;
}

function renderDashboardList() {
  const iso = todayISO();
  const sheets = allSheets();

  if (sheets.length === 0) {
    return `<div class="muted">Nog geen sheets. Maak eerst een mapje en voeg sheets toe.</div>`;
  }

  const rows = sheets.map(({folder, sheet}) => {
    const done = !!sheet.checks[iso];
    return `
      <div class="pill" style="justify-content:space-between;">
        <span>${escapeHtml(folder.name)} / <b>${escapeHtml(sheet.name)}</b></span>
        <span>${done ? "✅" : "⬜"}</span>
      </div>
    `;
  }).join("");

  return `<div style="display:flex; flex-direction:column; gap:8px;">${rows}</div>`;
}

function drawDashboardPie() {
  const canvas = $("#pie");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const { total, done } = computeTodayStats();
  const frac = total === 0 ? 0 : done / total;

  const w = canvas.width, h = canvas.height;
  const cx = w/2, cy = h/2;
  const r = Math.min(w,h)/2 - 14;

  ctx.clearRect(0,0,w,h);

  // background ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 18;
  ctx.stroke();

  // done arc
  const start = -Math.PI/2;
  const end = start + Math.PI*2*frac;

  ctx.beginPath();
  ctx.arc(cx, cy, r, start, end);
  ctx.strokeStyle = "rgba(74,222,128,0.95)";
  ctx.lineWidth = 18;
  ctx.lineCap = "round";
  ctx.stroke();

  // center text
  ctx.fillStyle = "rgba(233,238,247,0.95)";
  ctx.font = "800 22px ui-sans-serif, system-ui";
  const pct = total === 0 ? "0%" : `${Math.round(frac*100)}%`;
  const tw = ctx.measureText(pct).width;
  ctx.fillText(pct, cx - tw/2, cy + 8);
}

/* =========================
   Sheet (Calendar)
========================= */

function renderSheetHTML() {
  const folder = findFolder(state.route.folderId);
  const sheet = findSheet(state.route.folderId, state.route.sheetId);
  if (!folder || !sheet) {
    state.route = { view: "dashboard", folderId: null, sheetId: null };
    return renderDashboardHTML();
  }

  const d = state.monthCursor;
  const monthStart = startOfMonth(d);
  const days = daysInMonth(d);
  const offset = weekdayIndexMonFirst(monthStart);

  const weekdays = ["Ma","Di","Wo","Do","Vr","Za","Zo"].map(w => `<div class="weekday">${w}</div>`).join("");

  // build 6-week grid (42 cells) so layout stays stable
  const cells = [];
  const firstCellDate = new Date(monthStart);
  firstCellDate.setDate(1 - offset); // may be previous month

  for (let i=0; i<42; i++) {
    const cellDate = new Date(firstCellDate);
    cellDate.setDate(firstCellDate.getDate() + i);

    const iso = cellDate.toISOString().slice(0,10);
    const inMonth = cellDate.getMonth() === d.getMonth();
    const done = !!sheet.checks[iso];
    const isToday = iso === todayISO();

    cells.push(`
      <div class="day ${inMonth ? "" : "off"} ${isToday ? "today" : ""}"
           data-iso="${iso}">
        <div class="top">
          <div>${cellDate.getDate()}</div>
          <div class="badge ${done ? "done" : ""}">${done ? "✓" : ""}</div>
        </div>
        <div class="muted" style="font-size:12px;">${done ? "gedaan" : "niet gedaan"}</div>
      </div>
    `);
  }

  const monthTitle = fmtMonthTitle(d);

  const monthStats = computeMonthStats(sheet, d);
  const todayDone = !!sheet.checks[todayISO()];

  return `
    <div class="card">
      <div class="cal-header">
        <div>
          <div class="cal-title">${escapeHtml(sheet.name)}</div>
          <div class="muted">
            ${escapeHtml(folder.name)} · Vandaag: ${todayDone ? "✅ gedaan" : "⬜ niet gedaan"} ·
            Deze maand: <b>${monthStats.done}/${monthStats.total}</b> dagen gedaan
          </div>
        </div>
        <div class="cal-nav">
          <button class="btn" id="prevMonthBtn">←</button>
          <button class="btn" id="nextMonthBtn">→</button>
        </div>
      </div>

      <div class="muted" style="margin-bottom:10px;">${monthTitle} · klik op een dag om te togglen</div>

      <div class="cal-grid">
        ${weekdays}
        ${cells.join("")}
      </div>

      <div style="height:10px"></div>
      <div class="muted" style="font-size:12px;">
        Tip: rechtsklik (of long-press op mobiel) op sheet in sidebar voor hernoemen/verwijderen.
      </div>
    </div>
  `;
}

function computeMonthStats(sheet, cursorDate) {
  const start = startOfMonth(cursorDate);
  const end = endOfMonth(cursorDate);
  const total = end.getDate();
  let done = 0;

  for (let day=1; day<=total; day++) {
    const d = new Date(start.getFullYear(), start.getMonth(), day);
    const iso = d.toISOString().slice(0,10);
    if (sheet.checks[iso]) done++;
  }
  return { done, total };
}

/* =========================
   Export / Import
========================= */

function exportJSON() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "habits-export.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importJSONFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.folders)) {
        alert("Ongeldig JSON-bestand.");
        return;
      }
      // minimal normalize
      for (const f of parsed.folders) {
        if (!f.id) f.id = uid();
        if (!Array.isArray(f.sheets)) f.sheets = [];
        if (typeof f.open !== "boolean") f.open = true;
        for (const s of f.sheets) {
          if (!s.id) s.id = uid();
          if (!s.checks || typeof s.checks !== "object") s.checks = {};
        }
      }
      state.data = parsed;
      saveData();
      render();
      alert("Import gelukt!");
    } catch {
      alert("Kon JSON niet lezen.");
    }
  };
  reader.readAsText(file);
}

/* =========================
   Events
========================= */

function wireGlobalEvents() {
  $("#addFolderBtn").addEventListener("click", () => {
    const name = prompt("Naam van mapje (bv. fitness):");
    if (name && name.trim()) addFolder(name.trim());
  });

  $("#goDashboardBtn").addEventListener("click", goDashboard);

  $("#todayBtn").addEventListener("click", () => {
    if (state.route.view === "sheet") {
      state.monthCursor = new Date();
      render();
    } else {
      // dashboard just rerender
      render();
    }
  });

  $("#exportBtn").addEventListener("click", exportJSON);

  $("#importBtn").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importJSONFile(file);
    e.target.value = "";
  });

  // calendar interactions (event delegation)
  $("#view").addEventListener("click", (e) => {
    if (state.route.view !== "sheet") return;

    const prevBtn = e.target.closest("#prevMonthBtn");
    const nextBtn = e.target.closest("#nextMonthBtn");
    if (prevBtn) {
      const d = state.monthCursor;
      state.monthCursor = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      render();
      return;
    }
    if (nextBtn) {
      const d = state.monthCursor;
      state.monthCursor = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      render();
      return;
    }

    const day = e.target.closest(".day");
    if (!day) return;

    const iso = day.dataset.iso;
    toggleCheck(state.route.folderId, state.route.sheetId, iso);
  });
}

/* =========================
   Helpers
========================= */

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   Init
========================= */

wireGlobalEvents();
render();