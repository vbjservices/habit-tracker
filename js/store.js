const STORAGE_KEY = "habits_mvp_v1";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { folders: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.folders)) {
      return { folders: [] };
    }

    for (const f of parsed.folders) {
      if (!Array.isArray(f.sheets)) f.sheets = [];
      if (typeof f.open !== "boolean") f.open = true;
      for (const s of f.sheets) {
        if (!s.checks || typeof s.checks !== "object") s.checks = {};
      }
    }
    return parsed;
  } catch {
    return { folders: [] };
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function allSheets(data) {
  const out = [];
  for (const folder of data.folders) {
    for (const sheet of (folder.sheets || [])) {
      out.push({ folder, sheet });
    }
  }
  return out;
}

export function findFolder(data, folderId) {
  return data.folders.find(f => f.id === folderId) || null;
}

export function findSheet(data, folderId, sheetId) {
  const folder = findFolder(data, folderId);
  if (!folder) return null;
  return (folder.sheets || []).find(s => s.id === sheetId) || null;
}

export function addFolder(data, name) {
  data.folders.push({
    id: uid("folder"),
    name,
    open: true,
    sheets: [],
  });
}

export function renameFolder(data, folderId, name) {
  const f = findFolder(data, folderId);
  if (f) f.name = name;
}

export function deleteFolder(data, folderId) {
  data.folders = data.folders.filter(f => f.id !== folderId);
}

export function toggleFolderOpen(data, folderId) {
  const f = findFolder(data, folderId);
  if (f) f.open = !f.open;
}

export function addSheet(data, folderId, name) {
  const f = findFolder(data, folderId);
  if (!f) return;
  f.sheets.push({
    id: uid("sheet"),
    name,
    checks: {}, // iso -> color string (or legacy boolean)
  });
}

export function renameSheet(data, folderId, sheetId, name) {
  const s = findSheet(data, folderId, sheetId);
  if (s) s.name = name;
}

export function deleteSheet(data, folderId, sheetId) {
  const f = findFolder(data, folderId);
  if (!f) return;
  f.sheets = (f.sheets || []).filter(s => s.id !== sheetId);
}

// NEW: set/clear a color for a day
export function setCheckColor(data, folderId, sheetId, isoKey, colorOrNull) {
  const s = findSheet(data, folderId, sheetId);
  if (!s) return;

  if (!colorOrNull) {
    delete s.checks[isoKey];
    return;
  }
  s.checks[isoKey] = colorOrNull; // "red"|"yellow"|...
}

// Backwards compatibility helper for reads
export function getCheckValue(sheet, isoKey) {
  const v = sheet?.checks?.[isoKey];
  if (v === true) return "blue"; // legacy boolean -> default color
  if (typeof v === "string") return v;
  return null;
}

export function exportJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "habits-export.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function importJSONFile(file, cb) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.folders)) {
        throw new Error("Invalid JSON structure");
      }
      cb(parsed);
    } catch {
      alert("Import failed: invalid JSON");
    }
  };
  reader.readAsText(file);
}