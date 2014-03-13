(function(exports) {
    function leftStrip(str, removeThis) {
        if (str.indexOf(removeThis) === 0) {
            return str.substring(removeThis.length);
        }

        return str;
    }

    function sanitizeURL(urlString) {
        urlString = leftStrip(urlString, "http://");
        urlString = leftStrip(urlString, "www");

        var slashIndex = urlString.indexOf("/");
        if (slashIndex !== -1) {
            urlString = urlString.substring(0, slashIndex);
        }

        return urlString;
    }

    var scraperMap = {};

    var ScraperManager = {};

    ScraperManager.registerScraper = function(scraper) {
        if (typeof(scraper.scrape) !== "function" || typeof(scraper.getURL) !== "function") {
            throw new Error("Scraper does not implement the required API");
        }

        var url = sanitizeURL(scraper.getURL());
        if (scraperMap[url]) {
            throw new Error("Scraper already exists for URL: " + url);
        }

        scraperMap[url] = scraper;
    };

    ScraperManager.scrape = function(url, puzzleId, callback) {
        if (!scraperMap[url]) {
            throw new Error("Scraper not found for URL: " + url);
        }

        scraperMap[url].scrape(puzzleId, callback);
    };

    ScraperManager.getSupportedURLs = function() {
        return Object.keys(scraperMap);
    }

    exports.ScraperManager = ScraperManager;
})(window);