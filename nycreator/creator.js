// Runtime code
const gridElement = document.getElementById("main-grid");
const acrossElement = document.getElementById("clues-across");
const downElement = document.getElementById("clues-down");
const suggestElement = document.getElementById("auto-suggest");

var game = new GridController(gridElement);
var cc = new ClueController(game, acrossElement, downElement);
var ws = new WordSuggestor(game, game.selector, suggestElement);
var sl = new SaveLoad(game, cc);

game.init(cc, ws, sl);

// Re-render on resize
window.addEventListener("resize", function(event) {
    for (let actor of game.actors) {
        if ("render" in actor) actor.render();
    }
});
