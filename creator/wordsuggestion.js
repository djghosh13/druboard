// Word suggestion using Datamuse API
// https://www.datamuse.com/

const maxCacheSize = 100;
autofillCache = new Map();

async function requestAutofill(pattern, maxwords, refresh) {
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
            console.log(w);
            w = w["word"].toUpperCase();
            let p = w.replace(/\W/g, "");
            if (!parsed.includes(p)) {
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
    if (refresh) await new Promise(r => setTimeout(r, 200));
    if (words.length > maxwords) words.length = maxwords;
    return words;
}