// Base actors
class Grid {
    constructor(element) {
        this.width = 1;
        this.height = 1;
        this.state = [[{"cell": true, "value": ""}]];
        this.element = element;
        this.controller = null; // Need to set this on initialization
        // Handlers
        let grid = this;
        this.clickHandler = function(event) {
            let selection = this.id.match(/cell-(\d+)-(\d+)/);
            let i = parseInt(selection[1]);
            let j = parseInt(selection[2]);
            let mode = (event.which == 3) ? "mark" : "write";
            grid.controller.actionClickCell(i, j, mode);
            event.preventDefault();
        };
    }

    // Perform actions
    doAction(action, last = true) {
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
            this.renderCell(i, j);
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
            this.renderCell(i, j);
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
            this.render();
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
            this.render();
            return action;
        }
        return action;
    }

    undoAction(action, last = true) {
        // Mark cell black or white
        if (action["type"] == "mark") {
            let [i, j] = action["cell"];
            let state = this.state[i][j];
            let blocked = action["oldvalue"] === null;
            let value = action["oldvalue"] || "";
            // TODO: Add conflict checks
            state["cell"] = !blocked;
            state["value"] = value;
            this.renderCell(i, j);
            return action;
        }
        // Change cell value
        else if (action["type"] == "edit") {
            let [i, j] = action["cell"];
            let state = this.state[i][j];
            let blocked = action["oldvalue"] === null;
            let value = action["oldvalue"] || "";
            state["value"] = value;
            this.renderCell(i, j);
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
            this.render();
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
            this.render();
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
        actionList.push({
            "type": "resize-" + dim,
            "newvalue": value
        });
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
        return actionList;
    }

    // Visuals
    render() {
        // Set styles
        let cellWidth = this.element.parentNode.offsetWidth / this.width * 0.85;
        let cellHeight = this.element.parentNode.offsetHeight / this.height * 0.9 * 0.85;
        let cellPx = Math.max(Math.min(cellWidth, cellHeight, 120), 16);
        document.documentElement.style.setProperty("--cell-size", Math.floor(cellPx) + "px");
        document.documentElement.style.setProperty("--grid-width", this.width + "");
        document.documentElement.style.setProperty("--grid-height", this.height + "");
        //
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
                cell.addEventListener("click", this.clickHandler);
                cell.addEventListener("auxclick", this.clickHandler);
                cell.addEventListener("contextmenu", event => event.preventDefault());
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
    doAction(action, last = true) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
                this.refresh();
            case "edit":
            default:
        }
        this.render();
        return action;
    }

    undoAction(action, last = true) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
                this.refresh();
            case "edit":
            default:
        }
        this.render();
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
        try {
            return this.cellToClue[i][j][dir];
        } catch (err) {
            return null;
        }
        return null;
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

    doAction(action, last = true) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
                this.refresh();
            case "edit":
            default:
        }
        this.render();
        return action;
    }

    undoAction(action, last = true) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
                this.refresh();
            case "edit":
            default:
        }
        this.render();
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
            if (this.structure.getClue(i, j, this.direction) !== null) {
                this.selected = true;
                this.cell = [i, j];
                this.direction = this.direction;
            } else if (this.structure.getClue(i, j, otherDirection(this.direction)) !== null) {
                this.selected = true;
                this.cell = [i, j];
                this.direction = otherDirection(this.direction);
            }
        }
        this.render();
    }

    trySelect() {
        if (this.selected) return;
        for (let i = 0; i < this.grid.height; i++) {
            for (let j = 0; j < this.grid.width; j++) {
                if (this.structure.getClue(i, j, "across") !== null) {
                    this.selected = true;
                    this.cell = [i, j];
                    this.direction = "across";
                    this.render();
                    return true;
                }
                if (this.structure.getClue(i, j, "down") !== null) {
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

    scrollClue(forward) {
        const nclues = this.structure.clueToCell.length;
        if (!this.selected) {
            this.trySelect();
            if (forward) return;
        }
        let clue = this.structure.getClue(...this.cell, this.direction);
        let dx = forward ? 1 : nclues - 1;
        let dir = this.direction;
        for (let c = (clue + dx) % nclues;; c = (c + dx) % nclues) {
            if ((c + dx) % (2 * nclues - 3) == 1) dir = otherDirection(dir); // This looks dumb
            if (this.structure.clueToCell[c][dir].length) {
                this.direction = dir;
                this.cell = this.structure.clueToCell[c][dir][0]; // For Roy
                break;
            } else if (c == clue) return console.error("Wrapped around but no clue found");
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


// Main controller
class GridController {
    constructor(gridElement) {
        this.grid = new Grid(gridElement);
        this.grid.controller = this;
        this.structure = new GridStructure(this.grid);
        this.selector = new GridSelector(this.grid, this.structure);
        this.actors = [this.grid, this.structure, this.selector];
        this.actionHistory = [], this.actionFuture = [];
        // UI
        this.lockAspect = true;
        this.symmetry = false;
        this.theme = "light";
    }

    init(...additionalActors) {
        let game = this;
        this.actors = [...this.actors, ...additionalActors];
        // Bind UI handlers
        for (let element of document.querySelectorAll("div.increment")) {
            element.addEventListener("click", function(event) {
                let dim = parseInt(this.getAttribute("data-value"));
                if (this.getAttribute("data-property") == "width") {
                    dim += game.grid.width;
                } else if (this.getAttribute("data-property") == "height") {
                    dim += game.grid.height;
                } else {
                    throw console.error("Unsupported operation");
                }
                if (3 <= dim && dim <= 32) {
                    if (game.lockAspect) {
                        let historyLength = game.actionHistory.length;
                        game.takeAction(game.grid.actionResize("width", dim));
                        game.takeAction(game.grid.actionResize("height", dim));
                        game.mergeHistoryAfter(historyLength);
                    } else {
                        game.takeAction(game.grid.actionResize(this.getAttribute("data-property"), dim));
                    }
                }
            });
        }
        // Theme setting
        document.querySelector("div.option[data-action=theme]").addEventListener("click", function(event) {
            game.theme = game.theme == "light" ? "dark" : "light";
            window.localStorage.setItem("setting-theme", game.theme);
            this.querySelector(".toggle-theme").innerText = game.theme.toUpperCase();
            document.body.className = "color-theme-" + game.theme;
        });
        if (window.matchMedia("(prefers-color-scheme)").matches) {
            let defaultTheme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
            if (defaultTheme != this.theme) {
                this.theme = defaultTheme;
                document.querySelector(".toggle-theme").innerText = this.theme.toUpperCase();
            }
        }
        if (window.localStorage.getItem("setting-theme") !== null) {
            let savedTheme = window.localStorage.getItem("setting-theme");
            if (savedTheme != this.theme) {
                document.querySelector("div.option[data-action=theme]").click();
            }
        }
        // Lock aspect ratio setting
        document.querySelector("div[data-action=lock-aspect]").addEventListener("click", function(event) {
            game.lockAspect = !game.lockAspect;
            window.localStorage.setItem("setting-lock-aspect", game.lockAspect);
            this.classList.toggle("on", game.lockAspect);
        });
        if (window.localStorage.getItem("setting-lock-aspect") !== null) {
            if (window.localStorage.getItem("setting-lock-aspect") != "true") {
                document.querySelector("div[data-action=lock-aspect]").click();
            }
        }
        // Symmetry setting
        document.querySelector("div.option[data-action=symmetry]").addEventListener("click", function(event) {
            game.symmetry = !game.symmetry;
            window.localStorage.setItem("setting-symmetry", game.symmetry);
            this.querySelector(".toggle").classList.toggle("on", game.symmetry);
            this.querySelector(".toggle").innerText = game.symmetry ? "ON" : "OFF";
        });
        if (window.localStorage.getItem("setting-symmetry") !== null) {
            if (window.localStorage.getItem("setting-symmetry") != "false") {
                document.querySelector("div.option[data-action=symmetry]").click();
            }
        }
        // Help text
        document.querySelector("div.help-button").addEventListener("click", function(event) {
            document.querySelector("#help-box").classList.add("active");
        })
        document.querySelector("#help-box").addEventListener("click", function(event) {
            this.classList.remove("active");
        })
        // Keyboard controls
        document.addEventListener("keydown", function(event) {
            if (event.altKey) return;
            if (document.querySelector("#help-box").classList.contains("active")) {
                if (event.key == "Escape") {
                    document.querySelector("#help-box").classList.remove("active");
                }
                event.preventDefault();
                return;
            }
            if (document.querySelector("#clues-across").contains(event.target) ||
                document.querySelector("#clues-down").contains(event.target) ||
                document.querySelector("#header").contains(event.target)) {
                if (event.key == "Escape") {
                    event.target.blur();
                }
                return;
            }
            if (event.ctrlKey) {
                // Undo and redo
                if (event.key.toUpperCase() == "Z") {
                    game.prevAction();
                    event.preventDefault();
                } else if (event.key.toUpperCase() == "Y") {
                    game.nextAction();
                    event.preventDefault();
                }
                // Save
                if (event.key.toUpperCase() == "S") {
                    if (!IS_EMBED) DNotification.create("File saved.", 2500);
                    event.preventDefault();
                }
                return;
            }
            // Escape (deselect)
            if (event.key == "Escape") {
                game.selector.selected = false;
                game.selector.render();
            }
            // Tab (scroll through clues)
            if (event.key == "Tab") {
                game.selector.scrollClue(!event.shiftKey);
                event.preventDefault();
            }
            // Backtick (select clue)
            if (event.key == "`") {
                if (game.selector.selected) {
                    let [i, j] = game.selector.cell;
                    let clueidx = game.structure.cellToClue[i][j][game.selector.direction];
                    for (let entry of document.querySelectorAll(`#clues-${game.selector.direction} > .clue-entry`)) {
                        if (entry.querySelector(".clue-label").innerText == clueidx + 1) {
                            entry.querySelector(".clue-desc").focus();
                            break;
                        }
                    }
                }
                event.preventDefault();
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
        // Initialize additional actors
        additionalActors.forEach(x => x.init());
    }

    nextAction(actions = undefined) {
        let newAction = actions && actions.length;
        if (newAction) this.actionFuture.push(actions);
        if (newAction || this.actionFuture.length) {
            actions = this.actionFuture.pop();
            if (!actions.length) console.error("Empty action");
            let done = [];
            while (actions.length) {
                let action = actions.pop();
                let last = newAction || !actions.length;
                for (let actor of this.actors) {
                    action = actor.doAction(action, last);
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
                let last = !actions.length;
                for (let actor of this.actors) {
                    action = actor.undoAction(action, last);
                }
                done.push(action);
            }
            this.actionFuture.push(done);
        }
        this.refresh();
    }

    takeAction(actions) {
        if (actions.length) {
            this.nextAction(actions);
        }
    }

    mergeHistoryAfter(index) {
        let actions = [];
        while (this.actionHistory.length > index) {
            actions = [...this.actionHistory.pop(), ...actions];
        }
        if (actions.length) this.actionHistory.push(actions);
    }

    // UI
    refresh() {
        document.querySelector("div.input-value[data-property=width]").innerText = this.grid.width;
        document.querySelector("div.input-value[data-property=height]").innerText = this.grid.height;
    }

    actionClickCell(i, j, mode = "write") {
        if (mode == "mark") {
            this.selector.selected = false;
            if (this.symmetry) {
                let newstate = !this.grid.isOpen(i, j);
                let si = this.grid.height - i - 1, sj = this.grid.width - j - 1;
                this.takeAction([
                    ...this.grid.actionToggleCell(i, j, newstate),
                    ...this.grid.actionToggleCell(si, sj, newstate)
                ]);
            } else {
                this.takeAction(this.grid.actionToggleCell(i, j));
            }
        } else if (mode == "write") {
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

// Utilities
function otherDirection(dir) {
    return {
        "across": "down",
        "down": "across"
    }[dir];
}