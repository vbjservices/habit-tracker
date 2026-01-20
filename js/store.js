const STORAGE_KEY = "habitAppData_v1";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function normalize(data) {
  if (!data || typeof data !== "object") return { folders: [] };
  if (!Array.isArray(data.folders)) data.folders = [];

  for (const f of data.folders) {
    if (!f.id) f.id = uid();
    if (typeof f.name !== "string") f.name = "Mapje";
    if (typeof f.open !== "boolean") f.open = true;
    if (!Array.isArray(f.sheets)) f.sheets = [];

    for (const s of f.sheets) {
      if (!s.id) s.id = uid();
      if (typeof s.name !== "string") s.name = "Sheet";
      if (!s.checks || typeof s.checks !== "object") s.checks = {};
    }
  }
  return data;
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { folders: [] };
    return normalize(JSON.parse(raw));
  } catch {
    return { folders: [] };
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function findFolder(data, folderId) {
  return data.folders.find(f => f.id === folderId) || null;
}

export function findSheet(data, folderId, sheetId) {
  const folder = findFolder(data, folderId);
  if (!folder) return null;
  return folder.sheets.find(s => s.id === sheetId) || null;
}

export function allSheets(data) {
  const out = [];
  for (const f of data.folders) {
    for (const s of f.sheets) out.push({ folder: f, sheet: s });
  }
  return out;
}

/* CRUD */
export function addFolder(data, name) {
  data.folders.push({ id: uid(), name, open: true, sheets: [] });
  return data;
}

export function renameFolder(data, folderId, name) {
  const folder = findFolder(data, folderId);
  if (folder) folder.name = name;
  return data;
}

export function deleteFolder(data, folderId) {
  data.folders = data.folders.filter(f => f.id !== folderId);
  return data;
}

export function toggleFolderOpen(data, folderId) {
  const folder = findFolder(data, folderId);
  if (folder) folder.open = !folder.open;
  return data;
}

export function addSheet(data, folderId, name) {
  const folder = findFolder(data, folderId);
  if (!folder) return data;
  folder.sheets.push({ id: uid(), name, checks: {} });
  return data;
}

export function renameSheet(data, folderId, sheetId, name) {
  const sheet = findSheet(data, folderId, sheetId);
  if (sheet) sheet.name = name;
  return data;
}

export function deleteSheet(data, folderId, sheetId) {
  const folder = findFolder(data, folderId);
  if (!folder) return data;
  folder.sheets = folder.sheets.filter(s => s.id !== sheetId);
  return data;
}

export function toggleCheck(data, folderId, sheetId, isoDate) {
  const sheet = findSheet(data, folderId, sheetId);
  if (!sheet) return data;

  sheet.checks[isoDate] = !sheet.checks[isoDate];
  if (!sheet.checks[isoDate]) delete sheet.checks[isoDate];
  return data;
}

/* Export/Import */
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

export function importJSONFile(file, onLoaded) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = normalize(JSON.parse(String(reader.result)));
      onLoaded(parsed);
    } catch {
      alert("Kon JSON niet lezen.");
    }
  };
  reader.readAsText(file);
}