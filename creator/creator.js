const grid = document.getElementById("main-grid");

class PuzzleMaker {
    constructor(gridElement) {
        this.grid = gridElement;

        this.width = 1;
        this.height = 1;
        // Initialize puzzle maker
        this.mode = "mark";
        this.symmetry = false;
        this.state = [[{"cell": false, "value": ""}]];
        this.selection = {"index": 0, "direction": "across", "position": 0};
        this.dragging = null;
        this.resizeGrid(3, 3);
        // Initialize UI
        this.selectCell(0, 0);
    }

    refreshGrid(answers = null) {
        // Get old answers array and resize it
        answers = answers || this.exportAnswers();
        for (let j = answers[0].length; j < this.width; j++) {
            for (let i = 0; i < answers.length; i++) {
                answers[i].push("");
            }
        }
        for (let i = answers.length; i < this.height; i++) {
            let row = [];
            for (let j = 0; j < this.width; j++) {
                row.push("");
            }
            answers.push(row);
        }
        // Re-populate state array
        this.state = [];
        let clueidx = 1;
        for (let i = 0; i < this.height; i++) {
            let row = [];
            for (let j = 0; j < this.width; j++) {
                if (answers[i][j] != null) {
                    // Check if cell is start of any clues
                    let clues = {
                        "across": null,
                        "down": null
                    };
                    if ((i == 0 || answers[i - 1][j] == null) &&
                        !(i == this.height - 1 || answers[i + 1][j] == null)) {
                        clues["down"] = clueidx;
                    }
                    if ((j == 0 || answers[i][j - 1] == null) &&
                        !(j == this.width - 1 || answers[i][j + 1] == null)) {
                        clues["across"] = clueidx;
                    }
                    let label = null;
                    if (clues["across"] || clues["down"]) {
                        label = clueidx;
                        clueidx++;
                    }
                    // Propagate clue association
                    if (i != 0 && answers[i - 1][j] != null) {
                        clues["down"] = this.state[i - 1][j]["clues"]["down"];
                    }
                    if (j != 0 && answers[i][j - 1] != null) {
                        clues["across"] = row[j - 1]["clues"]["across"];
                    }
                    row.push({
                        "cell": true,
                        "value": answers[i][j],
                        "clues": clues,
                        "label": label
                    });
                } else {
                    row.push({
                        "cell": false
                    });
                }
            }
            this.state.push(row);
        }
        // Populate clues
        this.clues = [null];
        for (let i = 1; i < clueidx; i++) {
            this.clues.push({
                "across": [],
                "down": []
            });
        }
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (this.state[i][j]["cell"]) {
                    let clues = this.state[i][j]["clues"];
                    if (clues["across"]) {
                        this.clues[clues["across"]]["across"].push([i, j]);
                    }
                    if (clues["down"]) {
                        this.clues[clues["down"]]["down"].push([i, j]);
                    }
                }
            }
        }
        this.renderCells();
        this.refreshClues();
    }

    renderCells() {
        let cellWidth = window.innerWidth * 0.55 / this.width * 0.9;
        let cellHeight = window.innerHeight / this.height * 0.8;
        let cellPx = Math.max(Math.min(cellWidth, cellHeight, 120), 20);
        document.documentElement.style.setProperty("--cell-size", Math.floor(cellPx) + "px");
        this.grid.innerHTML = "";
        for (let i = 0; i < this.height; i++) {
            let row = document.createElement("tr");
            for (let j = 0; j < this.width; j++) {
                let cell = document.createElement("td");
                cell.className = "cell";
                cell.id = "cell-" + i + "-" + j;
                if (this.state[i][j]["cell"]) {
                    // Value
                    let value = document.createElement("span");
                    value.innerText = this.state[i][j]["value"];
                    cell.appendChild(value);
                    // Clue label
                    if (this.state[i][j]["label"] != null) {
                        let label = document.createElement("span");
                        label.className = "cell-label";
                        label.innerText = this.state[i][j]["label"];
                        cell.appendChild(label);
                    }
                } else {
                    cell.className = "cell black";
                }
                cell.addEventListener("click", clickCell);
                row.appendChild(cell);
            }
            this.grid.appendChild(row);
        }
    }

    resizeGrid(nw, nh) {
        if (nw >= 3 && nh >= 3 && !(nw == this.width && nh == this.height)) {
            this.width = nw;
            this.height = nh;
            this.refreshGrid();
            this.checkSymmetry();
        }
        document.querySelector("div.input-value[data-property=width]").innerText = this.width;
        document.querySelector("div.input-value[data-property=height]").innerText = this.height;
    }

    checkSymmetry(cell = null) {
        if (!this.symmetry) return;
        let oldmode = this.mode;
        this.mode = "mark";
        if (cell === null) {
            for (let i = 0; i < this.height / 2; i++) {
                for (let j = 0; j < this.width; j++) {
                    let si = this.height - i - 1, sj = this.width - j - 1;
                    if (this.state[i][j]["cell"] != this.state[si][sj]["cell"]) {
                        this.selectCell(si, sj);
                    }
                }
            }
        } else {
            let [i, j] = cell;
            let si = this.height - i - 1, sj = this.width - j - 1;
            if (this.state[i][j]["cell"] != this.state[si][sj]["cell"]) {
                this.selectCell(si, sj);
            }
        }
        this.mode = oldmode;
    }

    renderSelection() {
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                let cell = this.getCell(i, j);
                cell.classList.remove("selected");
                cell.classList.remove("selected-clue");
            }
        }
        let clue = this.clues[this.selection["index"]][this.selection["direction"]];
        for (let k = 0; k < clue.length; k++) {
            let cell = this.getCell(clue[k][0], clue[k][1]);
            cell.classList.add("selected-clue");
            if (k == this.selection["position"]) {
                cell.classList.add("selected");
            }
        }
    }

    getCell(i, j) {
        return document.getElementById("cell-" + i + "-" + j);
    }

    getSelectedCell() {
        return this.clues[this.selection["index"]][this.selection["direction"]][this.selection["position"]];
    }

    selectCell(i, j) {
        let state = this.state[i][j];
        if (this.mode == "mark") {
            state["cell"] = !state["cell"];
            state["value"] = "";
            this.refreshGrid();
            this.checkSymmetry([i, j]);
            return;
        }
        if (!state["cell"]) {
            return;
        }
        if (state["clues"][this.selection["direction"]] == this.selection["index"]) {
            let selected = this.getSelectedCell();
            if (selected[0] == i && selected[1] == j) {
                // Selecting same cell, try to change clue direction
                let newdir = {"across": "down", "down": "across"}[this.selection["direction"]];
                if (state["clues"][newdir] != null) {
                    this.selection["direction"] = newdir;
                    this.selection["index"] = state["clues"][newdir];
                    this.selection["position"] = indexOf(this.clues[this.selection["index"]][newdir], [i, j]);
                }
            } else {
                // Selecting different cell in same clue
                this.selection["position"] = indexOf(this.clues[this.selection["index"]][this.selection["direction"]], [i, j]);
            }
        } else {
            // Selecting different clue altogether (prioritize across)
            let dir = state["clues"]["across"] ? "across" : "down";
            this.selection["direction"] = dir;
            this.selection["index"] = state["clues"][dir];
            this.selection["position"] = indexOf(this.clues[this.selection["index"]][dir], [i, j]);
        }
        this.renderSelection();
    }

    navigate(dir, forward) {
        var addIndex = (idx, inc) => (idx - 1 + inc + this.clues.length - 1) % (this.clues.length - 1) + 1;
        if (this.selection.direction == dir) {
            if (forward) {
                if (this.selection["position"] + 1 < this.clues[this.selection["index"]][dir].length) {
                    this.selection["position"]++;
                } else {
                    // Skip to next clue
                    let idx = addIndex(this.selection["index"], 1);
                    while (!this.clues[idx][dir].length) idx = addIndex(idx, 1);
                    this.selection["index"] = idx;
                    this.selection["position"] = 0;
                }
            } else {
                if (this.selection["position"] > 0) {
                    this.selection["position"]--;
                } else {
                    // Skip to previous clue
                    let idx = addIndex(this.selection["index"], -1);
                    while (!this.clues[idx][dir].length) idx = addIndex(idx, -1);
                    this.selection["index"] = idx;
                    this.selection["position"] = 0; // this.clues[idx][dir].length - 1;
                }
            }
        } else {
            let selected = this.getSelectedCell();
            if (this.state[selected[0]][selected[1]]["clues"][dir] != null) {
                return this.selectCell(selected[0], selected[1]);
            }
        }
        this.renderSelection();
    }

    typeCharacter(char) {
        let [i, j] = this.getSelectedCell();
        let state = this.state[i][j];
        if (!state["locked"]) {
            state["value"] = char;
            this.getCell(i, j).firstElementChild.innerText = char;
        }
        this.navigate(this.selection["direction"], true);
    }

    deleteCharacter(back) {
        let [i, j] = this.getSelectedCell();
        let state = this.state[i][j];
        if (!state["locked"]) {
            state["value"] = "";
            this.getCell(i, j).firstElementChild.innerText = "";
        }
        if (back && this.selection["position"] != 0) {
            this.navigate(this.selection["direction"], false);
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
        clue.addEventListener("focus", focusClue);
        entry.appendChild(clue);
        let moveup = document.createElement("button");
        moveup.className = "moveup";
        moveup.addEventListener("click", clickMoveUp);
        let movedown = document.createElement("button");
        movedown.className = "movedown";
        movedown.addEventListener("click", clickMoveDown);
        let del = document.createElement("button");
        del.className = "delete";
        del.addEventListener("click", clickDelete);
        entry.appendChild(moveup);
        entry.appendChild(movedown);
        entry.appendChild(del);
        document.querySelector("#clues-" + dir).appendChild(entry);
        entry.scrollIntoView();
        this.refreshClues();
        return entry;
    }

    resetClues() {
        for (let entry of document.querySelectorAll("div.clue-entry")) {
            entry.remove();
        }
    }

    refreshClues() {
        let entries = document.querySelectorAll("#clues-across .clue-entry");
        let idx = 1;
        for (let i = 0; i < entries.length; i++) {
            while (idx < this.clues.length && !this.clues[idx]["across"].length) idx++;
            if (idx < this.clues.length) {
                entries[i].querySelector(".clue-label").innerText = idx;
                idx++;
            } else {
                entries[i].querySelector(".clue-label").innerText = "";
            }
        }
        entries = document.querySelectorAll("#clues-down .clue-entry");
        idx = 1;
        for (let i = 0; i < entries.length; i++) {
            while (idx < this.clues.length && !this.clues[idx]["down"].length) idx++;
            if (idx < this.clues.length) {
                entries[i].querySelector(".clue-label").innerText = idx;
                idx++;
            } else {
                entries[i].querySelector(".clue-label").innerText = "";
            }
        }
    }

    exportAnswers() {
        let answers = [];
        for (let i = 0; i < this.state.length; i++) {
            let row = [];
            for (let j = 0; j < this.state[i].length; j++) {
                row.push(this.state[i][j]["cell"] ? this.state[i][j]["value"] : null);
            }
            answers.push(row);
        }
        return answers;
    }

    exportPuzzle(fmt) {
        this.refreshGrid();
        if (fmt == "json") {
            let data = {
                "width": this.width,
                "height": this.height,
                "grid": [],
                "clues": {
                    "across": [],
                    "down": []
                }
            };
            // Answers
            for (let i = 0; i < this.height; i++) {
                let row = [];
                for (let j = 0; j < this.width; j++) {
                    if (this.state[i][j]["cell"]) {
                        if (!this.state[i][j]["value"]) return alert("Please fill in all of the cells.");
                        row.push(this.state[i][j]["value"]);
                    } else {
                        row.push(null);
                    }
                }
                data["grid"].push(row);
            }
            // Clues
            for (let entry of document.querySelectorAll("#clues-across .clue-entry")) {
                if (entry.querySelector(".clue-label").innerText) {
                    data["clues"]["across"].push(entry.querySelector(".clue-desc").innerText);
                }  else {
                    console.warn("Too many defined clues!");
                }
            }
            for (let entry of document.querySelectorAll("#clues-down .clue-entry")) {
                if (entry.querySelector(".clue-label").innerText) {
                    data["clues"]["down"].push(entry.querySelector(".clue-desc").innerText);
                }  else {
                    console.warn("Too many defined clues!");
                }
            }
            return JSON.stringify(data);
        } else if (fmt == "rxf") {
            return alert("RXF format support coming soon!");
        } else if (fmt == "exf") {
            let str = this.width + " " + this.height + "\n";
            // Answers
            for (let i = 0; i < this.height; i++) {
                for (let j = 0; j < this.width; j++) {
                    if (this.state[i][j]["cell"]) {
                        if (!this.state[i][j]["value"]) return alert("Please fill in all of the cells.");
                        str += this.state[i][j]["value"];
                    } else {
                        str += " ";
                    }
                }
            }
            str += "\n";
            // Clues
            str += "across\n";
            for (let entry of document.querySelectorAll("#clues-across .clue-entry")) {
                if (entry.querySelector(".clue-label").innerText) {
                    str += ":" + entry.querySelector(".clue-desc").innerText + "\n";
                }  else {
                    console.warn("Too many defined clues!");
                }
            }
            str += "down\n";
            for (let entry of document.querySelectorAll("#clues-down .clue-entry")) {
                if (entry.querySelector(".clue-label").innerText) {
                    str += ":" + entry.querySelector(".clue-desc").innerText + "\n";
                }  else {
                    console.warn("Too many defined clues!");
                }
            }
            return btoa(str);
        }
    }

    importPuzzle(data) {
        let fmt;
        if (data[0] == "{") fmt = "json";
        else if (data.includes("\n")) fmt = "rxf";
        else fmt = "exf";
        if (fmt == "json") {
            data = JSON.parse(data);
            this.width = data["width"];
            this.height = data["height"];
            // Answers
            this.refreshGrid(data["grid"]);
            // Clues
            this.resetClues();
            for (let clue of data["clues"]["across"]) {
                this.addClue("across").querySelector(".clue-desc").innerText = clue;
            }
            for (let clue of data["clues"]["down"]) {
                this.addClue("down").querySelector(".clue-desc").innerText = clue;
            }
        } else if (fmt == "rxf") {
            return alert("RXF format support coming soon!");
        } else if (fmt == "exf") {
            let str = atob(data);
            let [dims, grid, ...clues] = str.split("\n");
            [this.width, this.height] = dims.split(" ").map((x) => parseInt(x));
            this.resizeGrid(this.width, this.height);
            let answers = [];
            for (let i = 0; i < this.height; i++) {
                let row = [];
                for (let j = 0; j < this.width; j++) {
                    if (grid[i * this.width + j] != " ") {
                        row.push(grid[i * this.width + j]);
                    } else {
                        row.push(null);
                    }
                }
                answers.push(row);
            }
            this.refreshGrid(answers);
            this.resetClues();
            let mode = "";
            for (let clue of clues) {
                if (clue == "across" || clue == "down") {
                    mode = clue;
                } else {
                    this.addClue(mode).querySelector(".clue-desc").innerText = clue.substring(1);
                }
            }
        }
    }
}

