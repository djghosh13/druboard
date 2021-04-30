// Additional actors
class ClueController {
    constructor(gridController, acrossElement, downElement) {
        this.controller = gridController;
        this.element = {
            "across": acrossElement,
            "down": downElement
        };
        // Handlers
        this.focusHandler = null;
        this.moveUpHandler = null;
        this.moveDownHandler = null;
        this.deleteHandler = null;
    }

    init() {
        let cc = this;
        // Handlers
        this.focusHandler = function(event) {
            let clueidx = this.parentNode.querySelector(".clue-label").innerText;
            if (clueidx) {
                let idx = parseInt(clueidx) - 1;
                let dir = cc.element["down"].contains(this) ? "down" : "across";
                cc.controller.selector.selectClue(idx, dir);
            }
        };
        this.moveUpHandler = function(event) {
            let [dir, index] = cc.indexOf(this.parentNode);
            cc.controller.takeAction([
                {
                    "type": "clue-reorder",
                    "dir": dir,
                    "index": index,
                    "newindex": index - 1
                }
            ]);
        };
        this.moveDownHandler = function(event) {
            let [dir, index] = cc.indexOf(this.parentNode);
            cc.controller.takeAction([
                {
                    "type": "clue-reorder",
                    "dir": dir,
                    "index": index,
                    "newindex": index + 1
                }
            ]);
        };
        this.deleteHandler = function(event) {
            let [dir, index] = cc.indexOf(this.parentNode);
            cc.controller.takeAction([
                {
                    "type": "clue-delete",
                    "dir": dir,
                    "index": index
                }
            ]);
        }
        // Bind handlers
        for (let element of document.querySelectorAll("div.add-item")) {
            element.addEventListener("click", function(event) {
                cc.controller.takeAction([
                    {
                        "type": "clue-create",
                        "dir": this.getAttribute("data-value")
                    }
                ]);
                // Focus on new clue
                let entry = this.parentNode.querySelector(".clue-entry:last-of-type");
                entry.scrollIntoView();
                entry.querySelector(".clue-desc").focus();
            });
        }
    }

    doAction(action, last = false) {
        if (action["type"] == "clue-create") {
            let entry = this.createClueEntry();
            entry.querySelector(".clue-desc").innerText = action["text"] || "";
            this.element[action["dir"]].appendChild(entry);
            this.refresh();
        } else if (action["type"] == "clue-delete") {
            let entry = this.entryAt(action["dir"], action["index"]);
            // console.log(entry);
            action["text"] = entry.querySelector(".clue-desc").innerText;
            entry.remove();
            this.refresh();
        } else if (action["type"] == "clue-reorder") {
            if (action["newindex"] < 0 || action["newindex"] >= this.numClues(action["dir"])) {
                return null;
            }
            let entry = this.entryAt(action["dir"], action["index"]);
            entry.remove();
            let ref = this.entryAt(action["dir"], action["newindex"]);
            this.element[action["dir"]].insertBefore(entry, ref);
            this.refresh();
        }
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

    undoAction(action, last = false) {
        if (action["type"] == "clue-create") {
            let entry = this.element[action["dir"]].querySelector(".clue-entry:last-of-type");
            action["text"] = entry.querySelector(".clue-desc").innerText;
            entry.remove();
            this.refresh();
        } else if (action["type"] == "clue-delete") {
            let entry = this.createClueEntry();
            entry.querySelector(".clue-desc").innerText = action["text"] || "";
            let ref = this.entryAt(action["dir"], action["index"]);
            this.element[action["dir"]].insertBefore(entry, ref);
            this.refresh();
        } else if (action["type"] == "clue-reorder") {
            let entry = this.entryAt(action["dir"], action["newindex"]);
            entry.remove();
            let ref = this.entryAt(action["dir"], action["index"]);
            this.element[action["dir"]].insertBefore(entry, ref);
            this.refresh();
        }
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
                while (idx < this.controller.structure.clueToCell.length &&
                        !this.controller.structure.clueToCell[idx][dir].length) idx++;
                if (idx < this.controller.structure.clueToCell.length) {
                    entry.querySelector(".clue-label").innerText = idx + 1;
                    idx++;
                } else {
                    entry.querySelector(".clue-label").innerText = "";
                }
            }
        }
    }

    // Utility
    createClueEntry() {
        let entry = document.createElement("div");
        entry.className = "clue-entry";
        let label = document.createElement("span");
        label.className = "clue-label";
        entry.appendChild(label);
        let clue = document.createElement("div");
        clue.setAttribute("contentEditable", "true");
        clue.className = "clue-desc";
        clue.innerText = "";
        clue.addEventListener("focus", this.focusHandler);
        entry.appendChild(clue);
        let moveup = document.createElement("div");
        moveup.className = "clue-action moveup";
        moveup.addEventListener("click", this.moveUpHandler);
        let movedown = document.createElement("div");
        movedown.className = "clue-action movedown";
        movedown.addEventListener("click", this.moveDownHandler);
        let del = document.createElement("div");
        del.className = "clue-action delete";
        del.addEventListener("click", this.deleteHandler);
        entry.appendChild(moveup);
        entry.appendChild(movedown);
        entry.appendChild(del);
        return entry;
    }

    numClues(dir) {
        return this.element[dir].querySelectorAll(".clue-entry").length;
    }

    indexOf(entry) {
        let dir = this.element["down"].contains(entry) ? "down" : "across";
        let entryList = this.element[dir].querySelectorAll(".clue-entry");
        for (let i = 0; i < entryList.length; i++) {
            if (entryList[i] === entry) {
                return [dir, i];
            }
        }
        return [dir, -1];
    }

    entryAt(dir, index) {
        return this.element[dir].querySelectorAll(".clue-entry")[index] || null;
    }
}


