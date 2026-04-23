const button = document.querySelector(".carousel-filtering-button");
const carousel = document.querySelector(".carousel");

button.addEventListener("click", () => {
	const current = carousel.getAttribute("accent");

	if (current === "hover-clear tint" || current === "tint hover-clear") {
		carousel.removeAttribute("accent");
	} else {
		carousel.setAttribute("accent", "hover-clear tint");
	}
});
