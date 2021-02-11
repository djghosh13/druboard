class Grid {
    constructor(element) {
        this.width = 1;
        this.height = 1;
        this.state = [[{"cell": true, "value": ""}]];
        this.element = element;
    }

    // Perform actions
    doAction(action, render = true) {
        // Mark cell black or white
        if (action["type"] == "mark") {
            let [i, j] = action["cell"];
            let state = this.state[i][j];
            let blocked = action["newvalue"] === null;
            let value = action["newvalue"] || "";
            action["oldvalue"] = state["cell"] ? state["value"] : null;
            state["cell"] = !blocked;
            state["value"] = value;
            if (render) this.renderCell(i, j);
            return action;
        }
        // Change cell value
        else if (action["type"] == "edit") {
            let [i, j] = action["cell"];
            let state = this.state[i][j];
            let blocked = action["newvalue"] === null;
            let value = action["newvalue"] || "";
            action["oldvalue"] = state["value"];
            state["value"] = value;
            if (!state["cell"]) console.error("Tried to write to black cell", action);
            if (blocked) console.error("Tried to write null", action);
            if (render) this.renderCell(i, j);
            return action;
        }
        // Change size
        else if (action["type"] == "resize-width") {
            let size = action["newvalue"];
            action["oldvalue"] = this.width;
            for (let i = 0; i < this.height; i++) {
                for (let j = this.width; j < size; j++) {
                    this.state[i].push({
                        "cell": true,
                        "value": ""
                    });
                }
                this.state[i] = this.state[i].slice(0, size);
            }
            this.width = size;
            if (render) this.render();
            return action;
        }
        else if (action["type"] == "resize-height") {
            let size = action["newvalue"];
            action["oldvalue"] = this.height;
            for (let i = this.height; i < size; i++) {
                let row = [];
                for (let j = 0; j < this.width; j++) {
                    row.push({
                        "cell": true,
                        "value": ""
                    });
                }
                this.state.push(row);
            }
            this.state = this.state.slice(0, size);
            this.height = size;
            if (render) this.render();
            return action;
        }
    }

    undoAction(action, render = true) {
        // Mark cell black or white
        if (action["type"] == "mark") {
            let [i, j] = action["cell"];
            let state = this.state[i][j];
            let blocked = action["oldvalue"] === null;
            let value = action["oldvalue"] || "";
            // TODO: Add conflict checks
            state["cell"] = !blocked;
            state["value"] = value;
            if (render) this.renderCell(i, j);
            return action;
        }
        // Change cell value
        else if (action["type"] == "edit") {
            let [i, j] = action["cell"];
            let state = this.state[i][j];
            let blocked = action["oldvalue"] === null;
            let value = action["oldvalue"] || "";
            state["value"] = value;
            if (render) this.renderCell(i, j);
            return action;
        }
        // Change size
        else if (action["type"] == "resize-width") {
            let size = action["oldvalue"];
            for (let i = 0; i < this.height; i++) {
                for (let j = this.width; j < size; j++) {
                    this.state[i].push({
                        "cell": true,
                        "value": ""
                    });
                }
                this.state[i] = this.state[i].slice(0, size);
            }
            if (render) this.render();
            return action;
        }
        else if (action["type"] == "resize-height") {
            let size = action["oldvalue"];
            for (let i = this.height; i < size; i++) {
                let row = [];
                for (let j = 0; j < this.width; j++) {
                    row.push({
                        "cell": true,
                        "value": ""
                    });
                }
                this.state.push(row);
            }
            this.state = this.state.slice(0, size);
            if (render) this.render();
            return action;
        }
    }

    // Generate actions
    actionToggleCell(i, j, value = null) {
        let actionList = [];
        let newstate = (value === null) ? !this.state[i][j]["cell"] : value;
        if (this.state[i][j]["cell"] != newstate) {
            actionList.push({
                "type": "mark",
                "cell": [i, j],
                "newvalue": newstate ? "" : null
            });
        }
        return actionList;
    }

    actionEditCell(i, j, value) {
        let actionList = [];
        if (this.isOpen(i, j) && this.state[i][j]["value"] != value) {
            actionList.push({
                "type": "edit",
                "cell": [i, j],
                "newvalue": value
            });
        }
        return actionList;
    }

    actionResize(dim, value) {
        let actionList = [];
        let wi = (dim == "width") ? value : 0;
        let hi = (dim == "height") ? value : 0;
        if (wi == this.width || hi == this.height) return actionList;
        for (let i = hi; i < this.height; i++) {
            for (let j = wi; j < this.width; j++) {
                if (!this.state[i][j]["cell"]) {
                    actionList.push({
                        "type": "mark",
                        "cell": [i, j],
                        "newvalue": ""
                    });
                } else if (this.state[i][j]["value"]) {
                    actionList.push({
                        "type": "edit",
                        "cell": [i, j],
                        "newvalue": ""
                    });
                }
            }
        }
        actionList.push({
            "type": "resize-" + dim,
            "newvalue": value
        });
        return actionList;
    }

    // Visuals
    render() {
        let cellWidth = window.innerWidth * 0.55 / this.width * 0.9;
        let cellHeight = window.innerHeight / this.height * 0.8;
        let cellPx = Math.max(Math.min(cellWidth, cellHeight, 120), 20);
        document.documentElement.style.setProperty("--cell-size", Math.floor(cellPx) + "px");
        this.element.innerHTML = "";
        for (let i = 0; i < this.height; i++) {
            let row = document.createElement("tr");
            for (let j = 0; j < this.width; j++) {
                let cell = document.createElement("td");
                cell.className = "cell";
                cell.id = "cell-" + i + "-" + j;
                if (this.isOpen(i, j)) {
                    let value = document.createElement("span");
                    value.innerText = this.state[i][j]["value"];
                    cell.appendChild(value);
                } else {
                    cell.classList.add("black");
                }
                cell.addEventListener("click", uiClickCell);
                row.appendChild(cell);
            }
            this.element.appendChild(row);
        }
    }

    renderCell(i, j) {
        let cell = this.getCellElement(i, j);
        cell.innerHTML = "";
        if (this.isOpen(i, j)) {
            cell.classList.remove("black");
            let value = document.createElement("span");
            value.innerText = this.state[i][j]["value"];
            cell.appendChild(value);
        } else {
            cell.classList.add("black");
        }
    }

    // Utility
    isOpen(i, j) {
        return this.state[i][j]["cell"];
    }

    getCellElement(i, j) {
        return this.element.querySelector("#cell-" + i + "-" + j);
    }
}


