//changed function 
import { API_BASE_URL } from "./config.js";

let MESSAGES = [];
let ECUS = [];
let IS_EDIT_MODE = false;
let EDIT_SIGNAL_ID = null;

/* =========================
   ✅ MAIN INIT FUNCTION
========================= */
export async function initAddSignalPage() {
  let queryString = "";

  if (window.location.hash.includes("?")) {
    queryString = window.location.hash.split("?")[1];
  }

  const params = new URLSearchParams(queryString);
  EDIT_SIGNAL_ID = params.get("id");
  IS_EDIT_MODE = !!EDIT_SIGNAL_ID;

  await loadInitialData();

  const container = document.getElementById("signalsContainer");
  const form = document.getElementById("signalsForm");

  if (!container || !form) return;
  container.innerHTML = "";

  // Only single signal form, no Add button
  const sigDiv = createSignalForm(container);

  if (IS_EDIT_MODE) {
    await loadSignalForEdit(sigDiv, EDIT_SIGNAL_ID);
  }

  form.addEventListener("submit", submitSignal);
}

/* ================= DATA LOAD ================= */
async function loadInitialData() {
  const [msgRes, ecuRes] = await Promise.all([
    fetch(`${API_BASE_URL}/api/v1/messages`),
    fetch(`${API_BASE_URL}/api/v1/ecus`),
  ]);

  const msgJson = await msgRes.json();
  const ecuJson = await ecuRes.json();

  if (!msgJson.success || !ecuJson.success) {
    throw new Error("Failed to load Messages / ECUs");
  }

  MESSAGES = msgJson.data;
  ECUS = ecuJson.data;
}

