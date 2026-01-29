export function initPageEvents() {
  const addMessageBtn = document.getElementById("addMessage");
  if (addMessageBtn) {
    addMessageBtn.addEventListener("click", () => {
      const params = new URLSearchParams(window.location.search);
      const topologyId = params.get("id");

      window.location.href = `add-message.html`;
    });
  }

  const addSignalBtn = document.getElementById("addSignal");
  if (addSignalBtn) {
    addSignalBtn.addEventListener("click", () => {
      const params1 = new URLSearchParams(window.location.search);
      const topologyId1 = params1.get("id");

      window.location.href = `addSig.html`;
    });
  }

  document.getElementById("backToHomePage")?.addEventListener("click", () => {
    history.pushState({}, "", "/metadata");
    router();
  });
}
