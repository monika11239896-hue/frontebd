import { API_BASE_URL } from "./config.js";

let messages = [];
async function fetchMessages() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/messages`);
    if (!res.ok) throw new Error("Fetch failed");

    const json = await res.json();

    messages = json.data.map((m) => ({
      id: m.message_id,
      name: m.msg_name,
      ecu: ECU_MAP[m.sender_ecu_id] || `ECU-${m.sender_ecu_id}`,
      channel: CHANNEL_MAP[m.channel_id] || `CH-${m.channel_id}`,
    }));
  } catch (err) {
    console.error(err);
    messages = [];
  }
}

let ECU_MAP = {};
let CHANNEL_MAP = {};

async function fetchLookups() {
  const [ecuRes, channelRes] = await Promise.all([
    fetch(`${API_BASE_URL}/api/v1/ecus`),
    fetch(`${API_BASE_URL}/api/v1/channels`),
  ]);

  const ecus = await ecuRes.json();
  const channels = await channelRes.json();

  ecus.data.forEach((e) => (ECU_MAP[e.ecu_id] = e.ecu_name));
  channels.data.forEach((c) => (CHANNEL_MAP[c.channel_id] = c.channel_name));
}
// ================= STATE =================
let selectedECU = "";
let selectedChannel = "";

// ================= DOM (lazy init) =================
let tbody;
let globalSearch;

// ================= CORE FUNCTIONS =================
function renderTable() {
  const search = globalSearch.value.toLowerCase();

  const filtered = messages.filter(
    (m) =>
      (!selectedECU || m.ecu === selectedECU) &&
      (!selectedChannel || m.channel === selectedChannel) &&
      (!search ||
        `${m.id} ${m.name} ${m.ecu} ${m.channel}`
          .toLowerCase()
          .includes(search)),
  );

  tbody.innerHTML = "";

  filtered.forEach((m) => {
    tbody.insertAdjacentHTML(
      "beforeend",
      `
    <tr>
      <td>${m.id}</td>
      <td>
        <a href="#"
           class="message-link"
           data-msg-id="${m.id}"
           data-msg-name="${encodeURIComponent(m.name)}">
          ${m.name}
        </a>
      </td>
      <td><span class="badge badge-ecu">${m.ecu}</span></td>
      <td><span class="badge badge-channel">${m.channel}</span></td>
      <td class="text-end">
        <button
          class="action-btn view-msg-btn"
          data-msg-id="${m.id}"
          title="View message"
        >
          <i class="bi bi-eye"></i>
        </button>
        <button class="action-btn"><i class="bi bi-pencil"></i></button>
        <button
          class="action-btn text-danger delete-msg-btn"
          data-msg-id="${m.id}"
          title="Delete message"
        >
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
    `,
    );
  });

  tbody.querySelectorAll(".delete-msg-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const msgId = btn.dataset.msgId;
      await confirmAndDeleteMessage(msgId);
    });
  });
  tbody.querySelectorAll(".view-msg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const msgId = btn.dataset.msgId;
      openMessageViewModal(msgId);
    });
  });
  tbody.querySelectorAll(".message-link").forEach((link) => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();

      const msgId = link.dataset.msgId;
      const msgName = decodeURIComponent(link.dataset.msgName);

      await openSignalListModal(msgId, msgName);
    });
  });
}

function populateFilters() {
  const ecuSet = [...new Set(messages.map((m) => m.ecu))];
  const channelSet = [...new Set(messages.map((m) => m.channel))];

  const ecuList = document.getElementById("ecuFilterList");
  const channelList = document.getElementById("channelFilterList");

  ecuList.innerHTML =
    `<div class="filter-item" data-ecu="">All</div>` +
    ecuSet
      .map((e) => `<div class="filter-item" data-ecu="${e}">${e}</div>`)
      .join("");

  channelList.innerHTML =
    `<div class="filter-item" data-channel="">All</div>` +
    channelSet
      .map((c) => `<div class="filter-item" data-channel="${c}">${c}</div>`)
      .join("");

  ecuList.querySelectorAll("[data-ecu]").forEach((el) =>
    el.addEventListener("click", () => {
      selectedECU = el.dataset.ecu;
      renderTable();
      closeDropdowns();
    }),
  );

  channelList.querySelectorAll("[data-channel]").forEach((el) =>
    el.addEventListener("click", () => {
      selectedChannel = el.dataset.channel;
      renderTable();
      closeDropdowns();
    }),
  );
}

function closeDropdowns() {
  document.querySelectorAll(".dropdown-menu").forEach((d) => {
    d.classList.remove("show");
  });
}

export function filterDropdown(input, type) {
  const value = input.value.toLowerCase();
  const listId = type === "ecu" ? "ecuFilterList" : "channelFilterList";

  document.querySelectorAll(`#${listId} .filter-item`).forEach((item) => {
    item.style.display =
      item.textContent === "All" ||
      item.textContent.toLowerCase().includes(value)
        ? "block"
        : "none";
  });
}