class WordSuggestor {
    constructor(gridController, gridSelector, suggestElement) {
        this.controller = gridController;
        this.selector = gridSelector;
        this.element = suggestElement;
        // State
        this.searching = false;
        this.promise = null;
        this.previousQuery = "";
        this.clueidx = 0;
        this.cluedir = "across";
        this.searchIndex = 0;
        // Handlers
        this.searchHandler = null;
        this.refreshHandler = null;
        this.closeHandler = null;
        this.clickHandler = null;
        this.prefetchHandler = null;
    }

    queryInfo() {
        if (!this.searching && this.selector.selected) {
            let letters = this.selector.selectedClue().map(cell => {
                return this.controller.grid.state[cell[0]][cell[1]]["value"];
            });
            if (letters.reduce((a, x) => a || x, false) && !letters.reduce((a, x) => a && x, true)) {
                let word = letters.reduce((a, x) => a + (x || "?"), "");
                let clueidx = this.controller.structure.getClue(...this.selector.cell, this.selector.direction);
                let cluedir = this.selector.direction;
                return [word, clueidx, cluedir];
            }
        }
        return null;
    }

    init() {
        let ws = this;
        // Handlers
        this.searchHandler = function(event) {
            let refresh = event === null;
            let newQuery = ws.queryInfo();
            if (newQuery !== null) {
                let [word, clueidx, cluedir] = newQuery;
                ws.previousQuery = word, ws.clueidx = clueidx, ws.cluedir = cluedir;
                // Search up word
                ws.searching = true;
                let maxwords = Math.floor(48 / Math.max(word.length, 4));
                let promise = ws.promise = requestAutofill(word, maxwords, refresh, 0);
                promise.then(function(result) {
                    // Abort if no longer needed
                    if (ws.promise !== promise) return;
                    let [wordlist, newindex, npages] = result;
                    ws.searchIndex = newindex;
                    ws.displayResults(wordlist, npages);
                    ws.searching = false;
                });
            }
        };
        this.refreshHandler = function(event) {
            if (!ws.searching && ws.element.querySelectorAll("#suggestions div:not(.close)").length) {
                ws.element.classList.add("refreshing");
                ws.closeHandler(null);
                ws.searching = true;
                ws.searchIndex += parseInt(this.getAttribute("data-value"));
                let word = ws.previousQuery;
                let maxwords = Math.floor(48 / Math.max(word.length, 4));
                let promise = ws.promise = requestAutofill(word, maxwords, false, ws.searchIndex);
                promise.then(function(result) {
                    ws.element.classList.remove("refreshing");
                    // Abort if no longer needed
                    if (ws.promise !== promise) return;
                    let [wordlist, newindex, npages] = result;
                    ws.searchIndex = newindex;
                    ws.displayResults(wordlist, npages);
                    ws.searching = false;
                });
            }
        }
        this.closeHandler = function(event) {
            // Start closing results bar
            ws.element.classList.remove("open-bar");
            ws.element.classList.remove("empty");
            let listElement = ws.element.querySelector("#suggestions");
            listElement.querySelectorAll("div.suggestion-result").forEach(x => x.removeEventListener("click", ws.clickHandler));
            ws.searching = false;
            ws.promise = null;
            ws.element.querySelector("#suggest").removeEventListener("click", ws.closeHandler);
            ws.element.querySelector("#suggest").removeEventListener("click", ws.searchHandler);
            ws.element.querySelector("#suggest").addEventListener("click", ws.searchHandler);
            // Re-initiate search if on different clue
            if (this == ws.element.querySelector("#suggest")) {
                let newQuery = ws.queryInfo();
                if (newQuery !== null) {
                    let [word, clueidx, cluedir] = newQuery;
                    if (word != ws.previousQuery || clueidx != ws.clueidx || cluedir != ws.cluedir) {
                        ws.searchHandler(null);
                    }
                }
            }
        };
        this.clickHandler = function(event) {
            let word = this.innerText.replace(/[^A-Z]/g, "");
            let cells = ws.controller.structure.clueToCell[ws.clueidx][ws.cluedir];
            if (word.length == cells.length) {
                let actions = [];
                for (let i = 0; i < word.length; i++) {
                    actions = [...actions, ...ws.controller.grid.actionEditCell(...cells[i], word[i])];
                }
                ws.controller.takeAction(actions);
            }
            ws.closeHandler(null);
        };
        this.prefetchHandler = function(event) {
            let preQuery = ws.queryInfo();
            if (preQuery !== null) {
                requestAutofill(preQuery[0], 1, false, 0);
            }
        };
        // Bind handlers
        this.element.querySelector("#suggest").addEventListener("click", this.searchHandler);
        this.element.querySelector("#suggest").addEventListener("mouseover", this.prefetchHandler);
        this.element.querySelector("#suggestions div.close").addEventListener("click", this.closeHandler);
        for (let element of this.element.querySelectorAll(".scroll-button")) {
            element.addEventListener("click", this.refreshHandler);
        }
    }

