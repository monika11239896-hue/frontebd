import { API_BASE_URL } from "./config.js";

let ECUS = [];

let CHANNELS = [];

let messageIndex = 0;

let TOPOLOGY_ID = null;

/* =========================

   ✅ MAIN INIT FUNCTION

========================= */

export async function initAddMessagePage() {
  const params = new URLSearchParams(window.location.search);

  //TOPOLOGY_ID = params.get("topology_id");

  TOPOLOGY_ID = 1;

  if (!TOPOLOGY_ID) {
    alert("Missing topology");

    return;
  }

  const addMsgBtn = document.getElementById("addMessageBtn");

  addMsgBtn.disabled = true;

  await loadInitialData();

  addMsgBtn.addEventListener("click", addMessage);

  document

    .getElementById("messagesForm")

    .addEventListener("submit", saveMessages);

  addMsgBtn.disabled = false;
}

async function saveMessages(e) {
  e.preventDefault();

  try {
    for (const msgBlock of document.querySelectorAll(".message-block")) {
      // ---------------- CREATE MESSAGE ----------------

      const msgPayload = {
        message_id: parseInt(msgBlock.querySelector(".msg-id").value, 10),

        name: msgBlock.querySelector(".msg-name").value.trim(),

        length: parseInt(msgBlock.querySelector(".msg-length").value, 10),

        is_extended: msgBlock.querySelector(".msg-ext").checked,

        send_type: msgBlock.querySelector(".msg-send-type")?.value || null,

        cycle_time: msgBlock.querySelector(".msg-cycle-time")?.value
          ? parseInt(msgBlock.querySelector(".msg-cycle-time").value, 10)
          : null,

        comment: msgBlock.querySelector(".msg-comment").value.trim(), // 🔴 FIX HERE

        channel_id: parseInt(msgBlock.querySelector(".msg-can").value, 10),

        tx_ecu_id: parseInt(
          msgBlock.querySelector(".msg-sender-radio:checked")?.value,

          10,
        ),
      }; //   msgBlock.querySelectorAll(".signal-block").forEach(sigBlock => {
      //     msg.signals.push({
      //       sig_name: sigBlock.querySelector(".sig-name").value.trim(),
      //       start_bit: parseInt(sigBlock.querySelector(".sig-start").value, 10),
      //       length: parseInt(sigBlock.querySelector(".sig-length").value, 10),
      //       is_signed: sigBlock.querySelector(".sig-signed").checked,
      //       is_float: sigBlock.querySelector(".sig-float").checked,
      //       is_multiplexed: sigBlock.querySelector(".sig-mux").value,
      //       multiplex_val: sigBlock.querySelector(".sig-mux-val").value,
      //       endianness: sigBlock.querySelector(".sig-endian").value,
      //       factor: parseFloat(sigBlock.querySelector(".sig-factor").value) || 1,
      //       offset: parseFloat(sigBlock.querySelector(".sig-offset").value) || 0,
      //       min_value: parseFloat(sigBlock.querySelector(".sig-min").value),
      //       max_value: parseFloat(sigBlock.querySelector(".sig-max").value),
      //       initial_value: sigBlock.querySelector(".sig-init").value,
      //       unit: sigBlock.querySelector(".sig-unit").value,
      //       comment: sigBlock.querySelector(".sig-comment").value,
      //       receiver_ecu: Array.from(
      //         sigBlock.querySelectorAll(".sig-receiver-checkbox:checked")
      //       ).map(cb => cb.value)
      //     });
      //   });
      //   messages.push(msg);
      // });
      // const payload = {
      //   topology_id: TOPOLOGY_ID,
      //   messages
      // };

      if (
        !msgPayload.message_id ||
        !msgPayload.name ||
        isNaN(msgPayload.length) ||
        isNaN(msgPayload.channel_id) ||
        isNaN(msgPayload.tx_ecu_id)
      ) {
        alert("Message ID, Name, Length, Channel and Sender ECU are required");

        return;
      }

      const msgRes = await fetch(`${API_BASE_URL}/api/v1/messages`, {
        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(msgPayload),
      });

      const msgJson = await msgRes.json();

      if (!msgJson.success) throw new Error("Message creation failed"); // const messageId = msgJson.data.message_id;
      // ---------------- CREATE SIGNALS ----------------

      const valueDesc = {};
 
      // Find all KV rows inside THIS signal block
      msgBlock.querySelectorAll(".kvPairs > div").forEach((row) => {
        const keyEl = row.querySelector(".kvKey");
        const valEl = row.querySelector(".kvValue");
      
        if (!keyEl || !valEl) return;
      
        const key = keyEl.value.trim();
        const val = valEl.value.trim();
      
        if (key === "" || val === "") return;
      
        valueDesc[key] = val;
      });

      const signals = [];

      msgBlock.querySelectorAll(".signal-block").forEach((sigBlock) => {
        signals.push({
          sig_name: sigBlock.querySelector(".sig-name").value.trim(),

          start_bit: parseInt(sigBlock.querySelector(".sig-start").value, 10),

          length: parseInt(sigBlock.querySelector(".sig-length").value, 10),

          is_signed: sigBlock.querySelector(".sig-signed").checked,

          is_float: sigBlock.querySelector(".sig-float").checked,

          is_multiplexed: sigBlock.querySelector(".sig-mux").value === "1",

          multiplex_val: sigBlock.querySelector(".sig-mux-val").value || null,

          endianness: sigBlock.querySelector(".sig-endian").value,

          factor: parseFloat(sigBlock.querySelector(".sig-factor").value) || 1,

          offset: parseFloat(sigBlock.querySelector(".sig-offset").value) || 0,

          min_value: sigBlock.querySelector(".sig-min").value || null,

          max_value: sigBlock.querySelector(".sig-max").value || null,

          initial_value: sigBlock.querySelector(".sig-init").value || null,

          unit: sigBlock.querySelector(".sig-unit").value || null,

          comment: sigBlock.querySelector(".sig-comment").value || null,

          message_id: msgPayload.message_id,

          valueDesc:Object.keys(valueDesc).length ? valueDesc : null,

          receiver_ecus: Array.from(
            sigBlock.querySelectorAll(".sig-receiver-checkbox:checked"),
          ).map((cb) => parseInt(cb.value)),
        });
      });

      if (signals.length > 0) {
        const sigRes = await fetch(`${API_BASE_URL}/api/v1/signals`, {
          method: "POST",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify(signals),
        });

        const sigJson = await sigRes.json();

        if (!sigRes.ok) {
          console.error("Signal API error:", sigJson);
          throw new Error("Signal creation failed");
        }
        console.log("Signal response:", sigJson);
      }
    }

    alert("Messages & Signals saved successfully");

    window.location.href = `/`;
  } catch (err) {
    console.error(err);

    alert("Failed to save messages");
  }
}

