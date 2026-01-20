import { allSheets, findFolder, getCheckValue } from "./store.js";
import { todayISOAmsterdam, daysInMonth, pad2 } from "./time.js";

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function isoToDMY(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/* ========= Dashboard range helpers ========= */
function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function formatISODateUTC(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function getRangeKeys(range) {
  const today = todayISOAmsterdam();
  const t = parseISODate(today);

  let days = 1;
  if (range === "7D") days = 7;
  if (range === "14D") days = 14;
  if (range === "21D") days = 21;
  if (range === "1M") days = 30;

  const keys = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(t);
    d.setUTCDate(t.getUTCDate() - i);
    keys.push(formatISODateUTC(d));
  }
  return keys;
}

/* ===== Top UI ===== */

export function setBreadcrumbs(route, data) {
  const el = document.querySelector("#breadcrumbs");
  if (!el) return;

  if (route.view === "dashboard") {
    el.innerHTML = `<b>Dashboard</b> <span class="muted">— today overview</span>`;
    return;
  }

  if (route.view === "folder") {
    const folder = findFolder(data, route.folderId);
    el.innerHTML = `
      <span class="muted">Folder</span> <b>${escapeHtml(folder?.name || "")}</b>
      <span class="muted">/</span>
      <b>Overview</b>
    `;
    return;
  }

  el.innerHTML = `<b>Dashboard</b>`;
}

export function setTopRightButton(route) {
  const btn = document.querySelector("#topRightBtn");
  if (!btn) return;

  if (route.view === "dashboard") {
    btn.textContent = "Today";
    btn.title = "Refresh";
    btn.setAttribute("aria-label", "Refresh");
  } else {
    btn.textContent = "🏠 Home";
    btn.title = "Back to dashboard";
    btn.setAttribute("aria-label", "Back to dashboard");
  }
}

/* ===== Sidebar ===== */

export function renderSidebar(route, data) {
  const nav = document.querySelector("#sidebarNav");
  if (!nav) return;

  nav.innerHTML = "";

  if (data.folders.length === 0) {
    nav.innerHTML = `
      <div class="card">
        <h2>No folders</h2>
        <div class="muted">Click <b>+</b> to create your first folder.</div>
      </div>
    `;
    return;
  }

  for (const folder of data.folders) {
    const folderEl = document.createElement("div");
    folderEl.className = "folder";
    folderEl.setAttribute("data-folder", folder.id);
    folderEl.setAttribute("data-dnd-folder", "1");

    const head = document.createElement("div");
    head.className = "folder-head";
    head.setAttribute("data-folder-head", "1");
    head.setAttribute("data-folder", folder.id);

    head.innerHTML = `
      <div class="folder-title" style="min-width:0;">
        <button
          type="button"
          class="small-btn"
          style="width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;"
          title="${folder.open ? "Collapse" : "Expand"}"
          aria-label="${folder.open ? "Collapse" : "Expand"}"
          data-toggle-folder="1"
          data-folder="${folder.id}"
        >${folder.open ? "▼" : "▶"}</button>

        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          📁 ${escapeHtml(folder.name)}
        </span>
      </div>
      <div class="folder-actions">
        <button class="small-btn" title="New habit" aria-label="New habit" data-action="add-sheet" data-folder="${folder.id}">+</button>
        <button class="small-btn" title="Rename folder" aria-label="Rename folder" data-action="rename-folder" data-folder="${folder.id}">✎</button>
        <button class="small-btn" title="Delete folder" aria-label="Delete folder" data-action="delete-folder" data-folder="${folder.id}">🗑</button>
      </div>
    `;

    folderEl.appendChild(head);

    const sheetsWrap = document.createElement("div");
    sheetsWrap.className = "sheets";
    sheetsWrap.style.display = folder.open ? "flex" : "none";

    if (!folder.sheets || folder.sheets.length === 0) {
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.style.padding = "6px 10px 10px 10px";
      empty.textContent = "No habits yet. Click +.";
      sheetsWrap.appendChild(empty);
    } else {
      const today = todayISOAmsterdam();
      for (const sheet of folder.sheets) {
        const doneToday = !!sheet.checks?.[today];

        const row = document.createElement("div");
        row.className = "sheet";
        row.style.cursor = "default";
        row.setAttribute("draggable", "true");
        row.setAttribute("data-dnd-sheet-row", "1");
        row.dataset.folder = folder.id;
        row.dataset.sheet = sheet.id;
        row.innerHTML = `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; width:100%;">
            <div
              class="sheet-name"
              data-rename-sheet="1"
              data-folder="${folder.id}"
              data-sheet="${sheet.id}"
              data-name="${escapeHtml(sheet.name)}"
              title="Click to rename"
              style="cursor:pointer; flex:1; min-width:0;"
            >• ${escapeHtml(sheet.name)}</div>

            <div style="display:flex; align-items:center; gap:6px;">
              <div class="sheet-meta">${doneToday ? "✅" : ""}</div>
              <button
                type="button"
                class="small-btn"
                title="Delete habit"
                aria-label="Delete habit"
                data-action="delete-sheet"
                data-folder="${folder.id}"
                data-sheet="${sheet.id}"
              >🗑</button>
            </div>
          </div>
        `;
        sheetsWrap.appendChild(row);
      }
    }

    folderEl.appendChild(sheetsWrap);
    nav.appendChild(folderEl);
  }
}

/* ===== Dashboard ===== */

export function computeTodayStats(data) {
  const iso = todayISOAmsterdam();
  const sheets = allSheets(data);
  const total = sheets.length;
  const done = sheets.filter(x => !!x.sheet.checks?.[iso]).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { iso, total, done, percent };
}

export function renderDashboard(data, range = "1D") {
  const view = document.querySelector("#view");
  if (!view) return;

  const { iso, total, done, percent } = computeTodayStats(data);
  const isoLabel = isoToDMY(iso);

  view.innerHTML = `
    <div class="card-grid">
      <div class="card">
        <h2>Today (${isoLabel})</h2>
        <div class="big">${percent}%</div>
        <div class="muted">${done} of ${total} habits completed</div>
        <div style="height:10px"></div>

        <div class="pie-wrap">
          <canvas id="pie" width="180" height="180"></canvas>
          <div class="legend">
            <div class="pill"><span class="dot" style="background: var(--good)"></span> Done: <b>${done}</b></div>
            <div class="pill"><span class="dot" style="background: rgba(255,255,255,0.18)"></span> Left: <b>${Math.max(0, total - done)}</b></div>
          </div>
        </div>

        <div style="height:12px"></div>
        <div class="muted">Tip: each habit counts as 1 for the daily %.</div>
      </div>

      <div class="card">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <h2 style="margin:0;">Overview</h2>
          ${renderRangeSelectorHTML(range)}
        </div>
        <div style="height:10px"></div>
        ${renderDashboardListHTML(data, range)}
      </div>
    </div>
  `;

  drawDashboardPie(data);
}

function renderRangeSelectorHTML(active) {
  const items = [
    ["1D", "1D"],
    ["7D", "7D"],
    ["14D", "14D"],
    ["21D", "21D"],
    ["1M", "1M"],
  ];

  return `
    <div role="tablist" aria-label="Select range"
      style="
        display:flex; gap:8px; flex-wrap:wrap;
        border:1px solid var(--border);
        background: rgba(255,255,255,0.02);
        padding:6px;
        border-radius:12px;
      ">
      ${items.map(([val, label]) => {
        const isOn = val === active;
        return `
          <button
            type="button"
            data-range="${val}"
            role="tab"
            aria-selected="${isOn ? "true" : "false"}"
            style="
              border:1px solid ${isOn ? "rgba(96,165,250,0.35)" : "transparent"};
              background:${isOn ? "rgba(96,165,250,0.10)" : "rgba(255,255,255,0.02)"};
              color: var(--text);
              padding:8px 10px;
              border-radius:10px;
              cursor:pointer;
              font-weight:${isOn ? "700" : "600"};
              min-width: 52px;
            ">
            ${label}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderDashboardListHTML(data, range) {
  const sheets = allSheets(data);
  if (sheets.length === 0) {
    return `<div class="muted">No habits yet. Create a folder and add habits.</div>`;
  }

  const keys = getRangeKeys(range);
  const isSingleDay = range === "1D";
  const today = todayISOAmsterdam();

  return `
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${sheets.map(({ folder, sheet }) => {
        if (isSingleDay) {
          const done = !!sheet.checks?.[today];
          return `
            <div class="pill" style="justify-content:space-between;">
              <span>${escapeHtml(folder.name)} / <b>${escapeHtml(sheet.name)}</b></span>
              <span>${done ? "✅" : "❌"}</span>
            </div>
          `;
        } else {
          let c = 0;
          for (const k of keys) if (sheet.checks?.[k]) c++;
          return `
            <div class="pill" style="justify-content:space-between;">
              <span>${escapeHtml(folder.name)} / <b>${escapeHtml(sheet.name)}</b></span>
              <span><b>${c}</b>/<span class="muted">${keys.length}</span></span>
            </div>
          `;
        }
      }).join("")}
    </div>
  `;
}

export function drawDashboardPie(data) {
  const canvas = document.querySelector("#pie");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const { total, done } = computeTodayStats(data);
  const frac = total === 0 ? 0 : done / total;

  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;
  const r = Math.min(w, h) / 2 - 14;

  ctx.clearRect(0, 0, w, h);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 18;
  ctx.stroke();

  const start = -Math.PI / 2;
  const end = start + Math.PI * 2 * frac;

  ctx.beginPath();
  ctx.arc(cx, cy, r, start, end);
  ctx.strokeStyle = "rgba(74,222,128,0.95)";
  ctx.lineWidth = 18;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.fillStyle = "rgba(233,238,247,0.95)";
  ctx.font = "800 22px ui-sans-serif, system-ui";
  const pct = total === 0 ? "0%" : `${Math.round(frac * 100)}%`;
  const tw = ctx.measureText(pct).width;
  ctx.fillText(pct, cx - tw / 2, cy + 8);
}

/* ===== Folder Overview (neon colors + narrower habit col) ===== */

export function renderFolderOverview(route, data, monthCursor) {
  const view = document.querySelector("#view");
  if (!view) return;

  const folder = findFolder(data, route.folderId);
  if (!folder) {
    view.innerHTML = `<div class="card"><h2>Not found</h2><div class="muted">Folder no longer exists.</div></div>`;
    return;
  }

  const habits = folder.sheets || [];
  const y = monthCursor.getFullYear();
  const m = monthCursor.getMonth() + 1;
  const monthDays = daysInMonth(monthCursor);

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(monthCursor);

  const todayIso = todayISOAmsterdam();
  const t = parseISO(todayIso);
  const isThisMonth = (t.y === y && t.m === m);
  const todayIndex = isThisMonth ? t.d : 1;

  // ↓ narrowed: was 200. This is the lever to see more days.
  // You can tweak to 140/150 depending on how cramped you want it.
  const habitColW = 150;
  const cellW = 44;
  const headerH = 44;

  if (habits.length === 0) {
    view.innerHTML = `
      <div class="card">
        <h2>${escapeHtml(folder.name)} — ${escapeHtml(monthLabel)}</h2>
        <div class="muted">No habits in this folder yet. Click + to add one.</div>
      </div>
    `;
    return;
  }

  const dayHeaders = Array.from({ length: monthDays }, (_, i) => {
    const day = i + 1;
    const isToday = isThisMonth && day === todayIndex;
    return `
      <div
        class="${isToday ? "fv-today-col" : ""}"
        style="
          width:${cellW}px; min-width:${cellW}px; max-width:${cellW}px;
          height:${headerH}px;
          display:flex; align-items:center; justify-content:center;
          border-right:1px solid var(--border);
          font-weight:${isToday ? "900" : "700"};
          color:${isToday ? "var(--text)" : "var(--muted)"};
        "
      >${day}</div>
    `;
  }).join("");

  const habitNameRows = habits.map(h => `
    <div
      style="
        width:${habitColW}px; min-width:${habitColW}px; max-width:${habitColW}px;
        height:${cellW}px;
        display:flex; align-items:center;
        padding:0 10px;
        border-top:1px solid var(--border);
        border-right:1px solid var(--border);
        font-weight:800;
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        background: rgba(255,255,255,0.02);
      "
      title="${escapeHtml(h.name)}"
    >${escapeHtml(h.name)}</div>
  `).join("");

  const gridRows = habits.map(h => {
    const cells = Array.from({ length: monthDays }, (_, i) => {
      const day = i + 1;
      const key = `${y}-${pad2(m)}-${pad2(day)}`;
      const color = getCheckValue(h, key);
      const isToday = isThisMonth && day === todayIndex;

      return `
        <button
          type="button"
          class="fv-cell ${isToday ? "fv-today-col" : ""}"
          data-folder="${folder.id}"
          data-sheet="${h.id}"
          data-iso="${key}"
          data-color="${color || ""}"
          aria-label="${escapeHtml(h.name)} on ${key}"
          style="
            width:${cellW}px; min-width:${cellW}px; max-width:${cellW}px;
            height:${cellW}px;
            border:none;
            border-top:1px solid var(--border);
            border-right:1px solid var(--border);
            background:${color ? `var(--c-${color})` : "rgba(255,255,255,0.02)"};
            cursor:pointer;
            -webkit-tap-highlight-color: transparent;
          "
        ></button>
      `;
    }).join("");

    return `<div style="display:flex;">${cells}</div>`;
  }).join("");

  view.innerHTML = `
    <div class="card">
      <div class="cal-header">
        <div>
          <div class="cal-title">${escapeHtml(folder.name)} — ${escapeHtml(monthLabel)}</div>
          <div class="muted">Tap a cell to pick a color.</div>
        </div>
        <div class="cal-nav">
          <button class="btn" id="prevMonthBtn" type="button" aria-label="Previous month">←</button>
          <button class="btn" id="nextMonthBtn" type="button" aria-label="Next month">→</button>
        </div>
      </div>

      <style>
        /* Neon-ish / “3D” palette */
        :root{
          --c-red:    radial-gradient(circle at 30% 30%, rgba(255,90,90,0.95), rgba(255,30,140,0.55) 55%, rgba(255,0,80,0.35));
          --c-yellow: radial-gradient(circle at 30% 30%, rgba(255,240,80,0.95), rgba(255,180,0,0.55) 55%, rgba(255,120,0,0.35));
          --c-pink:   radial-gradient(circle at 30% 30%, rgba(255,120,220,0.95), rgba(255,60,140,0.55) 55%, rgba(255,0,110,0.35));
          --c-purple: radial-gradient(circle at 30% 30%, rgba(190,120,255,0.95), rgba(120,70,255,0.55) 55%, rgba(80,40,255,0.35));
          --c-blue:   radial-gradient(circle at 30% 30%, rgba(90,220,255,0.95), rgba(60,120,255,0.55) 55%, rgba(0,80,255,0.35));
        }

        .fv-shell{
          border:1px solid var(--border);
          border-radius:12px;
          overflow:hidden;
          background: rgba(255,255,255,0.02);
        }
        .fv-scroll-y{
          max-height: 66vh;
          overflow:auto;
          -webkit-overflow-scrolling: touch;
        }
        .fv-header{
          display:flex;
          position: sticky;
          top: 0;
          z-index: 5;
          background: rgba(12,18,30,0.92);
          backdrop-filter: blur(8px);
          border-bottom:1px solid var(--border);
        }
        .fv-header-left{
          width:${habitColW}px; min-width:${habitColW}px; max-width:${habitColW}px;
          height:${headerH}px;
          display:flex; align-items:center;
          padding:0 10px;
          font-weight:900;
          color: var(--muted);
          border-right:1px solid var(--border);
        }
        .fv-header-right{
          overflow-x:auto;
          overflow-y:hidden;
          -webkit-overflow-scrolling: touch;
        }
        .fv-body{
          display:flex;
        }
        .fv-left{
          width:${habitColW}px; min-width:${habitColW}px; max-width:${habitColW}px;
        }
        .fv-right{
          overflow-x:auto;
          overflow-y:hidden;
          -webkit-overflow-scrolling: touch;
        }
        .fv-cell{
          position: relative;
        }
        .fv-cell[data-color]:not([data-color=""]){
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.18),
            inset 0 10px 22px rgba(255,255,255,0.10),
            0 10px 26px rgba(0,0,0,0.18);
        }
        .fv-today-col{
          box-shadow: inset 0 0 0 9999px rgba(96,165,250,0.10);
        }
      </style>

      <div class="fv-shell" id="fvShell"
        data-cellw="${cellW}"
        data-todayindex="${todayIndex}"
        data-isthismonth="${isThisMonth ? "1" : "0"}"
      >
        <div class="fv-scroll-y" id="fvYScroll">
          <div class="fv-header">
            <div class="fv-header-left">Habit</div>
            <div class="fv-header-right" id="fvXHead">
              <div style="display:flex; width:max-content;">${dayHeaders}</div>
            </div>
          </div>

          <div class="fv-body">
            <div class="fv-left">${habitNameRows}</div>
            <div class="fv-right" id="fvXBody">
              <div style="width:max-content;">${gridRows}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* keep these exported helpers as-is for main.js */
export function wireFolderOverview({ autoScrollToToday = false } = {}) {
  const shell = document.getElementById("fvShell");
  const head = document.getElementById("fvXHead");
  const body = document.getElementById("fvXBody");
  if (!shell || !head || !body) return;

  const cellW = Number(shell.dataset.cellw || "44");
  const todayIndex = Number(shell.dataset.todayindex || "1");
  const isThisMonth = shell.dataset.isthismonth === "1";

  let lock = false;
  const sync = (from, to) => {
    if (lock) return;
    lock = true;
    to.scrollLeft = from.scrollLeft;
    requestAnimationFrame(() => { lock = false; });
  };
  head.addEventListener("scroll", () => sync(head, body), { passive: true });
  body.addEventListener("scroll", () => sync(body, head), { passive: true });

  if (autoScrollToToday && isThisMonth) {
    const targetCol = Math.max(1, todayIndex - 3);
    const left = (targetCol - 1) * cellW;
    body.scrollLeft = left;
    head.scrollLeft = left;
  }
}

export function captureFolderScroll() {
  return {
    y: document.getElementById("fvYScroll")?.scrollTop ?? 0,
    x: document.getElementById("fvXBody")?.scrollLeft ?? 0,
  };
}

export function restoreFolderScroll(state) {
  const yEl = document.getElementById("fvYScroll");
  const xBody = document.getElementById("fvXBody");
  const xHead = document.getElementById("fvXHead");

  if (yEl) yEl.scrollTop = state?.y ?? 0;
  if (xBody) xBody.scrollLeft = state?.x ?? 0;
  if (xHead) xHead.scrollLeft = state?.x ?? 0;
}