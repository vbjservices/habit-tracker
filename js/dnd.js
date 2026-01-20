// Desktop + Mobile Drag & Drop for sidebar habits (sheets).
// Desktop: HTML5 drag events (works well)
// Mobile: Pointer Events long-press drag with ghost element + hit-testing
//
// Features:
// - Drag sheets within a folder to reorder
// - Drag across folders to move
// - Drop BETWEEN sheets (shows insertion line)
// - Folder highlights when a draggable is over it
//
// Contract:
// initSidebarDnD({ rootEl, onMove })
// onMove({ fromFolderId, sheetId, toFolderId, toIndex })

let installed = false;

function clearDropHints(root) {
  root.querySelectorAll(".dnd-drop-before, .dnd-drop-after").forEach((el) => {
    el.classList.remove("dnd-drop-before", "dnd-drop-after");
  });
  root.querySelectorAll(".dnd-folder-over").forEach((el) => {
    el.classList.remove("dnd-folder-over");
  });
}

function closestSheetRow(target) {
  return target?.closest?.("[data-dnd-sheet-row='1']") || null;
}

function closestFolderContainer(target) {
  return target?.closest?.("[data-dnd-folder='1']") || null;
}

function getDropPosition(row, clientY) {
  const r = row.getBoundingClientRect();
  const mid = r.top + r.height / 2;
  return clientY < mid ? "before" : "after";
}

function getSheetIndexWithinFolder(row) {
  const folderId = row.dataset.folder;
  const sheetId = row.dataset.sheet;
  const folderEl = row.closest("[data-dnd-folder='1']");
  const rows = Array.from(folderEl?.querySelectorAll("[data-dnd-sheet-row='1']") || []).filter(
    (x) => x.dataset.folder === folderId
  );
  return rows.findIndex((x) => x.dataset.sheet === sheetId);
}

function ensureStyles() {
  const styleId = "dndStyle";
  if (document.getElementById(styleId)) return;

  const st = document.createElement("style");
  st.id = styleId;
  st.textContent = `
    .dnd-folder-over {
      outline: 2px solid rgba(96,165,250,0.35);
      outline-offset: 2px;
      border-radius: 12px;
    }
    [data-dnd-sheet-row='1']{
      position: relative;
      touch-action: pan-y; /* allow scrolling until we actually start a drag */
    }
    .dnd-drop-before::before,
    .dnd-drop-after::after{
      content:"";
      position:absolute;
      left: 10px;
      right: 10px;
      height: 3px;
      border-radius: 999px;
      background: rgba(96,165,250,0.90);
      box-shadow: 0 0 12px rgba(96,165,250,0.45);
      pointer-events: none;
    }
    .dnd-drop-before::before{ top: -2px; }
    .dnd-drop-after::after{ bottom: -2px; }

    body.dnd-dragging [draggable="true"]{
      cursor: grabbing;
    }

    /* Mobile ghost */
    .dnd-ghost {
      position: fixed;
      z-index: 99999;
      pointer-events: none;
      transform: translate3d(0,0,0);
      opacity: 0.92;
      border: 1px solid rgba(255,255,255,0.16);
      border-radius: 14px;
      background: rgba(12,18,30,0.92);
      backdrop-filter: blur(10px);
      box-shadow: 0 18px 60px rgba(0,0,0,0.55);
    }
    body.dnd-touch-dragging {
      user-select: none;
      -webkit-user-select: none;
      touch-action: none; /* once dragging, stop page from scrolling */
    }
  `;
  document.head.appendChild(st);
}

function isProbablyTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.("(pointer: coarse)").matches
  );
}

function createGhostFromRow(row) {
  const r = row.getBoundingClientRect();
  const ghost = row.cloneNode(true);

  ghost.classList.add("dnd-ghost");
  ghost.style.width = `${Math.min(r.width, 360)}px`;
  ghost.style.maxWidth = "90vw";
  ghost.style.padding = "0"; // clone already has content
  ghost.style.left = "0px";
  ghost.style.top = "0px";

  // Make ghost simpler (avoid buttons being visible as clickable)
  ghost.querySelectorAll("button").forEach((b) => (b.style.visibility = "hidden"));

  document.body.appendChild(ghost);
  return ghost;
}

function updateGhostPos(ghost, x, y, offsetX, offsetY) {
  const gx = x - offsetX;
  const gy = y - offsetY;
  ghost.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
}

function computeDropTarget(rootEl, clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return null;

  const folder = closestFolderContainer(el);
  if (!folder) return null;

  const toFolderId = folder.dataset.folder;

  const row = closestSheetRow(el);

  let toIndex = null;
  if (row && row.dataset.folder === toFolderId) {
    const pos = getDropPosition(row, clientY);
    const baseIndex = getSheetIndexWithinFolder(row);
    toIndex = pos === "before" ? baseIndex : baseIndex + 1;
    return { folderEl: folder, rowEl: row, toFolderId, toIndex, pos };
  } else {
    // append
    const rows = folder.querySelectorAll("[data-dnd-sheet-row='1']");
    toIndex = rows.length;
    return { folderEl: folder, rowEl: null, toFolderId, toIndex, pos: null };
  }
}

function applyDropHints(rootEl, target) {
  clearDropHints(rootEl);
  if (!target) return;

  target.folderEl.classList.add("dnd-folder-over");
  if (target.rowEl && target.pos) {
    target.rowEl.classList.add(target.pos === "before" ? "dnd-drop-before" : "dnd-drop-after");
  }
}

