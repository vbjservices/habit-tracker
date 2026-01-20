// Desktop HTML5 drag & drop for sidebar habits (sheets).
// - Drag sheets within a folder to reorder
// - Drag across folders to move
// - Drop BETWEEN sheets (shows an insertion line)
// - Folder highlights when a draggable is over it

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
  const rows = Array.from(
    row.closest("[data-dnd-folder='1']")?.querySelectorAll("[data-dnd-sheet-row='1']") || []
  ).filter((x) => x.dataset.folder === folderId);

  return rows.findIndex((x) => x.dataset.sheet === sheetId);
}

export function initSidebarDnD({ rootEl, onMove }) {
  if (installed) return;
  installed = true;

  if (!rootEl) {
    console.error("initSidebarDnD: missing rootEl");
    return;
  }

  // Small injected CSS (keeps your global CSS clean)
  const styleId = "dndStyle";
  if (!document.getElementById(styleId)) {
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
      }
      .dnd-drop-before::before,
      .dnd-drop-after::after{
        content:"";
        position:absolute;
        left: 10px;
        right: 10px;
        height: 3px;
        border-radius: 999px;
        background: rgba(96,165,250,0.85);
        box-shadow: 0 0 12px rgba(96,165,250,0.45);
      }
      .dnd-drop-before::before{ top: -2px; }
      .dnd-drop-after::after{ bottom: -2px; }
      body.dnd-dragging [draggable="true"]{
        cursor: grabbing;
      }
    `;
    document.head.appendChild(st);
  }

  let dragging = null; // { fromFolderId, sheetId }

  rootEl.addEventListener("dragstart", (e) => {
    const row = closestSheetRow(e.target);
    if (!row) return;

    dragging = {
      fromFolderId: row.dataset.folder,
      sheetId: row.dataset.sheet,
    };

    document.body.classList.add("dnd-dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify(dragging));

    // nice ghost image (optional): keep default
  });

  rootEl.addEventListener("dragend", () => {
    dragging = null;
    document.body.classList.remove("dnd-dragging");
    clearDropHints(rootEl);
  });

  rootEl.addEventListener("dragover", (e) => {
    if (!dragging) return;
    e.preventDefault(); // allow drop
    e.dataTransfer.dropEffect = "move";

    clearDropHints(rootEl);

    const folder = closestFolderContainer(e.target);
    if (folder) folder.classList.add("dnd-folder-over");

    const row = closestSheetRow(e.target);
    if (row) {
      const pos = getDropPosition(row, e.clientY);
      row.classList.add(pos === "before" ? "dnd-drop-before" : "dnd-drop-after");
    }
  });

  rootEl.addEventListener("dragleave", (e) => {
    // when leaving the whole nav area, clear; otherwise dragover will refresh
    if (e.target === rootEl) clearDropHints(rootEl);
  });

  rootEl.addEventListener("drop", (e) => {
    if (!dragging) return;
    e.preventDefault();

    clearDropHints(rootEl);

    // Determine destination folder
    const folder = closestFolderContainer(e.target);
    if (!folder) {
      dragging = null;
      return;
    }
    const toFolderId = folder.dataset.folder;

    // Determine insertion index (between sheets)
    let toIndex = null;
    const row = closestSheetRow(e.target);

    if (row && row.dataset.folder === toFolderId) {
      const pos = getDropPosition(row, e.clientY);
      const baseIndex = getSheetIndexWithinFolder(row);
      toIndex = pos === "before" ? baseIndex : baseIndex + 1;
    } else {
      // Dropped into folder but not onto a specific sheet row -> append
      const rows = folder.querySelectorAll("[data-dnd-sheet-row='1']");
      toIndex = rows.length;
    }

    // Notify app
    onMove?.({
      fromFolderId: dragging.fromFolderId,
      sheetId: dragging.sheetId,
      toFolderId,
      toIndex,
    });

    dragging = null;
    document.body.classList.remove("dnd-dragging");
  });
}