class GridStructure {
    constructor(grid) {
        this.grid = grid;
        this.cellToClue = [];
        this.clueToCell = [];
    }

    // Perform actions
    doAction(action, render = true) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
                this.refresh();
            case "edit":
            default:
        }
        if (render) this.render();
        return action;
    }

    undoAction(action, render = true) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
                this.refresh();
            case "edit":
            default:
        }
        if (render) this.render();
        return action;
    }

    refresh() {
        // Refresh lookup tables
        this.cellToClue = [];
        this.clueToCell = [];
        for (let i = 0; i < this.grid.height; i++) {
            let row = [];
            for (let j = 0; j < this.grid.width; j++) {
                if (!this.grid.isOpen(i, j)) {
                    row.push(null);
                    continue;
                }
                let clues = {
                    "across": null,
                    "down": null
                };
                // Check if start of clue
                if ((i == 0 || !this.grid.isOpen(i - 1, j)) &&
                    !(i == this.grid.height - 1 || !this.grid.isOpen(i + 1, j))) {
                    clues["down"] = this.clueToCell.length;
                }
                if ((j == 0 || !this.grid.isOpen(i, j - 1)) &&
                    !(j == this.grid.width - 1 || !this.grid.isOpen(i, j + 1))) {
                    clues["across"] = this.clueToCell.length;
                }
                if (clues["across"] !== null || clues["down"] !== null) {
                    this.clueToCell.push({
                        "across": clues["across"] !== null ? [[i, j]] : [],
                        "down": clues["down"] !== null ? [[i, j]] : []
                    });
                }
                // Check if part of clue
                if (i != 0 && this.grid.isOpen(i - 1, j)) {
                    clues["down"] = this.cellToClue[i - 1][j]["down"];
                    this.clueToCell[clues["down"]]["down"].push([i, j]);
                }
                if (j != 0 && this.grid.isOpen(i, j - 1)) {
                    clues["across"] = row[j - 1]["across"];
                    this.clueToCell[clues["across"]]["across"].push([i, j]);
                }
                row.push(clues);
            }
            this.cellToClue.push(row);
        }
    }

    // Visuals
    render() {
        this.grid.element.querySelectorAll("span.cell-label").forEach(element => element.remove());
        for (let idx = 0; idx < this.clueToCell.length; idx++) {
            let [i, j] = this.clueToCell[idx]["across"][0] || this.clueToCell[idx]["down"][0];
            let label = document.createElement("span");
            label.className = "cell-label";
            label.innerText = idx + 1;
            this.grid.getCellElement(i, j).appendChild(label);
        }
    }

    // Utility
    getClue(i, j, dir) {
        let cell = this.cellToClue[i][j];
        return cell && cell[dir];
    }
}


