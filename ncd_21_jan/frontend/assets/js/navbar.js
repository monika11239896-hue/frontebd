const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("toggleSidebar");
const overlay = document.getElementById("sidebarOverlay");

toggleBtn?.addEventListener("click", () => {
  sidebar.classList.toggle("show");
});

overlay?.addEventListener("click", () => {
  sidebar.classList.remove("show");
});
document.querySelectorAll(".sidebar .nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.remove("show");
    }
  });
});
