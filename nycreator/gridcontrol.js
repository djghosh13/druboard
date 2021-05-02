// NY Creator: Base actors
class NYGrid extends Grid{
    constructor(element) {
        super(element);
        this.state = [[{"end-x": false, "end-y": false, "value": ""}]];
        // Handlers
        let grid = this;
        this.borderClickHandler = function(event) {
            let selection = this.parentElement.id.match(/cell-(\d+)-(\d+)/);
            let i = parseInt(selection[1]);
            let j = parseInt(selection[2]);
            let axis = this.getAttribute("data-value");
            if (grid.controller.actionMarkBorder(i, j, axis)) {
                event.stopPropagation();
            }
            event.preventDefault();
        };
    }

    // Perform actions
    doAction(action, last = true) {
        // Mark cell border as blocked or open
        if (action["type"] == "mark") {
            let [i, j] = action["cell"];
            let state = this.state[i][j];
            let axis = action["axis"];
            let value = action["newvalue"];
            action["oldvalue"] = state["end-" + axis];
            if (action["oldvalue"] === action["newvalue"]) return null;
            state["end-" + axis] = value;
            this.renderCell(i, j);
            return action;
        }
        // Change cell value
        else if (action["type"] == "edit") {
            let [i, j] = action["cell"];
            let state = this.state[i][j];
            let value = action["newvalue"] || "";
            action["oldvalue"] = state["value"];
            if (action["oldvalue"] === action["newvalue"]) return null;
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
                        "end-x": false,
                        "end-y": false,
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
                        "end-x": false,
                        "end-y": false,
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
        // Mark cell border as blocked or open
        if (action["type"] == "mark") {
            let [i, j] = action["cell"];
            let state = this.state[i][j];
            let axis = action["axis"];
            let value = action["oldvalue"];
            state["end-" + axis] = value;
            this.renderCell(i, j);
            return action;
        }
        // Change cell value
        else if (action["type"] == "edit") {
            let [i, j] = action["cell"];
            let state = this.state[i][j];
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
                        "end-x": false,
                        "end-y": false,
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
                        "end-x": false,
                        "end-y": false,
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
    actionToggleBorder(i, j, axis, value = null) {
        let actionList = [];
        let newstate = (value === null) ? !this.state[i][j]["end-" + axis] : value;
        actionList.push({
            "type": "mark",
            "cell": [i, j],
            "axis": axis,
            "newvalue": newstate
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
                if (this.state[i][j]["value"]) {
                    actionList.push({
                        "type": "edit",
                        "cell": [i, j],
                        "newvalue": ""
                    });
                }
                if (dim == "width" && j > 0 && this.state[i][j - 1]["end-x"]) {
                    actionList.push({
                        "type": "mark",
                        "cell": [i, j - 1],
                        "axis": "x",
                        "newvalue": false
                    });
                }
                if (dim == "height" && i > 0 && this.state[i - 1][j]["end-y"]) {
                    actionList.push({
                        "type": "mark",
                        "cell": [i - 1, j],
                        "axis": "y",
                        "newvalue": false
                    });
                }
            }
        }
        return actionList;
    }

    // Visuals
    render() {
        // Set styles
        let cellWidth = window.innerWidth * 0.55 / this.width * 0.85;
        let cellHeight = window.innerHeight / this.height * 0.9 * 0.85;
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
                this.populateCell(cell, i, j);
                cell.addEventListener("click", this.clickHandler);
                row.appendChild(cell);
            }
            this.element.appendChild(row);
        }
    }

    renderCell(i, j) {
        let cell = this.getCellElement(i, j);
        cell.innerHTML = "";
        this.populateCell(cell, i, j);
    }

    // Utility
    getCellElement(i, j) {
        return this.element.querySelector("#cell-" + i + "-" + j);
    }

    populateCell(cell, i, j) {
        // Set value of cell
        let value = document.createElement("span");
        value.innerText = this.state[i][j]["value"];
        cell.appendChild(value);
        // Set current borders
        cell.classList.toggle("end-x", this.state[i][j]["end-x"]);
        cell.classList.toggle("end-y", this.state[i][j]["end-y"]);
        // Add border click listeners
        if (i != this.height - 1) {
            let border = document.createElement("div");
            border.className = "border-y";
            border.setAttribute("data-value", "y");
            border.addEventListener("click", this.borderClickHandler);
            cell.appendChild(border);
        }
        if (j != this.width - 1) {
            let border = document.createElement("div");
            border.className = "border-x";
            border.setAttribute("data-value", "x");
            border.addEventListener("click", this.borderClickHandler);
            cell.appendChild(border);
        }
    }

    isEndX(i, j) {
        return this.state[i][j]["end-x"];
    }

    isEndY(i, j) {
        return this.state[i][j]["end-y"];
    }
}


class NYGridStructure extends GridStructure{
    constructor(grid) {
        super(grid);
    }