async function openSignalListModal(messageId, messageName) {
  // Load signal list HTML
  const res = await fetch("pages/signal-list.html");
  const html = await res.text();

  document.getElementById("signalModalBody").innerHTML = html;
  document.getElementById("signalModalTitle").textContent =
    `Signals – ${messageName}`;

  // Show modal
  const modal = new bootstrap.Modal(document.getElementById("signalListModal"));
  modal.show();

  // Init signal list JS
  const sigModule = await import("../js/Sig-list.js");
  sigModule.initSignalListPage(messageId, messageName);
}

export async function initMessageListPage() {
  // DOM available NOW because router injected HTML
  tbody = document.getElementById("messageTableBody");
  globalSearch = document.getElementById("globalSearch");

  if (!tbody || !globalSearch) {
    console.error("Message List DOM not found");
    return;
  }

  globalSearch.addEventListener("input", renderTable);
  await fetchLookups();
  await fetchMessages();
  populateFilters();
  renderTable();
}
async function confirmAndDeleteMessage(messageId) {
  if (!confirm("Are you sure you want to delete this message?")) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/messages/${messageId}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Delete failed");

    // Remove from local state
    messages = messages.filter((m) => m.id !== Number(messageId));

    // Re-render table + filters
    populateFilters();
    renderTable();
  } catch (err) {
    console.error(err);
    alert("Failed to delete message");
  }
}

async function openMessageViewModal(messageId) {
  try {
    // Fetch message details
    const msg = messages.find((m) => m.id == messageId);

    // Fetch signals for this message
    const res = await fetch(
      `${API_BASE_URL}/api/v1/signals?message_id=${messageId}`,
    );
    if (!res.ok) throw new Error("Signal fetch failed");

    const json = await res.json();
    const signals = json.data || [];

    // Fill message info
    document.getElementById("vMsgId").textContent = msg.id;
    document.getElementById("messageViewTitle").textContent =
      `Message – ${msg.name}`;
    document.getElementById("vMsgEcu").textContent = msg.ecu;
    document.getElementById("vMsgChannel").textContent = msg.channel;
    document.getElementById("vMsgSignalCount").textContent = signals.length;

    // Fill signals table
    const tbody = document.getElementById("vSignalTableBody");
    tbody.innerHTML = "";

    signals.forEach((s) => {
      tbody.insertAdjacentHTML(
        "beforeend",
        `
        <tr>
          <td>${s.sig_name}</td>
          <td>${s.start_bit}</td>
          <td>${s.length}</td>
          <td>${s.unit || "-"}</td>
        </tr>
        `,
      );
    });

    // Show modal
    new bootstrap.Modal(document.getElementById("messageViewModal")).show();
  } catch (err) {
    console.error(err);
    alert("Unable to load message details");
  }
}
