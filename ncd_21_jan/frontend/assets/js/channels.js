// channels.js
import { API_BASE_URL } from "./config.js";
let ECU_MAP = {};

/* ===============================
   INIT CAN CHANNELS (Topology page)
================================ */
export function initCanChannels() {
  const form = document.getElementById("canChannelForm");
  const modal = document.getElementById("canChannelModal");

  if (form) {
    form.addEventListener("submit", createCanChannel);
  }

  if (modal) {
    modal.addEventListener("show.bs.modal", loadEcusForChannelModal);
  }

  const search = document.getElementById("ecuSearch");
  if (search) {
    search.addEventListener("input", filterEcus);
  }

  loadCanChannels();
}

/* ===============================
   CREATE CAN CHANNEL
================================ */
async function createCanChannel(e) {
  e.preventDefault();

  const channelName = document.getElementById("canName").value.trim();
  // const metadataId = new URLSearchParams(window.location.search).get("id");
  const metadataId = 1;
  const ecuIds = Array.from(
    document.querySelectorAll("#ecuCheckboxList input:checked"),
  ).map((cb) => parseInt(cb.value));

  if (!channelName) {
    alert("Channel name missing");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/channels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel_name: channelName,
        metadata_id: metadataId,
        ecu_ids: ecuIds,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.detail || "Failed to create channel");
      return;
    }

    bootstrap.Modal.getInstance(
      document.getElementById("canChannelModal"),
    ).hide();

    e.target.reset();
    loadCanChannels();
  } catch (err) {
    console.error(err);
    alert("Network error");
  }
}

/* ===============================
   LOAD CAN CHANNELS
================================ */
export async function loadCanChannels() {
  await loadEcuMap();
  const container = document.getElementById("canChannelList");
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/channels`);
    const json = await res.json();

    if (!json.success) {
      alert(json.message);
      return;
    }

    container.innerHTML = "";

    if (json.data.length === 0) {
      container.innerHTML = `<div class="text-muted">No CAN channels added</div>`;
      return;
    }

    json.data.forEach((channel) => {
      const ecuBadges = channel.ecus.length
        ? channel.ecus
            .map(
              (ecuId) =>
                `<span class="badge bg-secondary me-1">
                ${ECU_MAP[ecuId] || `ECU-${ecuId}`}
              </span>`,
            )
            .join("")
        : `<span class="text-muted">No ECUs</span>`;

      container.innerHTML += `
         <div class="border rounded p-3 mb-2">
          <div class="d-flex justify-content-between">
            <strong>${channel.channel_name}</strong>
            <a href="#"
              class="text-danger delete-channel"
              data-id="${channel.channel_id}">
              Delete
            </a>
          </div>

          <div class="mt-2">
            <small class="text-muted">ECUs:</small>
            <div class="mt-1">${ecuBadges}</div>
          </div>
        </div>
      `;
    });

    bindDeleteChannel();
  } catch (err) {
    console.error("Failed to load channels", err);
  }
}

/* ===============================
   DELETE CAN CHANNEL
================================ */
function bindDeleteChannel() {
  document.querySelectorAll(".delete-channel").forEach((link) => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const id = link.dataset.id;

      if (!confirm("Delete this CAN channel?")) return;

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/channels/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          alert("Delete failed");
          return;
        }

        loadCanChannels();
      } catch (err) {
        console.error(err);
        alert("Network error");
      }
    });
  });
}

/* ===============================
   LOAD ECUs IN MODAL
================================ */
async function loadEcusForChannelModal() {
  const container = document.getElementById("ecuCheckboxList");
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/ecus`);
    const json = await res.json();

    if (!json.success) {
      alert(json.message);
      return;
    }

    container.innerHTML = "";

    if (json.data.length === 0) {
      container.innerHTML = `<div class="text-muted">No ECUs available</div>`;
      return;
    }

    json.data.forEach((ecu) => {
      container.innerHTML += `
        <div class="form-check">
          <input class="form-check-input"
                 type="checkbox"
                 value="${ecu.ecu_id}"
                 id="ecu_${ecu.ecu_id}">
          <label class="form-check-label" for="ecu_${ecu.ecu_id}">
            ${ecu.ecu_name}
          </label>
        </div>
      `;
    });
  } catch (err) {
    console.error("Failed to load ECUs", err);
  }
}

/* ===============================
   ECU SEARCH FILTER
================================ */
function filterEcus(e) {
  const search = e.target.value.toLowerCase();
  document.querySelectorAll("#ecuCheckboxList .form-check").forEach((item) => {
    item.style.display = item.textContent.toLowerCase().includes(search)
      ? ""
      : "none";
  });
}

async function loadEcuMap() {
  const res = await fetch(`${API_BASE_URL}/api/v1/ecus`);
  const json = await res.json();

  if (!json.success || !Array.isArray(json.data)) return;

  ECU_MAP = {};
  json.data.forEach((ecu) => {
    ECU_MAP[ecu.ecu_id] = ecu.ecu_name;
  });
}
