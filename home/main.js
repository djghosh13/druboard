class DDrive {
    constructor(element) {
        this.element = element;
        this.fileList = null;
        this.sortOrder = null;
        //
        this.theme = "light";
        this.lastDropTarget = null;
        this.selectedID = null;
        this.lastDeleted = null;
        this.openedCreators = {};
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
                drive.openedCreators[file.id] = window.open(window.location.href.replace(/\?.*/, "") + `?uid=${file.id}&style=${style}`);
            });
        }
        this.refresh();
        this.render();
        // Refresh
        window.addEventListener("focus", () => {
            this.refresh();
            this.render();
        });
        // Selection
        document.addEventListener("click", function(event) {
            if (document.querySelector("#file-info").contains(event.target)) return;
            drive.deselectAll();
        })
        // Download backup
        document.querySelector("div.option[data-action=backup]").addEventListener("click", function(event) {
            drive.refresh();
            // JSZip
            var zip = JSZip();
            // Save every puzzle
            for (let id of drive.sortOrder) {
                let metadata = drive.fileList[id];
                let puzzle = DFile.loadFile(metadata["uid"]).puzzle;
                let filename = puzzle["metadata"]["title"].replace(/\W/g, "") || "puzzle";
                let data = DFile.export(puzzle, "exf");
                zip.file(`${filename}_${metadata["uid"]}.exf`, data);
            }
            // Create zip
            zip.generateAsync({
                "type": "blob",
                compression: "DEFLATE",
                compressionOptions: {
                    level: 6
                }
            }).then(function(blob) {
                // Generate backup file name
                const date = new Date();
                let filename = "druboard_backup_" +
                    date.getFullYear().toString().padStart(4, 0) +
                    (date.getMonth() + 1).toString().padStart(2, 0) +
                    date.getDate().toString().padStart(2, 0) + ".zip";
                // Create download link
                let url = URL.createObjectURL(blob);
                let notif = DNotification.create(`
                    Backup ready:<br />
                    <a href="${url}" download="${filename}">${filename}</a>
                `);
            })
        })
        // File upload
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
            for (let infile of event.dataTransfer.files) {
                let reader = new FileReader();
                reader.readAsText(infile);
                reader.onloadend = () => {
                    try {
                        let puzzle = DFile.import(reader.result, DFile.detectFormat(reader.result));
                        let style = puzzle["metadata"]["style"] || "standard";
                        let valid = (style == "standard") ? SaveLoad.validateObject(puzzle) : NYSaveLoad.validateObject(puzzle);
                        switch (valid) {
                            case "valid":
                                let file = new DFile(puzzle);
                                file.save();
                                DNotification.create(`${infile.name}<br /> Imported puzzle successfully`, 2500);
                                drive.refresh();
                                drive.render();
                                break;
                            case "incomplete":
                                DNotification.create(`${infile.name}<br /> To import older versions, create a new puzzle and import from the editor`, 10000);
                                break;
                            default:
                                DNotification.create(`${infile.name}<br /> Error: Invalid puzzle`, 6000);
                        }
                    } catch (err) {
                        DNotification.create(`${infile.name}<br /> Error: Unrecognized format`, 6000);
                    }
                }
            }
        });
        window.addEventListener("dragover", function (event) {
            event.preventDefault();
            event.stopPropagation();
        });
    }

    refresh() {
        // Refresh file list
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
            if (metadata["uid"] == this.selectedID) {
                link.classList.add("selected");
            }
            link.innerHTML = `
                <div class="col1">
                    <span class="title">${escapeHTML(metadata["title"])}</span>
                    <span class="author">${escapeHTML(metadata["author"])}</span>
                </div>
                <div class="col2">
                    <span class="size">${metadata["dimensions"][0]}×${metadata["dimensions"][1]}</span>
                    <span class="style">${metadata["style"].replace(/\W+/g, " ")}</span>
                </div>
                <div class="icon open" title="Open in New Tab"></div>
                <a class="icon download" data-value="exf" title="Download" download></a>
                <div class="icon delete" title="Delete"></div>
            `;
            link.addEventListener("click", function(event) {
                if (drive.selectedID !== metadata["uid"]) {
                    drive.selectedID = metadata["uid"];
                    drive.element.querySelectorAll(".file-entry").forEach(element => {
                        element.classList.remove("selected");
                    });
                    this.classList.add("selected");
                    window.setTimeout(() => drive.displayInfo(metadata["uid"]), 40);
                }
                event.stopPropagation();
            });
            let openCreator = (event) => {
                if (!drive.gotoOpenCreator(metadata["uid"])) {
                    const url = window.location.href.replace(/\?.*/, "") + `?uid=${metadata["uid"]}&style=${metadata["style"]}`;
                    drive.openedCreators[metadata["uid"]] = window.open(url);
                }
                event.stopPropagation();
            };
            link.addEventListener("dblclick", openCreator);
            link.querySelector(".open").addEventListener("click", openCreator);
            link.querySelector(".download").addEventListener("click", function(event) {
                // Update download link
                let puzzle = DFile.loadFile(metadata["uid"]).puzzle;
                let filename = puzzle["metadata"]["title"].replace(/\W/g, "") || "puzzle";
                let data = DFile.export(puzzle, this.getAttribute("data-value"));
                if (data) {
                    this.setAttribute("href", "data:;base64," + Base64.encode(data));
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
        // Refresh file preview
        if (this.selectedID !== null) {
            this.displayInfo(this.selectedID);
        }
    }

    displayInfo(id) {
        let metadata = this.fileList[id];
        let infoTable = document.querySelector("#file-info .info table");
        infoTable.querySelector(".title[data-value=title]").innerText = metadata["title"];
        infoTable.querySelector(".value[data-value=author]").innerText = metadata["author"];
        infoTable.querySelector(".value[data-value=clues]").innerText = metadata["nclues"];
        infoTable.querySelector(".value[data-value=dimensions]").innerText = `${metadata["dimensions"][0]}×${metadata["dimensions"][1]}`;
        infoTable.querySelector(".value[data-value=style]").innerText = metadata["style"];
        infoTable.querySelector(".value[data-value=modify_date]").innerText = new Date(metadata["modify_date"]).toLocaleString();
        infoTable.querySelector(".value[data-value=create_date]").innerText = new Date(metadata["create_date"]).toLocaleString();
        // Set iframe source
        document.querySelector("#file-info .preview iframe").setAttribute("src",
            `index.html?uid=${metadata["uid"]}&style=${metadata["style"]}&embed=true`
        );
        document.querySelector("#file-info").classList.add("active");
    }

    deselectAll() {
        this.selectedID = null;
        this.element.querySelectorAll(".file-entry").forEach(element => {
            element.classList.remove("selected");
        });
        document.querySelector("#file-info").classList.remove("active");
    }

    gotoOpenCreator(id) {
        try {
            if (this.openedCreators[id].window.closed === false) {
                this.openedCreators[id].window.focus();
                return true;
            }
        } catch (e) { }
        this.openedCreators[id] = null;
        return false;
    }

    deleteFile(id) {
        this.refresh();
        // Check if editor is open
        if (this.openedCreators[id]?.window?.closed === false) {
            let notif = DNotification.create(`
                This puzzle is open in another tab: <wbr />
                <a data-action="open-creator">Go to Creator</a><br />
                <a data-action="delete" style="color: var(--red-color);">Delete Anyway</a>
            `, 6000);
            notif.querySelector("a[data-action=open-creator]").addEventListener("click", () => this.gotoOpenCreator(id));
            notif.querySelector("a[data-action=delete]").addEventListener("click", () => {
                this.openedCreators[id]?.window?.close();
                this.openedCreators[id] = null;
                this.deleteFile(id);
            });
            return;
        }
        // Replace backup
        if (this.lastDeleted) {
            DNotification.remove(this.lastDeleted["notification"]);
        }
        this.lastDeleted = {
            "id": id,
            "metadata": this.fileList[id],
            "puzzle": window.localStorage.getItem(`${FILE_SAVE_PREFIX}-${id}`),
            "notification": null
        };
        // Delete and refresh view
        window.localStorage.removeItem(`${FILE_SAVE_PREFIX}-${id}`);
        delete this.fileList[id];
        window.localStorage.setItem(FILE_LIST_KEY, JSON.stringify(this.fileList));
        this.deselectAll();
        this.refresh();
        this.render();
        // Show undo notification
        let notif = this.lastDeleted["notification"] = DNotification.create(`
            Deleted <strong>"${escapeHTML(this.lastDeleted["metadata"]["title"])}"</strong>
            by <span>${escapeHTML(this.lastDeleted["metadata"]["author"])}</span>.<br />
            <a data-action="restore">Undo?</a>
        `, 30000);
        notif.querySelector("a[data-action=restore]").addEventListener("click", () => this.restoreFile());
    }

    restoreFile() {
        if (this.lastDeleted == null) return;
        DNotification.remove(this.lastDeleted["notification"]);
        new DFile(DFile.import(this.lastDeleted["puzzle"])).save();
        this.lastDeleted = null;
        this.refresh();
        this.render();
    }
}

var drive = new DDrive(document.querySelector("#files"));

drive.init();

// Utility

function escapeHTML(str) {
    return str.replace(
        /[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}