const COLORS = [
  { key: "red", label: "Red" },
  { key: "yellow", label: "Yellow" },
  { key: "pink", label: "Pink" },
  { key: "purple", label: "Purple" },
  { key: "blue", label: "Blue" },
];

function ensureRoot() {
  let root = document.getElementById("appModalRoot");
  if (root) return root;

  root = document.createElement("div");
  root.id = "appModalRoot";
  document.body.appendChild(root);
  return root;
}

function closeAll() {
  const root = document.getElementById("appModalRoot");
  if (root) root.innerHTML = "";
  document.body.style.overflow = "";
}

export function openColorPicker({ current = null } = {}) {
  const root = ensureRoot();
  root.innerHTML = "";

  document.body.style.overflow = "hidden";

  return new Promise((resolve) => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        cleanup();
        resolve(null);
      }
    };

    const cleanup = () => {
      window.removeEventListener("keydown", onKey);
      closeAll();
    };

    window.addEventListener("keydown", onKey);

    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.55);
      display: flex; align-items: center; justify-content: center;
      padding: 18px;
      z-index: 9999;
    `;

    const sheet = document.createElement("div");
    sheet.style.cssText = `
      width: min(520px, 100%);
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 18px;
      background: rgba(12,18,30,0.94);
      backdrop-filter: blur(12px);
      box-shadow: 0 24px 70px rgba(0,0,0,0.60);
      padding: 14px;

      /* Move it slightly upward (so it’s not “stuck” at bottom) */
      transform: translateY(-6vh);
    `;

    sheet.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
        <div style="font-weight:900; font-size:16px; color: rgba(233,238,247,0.95);">Pick a color</div>
        <button type="button" id="cpCloseBtn"
          style="border:1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.05);
                 color: rgba(233,238,247,0.95); border-radius:10px; padding:8px 10px; cursor:pointer;">
          Close
        </button>
      </div>
      <div style="height:10px"></div>

      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        ${COLORS.map(c => `
          <button type="button" data-color="${c.key}"
            style="
              flex: 1 1 140px;
              border:1px solid rgba(255,255,255,0.14);
              background: rgba(255,255,255,0.05);
              color: rgba(233,238,247,0.95);
              border-radius: 14px;
              padding: 12px 12px;
              cursor: pointer;
              font-weight: 900;
              text-align:left;
              box-shadow: 0 10px 30px rgba(0,0,0,0.25);
            ">
            <span style="
              display:inline-block; width:12px; height:12px; border-radius:999px;
              background: var(--c-${c.key}, rgba(255,255,255,0.5));
              margin-right:10px;
              border:1px solid rgba(255,255,255,0.24);
              vertical-align: middle;
              box-shadow: 0 0 12px var(--c-${c.key}, rgba(255,255,255,0.3));
            "></span>
            ${c.label}${current === c.key ? " ✓" : ""}
          </button>
        `).join("")}

        <button type="button" data-color="__clear__"
          style="
            flex: 1 1 140px;
            border:1px solid rgba(255,255,255,0.14);
            background: rgba(255,255,255,0.03);
            color: rgba(233,238,247,0.95);
            border-radius: 14px;
            padding: 12px 12px;
            cursor: pointer;
            font-weight: 900;
            text-align:left;
          ">
          ⟲ Clear
        </button>
      </div>

      <div style="height:10px"></div>
      <div style="color: rgba(255,255,255,0.6); font-size:12px;">
        Tip: press ESC to close.
      </div>
    `;

    overlay.appendChild(sheet);
    root.appendChild(overlay);

    sheet.querySelector("#cpCloseBtn")?.addEventListener("click", () => {
      cleanup();
      resolve(null);
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(null);
      }
    });

    sheet.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-color]");
      if (!btn) return;
      const color = btn.dataset.color;
      cleanup();
      resolve(color);
    });
  });
}