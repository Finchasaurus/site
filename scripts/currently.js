function renderElement(container, data) {
	const img = container.querySelector("img");
	img.classList.add("placeholder");
	const link = container.querySelector("a");
	const caption = link.querySelector("figcaption");

	img.src = data.image;
	img.alt = data.title;

	link.href = data.url;
	link.target = "_blank";

	caption.textContent = data.title;
}

function renderLastFM(data) {
	const trackName = data.track.name;
	const trackUrl = data.track.url;
	const trackArtist = data.track.artist["#text"];
	const trackImage = data.track.image[2]["#text"];

	const container = document.getElementById("listening");

	renderElement(container, {
		title: `${trackName} - ${trackArtist}`,
		url: trackUrl,
		image: trackImage,
	});
}

async function loadLastFM() {
	const key = "lastfm_cache";
	const cached = localStorage.getItem(key);

	if (cached) {
		const parsed = JSON.parse(cached);

		if (Date.now() - parsed.timestamp < 60_000) {
			renderLastFM(parsed.data);
			return;
		}
	}

	const url = `https://lastfm-last-played.biancarosa.com.br/meowbyte/latest-song`;

	try {
		const result = await fetch(url);

		if (!result.ok) {
			throw new Error("Request failed");
		}

		const data = await result.json();

		// Only cache successful data
		localStorage.setItem(
			key,
			JSON.stringify({
				timestamp: Date.now(),
				data,
			}),
		);

		renderLastFM(data);
	} catch (error) {
		// Render fallback UI WITHOUT caching it
		renderElement(document.getElementById("listening"), {
			title: "An error occurred fetching data",
			url: "#",
			image: "./assets/music-error.jpg",
		});
	}
}

function renderAniList(data) {
	const entries = data.data.MediaListCollection.lists[0].entries;

	entries.sort((a, b) => b.updatedAt - a.updatedAt);
	const entry = entries[0].media;

	const title = entry.title.english || entry.title.romaji || entry.title.native;
	const url = entry.siteUrl;
	const image = entry.coverImage.large;

	const container = document.querySelector("#watching");

	renderElement(container, {
		title,
		url,
		image,
	});
}

async function loadAniList() {
	const key = "anilist_cache";
	const cached = localStorage.getItem(key);

	if (cached) {
		const parsed = JSON.parse(cached);

		if (Date.now() - parsed.timestamp < 600_000) {
			renderAniList(parsed.data);
			return;
		}
	}

	const query = `
    query {
        MediaListCollection(userName: "17thAngel", type: ANIME, status: CURRENT) {
            lists {
                entries {
                    updatedAt
                    media {
                        title {
                            english
							romaji
							native
                        }
                        siteUrl
                        coverImage {
                            large
                        }
                    }
                }
            }
        }
    }
    `;

	try {
		const result = await fetch("https://graphql.anilist.co", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ query }),
		});

		if (!result.ok) {
			throw new Error("Request failed");
		}

		const data = await result.json();

		// Only cache successful data
		localStorage.setItem(
			key,
			JSON.stringify({
				timestamp: Date.now(),
				data,
			}),
		);

		renderAniList(data);
	} catch (error) {
		// Render fallback UI WITHOUT caching it
		renderAniList({
			data: {
				MediaListCollection: {
					lists: [
						{
							entries: [
								{
									updatedAt: 0,
									media: {
										title: {
											english: "An error occurred fetching data",
										},
										siteUrl: "#",
										coverImage: {
											large: "./assets/anime-error.jpg",
										},
									},
								},
							],
						},
					],
				},
			},
		});
	}
}

loadLastFM();
setInterval(loadLastFM, 10 * 1000); // Refresh every 10 seconds

loadAniList();
