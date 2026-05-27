async function updateFavicon() {
	const accent = getComputedStyle(document.querySelector("page")).getPropertyValue("--accent-color").trim();

	const response = await fetch("/assets/star.svg");
	let svg = await response.text();

	svg = svg.replaceAll("#ffffff", accent);
	svg = svg.replaceAll("#fff", accent);
	svg = svg.replaceAll("white", accent);

	let favicon = document.querySelector('link[rel="icon"]');

	if (!favicon) {
		favicon = document.createElement("link");
		favicon.setAttribute("rel", "icon");
		favicon.setAttribute("type", "image/svg+xml");
		document.head.appendChild(favicon);
	}

	favicon.setAttribute("href", `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`);
}

updateFavicon();

document.querySelectorAll("nav a").forEach((link) => {
	link.addEventListener("mouseenter", () => {
		requestAnimationFrame(updateFavicon);
	});

	link.addEventListener("mouseleave", () => {
		requestAnimationFrame(updateFavicon);
	});
});
