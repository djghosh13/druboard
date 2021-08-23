const FILE_LIST_KEY = "db-file-list";
const FILE_SAVE_PREFIX = "db-file-save";

class DFile {
    constructor(puzzle) {
        this.id = puzzle["metadata"]["uid"];
        this.puzzle = puzzle;
    }

    update(puzzle, modifyDate = null) {
        const immutableKeys = ["uid", "create_date", "style"];
        for (let key in this.puzzle["metadata"]) {
            if (immutableKeys.includes(key) || !(key in puzzle["metadata"])) {
                puzzle["metadata"][key] = this.puzzle["metadata"][key];
            }
        }
        if (modifyDate != null) {
            puzzle["metadata"]["modify_date"] = Math.max(modifyDate, puzzle["metadata"]["modify_date"] || 0);
        }
        puzzle["metadata"]["access_date"] = Date.now();
        this.puzzle = puzzle;
    }

    getMetadata() {
        return {
            "uid": this.id,
            "title": this.puzzle["metadata"]["title"] || "",
            "author": this.puzzle["metadata"]["author"] || "",
            "style": this.puzzle["metadata"]["style"] || "standard",
            "valid": this.puzzle["metadata"]["valid"] || false,
            "nclues": this.puzzle["metadata"]["nclues"] || 0,
            "dimensions": this.puzzle["dimensions"],
            "create_date": this.puzzle["metadata"]["create_date"] || 0,
            "access_date": this.puzzle["metadata"]["access_date"] || 0,
            "modify_date": this.puzzle["metadata"]["modify_date"] || 0
        };
    }

    save() {
        // Update file
        window.localStorage.setItem(`${FILE_SAVE_PREFIX}-${this.id}`, DFile.export(this.puzzle));
        // Update file list
        let fileList = JSON.parse(window.localStorage.getItem(FILE_LIST_KEY) || "{}");
        fileList[this.id] = this.getMetadata();
        window.localStorage.setItem(FILE_LIST_KEY, JSON.stringify(fileList));
    }

    // New files
    static generateID() {
        let str = Date.now().toString(16);
        if (str.length < 12) {
            str = "0".repeat(12 - str.length) + str;
        }
        return Array.from(btoa(str)).reduceRight((a, x) => a + x);
    }

    static createNew(template) {
        let puzzle = DFile.import(template);
        puzzle["metadata"]["uid"] = DFile.generateID();
        let time = Date.now();
        puzzle["metadata"]["create_date"] = time;
        puzzle["metadata"]["access_date"] = time;
        puzzle["metadata"]["modify_date"] = time;

        return new DFile(puzzle);
    }

    static loadFile(id) {
        let fileList = JSON.parse(window.localStorage.getItem(FILE_LIST_KEY) || "{}");
        if (id in fileList) {
            let puzzle = DFile.import(window.localStorage.getItem(`${FILE_SAVE_PREFIX}-${id}`));
            return new DFile(puzzle);
        }
        throw new FileNotFoundError("File does not exist");
    }

    // Export/Import
    static export(puzzle, fmt = "json") {
        switch (fmt) {
            case "json":
                return JSON.stringify(puzzle);
            case "exf":
                return "*" + btoa(JSON.stringify(puzzle));
            case "puz":
                // Rename metadata and add copyright
                puzzle["meta"] = puzzle["metadata"];
                puzzle["meta"]["copyright"] = "Made in DruBoard";
                // Rename answers grid
                puzzle["grid"] = puzzle["answers"].map(
                    row => row.map(value => value === null ? "." : value)
                );
                // Reformat clues - lazy way
                {
                    let structure = new GridStructure({
                        "width": puzzle["dimensions"][0],
                        "height": puzzle["dimensions"][1],
                        "isOpen": (i, j) => puzzle["answers"][i][j] !== null
                    });
                    structure.refresh();
                    let clues = {
                        "across": [],
                        "down": []
                    };
                    let idxs = {
                        "across": 0,
                        "down": 0
                    };
                    for (let dir of ["across", "down"]) {
                        for (let idx = 0; idx < structure.clueToCell.length; idx++) {
                            if (structure.clueToCell[idx][dir].length) {
                                clues[dir].push(puzzle["clues"][dir][idxs[dir]++]);
                            } else {
                                clues[dir].push(undefined);
                            }
                        }
                    }
                    puzzle["clues"] = clues;
                }
                return Puz.encode(puzzle).reduce((a, x) => a + String.fromCharCode(x), "");
            default:
                throw new Error("Invalid format");
        }
    }

    static import(string, fmt = "json") {
        switch (fmt) {
            case "json":
                return JSON.parse(string);
            case "exf":
                return JSON.parse(atob(string.substring(1)));
            case "rxf":
                return JSON.parse(atob(string.substring(1)))["boardData"];
            case "puz":
                throw "puz-import";
            default:
                throw new Error("Invalid format");
        }
    }

    static detectFormat(string) {
        if (string.startsWith("{")) return "json";
        if (string.startsWith("*")) return "exf";
        if (string.startsWith("~")) return "rxf";
        if (string.substr(2, 11) == "ACROSS&DOWN") return "puz";
        throw new Error("Invalid format");
    }
}


class FileNotFoundError extends Error { }