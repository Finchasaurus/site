let openTabs = [
  {
    name: "Test",
    href: "/test.html",
  },
];

const tabsContainer = document.querySelector("header");
const desktop = document.createElement("desktop");
document.body.appendChild(desktop);

for (const tab of openTabs) {
  createTab(tab);
}

function createTab(tab) {
  const tabElement = document.createElement("tab");
  tabElement.textContent = tab.name;
  tabsContainer.appendChild(tabElement);

  let startX, startY;
  let dragging = false;

  tabElement.addEventListener("mousedown", (e) => {
    startX = e.clientX;
    startY = e.clientY;
    dragging = false;

    function onMove(moveEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        dragging = true;
      }
    }

    function onUp(upEvent) {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);

      if (dragging) {
        tabElement.remove();

        createDesktopIcon(tabData, upEvent.clientX, upEvent.clientY);
      } else {
        window.location.href = tabData.href;
      }
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}

function createDesktopIcon(tabData, x, y) {
  const icon = document.createElement("div");
  icon.className = "desktop-icon";
  icon.textContent = tabData.name;

  icon.style.left = `${x}px`;
  icon.style.top = `${y}px`;

  desktop.appendChild(icon);

  makeDraggable(icon);

  icon.addEventListener("dblclick", () => {
    window.location.href = tabData.href;
  });
}

function makeDraggable(element) {
  let offsetX, offsetY;

  element.addEventListener("mousedown", (e) => {
    offsetX = e.offsetX;
    offsetY = e.offsetY;

    function move(moveEvent) {
      element.style.left = `${moveEvent.clientX - offsetX}px`;
      element.style.top = `${moveEvent.clientY - offsetY}px`;
    }

    function up() {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  });
}
