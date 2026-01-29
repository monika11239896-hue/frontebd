// ================= STATE =================
let selectedReceiver = "";

// ================= DOM (lazy) =================
let tbody;
let searchInput;
let messageTitle;
let messageDetails;

// ================= DATA (dummy for now) =================
const signals = [
  { id: 1, name: "Engine_RPM", receiver: "ECU_Dashboard", msgId: "1001" },
  { id: 2, name: "Engine_Temp", receiver: "ECU_AC", msgId: "1001" },
  { id: 3, name: "Oil_Pressure", receiver: "ECU_Service", msgId: "1001" },
  { id: 4, name: "Battery_Voltage", receiver: "ECU_Body", msgId: "1002" },
];

let messageSignals = [];
let messageId;
let messageName;

// ================= CORE =================
function renderSignals() {
  const search = searchInput.value.toLowerCase();
  tbody.innerHTML = "";

  const filtered = messageSignals.filter(
    (s) =>
      (!selectedReceiver || s.receiver === selectedReceiver) &&
      (!search || `${s.name} ${s.receiver}`.toLowerCase().includes(search)),
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted">
          No signals found for this message
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach((s, index) => {
    tbody.insertAdjacentHTML(
      "beforeend",
      `
        <tr>
          <td>${index + 1}</td>
          <td>${s.name}</td>
          <td><span class="badge badge-ecu">${s.receiver}</span></td>
          <td class="text-end">
            <button class="action-btn"><i class="bi bi-eye"></i></button>
            <button class="action-btn"><i class="bi bi-pencil"></i></button>
            <button class="action-btn text-danger"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `,
    );
  });
}

function populateReceiverFilter() {
  const list = document.getElementById("receiverEcuList");
  const ecus = [...new Set(messageSignals.map((s) => s.receiver))];

  list.innerHTML =
    `<div class="filter-item" data-receiver="">All</div>` +
    ecus
      .map((e) => `<div class="filter-item" data-receiver="${e}">${e}</div>`)
      .join("");

  list.querySelectorAll("[data-receiver]").forEach((el) =>
    el.addEventListener("click", () => {
      selectedReceiver = el.dataset.receiver;
      renderSignals();
    }),
  );
}

export function filterDropdown(input) {
  const value = input.value.toLowerCase();
  document.querySelectorAll(".filter-item").forEach((item) => {
    item.style.display =
      item.textContent === "All" ||
      item.textContent.toLowerCase().includes(value)
        ? "block"
        : "none";
  });
}
// ================= INIT (EXPORT) =================
export function initSignalListPage(msgId, msgName) {
  // DOM refs (NOW available because modal HTML is injected)
  tbody = document.getElementById("signalTableBody");
  searchInput = document.getElementById("signalSearch");
  messageTitle = document.getElementById("messageTitle");
  messageDetails = document.getElementById("messageDetails");

  if (!tbody || !searchInput) {
    console.error("Signal list DOM not found");
    return;
  }

  // ✅ Assign values from parameters
  messageId = String(msgId);
  messageName = msgName;

  // Header
  if (messageTitle) {
    messageTitle.textContent = `Signals – ${messageName}`;
  }
  if (messageDetails) {
    messageDetails.textContent = `Message ID: ${messageId}`;
  }

  // Filter signals for selected message
  messageSignals = signals.filter((s) => String(s.msgId) === String(messageId));

  searchInput.addEventListener("input", renderSignals);

  populateReceiverFilter();
  renderSignals();
}