class GridSelector {
    constructor(grid, structure) {
        this.grid = grid;
        this.structure = structure;
        this.selected = false;
        this.cell = [0, 0];
        this.direction = "across";
    }

    doAction(action, render = true) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
                this.refresh();
            case "edit":
            default:
        }
        if (render) this.render();
        return action;
    }

    undoAction(action, render = true) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
                this.refresh();
            case "edit":
            default:
        }
        if (render) this.render();
        return action;
    }

    refresh() {
        if (!this.selected) return;
        if (this.structure.getClue(...this.cell, this.direction) !== null) return;
        if (this.structure.getClue(...this.cell, otherDirection(this.direction)) !== null) {
            this.direction = otherDirection(this.direction);
        } else {
            this.selected = false;
        }
    }

    // Visuals
    render() {
        this.grid.element.querySelectorAll(".cell").forEach(function(element) {
            element.classList.remove("selected");
            element.classList.remove("selected-clue");
        });
        if (this.selected) {
            let clue = this.structure.getClue(...this.cell, this.direction);
            for (let cell of this.structure.clueToCell[clue][this.direction]) {
                this.grid.getCellElement(...cell).classList.add("selected-clue");
            }
            this.grid.getCellElement(...this.cell).classList.add("selected");
        }
    }

    // UI
    selectCell(i, j) {
        let selected = false;
        if (this.selected && this.cell[0] == i && this.cell[1] == j) {
            // Same cell, change direction if possible
            selected = true;
            if (this.structure.getClue(i, j, otherDirection(this.direction)) !== null) {
                this.direction = otherDirection(this.direction);
            }
        } else if (this.selected) {
            // Same clue, different cell
            let clue = this.structure.getClue(...this.cell, this.direction);
            for (let cell of this.structure.clueToCell[clue][this.direction]) {
                if (cell[0] == i && cell[1] == j) {
                    this.cell = [i, j];
                    selected = true;
                    break;
                }
            }
        }
        if (!selected) {
            // Choosing a new cell
            if (this.structure.getClue(i, j, "across") !== null) {
                this.selected = true;
                this.cell = [i, j];
                this.direction = "across";
            } else if (this.structure.getClue(i, j, "down") !== null) {
                this.selected = true;
                this.cell = [i, j];
                this.direction = "down";
            }
        }
        this.render();
    }

    trySelect() {
        if (this.selected) return;
        for (let i = 0; i < this.grid.height; i++) {
            for (let j = 0; j < this.grid.width; j++) {
                if (this.selector.getClue(i, j, "across") !== null) {
                    this.selected = true;
                    this.cell = [i, j];
                    this.direction = "across";
                    this.render();
                    return true;
                }
                if (this.selector.getClue(i, j, "down") !== null) {
                    this.selected = true;
                    this.cell = [i, j];
                    this.direction = "down";
                    this.render();
                    return true;
                }
            }
        }
        return false;
    }

    navigate(dir, forward, nextclue = true) {
        if (!this.selected) return this.trySelect();
        if (dir != this.direction) {
            // Try to change direction
            if (this.structure.getClue(...this.cell, otherDirection(this.direction)) !== null) {
                this.direction = otherDirection(this.direction);
                this.render();
            }
            return;
        }
        let clue = this.structure.getClue(...this.cell, this.direction);
        let cells = this.structure.clueToCell[clue][this.direction];
        for (let k = 0; k < cells.length; k++) {
            if (cells[k][0] == this.cell[0] && cells[k][1] == this.cell[1]) {
                // Found index
                if (forward && k != cells.length - 1) {
                    this.cell = cells[k + 1];
                } else if (!forward && k != 0) {
                    this.cell = cells[k - 1];
                } else if (nextclue) {
                    let dx = forward ? 1 : this.structure.clueToCell.length - 1;
                    for (let c = (clue + dx) % this.structure.clueToCell.length;;
                            c = (c + dx) % this.structure.clueToCell.length) {
                        if (this.structure.clueToCell[c][this.direction].length) {
                            this.cell = this.structure.clueToCell[c][this.direction][0]; // For Roy
                            break;
                        } else if (c == clue) return console.error("Wrapped around but no clue found");
                    }
                }
                break;
            }
        }
        this.render();
    }

    selectClue(idx, dir) {
        if (this.structure.clueToCell.length <= idx || !this.structure.clueToCell[idx][dir].length) return;
        if (this.selected && this.structure.getClue(...this.cell, dir) == idx) {
            if (dir != this.direction) {
                this.selectCell(...this.cell);
            }
        } else {
            this.selected = true;
            this.cell = this.structure.clueToCell[idx][dir][0];
            this.direction = dir;
        }
        this.render();
    }
}


