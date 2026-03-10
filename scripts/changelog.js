async function loadChangelog() {
	const response = await fetch("/feed/changelog.xml");
	const text = await response.text();

	const xml = new DOMParser().parseFromString(text, "text/xml");
	const items = xml.querySelectorAll("item");

	const container = document.getElementById("changelog");

	items.forEach((item, index) => {
		// Only show the 5 most recent items
		if (index >= 5) return;

		const title = item.querySelector("title").textContent;
		const link = item.querySelector("link").textContent;
		const pubDate = item.querySelector("pubDate").textContent;

		const a = document.createElement("a");
		a.href = link;

		const p = document.createElement("p");
		p.textContent = `${title} - ${new Date(pubDate).toLocaleDateString()}`;

		a.appendChild(p);

		container.appendChild(a);
	});
}

loadChangelog();