    doAction(action, last = false) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
                this.reset();
            case "edit":
            default:
        }
        return action;
    }

    undoAction(action, last = false) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
                this.reset();
            case "edit":
            default:
        }
        return action;
    }

    displayResults(wordlist, numpages = 100) {
        let listElement = this.element.querySelector("#suggestions");
        let lastElement = this.element.querySelector("div.close");
        listElement.querySelectorAll("div.suggestion-result").forEach(x => x.remove());
        for (let word of wordlist) {
            let result = document.createElement("div");
            result.className = "suggestion-result";
            result.innerText = word;
            result.addEventListener("click", this.clickHandler);
            listElement.insertBefore(result, lastElement);
        }
        // Scroll buttons
        this.element.classList.toggle("empty", numpages == 0);
        this.element.querySelector(".scroll-button[data-value='-1']").classList.toggle("disabled", this.searchIndex == 0);
        this.element.querySelector(".scroll-button[data-value='1']").classList.toggle("disabled", this.searchIndex == numpages - 1);
        // Open results bar
        this.element.classList.add("open-bar");
        this.element.querySelector("#suggest").removeEventListener("click", this.searchHandler);
        this.element.querySelector("#suggest").addEventListener("click", this.closeHandler);
    }

    reset() {
        this.searching = false;
        this.promise = null;
        this.closeHandler(null);
    }
}

// Word suggestion using Datamuse API
// https://www.datamuse.com/

const maxCacheSize = 400;
autofillCache = new Map();

