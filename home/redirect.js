{
    let query = new URLSearchParams(window.location.search);
    if (query.has("uid") && query.has("style")) {
        window.sessionStorage.setItem("current-puzzle", query.get("uid"));
        switch (query.get("style")) {
            case "standard":
                window.location.replace(`../creator/${INDEX_HTML}`);
                break;
            case "new-yorker":
                window.location.replace(`../nycreator/${INDEX_HTML}`);
                break;
            default:
                window.addEventListener("load", () => DNotification.create("Invalid puzzle ID", 5000));
        }
    }
}