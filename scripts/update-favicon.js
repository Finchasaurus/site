let cachedSvg = null;

async function loadSvg() {
	if (cachedSvg) return cachedSvg;

	const response = await fetch("/assets/star.svg");
	cachedSvg = await response.text();

	return cachedSvg;
}

async function updateFavicon() {
	const accent = getComputedStyle(document.querySelector("page")).getPropertyValue("--accent-color").trim();

	let svg = await loadSvg();

	svg = svg.replaceAll("#ffffff", accent);
	svg = svg.replaceAll("#fff", accent);
	svg = svg.replaceAll("white", accent);

	let favicon = document.querySelector('link[rel="icon"]');

	if (!favicon) {
		favicon = document.createElement("link");
		favicon.rel = "icon";
		favicon.type = "image/svg+xml";
		document.head.appendChild(favicon);
	}

	favicon.href = `data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}`;
}

updateFavicon();

document.querySelectorAll("nav a").forEach((link) => {
	link.addEventListener("mouseenter", updateFavicon);
	link.addEventListener("mouseleave", updateFavicon);
});