function indexOf(arrayOfArrays, array) {
    let index = -1;
    for (let k = 0; k < arrayOfArrays.length; k++) {
        if (arrayOfArrays[k].length == array.length) {
            let equal = true;
            for (let i = 0; i < array.length; i++) {
                if (array[i] != arrayOfArrays[k][i]) {
                    equal = false;
                    break;
                }
            }
            if (equal) {
                index = k;
                break;
            }
        }
    }
    return index;
}

function clickCell(event) {
    let selection = this.id.match(/cell-(\d+)-(\d+)/);
    let i = parseInt(selection[1]);
    let j = parseInt(selection[2]);
    game.selectCell(i, j);
    event.preventDefault();
}

function focusClue(event) {
    let clueidx = this.parentNode.querySelector(".clue-label").innerText;
    if (clueidx) {
        let dir = this.parentNode.parentNode.getAttribute("id").split("-")[1];
        game.selection["index"] = parseInt(clueidx);
        game.selection["direction"] = dir;
        game.selection["position"] = 0;
        game.renderSelection();
    }
}

function clickMoveUp(event) {
    let entry = this.parentNode;
    if (entry.previousElementSibling != null) {
        entry.parentNode.insertBefore(entry, entry.previousElementSibling);
    }
    game.refreshClues();
    entry.querySelector(".clue-desc").focus();
    event.preventDefault();
}

