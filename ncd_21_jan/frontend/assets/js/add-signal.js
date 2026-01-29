import { API_BASE_URL } from "./config.js";

let MESSAGES = [];

let ECUS = [];

/* =========================

   ✅ MAIN INIT FUNCTION

========================= */

export async function initAddSignalPage() {
  await loadInitialData();

  const addBtn = document.getElementById("addSignalBtn");

  const container = document.getElementById("signalsContainer");

  const form = document.getElementById("signalsForm");

  if (!addBtn || !container || !form) {
    console.error("Add Signal page DOM not found");

    return;
  }

  addBtn.addEventListener("click", () => addSignal(container));

  form.addEventListener("submit", submitSignals);

  const backBtn = document.getElementById("backToTopology");

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      const params = new URLSearchParams(window.location.search);

      const topologyId = params.get("topology_id");

      window.location.href = `topology.html?id=${topologyId}`;
    });
  }
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

function addSignal(container) {
  const sigDiv = document.createElement("div");

  sigDiv.classList.remove("collapsed");

  sigDiv.className = "border rounded p-3 mt-3 signal-block";

  container.querySelectorAll(".signal-block").forEach((s) => {
    s.classList.add("collapsed");
  });

  sigDiv.innerHTML = `

    <div class="collapsible-header d-flex justify-content-between align-items-center mb-2">

      <strong class="sig-title">New Signal</strong>

      <div>

        <button type="button" class="btn btn-sm btn-link toggle-sig">▼</button>

        <button type="button" class="btn btn-sm btn-link text-danger remove-sig">✕</button>

      </div>

    </div>



<div class="collapsible-body mt-2">



     <!-- MESSAGE -->

     

    <div class="mb-3">

      <label class="form-label">Message *</label>



      <input type="text"

            class="form-control form-control-sm msg-search"

            placeholder="Search Message">



      <div class="msg-list border rounded p-2 mt-1"

          style="max-height:150px; overflow-y:auto">

      </div>



      <!-- hidden selected value -->

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

        <input class="form-control form-control-sm sig-mux-val"

               placeholder="Multiplex Value"

               disabled>

      </div>



      <div class="col-md-3">

        <select class="form-select form-select-sm sig-endian">

          <option value="little_endian" >Little Endian</option>

          <option value="big_endian">Big Endian</option>

        </select>

      </div>

      <div class="col-md-3">

        <input type="text"

              class="form-control form-control-sm receiver-ecu-search"

              placeholder="Search Receiver ECU">



        <div class="receiver-ecu-list border rounded p-2 mt-1"

            style="max-height:140px; overflow-y:auto">

        </div>

      </div>



    </div>



    <div class="row g-2 mt-2">

      <div class="col-md-2">

        <input type="number" step="0.01" class="form-control form-control-sm sig-factor" placeholder="Factor" value="">

      </div>

      <div class="col-md-2">

        <input type="number" step="0.01" class="form-control form-control-sm sig-offset" placeholder="Offset" value="">

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

    <div class="col-md-2">

        <input type="number" class="form-control form-control-sm sig-GenSigCycleTime" placeholder="GenSigCycleTime">

    </div>

    <textarea class="form-control form-control-sm mt-2 mb-2 sig-comment"

              placeholder="Comment"></textarea>



    <h4 style="font-size:15px">Value Description*</h4>

    <div class="kvPairs"></div>

    <button type="button" class="addKV btn btn-secondary btn-sm">+ Add Value</button>

    <br>

  `;

  // ---------- Receiver ECU (CHECKBOX + SEARCH) ----------

  const receiverSearch = sigDiv.querySelector(".receiver-ecu-search");

  const receiverList = sigDiv.querySelector(".receiver-ecu-list");

  receiverList.innerHTML = "";

  ECUS.forEach((e) => {
    const id = `recv-${Date.now()}-${e.ecu_id}`;

    const div = document.createElement("div");

    div.className = "form-check small mb-1";

    div.innerHTML = `

    <input class="form-check-input sig-receiver-checkbox"

           type="checkbox"

           id="${id}"

           value="${e.ecu_id}">

    <label class="form-check-label" for="${id}">

      ${e.ecu_name}

    </label>

  `;

    initMessageSelector(sigDiv);

    initReceiverECUs(sigDiv);

    bindSignalEvents(sigDiv);

    container.appendChild(sigDiv);

    sigDiv.scrollIntoView({ behavior: "smooth" });
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

  const msgSearch = sigDiv.querySelector(".msg-search");

  const msgList = sigDiv.querySelector(".msg-list");

  const msgHidden = sigDiv.querySelector(".sig-message");

  // render list

  function renderMsgList(list) {
    msgList.innerHTML = "";

    list.forEach((m) => {
      const div = document.createElement("div");

      div.className = "form-check small mb-1 msg-item";

      div.innerHTML = `

          <input class="form-check-input"

                type="radio"

                name="msg-${Date.now()}"

                value="${m.message_id}">

          <label class="form-check-label">

            ${m.msg_name}

          </label>

        `;

      const radio = div.querySelector("input");

      radio.addEventListener("change", () => {
        msgHidden.value = radio.value;

        msgSearch.value = m.msg_name;

        // highlight selected

        msgList

          .querySelectorAll(".msg-item")

          .forEach((i) => i.classList.remove("bg-light"));

        div.classList.add("bg-light");
      });

      msgList.appendChild(div);
    });
  }

  // initial render

  renderMsgList(MESSAGES);

  // search filter

  msgSearch.addEventListener("input", () => {
    const q = msgSearch.value.toLowerCase().trim();

    if (!q) {
      renderMsgList(MESSAGES);

      return;
    }

    const filtered = MESSAGES.filter((m) =>
      m.msg_name.toLowerCase().includes(q),
    );

    renderMsgList(filtered);
  });

  sigDiv.querySelector(".toggle-sig").onclick = () => {
    sigDiv.classList.toggle("collapsed");
  };

  const sigNameInput = sigDiv.querySelector(".sig-name");

  const sigTitle = sigDiv.querySelector(".sig-title");

  sigNameInput.addEventListener("input", () => {
    sigTitle.textContent = sigNameInput.value || "Unnamed Signal";

    const messageDiv = sigDiv.closest(".message-block");
  });

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

  sigDiv.scrollIntoView({ behavior: "smooth" });
}

/* =========================

   📩 MESSAGE SEARCH

========================= */

function initMessageSelector(sigDiv) {
  const search = sigDiv.querySelector(".msg-search");

  const list = sigDiv.querySelector(".msg-list");

  const hidden = sigDiv.querySelector(".sig-message");

  function render(messages) {
    list.innerHTML = "";

    messages.forEach((m) => {
      const div = document.createElement("div");

      div.className = "form-check small";

      div.innerHTML = `

        <input class="form-check-input" type="radio" name="msg-${Date.now()}" value="${m.message_id}">

        <label class="form-check-label">${m.msg_name}</label>

      `;

      div.querySelector("input").addEventListener("change", () => {
        hidden.value = m.message_id;

        search.value = m.msg_name;
      });

      list.appendChild(div);
    });
  }

  render(MESSAGES);

  search.addEventListener("input", () => {
    const q = search.value.toLowerCase();

    render(MESSAGES.filter((m) => m.msg_name.toLowerCase().includes(q)));
  });
}

/* =========================

   👥 RECEIVER ECUs

========================= */

function initReceiverECUs(sigDiv) {
  const list = sigDiv.querySelector(".receiver-ecu-list");

  if (!list) return;

  ECUS.forEach((e) => {
    list.insertAdjacentHTML(
      "beforeend",

      `

      <div class="form-check small">

        <input class="form-check-input sig-receiver-checkbox" type="checkbox" value="${e.ecu_id}">

        <label class="form-check-label">${e.ecu_name}</label>

      </div>

    `,
    );
  });
}

/* =========================

   🎛️ EVENTS

========================= */

function bindSignalEvents(sigDiv) {
  sigDiv.querySelector(".toggle-sig").onclick = () =>
    sigDiv.classList.toggle("collapsed");

  sigDiv.querySelector(".remove-sig").onclick = () => sigDiv.remove();

  sigDiv.querySelector(".sig-name").addEventListener("input", (e) => {
    sigDiv.querySelector(".sig-title").textContent =
      e.target.value || "Unnamed Signal";
  });
}

async function submitSignals(e) {
  e.preventDefault();

  const payload = [];

  function collectValueDesc(sigDiv) {
    const obj = {};

    sigDiv.querySelectorAll(".kvPairs > div").forEach((row) => {
      const key = row.querySelector(".kvKey").value.trim();

      const value = row.querySelector(".kvValue").value.trim();

      if (key !== "" && key != null) {
        obj[String(key)] = value ?? "";
      }
    });

    return obj;
  }

  let hasError = false;

  document.querySelectorAll(".signal-block").forEach((sig) => {
    const messageId = sig.querySelector(".sig-message").value;

    if (!messageId) {
      alert("Please select a message for all signals");

      hasError = true;

      return;
    }

    payload.push({
      message_id: parseInt(messageId, 10), // ⭐ IMPORTANT

      sig_name: sig.querySelector(".sig-name").value.trim(),

      start_bit: parseInt(sig.querySelector(".sig-start").value, 10),

      length: parseInt(sig.querySelector(".sig-length").value, 10),

      is_signed: sig.querySelector(".sig-signed").checked,

      is_float: sig.querySelector(".sig-float").checked,

      is_multiplexed: Boolean(sig.querySelector(".sig-mux").value === "1"),

      multiplex_val: sig.querySelector(".sig-mux-val").value || null,

      endianness: sig.querySelector(".sig-endian").value,

      factor: parseFloat(sig.querySelector(".sig-factor").value) || 1,

      offset: parseFloat(sig.querySelector(".sig-offset").value) || 0,

      min_value: parseFloat(sig.querySelector(".sig-min").value),

      max_value: parseFloat(sig.querySelector(".sig-max").value),

      initial_value: parseFloat(sig.querySelector(".sig-init").value) || 0,

      unit: sig.querySelector(".sig-unit").value,

      comment: sig.querySelector(".sig-comment").value,

      //value_desc: JSON.stringify(collectValueDesc(sig)),

      receiver_ecus: Array.from(
        sig.querySelectorAll(".sig-receiver-checkbox:checked"),
      ).map((cb) => parseInt(cb.value)),
    });
  });

  if (hasError) return;

  const res = await fetch(`${API_BASE_URL}/api/v1/signals`, {
    method: "POST",

    headers: { "Content-Type": "application/json" },

    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (json.success) {
    alert("Signals added successfully");

    window.history.back();
  } else {
    alert("Failed to add signals");

    console.error(json);
  }
}

const backToTopology = document.getElementById("backToTopology");

if (backToTopology) {
  backToTopology.addEventListener("click", () => {
    const params = new URLSearchParams(window.location.search);

    const topologyId = params.get("topology_id");

    window.location.href = `topology.html?id=${topologyId}`;
  });
}
