const sidebar = document.querySelector("nav");
const handle = document.querySelector("resize-handle");

let isResizing = false;

handle.addEventListener("mousedown", () => {
  isResizing = true;
  document.body.style.cursor = "col-resize";
});

document.addEventListener("mousemove", (e) => {
  if (!isResizing) return;

  const newWidth = e.clientX;
  sidebar.style.width = `${newWidth}px`;
});

document.addEventListener("mouseup", () => {
  isResizing = false;
  document.body.style.cursor = "default";
});