function clickMoveDown(event) {
    let entry = this.parentNode;
    if (entry.nextElementSibling != null) {
        entry.parentNode.insertBefore(entry.nextElementSibling, entry);
    }
    game.refreshClues();
    entry.querySelector(".clue-desc").focus();
    event.preventDefault();
}

function clickDelete(event) {
    this.parentNode.remove();
    game.refreshClues();
    event.preventDefault();
}

for (let element of document.querySelectorAll("button.increment")) {
    element.addEventListener("click", function(event) {
        let width = game.width, height = game.height;
        if (this.getAttribute("data-property") == "width") {
            width += parseInt(this.getAttribute("data-value"));
        } else if (this.getAttribute("data-property") == "height") {
            height += parseInt(this.getAttribute("data-value"));
        }
        game.resizeGrid(width, height);
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

for (let element of document.querySelectorAll("button.option[data-action=export]")) {
    element.addEventListener("click", function(event) {
        let data = game.exportPuzzle(this.getAttribute("data-value"));
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
                game.importPuzzle(data);
                console.log("Imported clipboard data");
            } else {
                console.error("No clipboard data to import");
            }
            this.removeEventListener("paste", pasteHandler);
        };
        document.addEventListener("paste", pasteHandler);
    });
}

document.querySelector("button.option[data-action=symmetry]").addEventListener("click", function(event) {
    game.symmetry = !game.symmetry;
    let state = game.symmetry ? "on" : "off";
    this.querySelector(".toggle").className = "toggle " + state;
    this.querySelector(".toggle").innerText = state.toUpperCase();
    game.checkSymmetry();
});

for (let element of document.querySelectorAll("button.add-item")) {
    element.addEventListener("click", function(event) {
        game.addClue(this.getAttribute("data-value"));
    });
}

document.addEventListener("keydown", function(event) {
    if (event.repeat || event.ctrlKey || event.altKey) return;
    if (document.querySelector("#clues-across").contains(event.target) ||
        document.querySelector("#clues-down").contains(event.target)) return;
    if ("ABCDEFGHIJKLMNOPQRSTUVWXYZ".includes(event.key.toUpperCase())) {
        game.typeCharacter(event.key.toUpperCase());
    } else switch (event.code) {
        case "Backspace":
            game.deleteCharacter(true);
            break;
        case "Delete":
            game.deleteCharacter(false);
            break;
        case "ArrowLeft":
        case "ArrowRight":
            game.navigate("across", event.code == "ArrowRight");
            break;
        case "ArrowUp":
        case "ArrowDown":
            game.navigate("down", event.code == "ArrowDown");
            break;
        default:
            return;
    }
    event.preventDefault();
});

var game = new PuzzleMaker(grid);