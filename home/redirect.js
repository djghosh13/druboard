{
    let query = new URLSearchParams(window.location.search);
    if (query.has("uid") && query.has("style")) {
        window.sessionStorage.setItem("current-puzzle", query.get("uid"));
        let params = (query.has("embed") && query.get("embed")) ? "?embed=true" : "";
        switch (query.get("style")) {
            case "standard":
                window.location.replace(`../creator/${INDEX_HTML}${params}`);
                break;
            case "new-yorker":
                window.location.replace(`../nycreator/${INDEX_HTML}${params}`);
                break;
            default:
                window.addEventListener("load", () => DNotification.create("Invalid puzzle ID", 5000));
        }
    }
}