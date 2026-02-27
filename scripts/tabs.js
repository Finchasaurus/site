let openTabs = [
  {
    name: "Test",
    href: "/test.html",
  },
  {
    name: "Test2",
    href: "/test.html",
  },
  {
    name: "Test3",
    href: "/test.html",
  },
];

const tabsContainer = document.querySelector("header");
const desktop = document.createElement("desktop");
document.body.appendChild(desktop);

for (const tab of openTabs) {
  createTab(tab);
}

function createTab(tab, insertIndex = null) {
  const tabElement = document.createElement("tab");
  tabElement.textContent = tab.name;
  tabElement.dataset.name = tab.name;

  if (insertIndex === null || insertIndex >= tabsContainer.children.length) {
    tabsContainer.appendChild(tabElement);
  } else {
    tabsContainer.insertBefore(tabElement, tabsContainer.children[insertIndex]);
  }

  let startX, startY;
  let dragging = false;
  let icon = null;

  tabElement.addEventListener("mousedown", (e) => {
    startX = e.clientX;
    startY = e.clientY;
    dragging = false;

    function onMove(moveEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (!dragging && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        dragging = true;

        icon = createDesktopIcon(tab, moveEvent.clientX, moveEvent.clientY);

        removeTabFromState(tab.name);
        tabElement.remove();
      }

      if (dragging && icon) {
        icon.style.left = `${moveEvent.clientX - 30}px`;
        icon.style.top = `${moveEvent.clientY - 15}px`;
      }
    }

    function onUp(upEvent) {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);

      if (!dragging) {
        window.location.href = tab.href;
        return;
      }

      const headerRect = tabsContainer.getBoundingClientRect();

      if (
        upEvent.clientY >= headerRect.top &&
        upEvent.clientY <= headerRect.bottom
      ) {
        const insertIndex = getInsertIndex(upEvent.clientX);

        icon.remove();
        insertTabAt(tab, insertIndex);
      } else {
        makeDraggable(icon, tab);
      }
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}

function createDesktopIcon(tabData, x, y) {
  const icon = document.createElement("desktop-icon");
  icon.textContent = tabData.name;

  icon.style.position = "absolute";
  icon.style.left = `${x}px`;
  icon.style.top = `${y}px`;

  desktop.appendChild(icon);

  icon.addEventListener("dblclick", () => {
    window.location.href = tabData.href;
  });

  return icon;
}

function makeDraggable(element, tabData) {
  let offsetX, offsetY;

  element.addEventListener("mousedown", (e) => {
    offsetX = e.offsetX;
    offsetY = e.offsetY;

    function move(moveEvent) {
      element.style.left = `${moveEvent.clientX - offsetX}px`;
      element.style.top = `${moveEvent.clientY - offsetY}px`;
    }

    function up(upEvent) {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);

      const headerRect = tabsContainer.getBoundingClientRect();

      if (
        upEvent.clientY >= headerRect.top &&
        upEvent.clientY <= headerRect.bottom
      ) {
        const insertIndex = getInsertIndex(upEvent.clientX);

        element.remove();
        insertTabAt(tabData, insertIndex);
      }
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  });
}

function getInsertIndex(mouseX) {
  const tabs = Array.from(tabsContainer.children);

  for (let i = 0; i < tabs.length; i++) {
    const rect = tabs[i].getBoundingClientRect();
    if (mouseX < rect.left + rect.width / 2) {
      return i;
    }
  }

  return tabs.length;
}

function insertTabAt(tab, index) {
  openTabs.splice(index, 0, tab);
  createTab(tab, index);
}

function removeTabFromState(tabName) {
  const index = openTabs.findIndex((t) => t.name === tabName);
  if (index !== -1) {
    openTabs.splice(index, 1);
  }
}
