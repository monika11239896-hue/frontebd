// assets/js/router.js
async function loadPage(page, id = null, push = true) {
  try {
    // 🔹 Update URL hash
    if (push) {
      const url = id ? `#/${page}?id=${id}` : `#/${page}`;
      location.hash = url;
    }

    // 🔹 Load HTML
    const res = await fetch(`pages/${page}.html`);
    if (!res.ok) throw new Error("Page not found");

    const html = await res.text();
    const content = document.getElementById("contentArea");
    content.innerHTML = html;

    // Call page initializer modules
    switch (page) {
      case "metadata": {
        const module = await import("../js/metadata.js");
        module.initSaveMetadata();
        module.loadMetadata();
        break;
      }
      case "topology": {
        const channel = await import("../js/channels.js");
        channel.initCanChannels();
        const ecu = await import("../js/ecu.js");
        ecu.initEcus();
        const createDBC = await import("../js/create-dbc.js");
        createDBC.initCreateDbc();

        const metadataHeader = await import("../js/metadata.js");
        metadataHeader.loadTopologyHeader(id);

        const events = await import("../js/events.js");
        events.initPageEvents();
        break;
      }
      case "add-message": {
        const addMsg = await import("../js/add-message.js");
        addMsg.initAddMessagePage();
        break;
      }
      case "message-list": {
        const msgList = await import("../js/msg-list.js");
        msgList.initMessageListPage();
        break;
      }

      case "addSig": {
        const addSig = await import("../js/add-signal.js");
        await addSig.initAddSignalPage();
        break;
      }

      // Add more pages here as needed
      default:
        console.warn(`No initializer for page: ${page}`);
    }
  } catch (err) {
    console.error(err);
    document.getElementById("contentArea").innerHTML =
      "<p class='text-danger'>Failed to load page</p>";
  }
}
// ==============================
// ROUTE PARSER
// ==============================
function getRouteInfo() {
  const hash = location.hash.replace("#/", "") || "metadata";
  const [page, query] = hash.split("?");

  const params = new URLSearchParams(query || "");
  return {
    page,
    id: params.get("id"),
  };
}

// ==============================
// HANDLE BACK / FORWARD
// ==============================
window.addEventListener("hashchange", () => {
  const { page, id } = getRouteInfo();
  loadPage(page, id, false);
});

// ==============================
// INITIAL LOAD
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  const { page, id } = getRouteInfo();
  loadPage(page, id, false);
});

// ==============================
// GLOBAL ACCESS
// ==============================
window.loadPage = loadPage;