class GridController {
    constructor(gridElement) {
        this.grid = new Grid(gridElement);
        this.structure = new GridStructure(this.grid);
        this.selector = new GridSelector(this.grid, this.structure);
        this.actors = [this.grid, this.structure, this.selector];
        this.actionHistory = [], this.actionFuture = [];
        // UI
        this.mode = "mark";
    }

    init() {
        let game = this;
        // Setup UI events
        for (let element of document.querySelectorAll("button.increment")) {
            element.addEventListener("click", function(event) {
                if (this.getAttribute("data-property") == "width") {
                    let width = game.grid.width + parseInt(this.getAttribute("data-value"));
                    if (width >= 3) {
                        game.takeAction(game.grid.actionResize("width", width));
                    }
                } else if (this.getAttribute("data-property") == "height") {
                    let height = game.grid.height + parseInt(this.getAttribute("data-value"));
                    if (height >= 3) {
                        game.takeAction(game.grid.actionResize("height", height));
                    }
                }
            });
        }

        for (let element of document.querySelectorAll("button.mode")) {
            element.addEventListener("click", function(event) {
                game.mode = this.getAttribute("data-value");
                for (let elem of document.querySelectorAll("button.mode")) {
                    elem.nextElementSibling.classList.remove("selected");
                }
                this.nextElementSibling.classList.add("selected");
            });
        }

        document.addEventListener("keydown", function(event) {
            if (event.repeat || event.altKey) return;
            if (document.querySelector("#clues-across").contains(event.target) ||
                document.querySelector("#clues-down").contains(event.target)) return;
            // Undo and redo
            if (event.ctrlKey) {
                if (event.key.toUpperCase() == "Z") {
                    game.prevAction();
                    event.preventDefault();
                } else if (event.key.toUpperCase() == "Y") {
                    game.nextAction();
                    event.preventDefault();
                }
                return;
            }
            // Typing
            if ("ABCDEFGHIJKLMNOPQRSTUVWXYZ".includes(event.key.toUpperCase())) {
                game.typeCharacter(event.key.toUpperCase());
            } else switch (event.code) {
                case "Backspace":
                    game.typeCharacter("", "backspace");
                    break;
                case "Delete":
                    game.typeCharacter("", "delete");
                    break;
                case "ArrowLeft":
                case "ArrowRight":
                    game.selector.navigate("across", event.code == "ArrowRight");
                    break;
                case "ArrowUp":
                case "ArrowDown":
                    game.selector.navigate("down", event.code == "ArrowDown");
                    break;
                default:
                    return;
            }
            event.preventDefault();
        });
        // Initial grid size
        this.takeAction(this.grid.actionResize("width", 3));
        this.takeAction(this.grid.actionResize("height", 3));
        this.actionHistory.length = 0;
    }