    refresh() {
        // Refresh lookup tables
        this.cellToClue = [];
        this.clueToCell = [];
        for (let i = 0; i < this.grid.height; i++) {
            let row = [];
            for (let j = 0; j < this.grid.width; j++) {
                let clues = {
                    "across": null,
                    "down": null
                };
                // Check if start of clue
                if ((i == 0 || this.grid.isEndY(i - 1, j)) &&
                    !(i == this.grid.height - 1 || this.grid.isEndY(i, j))) {
                    clues["down"] = this.clueToCell.length;
                }
                if ((j == 0 || this.grid.isEndX(i, j - 1)) &&
                    !(j == this.grid.width - 1 || this.grid.isEndX(i, j))) {
                    clues["across"] = this.clueToCell.length;
                }
                if (clues["across"] !== null || clues["down"] !== null) {
                    this.clueToCell.push({
                        "across": clues["across"] !== null ? [[i, j]] : [],
                        "down": clues["down"] !== null ? [[i, j]] : []
                    });
                }
                // Check if part of clue
                if (i != 0 && !this.grid.isEndY(i - 1, j)) {
                    clues["down"] = this.cellToClue[i - 1][j]["down"];
                    this.clueToCell[clues["down"]]["down"].push([i, j]);
                }
                if (j != 0 && !this.grid.isEndX(i, j - 1)) {
                    clues["across"] = row[j - 1]["across"];
                    this.clueToCell[clues["across"]]["across"].push([i, j]);
                }
                row.push(clues);
            }
            this.cellToClue.push(row);
        }
    }
}


// Main controller
class NYGridController extends GridController {
    constructor(gridElement) {
        super(gridElement);
        this.grid = new NYGrid(gridElement);
        this.grid.controller = this;
        this.structure = new NYGridStructure(this.grid);
        this.selector = new GridSelector(this.grid, this.structure);
        this.actors = [this.grid, this.structure, this.selector];
        this.actionHistory = [], this.actionFuture = [];
        // UI
        this.mode = "mark";
        this.lockAspect = true;
        this.symmetry = false;
        this.theme = "light";
    }

    init(...additionalActors) {
        let game = this;
        // Edit mode setting
        for (let element of document.querySelectorAll("div.mode")) {
            element.addEventListener("click", function(event) {
                game.mode = this.getAttribute("data-value");
                window.localStorage.setItem("setting-mode", game.mode);
                for (let elem of document.querySelectorAll("div.mode")) {
                    elem.nextElementSibling.classList.remove("selected");
                }
                this.nextElementSibling.classList.add("selected");
                document.querySelectorAll("#main-grid").forEach(function(elem) {
                    elem.classList.toggle("mark-active", game.mode == "mark");
                });
            });
        }
        if (window.localStorage.getItem("setting-mode") !== null) {
            let savedMode = window.localStorage.getItem("setting-mode");
            document.querySelectorAll("div.mode[data-value=" + savedMode + "]").forEach(
                element => element.click()
            );
        }
        super.init(...additionalActors);
    }

    // UI
    actionClickCell(i, j) {
        if (this.mode == "write" || this.mode == "mark") {
            this.selector.selectCell(i, j);
        }
    }

    actionMarkBorder(i, j, axis) {
        if (this.mode == "mark") {
            this.selector.selected = false;
            if (this.symmetry) {
                let [si, sj] = (axis == "x")
                    ? [this.grid.height - i - 1, this.grid.width - j - 2]
                    : [this.grid.height - i - 2, this.grid.width - j - 1];
                let value = (axis == "x") ? this.grid.isEndX(i, j) : this.grid.isEndY(i, j);
                let actions = [
                    ...this.grid.actionToggleBorder(i, j, axis, !value),
                    ...this.grid.actionToggleBorder(si, sj, axis, !value)
                ];
                this.takeAction(actions);
            } else {
                this.takeAction(this.grid.actionToggleBorder(i, j, axis));
            }
            return true;
        }
        return false;
    }
}