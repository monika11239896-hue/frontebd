//const API_BASE_URL = window.API_BASE_URL || "http://127.0.0.1:8000";
const API_BASE_URL = "";
document.addEventListener('DOMContentLoaded', () => {

  const saveBtn = document.getElementById("saveTopologyBtn");
  if (saveBtn) {
  saveBtn.addEventListener("click", async () => {
    const name = document.getElementById("topologyName").value;
    const version = document.getElementById("topologyVersion").value;
    const author = document.getElementById("topologyAuthor").value;

    if (!name) {
      alert("File name is required");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/metadata`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileName: name,
          version,
          author
        })
      });

      if (!response.ok) {
        const err = await response.text();
        console.error(err);
        alert("Failed to save topology");
        return;
      }
      const result = await response.json();
      window.location.href = `/topology.html?id=${result.data.id}`;
    } catch (e) {
      console.error(e);
      alert("Network error");
    }
  });
}



const saveEcuBtn = document.getElementById("saveEcuBtn");
if (saveEcuBtn) {
  saveEcuBtn.addEventListener("click", async () => {
    const ecuName = document.getElementById("ecuNameInput").value.trim();

    if (!ecuName) {
      alert("ECU name is required");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ecus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ecu_name: ecuName
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || "Failed to create ECU");
        return;
      }

      alert(`ECU "${data.data}" created successfully`);

      // Close modal
      bootstrap.Modal.getInstance(
        document.getElementById("addEcuModal")
      ).hide();

      // Reset input
      document.getElementById("ecuNameInput").value = "";

      // OPTIONAL: reload ECU list in CAN modal
      if (typeof loadECUs === "function") {
        loadECUs();
      }

    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  });
}

  /* ===============================
     LOAD METADATA LIST
  =============================== */
  async function loadMetadata() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/metadata`);
      const data_json = await response.json();

      const data = data_json.data;

      const container = document.getElementById("fileList");
      if (!container) return;

      container.innerHTML = "";

      
      if (!data || data.length === 0) {
        container.innerHTML = `<div class="text-muted">No files found</div>`;
        return;
      }

      data.forEach((item, index) => {
        container.innerHTML += `
          <div class="list-group-item d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-3">
              <span class="file-index">${index + 1}.</span>
              <div>
                <div class="file-name fw-bold">${item.fileName}</div>
                <small class="text-muted">
                  Version: ${item.version || "-"} |
                  Author: ${item.author || "-"}
                </small>
              </div>
            </div>

            <div class="row-actions text-end">
              <small class="text-muted me-3">
                ${timeAgo(item.created_at)}
              </small>
              <a href="/topology.html?id=${item.id}">View</a>
              <span class="mx-1">/</span>
              <a href="#">Edit</a>
              <span class="mx-1">/</span>
              <a href="#" class="text-danger"
                 onclick="deleteMetadata(${item.id})">
                 Delete
              </a>
            </div>
          </div>
        `;
      });

    } catch (err) {
      console.error("Failed to load metadata", err);
    }
  }

  /* ===============================
     DELETE METADATA
  =============================== */
  window.deleteMetadata = async function (id) {
    if (!confirm("Delete this file?")) return;

    const res = await fetch(`${API_BASE_URL}/api/v1/metadata/${id}`, {
      method: "DELETE"
    });

    if (res.ok) {
      loadMetadata();
    } else {
      alert("Delete failed");
    }
  };

  /* ===============================
     TIME AGO HELPER
  =============================== */
  function timeAgo(dateString) {
    const diff = Math.floor((Date.now() - new Date(dateString)) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff} minutes ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
    return `${Math.floor(diff / 1440)} days ago`;
  }

  /* ===============================
     INIT
  =============================== */
  loadMetadata();

/* ===============================
   LOAD TOPOLOGY HEADER
================================ */
async function loadTopologyHeader() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/metadata/${id}`);
    if (!res.ok) throw new Error("Not found");

    const json = await res.json();

    if (!json.success) {
      alert(json.message);
      return;
    }
    const data = json.data;

    document.querySelector("[data-topology-name]").textContent = data.fileName;
    document.querySelector("[data-topology-id]").textContent = data.id;
    document.querySelector("[data-topology-version]").textContent = data.version || "—";
    document.querySelector("[data-topology-author]").textContent = data.author || "—";

    document.getElementById("metaDate").textContent =
      new Date(data.created_at).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

  } catch (err) {
    console.error(err);
    alert("Failed to load topology info");
  }
}

if (window.location.pathname.includes("topology.html")) {
  loadTopologyHeader();
  loadCanChannels();
  loadEcuTopology(); 

}


  document.getElementById("canChannelForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const channelName = document.getElementById("canName").value.trim();
  const metadataId = new URLSearchParams(window.location.search).get("id");

  const selectedEcus = Array.from(
    document.querySelectorAll("#ecuCheckboxList input:checked")
  ).map(cb => parseInt(cb.value));

  if (!channelName || !metadataId) {
    alert("Channel name missing");
    return;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/channels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel_name: channelName,
      metadata_id: metadataId,
      ecu_ids: selectedEcus
    })
  });

  if (!res.ok) {
    const err = await res.json();
    alert(err.detail || "Failed to create channel");
    return;
  }

  alert("CAN Channel created");

  bootstrap.Modal.getInstance(
    document.getElementById("canChannelModal")
  ).hide();

  e.target.reset();
  await loadCanChannels();

});


  async function loadEcusForChannelModal() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/ecus`);
    const json = await res.json();

    if (!json.success) {
      alert(json.message);
      return;
    }

    const ecus = json.data;

    const container = document.getElementById("ecuCheckboxList");
    if (!container) return;

    container.innerHTML = "";

    if (ecus.length === 0) {
      container.innerHTML = `<div class="text-muted">No ECUs available</div>`;
      return;
    }

    ecus.forEach(ecu => {
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
const canModal = document.getElementById("canChannelModal");

if (canModal) {
  canModal.addEventListener("show.bs.modal", loadEcusForChannelModal);
}

async function loadCanChannels() {
  
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/channels`);

    const json = await res.json();

    if (!json.success) {
      alert(json.message);
      return;
    }

    const channels = json.data;
    const container = document.getElementById("canChannelList");
    if (!container) return;

    container.innerHTML = "";

    

    if (channels.length === 0) {
      container.innerHTML =
        `<div class="text-muted">No CAN channels added</div>`;
      return;
    }

    channels.forEach(channel => {
      const ecuBadges = channel.ecus.length
        ? channel.ecus.map(ecu =>
            `<span class="badge bg-secondary me-1">${ecu.ecu_name}</span>`
          ).join("")
        : `<span class="text-muted">No ECUs</span>`;

      container.innerHTML += `
        <div class="border rounded p-3 mb-2">
          <div class="d-flex justify-content-between align-items-center">
            <strong>${channel.channel_name}</strong>
            <div>
              <a href="#" class="me-2">Edit</a>
              <a href="#"
                class="text-danger"
                onclick="deleteChannel(${channel.channel_id})">
                Delete
              </a>
            </div>
          </div>

          <div class="mt-2">
            <small class="text-muted">ECUs:</small>
            <div class="mt-1">${ecuBadges}</div>
          </div>
        </div>
      `;
    });

  } catch (err) {
    console.error("Failed to load channels", err);
  }
}

window.deleteChannel = async function (channelId) {
  if (!confirm("Delete this CAN channel?")) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/channels/${channelId}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.detail || "Delete failed");
      return;
    }

    // refresh channel list
    loadCanChannels();

  } catch (err) {
    console.error("Delete channel failed", err);
    alert("Network error");
  }
};

window.deleteECU = async function (ecuID) {
  if (!confirm("Delete this ECU?")) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/ecus/${ecuID}`, {
      method: "DELETE"
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      alert(result.message || "Delete failed");
      return;
    }

    alert("ECU deleted successfully");

    // 🔄 refresh ECU list
    await loadECUs();   // or remove ECU row from DOM

  } catch (err) {
    console.error("Delete ECU failed", err);
    alert("Network error");
  }
};

document.getElementById("addMessage").addEventListener("click", async () => {
  const params = new URLSearchParams(window.location.search);
  
  const topologyId = params.get("id");
  window.location.href = `add-message.html?topology_id=${topologyId}`;
});
document.getElementById("backToHomePage").addEventListener("click", async () => {
    // Redirect with metadata
  window.location.href =
    `/`;
});

document.getElementById("createDbcBtn").addEventListener("click", async () => {
    // Redirect with metadata
  alert("This Page is under construction.")
});

let ecuData = [];


// ===== Render ECU List =====
function renderEcuList() {
  const container = document.getElementById("ecuList");
  if (!container) return;
  container.innerHTML = "";

  ecuData.forEach((ecu, i) => {
    const ecuCollapseId = `ecuCollapse_${i}`;

    const ecuBlock = document.createElement("div");
    ecuBlock.className = "mb-2";

    ecuBlock.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center gap-2">
          <span class="chevron bi bi-chevron-right"
                data-bs-toggle="collapse"
                data-bs-target="#${ecuCollapseId}">
          </span>
          <strong>${ecu.ecu}</strong>
        </div>
        <span>
          
          <a href="#" class="text-danger" style="text-decoration: none;" onclick="deleteECU(${ecu.ecu_id})">❌</a>
        </span>
      </div>

      <div class="collapse ms-4 mt-1" id="${ecuCollapseId}">
        ${
          ecu.messages.length
            ? ecu.messages.map(msg => `
                <div class="mt-1">
                  ↪ ${msg.name}
                  ${
                    msg.signals.length
                      ? `<ul class="list-unstyled ms-4 mt-1">
                          ${msg.signals.map(sig =>
                            `<li>↪ ${sig}</li>`
                          ).join("")}
                        </ul>`
                      : `<div class="text-muted ms-4">No signals</div>`
                  }
                </div>
              `).join("")
            : `<div class="text-muted">No messages</div>`
        }
      </div>
    `;

    container.appendChild(ecuBlock);
  });

  bindChevronRotation();
}

// ===== Chevron rotation =====
function bindChevronRotation() {
  document.querySelectorAll(".chevron").forEach(ch => {
    const target = document.querySelector(ch.dataset.bsTarget);

    target.addEventListener("shown.bs.collapse", () =>
      ch.classList.add("rotate")
    );
    target.addEventListener("hidden.bs.collapse", () =>
      ch.classList.remove("rotate")
    );
  });
}

async function loadEcuTopology() {
  const res = await fetch("/api/v1/ecu_topology");
  const json = await res.json();

  if (!json.success) {
    alert("Failed to load topology");
    return;
  }

  ecuData = json.data;
  renderEcuList();
}

document.getElementById("ecuSearch").addEventListener("input", function () {
  const search = this.value.toLowerCase();
  const items = document.querySelectorAll("#ecuCheckboxList .form-check");

  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(search) ? "" : "none";
  });
});


});