// if (json.success) {

//   alert("Messages saved successfully");

//   window.location.href = `topology.html?id=${TOPOLOGY_ID}`;

// } else {

//   alert("Failed to save messages");

//   console.error(json);

// }

//});

// ---------- Helpers ----------

function addMessage() {
  const container = document.getElementById("messagesContainer");

  const idx = messageIndex++;

  // Collapse all existing messages

  document.querySelectorAll(".message-block").forEach((m) => {
    m.classList.add("collapsed");
  });

  const msgDiv = document.createElement("div");

  msgDiv.classList.remove("collapsed");

  msgDiv.className = "border rounded p-2 mb-2 message-block";

  msgDiv.innerHTML = `
<div class="card shadow-sm mb-3 message-card">

  <!-- HEADER -->
  <div class="card-header bg-light collapsible-header">
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <strong class="msg-title">New Message</strong>
        <span class="badge bg-secondary ms-2 signal-count">0 Signals</span>
      </div>
      <div>
        <button type="button" class="btn btn-sm btn-outline-secondary toggle-msg">
          <i class="bi bi-chevron-down"></i>
        </button>
        <button type="button" class="btn btn-sm btn-outline-danger remove-msg">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </div>

    <!-- Signal summary when collapsed -->
    <div class="signal-summary small text-muted mt-1"></div>
  </div>

  <!-- BODY -->
  <div class="card-body collapsible-body">

    <!-- MESSAGE BASIC INFO -->
    <div class="row g-2 mb-3">
      <div class="col-md-2">
        <input type="number"
               class="form-control form-control-sm msg-id"
               placeholder="Msg ID">
      </div>

      <div class="col-md-4">
        <input class="form-control form-control-sm msg-name"
               placeholder="Message Name">
      </div>

      <div class="col-md-2">
        <input type="number"
               class="form-control form-control-sm msg-length"
               placeholder="Length">
      </div>

      <div class="col-md-2 d-flex align-items-center">
        <div class="form-check">
          <input type="checkbox"
                 class="form-check-input msg-ext"
                 id="extCheck">
          <label class="form-check-label small" for="extCheck">
            Extended
          </label>
        </div>
      </div>
    </div>

    <!-- SENDER ECU -->
    <div class="row mb-3">
      <div class="col-md-6">
        <label class="form-label small text-muted">Sender ECU</label>
        <input type="text"
               class="form-control form-control-sm sender-ecu-search"
               placeholder="Search Sender ECU">
        <div class="sender-ecu-list border rounded p-2 mt-1 bg-white"
             style="max-height:150px; overflow-y:auto"></div>
      </div>

      <div class="col-md-6">
        <label class="form-label small text-muted">CAN Channel</label>
        <select class="form-select form-select-sm msg-can">
          <option value="">Select CAN Channel</option>
          ${CHANNELS.map(
            (c) => `<option value="${c.channel_id}">${c.channel_name}</option>`,
          ).join("")}
        </select>
      </div>
    </div>

    <!-- SEND INFO -->
    <div class="row g-2 mb-3">
      <div class="col-md-6">
        <input class="form-control form-control-sm msg-send-type"
               placeholder="Send Type">
      </div>
      <div class="col-md-6">
        <input class="form-control form-control-sm msg-cycle-time"
               placeholder="Cycle Time (ms)">
      </div>
    </div>

    <!-- COMMENT -->
    <div class="mb-3">
      <textarea class="form-control form-control-sm msg-comment"
                rows="2"
                placeholder="Message Comment"></textarea>
    </div>

    <!-- SIGNALS -->
    <div class="signals-container mb-2"></div>

    <div class="text-end">
      <button type="button"
              class="btn btn-outline-primary btn-sm add-signal">
        + Add Signal
      </button>
    </div>

  </div>
</div>
`;

  const senderSearch = msgDiv.querySelector(".sender-ecu-search");

  const senderList = msgDiv.querySelector(".sender-ecu-list");

  senderList.innerHTML = "";

  ECUS.forEach((e) => {
    const div = document.createElement("div");

    div.className = "form-check small mb-1";

    div.innerHTML = `

    <input class="form-check-input msg-sender-radio"

           type="radio"

           name="sender-${idx}"

           id="sender-${idx}-${e.ecu_id}"

           value="${e.ecu_id}">

    <label class="form-check-label"

           for="sender-${idx}-${e.ecu_id}">

      ${e.ecu_name}

    </label>

  `;

    senderList.appendChild(div);
  });

  // Search filter

  senderSearch.addEventListener("input", () => {
    const q = senderSearch.value.toLowerCase();

    senderList.querySelectorAll(".form-check").forEach((div) => {
      div.style.display = div.textContent.toLowerCase().includes(q)
        ? ""
        : "none";
    });
  });

  const toggleBtn = msgDiv.querySelector(".toggle-msg");

  toggleBtn.onclick = () => {
    msgDiv.classList.toggle("collapsed");

    updateSignalSummary(msgDiv);
  };

  msgDiv.querySelector(".remove-msg").onclick = () => msgDiv.remove();

  msgDiv.querySelector(".add-signal").onclick = () =>
    addSignal(msgDiv.querySelector(".signals-container"));

  container.appendChild(msgDiv);

  updateSignalSummary(msgDiv);

  const nameInput = msgDiv.querySelector(".msg-name");

  const titleEl = msgDiv.querySelector(".msg-title");

  nameInput.addEventListener("input", () => {
    titleEl.textContent = nameInput.value || " Message";
  });
}

