// NY Creator: Additional actors
class NYSaveLoad extends SaveLoad {
    constructor(gridController, clueController) {
        super(gridController, clueController);
        this.puzzleStyle = "new-yorker";
        this.styleMessage = `This looks like a standard puzzle. <br />
                             <a href='../creator/'>Open in Creator?</a>`;
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
        if ((puzzle["metadata"]["style"] || "standard") != this.puzzleStyle) throw "puzzle-style";
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

    static validateObject(puzzle) {
        if (puzzle["metadata"]
            && ["valid", "title", "author"].every(key => key in puzzle["metadata"])
            && puzzle["dimensions"]
            && puzzle["dimensions"].length == 2
            && puzzle["dimensions"].every(dim => dim == Math.floor(dim) && 3 <= dim && dim <= 24)
            && puzzle["answers"]
            && puzzle["answers"].length == puzzle["dimensions"][1]
            && puzzle["answers"].every(
                row => row.length == puzzle["dimensions"][0]
                && row.every(chr => chr === "" || chr.match(/^[A-Z]$/))
            )
            && puzzle["clues"]
            && ["across", "down"].every(
                key => key in puzzle["clues"]
                && puzzle["clues"][key].length !== undefined
                && puzzle["clues"][key].every(c => typeof(c) == "string")
            )
            && puzzle["border-x"]
            && puzzle["border-x"].length == puzzle["dimensions"][1]
            && puzzle["border-x"].every(
                row => row.length == puzzle["dimensions"][0] - 1
                && row.every(b => b === 0 || b === 1)
            )
            && puzzle["border-y"]
            && puzzle["border-y"].length == puzzle["dimensions"][1] - 1
            && puzzle["border-y"].every(
                row => row.length == puzzle["dimensions"][0]
                && row.every(b => b === 0 || b === 1)
            )) {
            // Is a valid puzzle, check if new or old version
            if (puzzle["metadata"]["uid"] && typeof(puzzle["metadata"]["uid"]) == "string") {
                return "valid";
            }
            return "incomplete";
        }
        return false;
    }
}

DEFAULT_PUZZLE.set("new-yorker", '{"metadata":{"style":"new-yorker","valid":false,"title":"Untitled","author":"Anonymous"},"dimensions":[5,5],"answers":[["","","","",""],["","","","",""],["","","","",""],["","","","",""],["","","","",""]],"border-x":[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]],"border-y":[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],"clues":{"across":[],"down":[]}}');