async function loadSignalForEdit(sigDiv, signalId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/signals/${signalId}`);
  const json = await res.json();

  if (!json.success) {
    alert("Failed to load signal");
    return;
  }

  const signal = json.data;
  fillSignalForm(sigDiv, signal);
}

/* ================= CREATE SIGNAL FORM ================= */
function createSignalForm(container) {
  const sigDiv = document.createElement("div");
  sigDiv.className = "border rounded p-3 mt-3 signal-block";

  sigDiv.innerHTML = `
    <div class="collapsible-header d-flex justify-content-between align-items-center mb-2">
      <strong class="sig-title">New Signal</strong>
    </div>

    <div class="collapsible-body mt-2">
      <!-- MESSAGE -->
      <div class="mb-3">
        <label class="form-label">Message *</label>
        <input type="text" class="form-control form-control-sm msg-search" placeholder="Search Message">
        <div class="msg-list border rounded p-2 mt-1" style="max-height:150px; overflow-y:auto"></div>
        <input type="hidden" class="sig-message" required>
      </div>

      <div class="row g-2">
        <div class="col-md-4">
          <input class="form-control form-control-sm sig-name" placeholder="Signal Name">
        </div>
        <div class="col-md-2">
          <input type="number" class="form-control form-control-sm sig-start" placeholder="Start Bit">
        </div>
        <div class="col-md-2">
          <input type="number" class="form-control form-control-sm sig-length" placeholder="Length">
        </div>
        <div class="col-md-2 form-check mt-2">
          <input class="form-check-input sig-signed" type="checkbox">
          <label class="form-check-label small">Signed</label>
        </div>
        <div class="col-md-2 form-check mt-2">
          <input class="form-check-input sig-float" type="checkbox">
          <label class="form-check-label small">Float</label>
        </div>
      </div>

      <div class="row g-2 mt-2">
        <div class="col-md-3">
          <select class="form-select form-select-sm sig-mux">
            <option value="0">No</option>
            <option value="1">Yes</option>
          </select>
        </div>
        <div class="col-md-3">
          <input class="form-control form-control-sm sig-mux-val" placeholder="Multiplex Value" disabled>
        </div>
        <div class="col-md-3">
          <select class="form-select form-select-sm sig-endian">
            <option value="little_endian">Little Endian</option>
            <option value="big_endian">Big Endian</option>
          </select>
        </div>
        <div class="col-md-3">
          <input type="text" class="form-control form-control-sm receiver-ecu-search" placeholder="Search Receiver ECU">
          <div class="receiver-ecu-list border rounded p-2 mt-1" style="max-height:140px; overflow-y:auto"></div>
        </div>
      </div>

      <div class="row g-2 mt-2">
        <div class="col-md-2">
          <input type="number" step="0.01" class="form-control form-control-sm sig-factor" placeholder="Factor">
        </div>
        <div class="col-md-2">
          <input type="number" step="0.01" class="form-control form-control-sm sig-offset" placeholder="Offset">
        </div>
        <div class="col-md-2">
          <input type="number" class="form-control form-control-sm sig-min" placeholder="Min">
        </div>
        <div class="col-md-2">
          <input type="number" class="form-control form-control-sm sig-max" placeholder="Max">
        </div>
        <div class="col-md-2">
          <input class="form-control form-control-sm sig-init" placeholder="Initial Value">
        </div>
        <div class="col-md-2 mb-2">
          <input class="form-control form-control-sm sig-unit" placeholder="Unit">
        </div>
      </div>

      <div class="col-md-2 mt-2">
        <input type="number" class="form-control form-control-sm sig-GenSigCycleTime" placeholder="GenSigCycleTime">
      </div>

      <textarea class="form-control form-control-sm mt-2 mb-2 sig-comment" placeholder="Comment"></textarea>

      <h4 style="font-size:15px">Value Description*</h4>
      <div class="kvPairs"></div>
      <button type="button" class="addKV btn btn-secondary btn-sm">+ Add Value</button>
    </div>
  `;

  container.appendChild(sigDiv);
  container.scrollIntoView({ behavior: "smooth" });

  initSignalLogic(sigDiv);

  return sigDiv;
}

/* ================= INITIALIZE SIGNAL FORM LOGIC ================= */
function initSignalLogic(sigDiv) {
  // Message selection
  const msgSearch = sigDiv.querySelector(".msg-search");
  const msgList = sigDiv.querySelector(".msg-list");
  const msgHidden = sigDiv.querySelector(".sig-message");
  const radioGroupName = `msg-${Date.now()}-${Math.random()}`;

  function renderMsgList(list) {
    msgList.innerHTML = "";
    list.forEach((m) => {
      const div = document.createElement("div");
      div.className = "form-check small mb-1 msg-item";
      div.innerHTML = `
        <input class="form-check-input" type="radio" name="${radioGroupName}" value="${m.message_id}">
        <label class="form-check-label">${m.msg_name}</label>
      `;
      const radio = div.querySelector("input");
      radio.addEventListener("change", () => {
        msgHidden.value = radio.value;
        msgSearch.value = m.msg_name;
        msgList.querySelectorAll(".msg-item").forEach((i) => i.classList.remove("bg-light"));
        div.classList.add("bg-light");
      });
      msgList.appendChild(div);
    });
  }

  renderMsgList(MESSAGES);
  msgSearch.addEventListener("input", () => {
    const q = msgSearch.value.toLowerCase().trim();
    renderMsgList(MESSAGES.filter((m) => m.msg_name.toLowerCase().includes(q)));
  });

  // Signal name updates title
  const sigNameInput = sigDiv.querySelector(".sig-name");
  const sigTitle = sigDiv.querySelector(".sig-title");
  sigNameInput.addEventListener("input", () => {
    sigTitle.textContent = sigNameInput.value || "Unnamed Signal";
  });

  // Add key-value pairs
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

  // Number input validation
  sigDiv.querySelectorAll("input[type=number]").forEach((input) => {
    input.addEventListener("input", () => {
      const v = input.value;
      input.style.borderColor = (v !== "" && (v < 0 || v > 64)) ? "red" : "";
    });
  });

  // Multiplex toggle logic
  const muxSelect = sigDiv.querySelector(".sig-mux");
  const muxVal = sigDiv.querySelector(".sig-mux-val");
  muxSelect.addEventListener("change", () => {
    muxVal.disabled = muxSelect.value !== "1";
    if (muxVal.disabled) muxVal.value = "";
  });

  // Receiver ECU search
  const receiverSearch = sigDiv.querySelector(".receiver-ecu-search");
  const receiverList = sigDiv.querySelector(".receiver-ecu-list");
  receiverList.innerHTML = "";
  ECUS.forEach((e) => {
    const id = `recv-${Date.now()}-${Math.random()}-${e.ecu_id}`;
    const div = document.createElement("div");
    div.className = "form-check small mb-1";
    div.innerHTML = `
      <input class="form-check-input sig-receiver-checkbox" type="checkbox" id="${id}" value="${e.ecu_id}">
      <label class="form-check-label" for="${id}">${e.ecu_name}</label>
    `;
    receiverList.appendChild(div);
  });

  receiverSearch.addEventListener("input", () => {
    const q = receiverSearch.value.toLowerCase();
    receiverList.querySelectorAll(".form-check").forEach((div) => {
      div.style.display = div.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });
}

/* ================= SUBMIT SIGNAL ================= */
async function submitSignal(e) {
  e.preventDefault();

  const sigDiv = document.querySelector(".signal-block");

  const messageId = sigDiv.querySelector(".sig-message").value;
  if (!messageId) {
    alert("Please select a message");
    return;
  }

  const genSigCycleTimeInput = sigDiv.querySelector(".sig-GenSigCycleTime");
  const genSigCycleTimeValue = genSigCycleTimeInput && genSigCycleTimeInput.value 
    ? parseInt(genSigCycleTimeInput.value, 10) 
    : null;

  const payload = {
    message_id: parseInt(messageId, 10),
    sig_name: sigDiv.querySelector(".sig-name").value.trim(),
    start_bit: parseInt(sigDiv.querySelector(".sig-start").value, 10),
    length: parseInt(sigDiv.querySelector(".sig-length").value, 10),
    is_signed: sigDiv.querySelector(".sig-signed").checked,
    is_float: sigDiv.querySelector(".sig-float").checked,
    is_multiplexed: Boolean(sigDiv.querySelector(".sig-mux").value === "1"),
    multiplex_val: sigDiv.querySelector(".sig-mux-val").value || null,
    endianness: sigDiv.querySelector(".sig-endian").value,
    factor: parseFloat(sigDiv.querySelector(".sig-factor").value) || 1,
    offset: parseFloat(sigDiv.querySelector(".sig-offset").value) || 0,
    min_value: parseFloat(sigDiv.querySelector(".sig-min").value),
    max_value: parseFloat(sigDiv.querySelector(".sig-max").value),
    initial_value: parseFloat(sigDiv.querySelector(".sig-init").value) || 0,
    unit: sigDiv.querySelector(".sig-unit").value,
    comment: sigDiv.querySelector(".sig-comment").value,
    gen_sig_cycle_time: genSigCycleTimeValue,
    receiver_ecus: Array.from(sigDiv.querySelectorAll(".sig-receiver-checkbox:checked"))
      .map((cb) => parseInt(cb.value)),
  };

  const url = IS_EDIT_MODE
    ? `${API_BASE_URL}/api/v1/signals/${EDIT_SIGNAL_ID}`
    : `${API_BASE_URL}/api/v1/signals`;

  const method = IS_EDIT_MODE ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (json.success) {
    alert("Signal saved successfully");
    window.history.back();
  } else {
    alert("Failed to save signal");
    console.error(json);
  }
}

/* ================= FILL SIGNAL FORM ================= */
function fillSignalForm(sigDiv, signal) {
  // Message
  sigDiv.querySelector(".sig-message").value = signal.message_id;
  const selectedMessage = MESSAGES.find(m => m.message_id === signal.message_id);
  const msgSearch = sigDiv.querySelector(".msg-search");
  const msgList = sigDiv.querySelector(".msg-list");
  if (selectedMessage) {
    msgSearch.value = selectedMessage.msg_name;
    setTimeout(() => {
      const radioToCheck = msgList.querySelector(`input[value="${signal.message_id}"]`);
      if (radioToCheck) {
        radioToCheck.checked = true;
        radioToCheck.closest('.msg-item')?.classList.add('bg-light');
      }
    }, 100);
  }

  // Basic fields
  sigDiv.querySelector(".sig-name").value = signal.sig_name || "";
  sigDiv.querySelector(".sig-start").value = signal.start_bit || "";
  sigDiv.querySelector(".sig-length").value = signal.length || "";
  sigDiv.querySelector(".sig-signed").checked = signal.is_signed || false;
  sigDiv.querySelector(".sig-float").checked = signal.is_float || false;

  // Mux
  sigDiv.querySelector(".sig-mux").value = signal.is_multiplexed ? "1" : "0";
  sigDiv.querySelector(".sig-mux-val").value = signal.multiplex_val || "";
  sigDiv.querySelector(".sig-mux-val").disabled = !signal.is_multiplexed;

  // Endian
  sigDiv.querySelector(".sig-endian").value = signal.endianness || "little_endian";

  // Numeric
  sigDiv.querySelector(".sig-factor").value = signal.factor ?? "";
  sigDiv.querySelector(".sig-offset").value = signal.offset ?? "";
  sigDiv.querySelector(".sig-min").value = signal.min_value ?? "";
  sigDiv.querySelector(".sig-max").value = signal.max_value ?? "";
  sigDiv.querySelector(".sig-init").value = signal.initial_value ?? "";

  // Text
  sigDiv.querySelector(".sig-unit").value = signal.unit || "";
  sigDiv.querySelector(".sig-comment").value = signal.comment || "";

  // GenSigCycleTime
  const genSigCycleTimeInput = sigDiv.querySelector(".sig-GenSigCycleTime");
  if (genSigCycleTimeInput) {
    genSigCycleTimeInput.value = signal.gen_sig_cycle_time ?? "";
  }

  // Receiver ECUs
  setTimeout(() => {
    sigDiv.querySelectorAll(".sig-receiver-checkbox").forEach(cb => {
      const ecuId = parseInt(cb.value);
      cb.checked = signal.receiver_ecus?.includes(ecuId) || false;
    });
  }, 100);

  // Title
  sigDiv.querySelector(".sig-title").textContent = signal.sig_name || "Unnamed Signal";
}
