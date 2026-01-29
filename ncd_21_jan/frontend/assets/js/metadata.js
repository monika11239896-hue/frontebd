// metadata.js
import { API_BASE_URL } from "./config.js";
import { timeAgo } from "./utils.js";

/* ===============================
   CREATE METADATA
================================ */
export function initSaveMetadata() {
  const saveBtn = document.getElementById("saveTopologyBtn");
  if (!saveBtn) return;

  saveBtn.addEventListener("click", async () => {
    const name = document.getElementById("topologyName").value;
    const version = document.getElementById("topologyVersion").value;
    const author = document.getElementById("topologyAuthor").value;

    if (!name) {
      alert("File name is required");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: name, version, author }),
      });

      if (!res.ok) throw new Error("Save failed");

      const json = await res.json();

      // Close the modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("createTopologyModal"),
      );
      modal.hide();

      // Clear the form inputs
      document.getElementById("topologyName").value = "";
      document.getElementById("topologyVersion").value = "";
      document.getElementById("topologyAuthor").value = "";

      // Reload the metadata list to show the new item
      await loadMetadata();

      // Optional: Show success message
      alert("Topology saved successfully!");

      // REMOVED: window.location.href = `/topology.html?id=${json.data.id}`;
    } catch (err) {
      console.error(err);
      alert("Failed to save topology");
    }
  });
}

/* ===============================
   LOAD METADATA LIST
================================ */
export async function loadMetadata() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/metadata`);
    const json = await res.json();

    const container = document.getElementById("fileList");
    if (!container) return;

    container.innerHTML = "";

    if (!json.data || json.data.length === 0) {
      container.innerHTML = `<div class="text-muted">No files found</div>`;
      return;
    }

    json.data.forEach((item, i) => {
      container.innerHTML += `
        <div class="list-group-item d-flex justify-content-between">
          <div>
            <strong>${i + 1}. ${item.fileName}</strong>
            <div class="text-muted small">
              Version: ${item.version || "-"} |
              Author: ${item.author || "-"}
            </div>
          </div>

          <div>
            <small class="text-muted me-3">
              ${timeAgo(item.created_at)}
            </small>
          
            <a href="#" class="text-danger delete-metadata"
               data-id="${item.id}">
               Delete
            </a>
          </div>
        </div>
      `;
    });

    bindDeleteMetadata();
  } catch (err) {
    console.error("Failed to load metadata", err);
  }
}

/* ===============================
   DELETE METADATA
================================ */
function bindDeleteMetadata() {
  document.querySelectorAll(".delete-metadata").forEach((link) => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const id = link.dataset.id;

      if (!confirm("Delete this file?")) return;

      const res = await fetch(`${API_BASE_URL}/api/v1/metadata/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadMetadata();
      } else {
        alert("Delete failed");
      }
    });
  });
}

/* ===============================
   LOAD TOPOLOGY HEADER
================================ */
export async function loadTopologyHeader() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/metadata/${id}`);
    if (!res.ok) throw new Error("Not found");

    const json = await res.json();
    const data = json.data;

    document.querySelector("[data-topology-name]").textContent = data.fileName;
    document.querySelector("[data-topology-id]").textContent = data.id;
    document.querySelector("[data-topology-version]").textContent =
      data.version || "—";
    document.querySelector("[data-topology-author]").textContent =
      data.author || "—";

    document.getElementById("metaDate").textContent = new Date(
      data.created_at,
    ).toLocaleString("en-IN");
  } catch (err) {
    console.error(err);
    alert("Failed to load topology info");
  }
}
