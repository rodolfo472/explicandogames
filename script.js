const startBtn = document.getElementById("startBtn");
const menu = document.getElementById("menu");
const game = document.getElementById("game");
const scoreElement = document.getElementById("score");

let score = 0;

startBtn.addEventListener("click", () => {
  menu.classList.add("hidden");
  game.classList.remove("hidden");
  startGame();
});

function startGame() {
  setInterval(() => {
    score++;
    scoreElement.innerText = score;
  }, 200);
}