    nextAction() {
        if (this.actionFuture.length) {
            let actions = this.actionFuture.pop();
            if (!actions.length) console.error("Empty action");
            let done = [];
            while (actions.length) {
                let action = actions.pop();
                let render = !actions.length; // Render if last action
                for (let actor of this.actors) {
                    action = actor.doAction(action, render);
                }
                done.push(action);
            }
            this.actionHistory.push(done);
        }
        this.refresh();
    }

    prevAction() {
        if (this.actionHistory.length) {
            let actions = this.actionHistory.pop();
            if (!actions.length) console.error("Empty action");
            let done = [];
            while (actions.length) {
                let action = actions.pop();
                let render = !actions.length; // Render if last action
                for (let actor of this.actors) {
                    action = actor.undoAction(action, render);
                }
                done.push(action);
            }
            this.actionFuture.push(done);
        }
        this.refresh();
    }

    takeAction(actions) {
        if (actions.length) {
            this.actionFuture = [actions];
            this.nextAction();
        }
    }

    // UI
    refresh() {
        document.querySelector("div.input-value[data-property=width]").innerText = this.grid.width;
        document.querySelector("div.input-value[data-property=height]").innerText = this.grid.height;
    }

    actionClickCell(i, j) {
        if (this.mode == "mark") {
            this.selector.selected = false;
            this.takeAction(this.grid.actionToggleCell(i, j));
        } else if (this.mode == "write") {
            this.selector.selectCell(i, j);
        }
    }

    typeCharacter(char, del = false) {
        if (this.selector.selected) {
            this.takeAction(this.grid.actionEditCell(...this.selector.cell, char));
            if (del != "delete") {
                this.selector.navigate(this.selector.direction, del != "backspace", del != "backspace");
            }
        } else {
            this.selector.trySelect();
        }
    }
}


class ClueController {
    constructor(gridController, acrossElement, downElement) {
        this.gridController = gridController;
        this.element = {
            "across": acrossElement,
            "down": downElement
        };
    }

    init() {
        let cc = this;
        for (let element of document.querySelectorAll("button.add-item")) {
            element.addEventListener("click", function(event) {
                cc.addClue(this.getAttribute("data-value"));
            });
        }
    }

    refresh() {
        for (let dir of ["across", "down"]) {
            let idx = 0;
            for (let entry of this.element[dir].querySelectorAll(".clue-entry")) {
                while (idx < this.gridController.structure.clueToCell.length &&
                        !this.gridController.structure.clueToCell[idx][dir].length) idx++;
                if (idx < this.gridController.structure.clueToCell.length) {
                    entry.querySelector(".clue-label").innerText = idx + 1;
                    idx++;
                } else {
                    entry.querySelector(".clue-label").innerText = "";
                }
            }
        }
    }

    addClue(dir) {
        let entry = document.createElement("div");
        entry.className = "clue-entry";
        let label = document.createElement("span");
        label.className = "clue-label";
        entry.appendChild(label);
        let clue = document.createElement("div");
        clue.setAttribute("contentEditable", "true");
        clue.className = "clue-desc";
        clue.innerText = "...";
        clue.addEventListener("focus", uiFocusClue);
        entry.appendChild(clue);
        let moveup = document.createElement("button");
        moveup.className = "moveup";
        moveup.addEventListener("click", uiClickMoveUp);
        let movedown = document.createElement("button");
        movedown.className = "movedown";
        movedown.addEventListener("click", uiClickMoveDown);
        let del = document.createElement("button");
        del.className = "delete";
        del.addEventListener("click", uiClickDelete);
        entry.appendChild(moveup);
        entry.appendChild(movedown);
        entry.appendChild(del);
        this.element[dir].appendChild(entry);
        entry.scrollIntoView();
        //
        this.refresh();
        return entry;
    }
}