export function initSidebarDnD({ rootEl, onMove }) {
  if (installed) return;
  installed = true;

  if (!rootEl) {
    console.error("initSidebarDnD: missing rootEl");
    return;
  }

  ensureStyles();

  /* =========================
   * Desktop: HTML5 drag & drop
   * ========================= */
  let draggingDesktop = null; // { fromFolderId, sheetId }

  rootEl.addEventListener("dragstart", (e) => {
    const row = closestSheetRow(e.target);
    if (!row) return;

    draggingDesktop = {
      fromFolderId: row.dataset.folder,
      sheetId: row.dataset.sheet,
    };

    document.body.classList.add("dnd-dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify(draggingDesktop));
  });

  rootEl.addEventListener("dragend", () => {
    draggingDesktop = null;
    document.body.classList.remove("dnd-dragging");
    clearDropHints(rootEl);
  });

  rootEl.addEventListener("dragover", (e) => {
    if (!draggingDesktop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const target = computeDropTarget(rootEl, e.clientX, e.clientY);
    applyDropHints(rootEl, target);
  });

  rootEl.addEventListener("drop", (e) => {
    if (!draggingDesktop) return;
    e.preventDefault();

    const target = computeDropTarget(rootEl, e.clientX, e.clientY);
    clearDropHints(rootEl);

    if (!target) {
      draggingDesktop = null;
      document.body.classList.remove("dnd-dragging");
      return;
    }

    onMove?.({
      fromFolderId: draggingDesktop.fromFolderId,
      sheetId: draggingDesktop.sheetId,
      toFolderId: target.toFolderId,
      toIndex: target.toIndex,
    });

    draggingDesktop = null;
    document.body.classList.remove("dnd-dragging");
  });

  /* =========================
   * Mobile: long-press pointer drag
   * ========================= */
  if (!isProbablyTouchDevice()) return;

  let pressTimer = null;
  let maybeRow = null;

  let draggingTouch = null; // { fromFolderId, sheetId }
  let ghost = null;

  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;

  let ghostOffsetX = 0;
  let ghostOffsetY = 0;

  const LONG_PRESS_MS = 50;
  const MOVE_CANCEL_PX = 12;

  function cancelPendingPress() {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    maybeRow = null;
  }

  function cleanupTouchDrag() {
    cancelPendingPress();

    draggingTouch = null;
    if (ghost) {
      ghost.remove();
      ghost = null;
    }
    document.body.classList.remove("dnd-touch-dragging");
    clearDropHints(rootEl);
  }

  function startTouchDrag(row, clientX, clientY) {
    draggingTouch = {
      fromFolderId: row.dataset.folder,
      sheetId: row.dataset.sheet,
    };

    // Create ghost
    ghost = createGhostFromRow(row);
    const r = row.getBoundingClientRect();
    ghostOffsetX = Math.min(24, r.width * 0.15);
    ghostOffsetY = 18;

    updateGhostPos(ghost, clientX, clientY, ghostOffsetX, ghostOffsetY);

    document.body.classList.add("dnd-touch-dragging");
  }

  rootEl.addEventListener(
    "pointerdown",
    (e) => {
      // only touch/pen
      if (e.pointerType === "mouse") return;

      // Don’t start drag when clicking buttons (delete etc.)
      if (e.target.closest("button")) return;

      const row = closestSheetRow(e.target);
      if (!row) return;

      // record start
      startX = e.clientX;
      startY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;

      maybeRow = row;

      // long press to activate drag
      pressTimer = setTimeout(() => {
        pressTimer = null;
        if (!maybeRow) return;
        startTouchDrag(maybeRow, lastX, lastY);
      }, LONG_PRESS_MS);
    },
    { passive: true }
  );

  rootEl.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "mouse") return;

      lastX = e.clientX;
      lastY = e.clientY;

      // If not dragging yet, cancel long-press when user scrolls/moves
      if (!draggingTouch) {
        if (!pressTimer) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const dist = Math.hypot(dx, dy);
        if (dist > MOVE_CANCEL_PX) {
          cancelPendingPress();
        }
        return;
      }

      // dragging
      e.preventDefault(); // stop scroll while dragging
      if (ghost) updateGhostPos(ghost, e.clientX, e.clientY, ghostOffsetX, ghostOffsetY);

      const target = computeDropTarget(rootEl, e.clientX, e.clientY);
      applyDropHints(rootEl, target);
    },
    { passive: false }
  );

  rootEl.addEventListener(
    "pointerup",
    (e) => {
      if (e.pointerType === "mouse") return;

      // If not dragging, just cancel pending
      if (!draggingTouch) {
        cancelPendingPress();
        return;
      }

      e.preventDefault();

      const target = computeDropTarget(rootEl, e.clientX, e.clientY);
      clearDropHints(rootEl);

      if (target && draggingTouch) {
        onMove?.({
          fromFolderId: draggingTouch.fromFolderId,
          sheetId: draggingTouch.sheetId,
          toFolderId: target.toFolderId,
          toIndex: target.toIndex,
        });
      }

      cleanupTouchDrag();
    },
    { passive: false }
  );

  rootEl.addEventListener(
    "pointercancel",
    (e) => {
      if (e.pointerType === "mouse") return;
      cleanupTouchDrag();
    },
    { passive: true }
  );

  // Extra safety: if user scrolls page during pending press, cancel
  window.addEventListener("scroll", () => {
    if (!draggingTouch) cancelPendingPress();
  }, { passive: true });
}