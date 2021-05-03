class DDrive {
    constructor(element) {
        this.element = element;
        this.fileList = null;
        this.sortOrder = null;
        //
        this.theme = "light";
        this.lastDropTarget = null;
    }

    init() {
        let drive = this;
        // Theme setting
        document.querySelector("div.option[data-action=theme]").addEventListener("click", function(event) {
            drive.theme = drive.theme == "light" ? "dark" : "light";
            window.localStorage.setItem("setting-theme", drive.theme);
            this.querySelector(".toggle-theme").innerText = drive.theme.toUpperCase();
            document.body.className = "color-theme-" + drive.theme;
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
        // New puzzle
        window.sessionStorage.removeItem("current-puzzle");
        for (let element of document.querySelectorAll("div.new-puzzle")) {
            element.addEventListener("click", () => {
                let style = element.getAttribute("data-value");
                let file = DFile.createNew(DEFAULT_PUZZLE.get(style));
                file.save();
                window.open(window.location.href.replace(/\?.*/, "") + `?uid=${file.id}&style=${style}`);
            });
        }
        this.refresh();
        this.render();
        // Refresh
        window.addEventListener("focus", () => {
            this.refresh();
            this.render();
        });
        //
        window.addEventListener("dragenter", function(event) {
            drive.lastDropTarget = event.target;
            document.querySelector(".dropzone").classList.add("active");
        });
        window.addEventListener("dragleave", function(event) {
            if (event.target === drive.lastDropTarget || event.target === document) {
                document.querySelector(".dropzone").classList.remove("active");
            }
        });
        window.addEventListener("drop", function(event) {
            event.preventDefault();
            document.querySelector(".dropzone").classList.remove("active");
            let reader = new FileReader();
            reader.readAsText(event.dataTransfer.files[0]);
            reader.onloadend = () => {
                try {
                    let puzzle = DFile.import(reader.result, DFile.detectFormat(reader.result));
                    let style = puzzle["metadata"]["style"] || "standard";
                    let valid = (style == "standard") ? SaveLoad.validateObject(puzzle) : NYSaveLoad.validateObject(puzzle);
                    switch (valid) {
                        case "valid":
                            let file = new DFile(puzzle);
                            file.save();
                            DNotification.create("Imported puzzle", 4000);
                            drive.refresh();
                            drive.render();
                            break;
                        case "incomplete":
                            DNotification.create("To import older versions, create a new puzzle and import from the editor", 10000);
                            break;
                        default:
                            DNotification.create("Error: Invalid puzzle", 5000);
                    }
                } catch (err) {
                    DNotification.create("Error: Unrecognized format", 5000);
                }
            }
        });
        window.addEventListener("dragover", function (event) {
            event.preventDefault();
            event.stopPropagation();
        });
    }

    refresh() {
        this.fileList = JSON.parse(window.localStorage.getItem(FILE_LIST_KEY) || "{}");
        this.sortOrder = [];
        for (let id in this.fileList) {
            this.sortOrder.push(id);
        }
        this.sortOrder.sort((a, b) => this.fileList[b]["access_date"] - this.fileList[a]["access_date"]);
    }

    render() {
        let drive = this;
        this.element.innerHTML = "";
        // If empty
        if (this.sortOrder.length == 0) {
            let link = document.createElement("div");
            link.classList.add("file-entry");
            link.classList.add("no-file");
            link.innerHTML = `
                <div class="col1">
                    <span class="title">No saved puzzles</span>
                </div>
            `;
            this.element.appendChild(link);
            return;
        }
        // Generate from file list
        for (let id of this.sortOrder) {
            let metadata = this.fileList[id];
            let link = document.createElement("div");
            link.classList.add("file-entry");
            link.innerHTML = `
                <div class="col1">
                    <span class="title">${metadata["title"]}</span>
                    <span class="author">${metadata["author"]}</span>
                </div>
                <div class="col2">
                    <span class="size">${metadata["dimensions"][0]}×${metadata["dimensions"][1]}</span>
                    <span class="style">${metadata["style"].replace(/\W+/g, " ")}</span>
                </div>
                <a class="icon download" data-value="exf" title="Download" download></a>
                <div class="icon delete" title="Delete"></div>
            `;
            link.addEventListener("click", function() {
                window.open(window.location.href.replace(/\?.*/, "") + `?uid=${metadata["uid"]}&style=${metadata["style"]}`);
            });
            link.querySelector(".download").addEventListener("click", function(event) {
                // Update download link
                let puzzle = DFile.loadFile(metadata["uid"]).puzzle;
                let filename = puzzle["metadata"]["title"].replace(/\W/g, "") || "puzzle";
                let data = DFile.export(puzzle, this.getAttribute("data-value"));
                if (data) {
                    this.setAttribute("href", "data:;base64," + btoa(data));
                    this.setAttribute("download", filename + "." + this.getAttribute("data-value"));
                } else {
                    this.removeAttribute("href");
                    this.removeAttribute("download");
                }
                event.stopPropagation();
            });
            link.querySelector(".delete").addEventListener("click", function(event) {
                event.stopPropagation();
            });
            link.querySelector(".delete").addEventListener("dblclick", function(event) {
                drive.deleteFile(metadata["uid"]);
                event.stopPropagation();
            });
            this.element.appendChild(link); 
        }
    }

    deleteFile(id) {
        window.localStorage.removeItem(`${FILE_SAVE_PREFIX}-${id}`);
        this.refresh();
        delete this.fileList[id];
        window.localStorage.setItem(FILE_LIST_KEY, JSON.stringify(this.fileList));
        this.refresh();
        this.render();
    }
}

var drive = new DDrive(document.querySelector("#files"));

drive.init();