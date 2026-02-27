const sidebar = document.querySelector("nav");
const handle = document.querySelector("resize-handle");
const main = document.querySelector("main");

let isResizing = false;

handle.addEventListener("mousedown", () => {
  isResizing = true;
  document.body.style.cursor = "col-resize";
});

document.addEventListener("mousemove", (e) => {
  if (!isResizing) return;

  const newWidth = Math.max(200, Math.min(400, e.clientX));

  sidebar.style.width = `${newWidth}px`;
  handle.style.left = `${newWidth}px`;
  main.style.left = `${newWidth + 1}px`;
});

document.addEventListener("mouseup", () => {
  isResizing = false;
  document.body.style.cursor = "default";
});
