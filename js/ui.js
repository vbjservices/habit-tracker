import { allSheets, findFolder, findSheet } from "./store.js";
import {
  todayISOAmsterdam,
  monthTitleNL,
  startOfMonth,
  endOfMonth,
  weekdayIndexMonFirst,
  daysInMonth,
  pad2,
} from "./time.js";

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ========= Date range helpers (Dashboard Overview) ========= */
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
  if (range === "1M") days = 30;

  const keys = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(t);
    d.setUTCDate(t.getUTCDate() - i);
    keys.push(formatISODateUTC(d));
  }
  return keys;
}

function isoToNLDate(iso) {
  // iso: YYYY-MM-DD -> DD/MM/YYYY
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/* ===== Top UI ===== */

export function setBreadcrumbs(route, data) {
  const el = document.querySelector("#breadcrumbs");
  if (!el) return;

  if (route.view === "dashboard") {
    el.innerHTML = `<b>Dashboard</b> <span class="muted">— overzicht vandaag</span>`;
    return;
  }

  if (route.view === "folder") {
    const folder = findFolder(data, route.folderId);
    el.innerHTML = `
      <span class="muted">Mapje</span> <b>${escapeHtml(folder?.name || "")}</b>
      <span class="muted">/</span>
      <b>Overzicht</b>
    `;
    return;
  }

  const folder = findFolder(data, route.folderId);
  const sheet = findSheet(data, route.folderId, route.sheetId);

  el.innerHTML = `
    <span class="muted">Mapje</span> <b>${escapeHtml(folder?.name || "")}</b>
    <span class="muted">/</span>
    <span class="muted">Sheet</span> <b>${escapeHtml(sheet?.name || "")}</b>
  `;
}

export function setTopRightButton(route) {
  const btn = document.querySelector("#topRightBtn");
  if (!btn) return;

  if (route.view === "dashboard") {
    btn.textContent = "Vandaag";
    btn.title = "Ververs vandaag";
    btn.setAttribute("aria-label", "Ververs vandaag");
  } else {
    btn.textContent = "🏠 Home";
    btn.title = "Terug naar dashboard";
    btn.setAttribute("aria-label", "Terug naar dashboard");
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
        <h2>Geen mapjes</h2>
        <div class="muted">Klik op <b>+</b> om je eerste mapje te maken (bv. fitness).</div>
      </div>
    `;
    return;
  }

  for (const folder of data.folders) {
    const folderEl = document.createElement("div");
    folderEl.className = "folder";
    folderEl.setAttribute("data-folder-container", "1");
    folderEl.setAttribute("data-folder", folder.id);

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
          title="${folder.open ? "Inklappen" : "Uitklappen"}"
          aria-label="${folder.open ? "Inklappen" : "Uitklappen"}"
          data-toggle-folder="1"
          data-folder="${folder.id}"
        >${folder.open ? "▼" : "▶"}</button>

        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          📁 ${escapeHtml(folder.name)}
        </span>
      </div>
      <div class="folder-actions">
        <button class="small-btn" title="Nieuwe sheet" aria-label="Nieuwe sheet" data-action="add-sheet" data-folder="${folder.id}">+</button>
        <button class="small-btn" title="Mapje hernoemen" aria-label="Mapje hernoemen" data-action="rename-folder" data-folder="${folder.id}">✎</button>
        <button class="small-btn" title="Mapje verwijderen" aria-label="Mapje verwijderen" data-action="delete-folder" data-folder="${folder.id}">🗑</button>
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
      empty.textContent = "Nog geen sheets. Klik op +.";
      sheetsWrap.appendChild(empty);
    } else {
      for (const sheet of folder.sheets) {
        const row = document.createElement("div");
        row.className = "sheet";

        const isActiveSheet =
          route.view === "sheet" &&
          route.folderId === folder.id &&
          route.sheetId === sheet.id;

        if (isActiveSheet) row.classList.add("active");

        const doneToday = !!sheet.checks[todayISOAmsterdam()];
        row.innerHTML = `
          <div class="sheet-name">🗒 ${escapeHtml(sheet.name)}</div>
          <div class="sheet-meta">${doneToday ? "✅ vandaag" : ""}</div>
        `;

        row.setAttribute("data-open-sheet", "1");
        row.setAttribute("data-folder", folder.id);
        row.setAttribute("data-sheet", sheet.id);

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
  const done = sheets.filter(x => !!x.sheet.checks[iso]).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { iso, total, done, percent };
}

export function renderDashboard(data, range = "1D") {
  const view = document.querySelector("#view");
  if (!view) return;

  const { iso, total, done, percent } = computeTodayStats(data);
  const isoNL = isoToNLDate(iso);

  view.innerHTML = `
    <div class="card-grid">
      <div class="card">
        <h2>Vandaag (${isoNL})</h2>
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
        <div class="muted">Tip: elke sheet telt als 1 gewoonte voor het dagpercentage.</div>
      </div>

      <div class="card">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <h2 style="margin:0;">Overzicht</h2>
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
    ["1M", "1M"],
  ];

  return `
    <div role="tablist" aria-label="Selecteer periode"
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
    return `<div class="muted">Nog geen sheets. Maak eerst een mapje en voeg sheets toe.</div>`;
  }

  const keys = getRangeKeys(range);
  const isSingleDay = range === "1D";
  const today = todayISOAmsterdam();

  return `
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${sheets.map(({ folder, sheet }) => {
        if (isSingleDay) {
          const done = !!sheet.checks[today];
          return `
            <div class="pill" style="justify-content:space-between;">
              <span>${escapeHtml(folder.name)} / <b>${escapeHtml(sheet.name)}</b></span>
              <span>${done ? "✅" : "❌"}</span>
            </div>
          `;
        } else {
          let c = 0;
          for (const k of keys) if (sheet.checks[k]) c++;

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
  const cx = w/2, cy = h/2;
  const r = Math.min(w,h)/2 - 14;

  ctx.clearRect(0,0,w,h);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 18;
  ctx.stroke();

  const start = -Math.PI/2;
  const end = start + Math.PI*2*frac;

  ctx.beginPath();
  ctx.arc(cx, cy, r, start, end);
  ctx.strokeStyle = "rgba(74,222,128,0.95)";
  ctx.lineWidth = 18;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.fillStyle = "rgba(233,238,247,0.95)";
  ctx.font = "800 22px ui-sans-serif, system-ui";
  const pct = total === 0 ? "0%" : `${Math.round(frac*100)}%`;
  const tw = ctx.measureText(pct).width;
  ctx.fillText(pct, cx - tw/2, cy + 8);
}

/* ===== Folder Overview (FIXED AXES)
   Habits on Y (left), Days on X (top), horizontal scroll across days
===== */

export function renderFolderOverview(route, data, monthCursor) {
  const view = document.querySelector("#view");
  if (!view) return;

  const folder = findFolder(data, route.folderId);
  if (!folder) {
    view.innerHTML = `<div class="card"><h2>Niet gevonden</h2><div class="muted">Mapje bestaat niet meer.</div></div>`;
    return;
  }

  const habits = folder.sheets || [];
  const d = monthCursor;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const monthDays = daysInMonth(d);

  const monthLabel = monthTitleNL(d);
  const todayKey = todayISOAmsterdam();

  if (habits.length === 0) {
    view.innerHTML = `
      <div class="card">
        <h2>${escapeHtml(folder.name)} — Overzicht</h2>
        <div class="muted">Nog geen habits in dit mapje. Voeg er één toe via +.</div>
      </div>
    `;
    return;
  }

  // Header row: days across X
  const dayHeaderCells = Array.from({ length: monthDays }, (_, i) => {
    const day = i + 1;
    const key = `${y}-${pad2(m)}-${pad2(day)}`;
    const isToday = key === todayKey;

    return `
      <div
        style="
          flex: 0 0 44px;
          width:44px;
          min-width:44px;
          max-width:44px;
          padding:10px 0;
          text-align:center;
          border-right:1px solid var(--border);
          font-weight:${isToday ? "900" : "700"};
          color:${isToday ? "var(--text)" : "var(--muted)"};
          background:${isToday ? "rgba(96,165,250,0.08)" : "transparent"};
        "
        title="${key}"
      >${day}</div>
    `;
  }).join("");

  // Rows: habits down Y
  const habitRows = habits.map(h => {
    const nameCell = `
      <div
        style="
          flex: 0 0 160px;
          width:160px;
          min-width:160px;
          max-width:160px;
          padding:10px;
          border-right:1px solid var(--border);
          border-top:1px solid var(--border);
          font-weight:800;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        "
        title="${escapeHtml(h.name)}"
      >${escapeHtml(h.name)}</div>
    `;

    const cells = Array.from({ length: monthDays }, (_, i) => {
      const day = i + 1;
      const key = `${y}-${pad2(m)}-${pad2(day)}`;
      const done = !!h.checks?.[key];
      const isToday = key === todayKey;

      return `
        <button
          type="button"
          class="fv-cell"
          data-folder="${folder.id}"
          data-sheet="${h.id}"
          data-iso="${key}"
          aria-label="${escapeHtml(h.name)} op ${key} ${done ? "uit" : "aan"}"
          style="
            flex: 0 0 44px;
            width:44px;
            min-width:44px;
            max-width:44px;
            height: 44px;
            border-right:1px solid var(--border);
            border-top:1px solid var(--border);
            background: ${done ? "rgba(74,222,128,0.14)" : (isToday ? "rgba(96,165,250,0.05)" : "rgba(255,255,255,0.02)")};
            color: ${done ? "var(--good)" : "transparent"};
            cursor:pointer;
            font-weight:900;
            -webkit-tap-highlight-color: transparent;
          "
        >✓</button>
      `;
    }).join("");

    return `
      <div style="display:flex; width:100%;">
        ${nameCell}
        <div style="display:flex; width:max-content;">
          ${cells}
        </div>
      </div>
    `;
  }).join("");

  view.innerHTML = `
    <div class="card">
      <div class="cal-header">
        <div>
          <div class="cal-title">${escapeHtml(folder.name)} — Overzicht</div>
          <div class="muted">Maand: <b>${monthLabel}</b> · klik op een vakje om te togglen</div>
        </div>
        <div class="cal-nav">
          <button class="btn" id="prevMonthBtn" type="button" aria-label="Vorige maand">←</button>
          <button class="btn" id="nextMonthBtn" type="button" aria-label="Volgende maand">→</button>
        </div>
      </div>

      <div
        style="
          border:1px solid var(--border);
          border-radius:12px;
          overflow:hidden;
          background: rgba(255,255,255,0.02);
        "
      >
        <!-- Header -->
        <div style="display:flex; width:100%;">
          <div
            style="
              flex: 0 0 160px;
              width:160px;
              min-width:160px;
              max-width:160px;
              padding:10px;
              border-right:1px solid var(--border);
              font-weight:900;
              color: var(--muted);
            "
          >Habit</div>

          <div style="overflow-x:auto; overflow-y:hidden; -webkit-overflow-scrolling: touch;">
            <div style="display:flex; width:max-content;">
              ${dayHeaderCells}
            </div>
          </div>
        </div>

        <!-- Body -->
        <div style="max-height: 62vh; overflow:auto; -webkit-overflow-scrolling: touch;">
          ${habits.map(h => {
            const nameCell = `
              <div
                style="
                  flex: 0 0 160px;
                  width:160px;
                  min-width:160px;
                  max-width:160px;
                  padding:10px;
                  border-right:1px solid var(--border);
                  border-top:1px solid var(--border);
                  font-weight:800;
                  white-space:nowrap;
                  overflow:hidden;
                  text-overflow:ellipsis;
                "
                title="${escapeHtml(h.name)}"
              >${escapeHtml(h.name)}</div>
            `;

            const cells = Array.from({ length: monthDays }, (_, i) => {
              const day = i + 1;
              const key = `${y}-${pad2(m)}-${pad2(day)}`;
              const done = !!h.checks?.[key];
              const isToday = key === todayKey;

              return `
                <button
                  type="button"
                  class="fv-cell"
                  data-folder="${folder.id}"
                  data-sheet="${h.id}"
                  data-iso="${key}"
                  aria-label="${escapeHtml(h.name)} op ${key} ${done ? "uit" : "aan"}"
                  style="
                    flex: 0 0 44px;
                    width:44px;
                    min-width:44px;
                    max-width:44px;
                    height: 44px;
                    border-right:1px solid var(--border);
                    border-top:1px solid var(--border);
                    background: ${done ? "rgba(74,222,128,0.14)" : (isToday ? "rgba(96,165,250,0.05)" : "rgba(255,255,255,0.02)")};
                    color: ${done ? "var(--good)" : "transparent"};
                    cursor:pointer;
                    font-weight:900;
                    -webkit-tap-highlight-color: transparent;
                  "
                >✓</button>
              `;
            }).join("");

            return `
              <div style="display:flex; width:100%;">
                ${nameCell}
                <div style="overflow-x:auto; overflow-y:hidden; -webkit-overflow-scrolling: touch;">
                  <div style="display:flex; width:max-content;">
                    ${cells}
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <div style="height:10px"></div>
      <div class="muted" style="font-size:12px;">
        Later: kleurselect popup per vakje (rood/geel/roze/paars/blauw). Nu is het simpel togglen.
      </div>
    </div>
  `;
}

/* ===== Sheet View ===== */

export function renderSheet(route, data, monthCursor) {
  const view = document.querySelector("#view");
  if (!view) return;

  const folder = findFolder(data, route.folderId);
  const sheet = findSheet(data, route.folderId, route.sheetId);

  if (!folder || !sheet) {
    view.innerHTML = `<div class="card"><h2>Niet gevonden</h2><div class="muted">Sheet bestaat niet meer.</div></div>`;
    return;
  }

  const d = monthCursor;
  const monthStart = startOfMonth(d);
  const offset = weekdayIndexMonFirst(monthStart);

  const weekdays = ["Ma","Di","Wo","Do","Vr","Za","Zo"].map(w => `<div class="weekday">${w}</div>`).join("");

  const firstCellDate = new Date(monthStart);
  firstCellDate.setDate(1 - offset);

  const todayKey = todayISOAmsterdam();

  const cells = [];
  for (let i=0; i<42; i++) {
    const cellDate = new Date(firstCellDate);
    cellDate.setDate(firstCellDate.getDate() + i);

    const key = `${cellDate.getFullYear()}-${pad2(cellDate.getMonth()+1)}-${pad2(cellDate.getDate())}`;

    const inMonth = cellDate.getMonth() === d.getMonth();
    const done = !!sheet.checks[key];
    const isToday = key === todayKey;

    cells.push(`
      <div class="day ${inMonth ? "" : "off"} ${isToday ? "today" : ""}" data-iso="${key}">
        <div class="top">
          <div>${cellDate.getDate()}</div>
          <div class="badge ${done ? "done" : ""}">${done ? "✓" : ""}</div>
        </div>
        <div class="muted" style="font-size:12px;">${done ? "gedaan" : "niet gedaan"}</div>
      </div>
    `);
  }

  const monthTitle = monthTitleNL(d);
  const monthStats = computeMonthStats(sheet, d);
  const todayDone = !!sheet.checks[todayKey];

  view.innerHTML = `
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
          <button class="btn" id="prevMonthBtn" type="button" aria-label="Vorige maand">←</button>
          <button class="btn" id="nextMonthBtn" type="button" aria-label="Volgende maand">→</button>
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
    const key = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
    if (sheet.checks[key]) done++;
  }
  return { done, total };
}