// Main code
const gridElement = document.getElementById("main-grid");
const acrossElement = document.getElementById("clues-across");
const downElement = document.getElementById("clues-down");

var game = new GridController(gridElement);
var cc = new ClueController(game, acrossElement, downElement);
game.init();
cc.init();

// UI functions
function uiClickCell(event) {
    let selection = this.id.match(/cell-(\d+)-(\d+)/);
    let i = parseInt(selection[1]);
    let j = parseInt(selection[2]);
    game.actionClickCell(i, j);
    event.preventDefault();
}

function uiFocusClue(event) {
    let clueidx = this.parentNode.querySelector(".clue-label").innerText;
    if (clueidx) {
        let idx = parseInt(clueidx) - 1;
        let dir = this.parentNode.parentNode.getAttribute("id").split("-")[1];
        game.selector.selectClue(idx, dir);
    }
}

function uiClickMoveUp(event) {
    let entry = this.parentNode;
    if (entry.previousElementSibling != null) {
        entry.parentNode.insertBefore(entry, entry.previousElementSibling);
    }
    cc.refresh();
    entry.querySelector(".clue-desc").focus();
    event.preventDefault();
}

function uiClickMoveDown(event) {
    let entry = this.parentNode;
    if (entry.nextElementSibling != null) {
        entry.parentNode.insertBefore(entry.nextElementSibling, entry);
    }
    cc.refresh();
    entry.querySelector(".clue-desc").focus();
    event.preventDefault();
}

function uiClickDelete(event) {
    this.parentNode.remove();
    cc.refresh();
    event.preventDefault();
}
    
// Utilities
function otherDirection(dir) {
    return {
        "across": "down",
        "down": "across"
    }[dir];
}

// for (let element of document.querySelectorAll("button.option[data-action=export]")) {
//     element.addEventListener("click", function(event) {
//         let data = game.exportPuzzle(this.getAttribute("data-value"));
//         if (data) {
//             navigator.clipboard.writeText(data).then(function() {
//                 alert("Successfully copied to clipboard!");
//             }, function() {
//                 alert("Error: Failed to copy to clipboard.");
//             });
//         }
//     });
// }

// for (let element of document.querySelectorAll("button.option[data-action=import]")) {
//     element.addEventListener("click", function(event) {
//         let pasteHandler = function(event) {
//             let data = (event.clipboardData || window.clipboardData).getData("text");
//             if (data) {
//                 game.importPuzzle(data);
//                 console.log("Imported clipboard data");
//             } else {
//                 console.error("No clipboard data to import");
//             }
//             this.removeEventListener("paste", pasteHandler);
//         };
//         document.addEventListener("paste", pasteHandler);
//     });
// }

// document.querySelector("button.option[data-action=symmetry]").addEventListener("click", function(event) {
//     game.symmetry = !game.symmetry;
//     let state = game.symmetry ? "on" : "off";
//     this.querySelector(".toggle").className = "toggle " + state;
//     this.querySelector(".toggle").innerText = state.toUpperCase();
//     game.checkSymmetry();
// });


// // Old code

// resetClues() {
//     for (let entry of document.querySelectorAll("div.clue-entry")) {
//         entry.remove();
//     }
// }

// exportAnswers() {
//     let answers = [];
//     for (let i = 0; i < this.state.length; i++) {
//         let row = [];
//         for (let j = 0; j < this.state[i].length; j++) {
//             row.push(this.state[i][j]["cell"] ? this.state[i][j]["value"] : null);
//         }
//         answers.push(row);
//     }
//     return answers;
// }

