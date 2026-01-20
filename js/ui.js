import {
  allSheets,
  findFolder,
  findSheet,
} from "./store.js";

import {
  todayISOAmsterdam,
  monthTitleNL,
  startOfMonth,
  endOfMonth,
  weekdayIndexMonFirst,
} from "./time.js";

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ===== Top UI ===== */

export function setBreadcrumbs(route, data) {
  const el = document.querySelector("#breadcrumbs");
  if (!el) return;

  if (route.view === "dashboard") {
    el.innerHTML = `<b>Dashboard</b> <span class="muted">— overzicht vandaag</span>`;
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

  if (route.view === "sheet") {
    btn.textContent = "🏠 Home";
    btn.title = "Terug naar dashboard";
    btn.setAttribute("aria-label", "Terug naar dashboard");
  } else {
    btn.textContent = "Vandaag";
    btn.title = "Ververs vandaag";
    btn.setAttribute("aria-label", "Ververs vandaag");
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

    const head = document.createElement("div");
    head.className = "folder-head";
    head.innerHTML = `
      <div class="folder-title">
        <span class="chev">${folder.open ? "▼" : "▶"}</span>
        <span>📁 ${escapeHtml(folder.name)}</span>
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

        const isActive =
          route.view === "sheet" &&
          route.folderId === folder.id &&
          route.sheetId === sheet.id;

        if (isActive) row.classList.add("active");

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

export function renderDashboard(data) {
  const view = document.querySelector("#view");
  if (!view) return;

  const { iso, total, done, percent } = computeTodayStats(data);

  view.innerHTML = `
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
        <div class="muted">Tip: elke sheet telt als 1 gewoonte voor het dagpercentage.</div>
      </div>

      <div class="card">
        <h2>Overzicht</h2>
        ${renderDashboardListHTML(data)}
      </div>
    </div>
  `;

  drawDashboardPie(data);
}

function renderDashboardListHTML(data) {
  const iso = todayISOAmsterdam();
  const sheets = allSheets(data);

  if (sheets.length === 0) {
    return `<div class="muted">Nog geen sheets. Maak eerst een mapje en voeg sheets toe.</div>`;
  }

  return `
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${sheets.map(({folder, sheet}) => {
        const done = !!sheet.checks[iso];
        return `
          <div class="pill" style="justify-content:space-between;">
            <span>${escapeHtml(folder.name)} / <b>${escapeHtml(sheet.name)}</b></span>
            <span>${done ? "✅" : "⬜"}</span>
          </div>
        `;
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

    // Key must match what we store: YYYY-MM-DD (calendar date)
    const key = `${cellDate.getFullYear()}-${String(cellDate.getMonth()+1).padStart(2,"0")}-${String(cellDate.getDate()).padStart(2,"0")}`;

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
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (sheet.checks[key]) done++;
  }
  return { done, total };
}