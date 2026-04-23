const button = document.querySelector(".carousel-filtering-button");
const carousel = document.querySelector(".carousel");
const items = document.querySelectorAll(".carousel ul");

button.addEventListener("click", () => {
	items.forEach((item) => {
		const current = item.getAttribute("accent");

		if (current === "hover-clear tint" || current === "tint hover-clear") {
			item.removeAttribute("accent");
		} else {
			item.setAttribute("accent", "hover-clear tint");
		}
	});
});
