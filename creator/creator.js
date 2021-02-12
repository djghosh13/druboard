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
            if (action["oldvalue"] === action["newvalue"]) return null;
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
            if (action["oldvalue"] === action["newvalue"]) return null;
            if (!state["cell"] || blocked) return null;
            state["value"] = value;
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
        return action;
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
            this.width = size;
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
            this.height = size;
            if (render) this.render();
            return action;
        }
        return action;
    }

    // Generate actions
    actionToggleCell(i, j, value = null) {
        let actionList = [];
        let newstate = (value === null) ? !this.state[i][j]["cell"] : value;
        actionList.push({
            "type": "mark",
            "cell": [i, j],
            "newvalue": newstate ? "" : null
        });
        return actionList;
    }

    actionEditCell(i, j, value) {
        let actionList = [];
        actionList.push({
            "type": "edit",
            "cell": [i, j],
            "newvalue": value
        });
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
        let cellWidth = window.innerWidth * 0.55 / this.width * 0.85;
        let cellHeight = window.innerHeight / this.height * 0.9 * 0.85;
        let cellPx = Math.max(Math.min(cellWidth, cellHeight, 120), 16);
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

    selectedClue() {
        if (!this.selected) return null;
        let clue = this.structure.getClue(...this.cell, this.direction);
        return this.structure.clueToCell[clue][this.direction];
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

    init(...additionalActors) {
        let game = this;
        this.actors = [...this.actors, ...additionalActors];
        // Setup UI events
        for (let element of document.querySelectorAll("button.increment")) {
            element.addEventListener("click", function(event) {
                if (this.getAttribute("data-property") == "width") {
                    let width = game.grid.width + parseInt(this.getAttribute("data-value"));
                    if (3 <= width && width <= 32) {
                        game.takeAction(game.grid.actionResize("width", width));
                    }
                } else if (this.getAttribute("data-property") == "height") {
                    let height = game.grid.height + parseInt(this.getAttribute("data-value"));
                    if (3 <= height && height <= 32) {
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
                document.querySelector("#clues-down").contains(event.target) ||
                document.querySelector("#header").contains(event.target)) return;
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
                let render = true; // !actions.length; // Render if last action
                for (let actor of this.actors) {
                    action = actor.doAction(action, render);
                    if (action === null) break;
                }
                if (action !== null) done.push(action);
            }
            if (done.length) this.actionHistory.push(done);
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
                let render = true; // !actions.length; // Render if last action
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

    doAction(action, render = false) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
                this.refresh();
            case "edit":
            default:
        }
        return action;
    }

    undoAction(action, render = false) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
                this.refresh();
            case "edit":
            default:
        }
        return action;
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

    clear() {
        this.element["across"].innerHTML = "";
        this.element["down"].innerHTML = "";
    }
}


// Main code
const gridElement = document.getElementById("main-grid");
const acrossElement = document.getElementById("clues-across");
const downElement = document.getElementById("clues-down");

var game = new GridController(gridElement);
var cc = new ClueController(game, acrossElement, downElement);
game.init(cc);
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

function exportJSON() {
    let puzzle = {
        "metadata": {
            "valid": true,
            "title": "",
            "author": ""
        },
        "dimensions": [game.grid.width, game.grid.height],
        "answers": [],
        "clues": {
            "across": [],
            "down": []
        }
    };
    // Metadata
    puzzle["metadata"]["title"] = document.querySelector(".head-title").innerText;
    puzzle["metadata"]["author"] = document.querySelector(".head-byline").innerText;
    // Fill in answers
    for (let i = 0; i < game.grid.height; i++) {
        let row = [];
        for (let j = 0; j < game.grid.width; j++) {
            if (game.grid.isOpen(i, j)) {
                let value = game.grid.state[i][j]["value"];
                if (game.structure.cellToClue[i][j]["across"] === null &&
                        game.structure.cellToClue[i][j]["down"] === null)
                    value = "";
                row.push(value);
                if (!value) puzzle["metadata"]["valid"] = false;
            } else {
                row.push(null);
            }
        }
        puzzle["answers"].push(row);
    }
    // Retrieve clues
    for (let dir of ["across", "down"]) {
        let clues = cc.element[dir].querySelectorAll(".clue-entry")
        for (let entry of clues) {
            puzzle["clues"][dir].push(entry.querySelector(".clue-desc").innerText);
        }
        let nclues = game.structure.clueToCell.reduce((a, c) => a + (c[dir].length != 0));
        if (clues.length != nclues) {
            puzzle["metadata"]["valid"] = false;
        }
    }
    return puzzle;
}

function importJSON(puzzle) {
    game.takeAction(game.grid.actionResize("width", puzzle["dimensions"][0]));
    game.takeAction(game.grid.actionResize("height", puzzle["dimensions"][1]));
    // Answers
    let actions = [];
    for (let i = 0; i < game.grid.height; i++) {
        for (let j = 0; j < game.grid.width; j++) {
            actions = [...game.grid.actionToggleCell(i, j, puzzle["answers"][i][j] !== null), ...actions];
            if (puzzle["answers"][i][j] !== null) {
                actions = [...game.grid.actionEditCell(i, j, puzzle["answers"][i][j]), ...actions];
            }
        }
    }
    game.takeAction(actions);
    // Clues
    cc.clear();
    for (let dir of ["across", "down"]) {
        for (let clue of puzzle["clues"][dir]) {
            cc.addClue(dir).querySelector(".clue-desc").innerText = clue;
        }
    }
    // Metadata
    document.querySelector(".head-title").innerText = puzzle["metadata"]["title"] || "";
    document.querySelector(".head-byline").innerText = puzzle["metadata"]["author"] || "";
}

var exportFormat = {
    "json": JSON.stringify,
    "exf": function(puzzle) {
        let data = [puzzle["metadata"], puzzle["dimensions"]];
        let answerStr = "";
        for (let i = 0; i < puzzle["dimensions"][1]; i++) {
            for (let j = 0; j < puzzle["dimensions"][0]; j++) {
                let ans = puzzle["answers"][i][j];
                answerStr += (ans === null) ? "0" : (ans || " ");
            }
        }
        data.push(answerStr);
        data = [...data, puzzle["clues"]["across"], puzzle["clues"]["down"]];
        return btoa(JSON.stringify(data));
    },
    "rxf": () => alert("RXF support coming soon!")
};

var importFormat = {
    "json": JSON.parse,
    "exf": function(str) {
        let data = JSON.parse(atob(str));
        let puzzle = {};
        puzzle["metadata"] = data[0];
        puzzle["dimensions"] = data[1];
        puzzle["answers"] = [];
        for (let i = 0; i < puzzle["dimensions"][1]; i++) {
            let row = [];
            for (let j = 0; j < puzzle["dimensions"][0]; j++) {
                let ans = data[2][i * puzzle["dimensions"][0] + j];
                row.push(ans == "0" ? null : ans == " " ? "" : ans);
            }
            puzzle["answers"].push(row);
        }
        puzzle["clues"] = {
            "across": data[3],
            "down": data[4]
        };
        return puzzle;
    },
    "rxf": () => alert("Unrecognized format")
};

for (let element of document.querySelectorAll("button.option[data-action=export]")) {
    element.addEventListener("click", function(event) {
        let data = exportFormat[this.getAttribute("data-value")](exportJSON());
        if (data) {
            navigator.clipboard.writeText(data).then(function() {
                alert("Successfully copied to clipboard!");
            }, function() {
                alert("Error: Failed to copy to clipboard.");
            });
        }
    });
}

for (let element of document.querySelectorAll("button.option[data-action=import]")) {
    element.addEventListener("click", function(event) {
        let pasteHandler = function(event) {
            let data = (event.clipboardData || window.clipboardData).getData("text");
            if (data) {
                for (let fmt in importFormat) {
                    try {
                        importJSON(importFormat[fmt](data));
                        console.log("Imported clipboard data");
                        break;
                    } catch (e) {

                    }
                }
            } else {
                console.error("No clipboard data to import");
            }
            this.removeEventListener("paste", pasteHandler);
        };
        document.addEventListener("paste", pasteHandler);
    });
}

var searching = false;

function wsSelectResult(idx, dir) {
    return function(event) {
        let word = this.innerText.replace(/[^A-Z]/g, "");
        let cells = game.structure.clueToCell[idx][dir];
        if (word.length == cells.length) {
            let actions = [];
            for (let i = 0; i < word.length; i++) {
                actions = [...actions, ...game.grid.actionEditCell(...cells[i], word[i])];
            }
            game.takeAction(actions);
        }
        wsClearResults();
    };
}

function wsClearResults() {
    let listElement = document.querySelector("#suggestions");
    listElement.parentNode.classList.remove("open-bar");
    listElement.querySelectorAll("div.suggestion-result").forEach(x => x.remove());
}

document.querySelector("#suggest").addEventListener("click", function(event) {
    this.parentNode.classList.remove("open-bar");
    if (game.selector.selected && !searching) {
        let word = game.selector.selectedClue().map(cell => game.grid.state[cell[0]][cell[1]]["value"]);
        if (word.reduce((a, x) => a || x, false)) {
            // Get reference to clue
            let clueidx = game.structure.getClue(...game.selector.cell, game.selector.direction);
            let cluedir = game.selector.direction;
            // Search up word
            searching = true;
            let listElement = document.querySelector("#suggestions");
            requestAutofill(word, function(wordlist) {
                listElement.querySelectorAll("div.suggestion-result").forEach(x => x.remove());
                let lastElement = listElement.querySelector("div.close");
                for (let word of wordlist) {
                    let result = document.createElement("div");
                    result.className = "suggestion-result";
                    result.innerText = word;
                    result.addEventListener("click", wsSelectResult(clueidx, cluedir));
                    listElement.insertBefore(result, lastElement);
                }
                searching = false;
                listElement.parentNode.classList.add("open-bar");
            }, Math.floor(48 / Math.max(word.length, 4)));
        }
    }
});

document.querySelector("#suggestions div.close").addEventListener("click", wsClearResults);