const players = document.querySelectorAll("#music-player");

players.forEach((player) => {
	const audio = player.querySelector("audio");
	const source = audio.querySelector("source");

	const playPauseButton = player.querySelector("#play-pause");
	const forwardButton = player.querySelector("#forward");
	const backwardButton = player.querySelector("#backward");

	let loaded = false;

	function ensureLoaded() {
		if (loaded) return;

		audio.src = source.dataset.src;
		audio.load();
		loaded = true;
	}

	playPauseButton.addEventListener("click", async () => {
		ensureLoaded();

		if (audio.paused) {
			await audio.play();
			playPauseButton.textContent = "⏸";
		} else {
			audio.pause();
			playPauseButton.textContent = "▶";
		}
	});

	forwardButton.addEventListener("click", () => {
		audio.currentTime += 10;
	});

	backwardButton.addEventListener("click", () => {
		audio.currentTime -= 10;
	});

	audio.addEventListener("ended", () => {
		playPauseButton.textContent = "▶";
	});
});