async function requestAutofill(pattern, maxwords, refresh, pageIdx = 0) {
    let query = pattern.toLowerCase();
    let words;
    if (autofillCache.has(query)) {
        words = [...autofillCache.get(query)];
    } else {
        let url = "https://api.datamuse.com/words?sp=" + query;
        const response = await fetch(url);
        words = await response.json();
        // Process words
        let unique = [], parsed = [];
        for (let w of words) {
            w = w["word"].toUpperCase();
            let p = w.replace(/[^A-Z]/g, "");
            if (!parsed.includes(p) && p.length == query.length) {
                unique.push(w);
                parsed.push(p);
            }
        }
        words = unique;
        // Add to cache
        autofillCache.set(query, [...words]);
        if (autofillCache.size > maxCacheSize) {
            for (let firstkey of autofillCache.keys()) {
                autofillCache.delete(firstkey);
                break;
            }
        }
    }
    if (refresh) await new Promise(r => setTimeout(r, 150));
    const npages = Math.ceil(words.length / maxwords);
    pageIdx = npages ? (pageIdx + npages) % npages : -1;
    let result = words.slice(pageIdx * maxwords, (pageIdx + 1) * maxwords);
    return [result, pageIdx, npages];
}


class SaveLoad {
    constructor(gridController, clueController) {
        this.gridController = gridController;
        this.clueController = clueController;
        this.importMode = false;
        this.lastDropTarget = null;
        // Handlers
        this.exportHandler = null;
        this.importHandler = null;
        this.pasteHandler = null;
        this.downloadHandler = null;
        this.autosaveHandler = null;
        // Export/import
        this.exportFormat = {
            "json": JSON.stringify,
            "exf": puzzle => "*" + btoa(JSON.stringify(puzzle))
        };
        this.importFormat = {
            "json": JSON.parse,
            "exf": str => JSON.parse(atob(str.substring(1))),
            "rxf": str => JSON.parse(atob(str.substring(1)))['boardData']
        };
        // Autosave
        this.lastChanged = -1;
    }

    init() {
        let sl = this;
        // Handlers
        this.exportHandler = function(event) {
            let data = sl.exportFormat[this.getAttribute("data-value")](sl.exportObject());
            if (data) {
                navigator.clipboard.writeText(data).then(
                    () => DNotification.create("Successfully copied to clipboard!", 4000),
                    () => DNotification.create("Error: Failed to copy to clipboard", 5000)
                );
            }
        };
        this.pasteHandler = function(event) {
            let data = (event.clipboardData || window.clipboardData).getData("text");
            sl.loadData(data, 'clipboard');
            document.querySelector("div.option[data-action=import]").innerText = "Import";
            this.removeEventListener("paste", sl.pasteHandler);
            sl.importMode = false;
        };
        this.dropHandler = function(event) {
            event.preventDefault();
            document.querySelector(".dropzone").classList.remove("active");
            let reader = new FileReader();
            reader.readAsText(event.dataTransfer.files[0]);
            reader.onloadend = () => sl.loadData(reader.result, 'file');
        }
        this.importHandler = function(event) {
            if (!sl.importMode) {
                this.innerText = "Ctrl + V";
                document.addEventListener("paste", sl.pasteHandler);
            } else {
                this.innerText = "Import";
                document.removeEventListener("paste", sl.pasteHandler);
            }
            sl.importMode = !sl.importMode;
        };
        this.downloadHandler = function(event) {
            // Update download link(s)
            let puzzle = sl.exportObject();
            let filename = puzzle["metadata"]["title"].replace(/\W/g, "") || "puzzle";
            let data = sl.exportFormat[this.getAttribute("data-value")](puzzle);
            if (data) {
                this.setAttribute("href", "data:;base64," + btoa(data));
                this.setAttribute("download", filename + "." + this.getAttribute("data-value"));
            } else {
                this.removeAttribute("href");
                this.removeAttribute("download");
            }
        }
        this.autosaveHandler = function(event) {
            window.localStorage.setItem("save-ny-auto", sl.exportFormat["json"](sl.exportObject()));
        };
        // Bind handlers
        document.querySelectorAll("div.option[data-action=new]").forEach(
            x => x.addEventListener("click", function() {
                window.localStorage.removeItem("save-ny-auto");
                sl.loadData(DEFAULT_PUZZLE);
            })
        )
        document.querySelectorAll("div.option[data-action=export]").forEach(
            x => x.addEventListener("click", this.exportHandler)
        );
        document.querySelectorAll("div.option[data-action=import]").forEach(
            x => x.addEventListener("click", this.importHandler)
        );
        document.querySelectorAll("a.option[data-action=download]").forEach(
            x => x.addEventListener("click", this.downloadHandler)
        );
        window.addEventListener("dragenter", function(event) {
            sl.lastDropTarget = event.target;
            document.querySelector(".dropzone").classList.add("active");
        });
        window.addEventListener("dragleave", function(event) {
            if (event.target === sl.lastDropTarget || event.target === document) {
                document.querySelector(".dropzone").classList.remove("active");
            }
        });
        window.addEventListener("drop", this.dropHandler);
        window.addEventListener("dragover", function (event) {
            event.preventDefault();
            event.stopPropagation();
        });
        window.addEventListener("beforeunload", this.autosaveHandler);
        // Load puzzle from local storage
        try {
            if (window.sessionStorage.getItem("save-tmp") !== null) {
                this.loadData(window.sessionStorage.getItem("save-tmp"), window.sessionStorage.getItem("save-tmp-source"));
                window.sessionStorage.removeItem("save-tmp");
                window.sessionStorage.removeItem("save-tmp-source");
            } else if (window.localStorage.getItem("save-ny-auto") !== null) {
                this.loadData(window.localStorage.getItem("save-ny-auto"));
            } else {
                this.loadData(DEFAULT_PUZZLE);
            }
        } catch (err) {
            this.loadData(DEFAULT_PUZZLE);
        }
        this.gridController.actionHistory.length = 0;
        this.lastChanged = -1;
        // Set auto-save
        window.setInterval(function() {
            if (sl.lastChanged != -1 && Date.now() - sl.lastChanged > 2000) {
                sl.lastChanged = -1;
                sl.autosaveHandler(null);
            }
        }, 1000);
    }