// exportPuzzle(fmt) {
//     this.refreshGrid();
//     if (fmt == "json") {
//         let data = {
//             "width": this.width,
//             "height": this.height,
//             "grid": [],
//             "clues": {
//                 "across": [],
//                 "down": []
//             }
//         };
//         // Answers
//         for (let i = 0; i < this.height; i++) {
//             let row = [];
//             for (let j = 0; j < this.width; j++) {
//                 if (this.state[i][j]["cell"]) {
//                     if (!this.state[i][j]["value"]) return alert("Please fill in all of the cells.");
//                     row.push(this.state[i][j]["value"]);
//                 } else {
//                     row.push(null);
//                 }
//             }
//             data["grid"].push(row);
//         }
//         // Clues
//         for (let entry of document.querySelectorAll("#clues-across .clue-entry")) {
//             if (entry.querySelector(".clue-label").innerText) {
//                 data["clues"]["across"].push(entry.querySelector(".clue-desc").innerText);
//             }  else {
//                 console.warn("Too many defined clues!");
//             }
//         }
//         for (let entry of document.querySelectorAll("#clues-down .clue-entry")) {
//             if (entry.querySelector(".clue-label").innerText) {
//                 data["clues"]["down"].push(entry.querySelector(".clue-desc").innerText);
//             }  else {
//                 console.warn("Too many defined clues!");
//             }
//         }
//         return JSON.stringify(data);
//     } else if (fmt == "rxf") {
//         return alert("RXF format support coming soon!");
//     } else if (fmt == "exf") {
//         let str = this.width + " " + this.height + "\n";
//         // Answers
//         for (let i = 0; i < this.height; i++) {
//             for (let j = 0; j < this.width; j++) {
//                 if (this.state[i][j]["cell"]) {
//                     if (!this.state[i][j]["value"]) return alert("Please fill in all of the cells.");
//                     str += this.state[i][j]["value"];
//                 } else {
//                     str += " ";
//                 }
//             }
//         }
//         str += "\n";
//         // Clues
//         str += "across\n";
//         for (let entry of document.querySelectorAll("#clues-across .clue-entry")) {
//             if (entry.querySelector(".clue-label").innerText) {
//                 str += ":" + entry.querySelector(".clue-desc").innerText + "\n";
//             }  else {
//                 console.warn("Too many defined clues!");
//             }
//         }
//         str += "down\n";
//         for (let entry of document.querySelectorAll("#clues-down .clue-entry")) {
//             if (entry.querySelector(".clue-label").innerText) {
//                 str += ":" + entry.querySelector(".clue-desc").innerText + "\n";
//             }  else {
//                 console.warn("Too many defined clues!");
//             }
//         }
//         return btoa(str);
//     }
// }

// importPuzzle(data) {
//     let fmt;
//     if (data[0] == "{") fmt = "json";
//     else if (data.includes("\n")) fmt = "rxf";
//     else fmt = "exf";
//     if (fmt == "json") {
//         data = JSON.parse(data);
//         this.width = data["width"];
//         this.height = data["height"];
//         // Answers
//         this.refreshGrid(data["grid"]);
//         // Clues
//         this.resetClues();
//         for (let clue of data["clues"]["across"]) {
//             this.addClue("across").querySelector(".clue-desc").innerText = clue;
//         }
//         for (let clue of data["clues"]["down"]) {
//             this.addClue("down").querySelector(".clue-desc").innerText = clue;
//         }
//     } else if (fmt == "rxf") {
//         return alert("RXF format support coming soon!");
//     } else if (fmt == "exf") {
//         let str = atob(data);
//         let [dims, grid, ...clues] = str.split("\n");
//         [this.width, this.height] = dims.split(" ").map((x) => parseInt(x));
//         this.resizeGrid(this.width, this.height);
//         let answers = [];
//         for (let i = 0; i < this.height; i++) {
//             let row = [];
//             for (let j = 0; j < this.width; j++) {
//                 if (grid[i * this.width + j] != " ") {
//                     row.push(grid[i * this.width + j]);
//                 } else {
//                     row.push(null);
//                 }
//             }
//             answers.push(row);
//         }
//         this.refreshGrid(answers);
//         this.resetClues();
//         let mode = "";
//         for (let clue of clues) {
//             if (clue == "across" || clue == "down") {
//                 mode = clue;
//             } else {
//                 this.addClue(mode).querySelector(".clue-desc").innerText = clue.substring(1);
//             }
//         }
//     }
// }
