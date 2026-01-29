import { API_BASE_URL } from "./config.js";

export function initCreateDbc() {
  // Open modal
  document.getElementById("createDbcBtn").addEventListener("click", () => {
    const modal = new bootstrap.Modal(
      document.getElementById("createDbcModal")
    );
    modal.show();
  });

  // Type change
  document.getElementById("dbcType").addEventListener("change", handleTypeChange);

  // Submit
  document
    .getElementById("createDbcForm")
    .addEventListener("submit", submitCreateDbc);

    document
  .getElementById("cancelCreateDbcBtn")
  .addEventListener("click", () => {
    const modalEl = document.getElementById("createDbcModal");
    const modal = bootstrap.Modal.getInstance(modalEl);

    if (modal) modal.hide();

    // 🔥 FORCE BACKDROP CLEANUP
    document.body.classList.remove("modal-open");
    document
      .querySelectorAll(".modal-backdrop")
      .forEach(b => b.remove());
  });
}

/* ===============================
   TYPE CHANGE
================================ */
async function handleTypeChange(e) {
  const type = e.target.value;

  document.getElementById("dbcEcuSection").classList.add("d-none");
  document.getElementById("dbcChannelSection").classList.add("d-none");

  if (type === "ecu") {
    document.getElementById("dbcEcuSection").classList.remove("d-none");
    await loadEcus();
  }

  if (type === "channel") {
    document.getElementById("dbcChannelSection").classList.remove("d-none");
    await loadChannels();
  }
}

/* ===============================
   LOAD ECUs
================================ */
async function loadEcus() {
  const container = document.getElementById("dbcEcuList");
  container.innerHTML = "Loading...";

  const res = await fetch(`${API_BASE_URL}/api/v1/ecus`);
  const json = await res.json();

  container.innerHTML = "";

  json.data.forEach(ecu => {
    container.innerHTML += `
      <div class="form-check">
        <input class="form-check-input" type="radio" name="ecu_id" value="${ecu.ecu_id}">
        <label class="form-check-label">${ecu.ecu_name}</label>
      </div>
    `;
  });
}

/* ===============================
   LOAD CHANNELS
================================ */
async function loadChannels() {
  const container = document.getElementById("dbcChannelList");
  container.innerHTML = "Loading...";

  const res = await fetch(`${API_BASE_URL}/api/v1/channels`);
  const json = await res.json();

  container.innerHTML = "";

  json.data.forEach(ch => {
    container.innerHTML += `
      <div class="form-check">
        <input class="form-check-input" type="radio" name="channel_id" value="${ch.channel_id}">
        <label class="form-check-label">${ch.channel_name}</label>
      </div>
    `;
  });
}

/* ===============================
   SUBMIT (BACKEND
================================ */
async function submitCreateDbc(e) {
  e.preventDefault();

  const dbcType = document.getElementById("dbcType").value;
  if (!dbcType) return alert("Select DBC type");

  const payload = { dbc_type: dbcType };

  // ECU DBC (normal)
  if (dbcType === "ecu") {
    const ecu = document.querySelector("input[name='ecu_id']:checked");
    if (!ecu) return alert("Select ECU");
    payload.ecu_id = parseInt(ecu.value);
  }

  if (dbcType === "channel") {
    const channel = document.querySelector(
      "input[name='channel_id']:checked"
    );
  
    if (!channel) {
      return alert("Select Channel");
    }
  
    const channelId = parseInt(channel.value);
  
    // ✅ REQUIRED BY BACKEND VALIDATION
    payload.channel_id = channelId;
  
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/dbc/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("DBC creation failed");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "can.dbc";
    document.body.appendChild(a);
    a.click();
    a.remove();

    bootstrap.Modal.getInstance(
      document.getElementById("createDbcModal")
    ).hide();


    const modalEl = document.getElementById("createDbcModal");
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();

    // 🔧 FORCE CLEANUP
    document.body.classList.remove("modal-open");
    document.querySelectorAll(".modal-backdrop").forEach(b => b.remove());

  } catch (err) {
    console.error(err);
    alert("Network error");
  }
}