    doAction(action, last = false) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
            case "edit":
                if (last) this.refresh();
            default:
        }
        sl.lastChanged = Date.now();
        return action;
    }

    undoAction(action, last = false) {
        switch (action["type"]) {
            case "mark":
            case "resize-width":
            case "resize-height":
            case "edit":
                if (last) this.refresh();
            default:
        }
        sl.lastChanged = Date.now();
        return action;
    }

    refresh() {
        // Do nothing
    }

    exportObject() {
        let puzzle = {
            "metadata": {
                "style": "new-yorker",
                "valid": true,
                "title": "",
                "author": ""
            },
            "dimensions": [],
            "answers": [],
            "border-x": [],
            "border-y": [],
            "clues": {
                "across": [],
                "down": []
            }
        };
        let gc = this.gridController, cc = this.clueController;
        // Metadata
        puzzle["metadata"]["title"] = document.querySelector(".head-title").innerText;
        puzzle["metadata"]["author"] = document.querySelector(".head-byline").innerText;
        // Get dimensions
        puzzle["dimensions"] = [gc.grid.width, gc.grid.height];
        // Fill in answers
        for (let i = 0; i < gc.grid.height; i++) {
            let row = [];
            for (let j = 0; j < gc.grid.width; j++) {
                let value = gc.grid.state[i][j]["value"];
                if (gc.structure.cellToClue[i][j]["across"] === null &&
                        gc.structure.cellToClue[i][j]["down"] === null)
                    value = "";
                row.push(value);
                if (!value) {
                    puzzle["metadata"]["valid"] = false;
                }
            }
            puzzle["answers"].push(row);
        }
        // Fill in borders
        for (let i = 0; i < gc.grid.height; i++) {
            let row = [];
            for (let j = 0; j < gc.grid.width - 1; j++) {
                let value = gc.grid.state[i][j]["end-x"];
                row.push(value ? 1 : 0);
            }
            puzzle["border-x"].push(row);
        }
        for (let i = 0; i < gc.grid.height - 1; i++) {
            let row = [];
            for (let j = 0; j < gc.grid.width; j++) {
                let value = gc.grid.state[i][j]["end-y"];
                row.push(value ? 1 : 0);
            }
            puzzle["border-y"].push(row);
        }
        // Retrieve clues
        for (let dir of ["across", "down"]) {
            let clues = cc.element[dir].querySelectorAll(".clue-entry")
            for (let entry of clues) {
                puzzle["clues"][dir].push(entry.querySelector(".clue-desc").innerText);
            }
            let nclues = gc.structure.clueToCell.reduce((a, c) => a + (c[dir].length != 0), 0);
            if (clues.length != nclues) {
                puzzle["metadata"]["valid"] = false;
            }
        }
        return puzzle;
    }

    importObject(puzzle) {
        if (puzzle["metadata"]["style"] != "new-yorker") throw "puzzle-style";
        let gc = this.gridController, cc = this.clueController;
        let historyLength = gc.actionHistory.length;
        gc.takeAction(gc.grid.actionResize("width", puzzle["dimensions"][0]));
        gc.takeAction(gc.grid.actionResize("height", puzzle["dimensions"][1]));
        // Answers
        let actions = [];
        for (let i = 0; i < gc.grid.height; i++) {
            for (let j = 0; j < gc.grid.width; j++) {
                if (puzzle["answers"][i][j] !== null) {
                    actions = [...gc.grid.actionEditCell(i, j, puzzle["answers"][i][j]), ...actions];
                }
            }
        }
        // Borders
        for (let i = 0; i < gc.grid.height; i++) {
            for (let j = 0; j < gc.grid.width - 1; j++) {
                actions = [...gc.grid.actionToggleBorder(i, j, "x", puzzle["border-x"][i][j]), ...actions];
            }
        }
        for (let i = 0; i < gc.grid.height - 1; i++) {
            for (let j = 0; j < gc.grid.width; j++) {
                actions = [...gc.grid.actionToggleBorder(i, j, "y", puzzle["border-y"][i][j]), ...actions];
            }
        }
        gc.takeAction(actions);
        // Clues
        actions = [];
        for (let dir of ["across", "down"]) {
            let n = cc.numClues(dir);
            for (let i = 0; i < n; i++) {
                actions.unshift({
                    "type": "clue-delete",
                    "dir": dir,
                    "index": 0
                });
            }
        }
        for (let dir of ["across", "down"]) {
            for (let clue of puzzle["clues"][dir]) {
                actions.unshift({
                    "type": "clue-create",
                    "dir": dir,
                    "text": clue
                });
            }
        }
        gc.takeAction(actions);
        // Combine all taken actions
        gc.mergeHistoryAfter(historyLength);
        // Metadata
        document.querySelector(".head-title").innerText = puzzle["metadata"]["title"] || "";
        document.querySelector(".head-byline").innerText = puzzle["metadata"]["author"] || "";
        this.refresh();
    }

    detectFormat(data) {
        if (data.startsWith("{")) return "json";
        if (data.startsWith("*")) return "exf";
        if (data.startsWith("~")) return "rxf";
        throw Error("Invalid format");
    }

    loadData(data, source = null) {
        if (data) {
            try {
                let fmt = sl.detectFormat(data);
                sl.importObject(sl.importFormat[fmt](data));
                if (source !== null) {
                    DNotification.create("Imported data from " + source + ".", 4000);
                }
            } catch (err) {
                if (err === "puzzle-style") {
                    let notif = DNotification.create(
                        `This looks like a standard puzzle. <br />
                        <a href='../creator/'>Open in Creator?</a>`, 10000);
                    notif.querySelector("a").addEventListener("click", function() {
                        window.sessionStorage.setItem("save-tmp", data);
                        if (source !== null) {
                            window.sessionStorage.setItem("save-tmp-source", source);
                        } else {
                            window.sessionStorage.removeItem("save-tmp-source");
                        }
                    });
                    return;
                }
                DNotification.create("Error: Unrecognized format", 5000);
                console.error(err);
            }
        } else if (source !== null) {
            DNotification.create("No data from " + source + " to import", 5000);
        }
    }
}

const DEFAULT_PUZZLE = '{"metadata":{"style":"new-yorker","valid":false,"title":"Untitled","author":"Anonymous"},"dimensions":[5,5],"answers":[["","","","",""],["","","","",""],["","","","",""],["","","","",""],["","","","",""]],"border-x":[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],"border-y":[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],"clues":{"across":[],"down":[]}}';