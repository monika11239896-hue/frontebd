// ecus.js
import { API_BASE_URL } from "./config.js";

/* ===============================
   INIT ECUs (Topology page)
================================ */
export function initEcus() {
  bindCreateEcu();
  loadEcuTopology();
}

/* ===============================
   CREATE ECU
================================ */
function bindCreateEcu() {
  const btn = document.getElementById("saveEcuBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const input = document.getElementById("ecuNameInput");
    const ecuName = input.value.trim();

    if (!ecuName) {
      alert("ECU name is required");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ecus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ecu_name: ecuName })
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        alert(json.message || "Failed to create ECU");
        return;
      }

      bootstrap.Modal.getInstance(
        document.getElementById("addEcuModal")
      ).hide();

      input.value = "";
      loadEcuTopology();

    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  });
}

/* ===============================
   DELETE ECU
================================ */
async function deleteEcu(ecuId) {
  if (!ecuId) {
    console.error("Invalid ECU ID:", ecuId);
    alert("Invalid ECU ID");
    return;
  }

  if (!confirm("Delete this ECU?")) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/ecus/${ecuId}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Delete failed");
    }

    // ✅ Refresh list
    loadEcuTopology();

  } catch (err) {
    console.error("Delete ECU error:", err);
    alert("Delete failed");
  }
}


/* ===============================
   LOAD ECU TOPOLOGY
================================ */
async function loadEcuTopology() {
  const container = document.getElementById("ecuList");
  if (!container) return;

  container.innerHTML = `<div class="text-muted">Loading ECUs...</div>`;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/ecus`);
    const json = await res.json();

    // ✅ Backend-safe parsing
    const ecus = Array.isArray(json.data)
      ? json.data
      : [];

    container.innerHTML = "";

    if (ecus.length === 0) {
      container.innerHTML = `<div class="text-muted">No ECUs found</div>`;
      return;
    }

    ecus.forEach(ecu => {
      const ecuId = ecu.ecu_id ?? ecu.id;
      const ecuName = ecu.ecu_name ?? ecu.ecu ?? "Unnamed ECU";

      container.innerHTML += `
        <div class="d-flex justify-content-between align-items-center border rounded p-2 mb-2">
          <strong>${ecuName}</strong>
          <a href="#"
             class="text-danger delete-ecu"
             data-id="${ecuId}">
             ❌
          </a>
        </div>
      `;
    });

    bindDeleteEcu();

  } catch (err) {
    console.error("Failed to load ECUs", err);
    container.innerHTML =
      `<div class="text-danger">Failed to load ECUs</div>`;
  }
}

/* ===============================
   EVENTS
================================ */
function bindDeleteEcu() {
  const container = document.getElementById("ecuList");

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".delete-ecu");
    if (!btn) return;

    e.preventDefault();

    const ecuId = btn.dataset.id;
    console.log("Deleting ECU ID:", ecuId);

    deleteEcu(ecuId);
  });
}

function bindChevronRotation() {
  document.querySelectorAll(".ecu-chevron").forEach(icon => {
    const target = document.querySelector(icon.dataset.bsTarget);

    target.addEventListener("shown.bs.collapse", () =>
      icon.classList.add("rotate")
    );
    target.addEventListener("hidden.bs.collapse", () =>
      icon.classList.remove("rotate")
    );
  });
}
