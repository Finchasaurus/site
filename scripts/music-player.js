const players = document.querySelectorAll("#music-player");

players.forEach((player) => {
	const audio = player.querySelector("audio");
	const playPauseButton = player.querySelector("#play-pause");
	const forwardButton = player.querySelector("#forward");
	const backwardButton = player.querySelector("#backward");

	playPauseButton.addEventListener("click", () => {
		if (audio.paused) {
			audio.play();
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
