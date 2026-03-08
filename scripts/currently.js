function renderLastFM(data) {
	const trackName = data.track.name;
	const trackUrl = data.track.url;
	const trackArtist = data.track.artist["#text"];
	const trackImage = data.track.image[2]["#text"];

	const container = document.getElementById("listening");
	const img = container.querySelector("img");
	const link = container.querySelector("a");
	const caption = link.querySelector("figcaption");

	img.src = trackImage;
	img.alt = `${trackName} cover`;

	link.href = trackUrl;

	caption.textContent = `${trackName} - ${trackArtist}`;
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
	const result = await fetch(url);
	const data = await result.json();

	localStorage.setItem(
		key,
		JSON.stringify({
			timestamp: Date.now(),
			data,
		}),
	);

	renderLastFM(data);
}

function renderAniList(data) {
	const entries = data.data.MediaListCollection.lists[0].entries;

	entries.sort((a, b) => b.updatedAt - a.updatedAt);
	const entry = entries[0].media;

	const title = entry.title.english;
	const url = entry.siteUrl;
	const image = entry.coverImage.large;

	const container = document.querySelector("#watching");
	const img = container.querySelector("img");
	const link = container.querySelector("a");
	const caption = link.querySelector("figcaption");

	img.src = image;
	img.alt = title;

	link.href = url;

	caption.textContent = title;
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

	const result = await fetch("https://graphql.anilist.co", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ query }),
	});

	const data = await result.json();

	localStorage.setItem(
		key,
		JSON.stringify({
			timestamp: Date.now(),
			data,
		}),
	);

	renderAniList(data);
}

const interval = 100_000;

loadLastFM();
setInterval(loadLastFM, interval);

loadAniList();
