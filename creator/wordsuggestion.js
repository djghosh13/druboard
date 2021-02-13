// Word suggestion using Datamuse API
// https://www.datamuse.com/

function requestAutofill(pattern, maxwords = 10, cached = false) {
    if (cached !== false) return Promise.resolve(cached);
    // Not cached
    let query = pattern.reduce((a, x) => a + (x || "?"), "").toLowerCase();
    let url = "https://api.datamuse.com/words?sp=" + query;
    return fetch(url).then(response => response.json()).then(words => {
        if (words.length > maxwords) words.length = maxwords;
        return words.map(x => x["word"].toUpperCase());
    });
}