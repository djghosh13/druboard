var IS_EMBED = false;
{
    let query = new URLSearchParams(window.location.search);
    if (query.has("embed") && query.get("embed")) {
        document.documentElement.classList.add("embed");
        IS_EMBED = true;
    }
}