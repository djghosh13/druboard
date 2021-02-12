// Word suggestion using Datamuse API
// https://www.datamuse.com/

function requestAutofill(pattern, callback, maxwords = 10) {
    let query = pattern.reduce((a, x) => a + (x || "?"), "").toLowerCase();
    let url = "http://api.datamuse.com/words?sp=" + query;
    fetch(url).then(data => {
        let words = data.json();
        if (words.length > maxwords) words.length = maxwords;
        return words.map(x => x["word"].toUpperCase());
    }).then(callback);
}