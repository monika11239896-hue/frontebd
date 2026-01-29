// assets/js/main.js

import {
  initSaveMetadata,
  loadMetadata,
  loadTopologyHeader,
} from "./metadata.js";
import { initCanChannels } from "./channels.js";
import { initEcus } from "./ecu.js";
import { initPageEvents } from "./events.js";
import { initCreateDbc } from "./create-dbc.js";

export function initTopologyPage() {
  // Initialize UI and events related to topology page
  initPageEvents();
  initCreateDbc();
  loadTopologyHeader();
  initCanChannels();
  initEcus();
}

// Optional: global initialization for your SPA
document.addEventListener("DOMContentLoaded", () => {
  // For SPA, better to keep page-specific init inside loadPage() calls
  // But if needed, some global init code can go here

  // Example: Initialize any global page events you want active on all pages
  initPageEvents();
});