function addSignal(container) {
  const sigDiv = document.createElement("div");

  sigDiv.classList.remove("collapsed");

  sigDiv.className = "border rounded p-3 mt-3 signal-block";

  container.querySelectorAll(".signal-block").forEach((s) => {
    s.classList.add("collapsed");
  });

  sigDiv.innerHTML = `
<div class="card border-secondary mb-3 signal-card">

  <!-- HEADER -->
  <div class="card-header bg-light collapsible-header d-flex justify-content-between align-items-center">
    <strong class="sig-title">New Signal</strong>
    <div>
      <button type="button" class="btn btn-sm btn-outline-secondary toggle-sig">
        <i class="bi bi-chevron-down"></i>
      </button>
      <button type="button" class="btn btn-sm btn-outline-danger remove-sig">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
  </div>

  <!-- BODY -->
  <div class="card-body collapsible-body">

    <!-- BASIC SIGNAL INFO -->
    <div class="row g-2 mb-3">
      <div class="col-md-4">
        <input class="form-control form-control-sm sig-name"
               placeholder="Signal Name">
      </div>

      <div class="col-md-2">
        <input type="number"
               class="form-control form-control-sm sig-start"
               placeholder="Start Bit">
      </div>

      <div class="col-md-2">
        <input type="number"
               class="form-control form-control-sm sig-length"
               placeholder="Length">
      </div>

      <div class="col-md-2 d-flex align-items-center">
        <div class="form-check">
          <input class="form-check-input sig-signed" type="checkbox">
          <label class="form-check-label small">Signed</label>
        </div>
      </div>

      <div class="col-md-2 d-flex align-items-center">
        <div class="form-check">
          <input class="form-check-input sig-float" type="checkbox">
          <label class="form-check-label small">Float</label>
        </div>
      </div>
    </div>

    <!-- MULTIPLEX / ENDIAN / RECEIVER -->
    <div class="row g-2 mb-3">
      <div class="col-md-3">
        <label class="form-label small text-muted">Multiplexed</label>
        <select class="form-select form-select-sm sig-mux">
          <option value="0">No</option>
          <option value="1">Yes</option>
        </select>
      </div>

      <div class="col-md-3">
        <label class="form-label small text-muted">Mux Value</label>
        <input class="form-control form-control-sm sig-mux-val"
               placeholder="Multiplex Value"
               disabled>
      </div>

      <div class="col-md-3">
        <label class="form-label small text-muted">Endianness</label>
        <select class="form-select form-select-sm sig-endian">
          <option value="little_endian">Little Endian</option>
          <option value="big_endian">Big Endian</option>
        </select>
      </div>

      <div class="col-md-3">
        <label class="form-label small text-muted">Receiver ECU</label>
        <input type="text"
               class="form-control form-control-sm receiver-ecu-search"
               placeholder="Search Receiver ECU">
        <div class="receiver-ecu-list border rounded p-2 mt-1 bg-white"
             style="max-height:140px; overflow-y:auto"></div>
      </div>
    </div>

    <!-- SCALING / LIMITS -->
    <div class="row g-2 mb-3">
      <div class="col-md-2">
        <input type="number" step="0.01"
               class="form-control form-control-sm sig-factor"
               placeholder="Factor">
      </div>

      <div class="col-md-2">
        <input type="number" step="0.01"
               class="form-control form-control-sm sig-offset"
               placeholder="Offset">
      </div>

      <div class="col-md-2">
        <input type="number"
               class="form-control form-control-sm sig-min"
               placeholder="Min">
      </div>

      <div class="col-md-2">
        <input type="number"
               class="form-control form-control-sm sig-max"
               placeholder="Max">
      </div>

      <div class="col-md-2">
        <input class="form-control form-control-sm sig-init"
               placeholder="Initial">
      </div>

      <div class="col-md-2">
        <input class="form-control form-control-sm sig-unit"
               placeholder="Unit">
      </div>
    </div>

    <!-- TIMING -->
    <div class="row g-2 mb-3">
      <div class="col-md-3">
        <input type="number"
               class="form-control form-control-sm sig-GenSigCycleTime"
               placeholder="GenSigCycleTime (ms)">
      </div>
    </div>

    <!-- COMMENT -->
    <textarea class="form-control form-control-sm mb-3 sig-comment"
              rows="2"
              placeholder="Signal Comment"></textarea>

    <!-- VALUE DESCRIPTION -->
    <div class="border rounded p-2">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <strong style="font-size:14px">Value Description</strong>
        <button type="button"
                class="btn btn-outline-secondary btn-sm addKV">
          + Add Value
        </button>
      </div>

      <div class="kvPairs"></div>
    </div>

  </div>
</div>
`;

  // ---------- Receiver ECU (CHECKBOX + SEARCH) ----------

  const receiverSearch = sigDiv.querySelector(".receiver-ecu-search");

  const receiverList = sigDiv.querySelector(".receiver-ecu-list");

  receiverList.innerHTML = "";

  ECUS.forEach((e) => {
    const div = document.createElement("div");

    div.className = "form-check small mb-1";

    div.innerHTML = `

      <input class="form-check-input sig-receiver-checkbox"

            type="checkbox"

            id="recv-${Date.now()}-${e.ecu_id}"

            value="${e.ecu_id}">

      <label class="form-check-label"

            for="recv-${Date.now()}-${e.ecu_id}">

        ${e.ecu_name}

      </label>

    `;

    receiverList.appendChild(div);
  });

  // Search filter

  receiverSearch.addEventListener("input", () => {
    const q = receiverSearch.value.toLowerCase();

    receiverList.querySelectorAll(".form-check").forEach((div) => {
      div.style.display = div.textContent.toLowerCase().includes(q)
        ? ""
        : "none";
    });
  });

  sigDiv.querySelector(".toggle-sig").onclick = () => {
    sigDiv.classList.toggle("collapsed");
  };

  const sigNameInput = sigDiv.querySelector(".sig-name");

  const sigTitle = sigDiv.querySelector(".sig-title");

  sigNameInput.addEventListener("input", () => {
    sigTitle.textContent = sigNameInput.value || "Unnamed Signal";

    const messageDiv = sigDiv.closest(".message-block");

    updateSignalSummary(messageDiv);
  });

  sigDiv.querySelector(".remove-sig").onclick = () => {
    sigDiv.remove();

    updateSignalSummary(sigDiv.closest(".message-block"));
  };

  sigDiv.querySelector(".addKV").onclick = () => {
    const row = document.createElement("div");

    row.style.display = "flex";

    row.style.gap = "6px";

    row.style.marginBottom = "5px";

    row.innerHTML = `

      <input class="kvKey form-control form-control-sm" placeholder="Key" style="width:60px">

      <input class="kvValue form-control form-control-sm" placeholder="Value" style="flex:1">

      <button type="button" onclick="this.parentElement.remove()">X</button>

    `;

    sigDiv.querySelector(".kvPairs").appendChild(row);
  };

  sigDiv.querySelectorAll("input[type=number]").forEach((input) => {
    input.addEventListener("input", () => {
      const v = input.value;

      if (v !== "" && (v < 0 || v > 64)) {
        input.style.borderColor = "red";
      } else {
        input.style.borderColor = "";
      }
    });
  });

  // Multiplex toggle logic

  const muxSelect = sigDiv.querySelector(".sig-mux");

  const muxVal = sigDiv.querySelector(".sig-mux-val");

  muxSelect.addEventListener("change", () => {
    muxVal.disabled = muxSelect.value !== "1";

    if (muxVal.disabled) muxVal.value = "";
  });

  sigDiv.querySelector(".remove-sig").onclick = () => sigDiv.remove();

  container.appendChild(sigDiv);

  const messageDiv = container.closest(".message-block");

  updateSignalSummary(messageDiv);

  sigDiv.scrollIntoView({ behavior: "smooth" });
}

async function loadInitialData() {
  try {
    const [ecuRes, channelRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/v1/ecus`),

      fetch(`${API_BASE_URL}/api/v1/channels`),
    ]);

    const ecuJson = await ecuRes.json();

    const channelJson = await channelRes.json();

    if (!ecuJson.success || !channelJson.success) {
      throw new Error("Failed to load ECU or Channel data");
    }

    ECUS = ecuJson.data;

    CHANNELS = channelJson.data;

    console.log("ECUs loaded:", ECUS);

    console.log("Channels loaded:", CHANNELS);
  } catch (err) {
    console.error("Failed to load ECU/Channel data", err);
  }
}

function updateSignalSummary(messageDiv) {
  const summary = messageDiv.querySelector(".signal-summary");

  const countBadge = messageDiv.querySelector(".signal-count");

  const signals = messageDiv.querySelectorAll(".signal-block .sig-name");

  countBadge.textContent = `${signals.length} Signals`;

  if (signals.length === 0) {
    summary.textContent = "No signals";

    return;
  }

  summary.innerHTML = Array.from(signals)

    .map((s) => `• ${s.value || "Unnamed Signal"}`)

    .join("<br>");
}
