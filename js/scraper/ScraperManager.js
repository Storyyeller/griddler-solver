(function(exports) {
    function leftStrip(str, removeThis) {
        if (str.indexOf(removeThis) === 0) {
            return str.substring(removeThis.length);
        }

        return str;
    }

    /**
     * Removes http://www and the first slash plus anything after it from a URL. E.g., turns
     * "http://www.webpbn.com/foo/bar" into "webpbn.com"
     *
     * @param urlString {string} a URL
     * @returns {string} a sanitized URL
     */
    function sanitizeURL(urlString) {
        urlString = leftStrip(urlString, "http://");
        urlString = leftStrip(urlString, "www");

        var slashIndex = urlString.indexOf("/");
        if (slashIndex !== -1) {
            urlString = urlString.substring(0, slashIndex);
        }

        return urlString;
    }

    /**
     * Handles scraping puzzles from websites, serving as a facade for a bunch of site-specific
     * scrapers.
     *
     * This object is a singleton.  To add support for a new website, create a SiteSpecificScraper
     * and register it with this object via the registerScraper function. A SiteSpecificScraper
     * is an object with the following functions.
     *
     *      function scrape(puzzleId, callback) - accepts a string puzzle ID as a parameter,
     *      downloads that puzzle, and calls the callback. The callback should be a function
     *      of the form function(Error, rawPuzzleObject). If an error occurred during scraping,
     *      Error will be non-null. If no error occurred, error will be null and rawPuzzleObject
     *      will be a puzzle.
     *
     *      function getURL() - returns the URL that the scraper scrapes from (without http://www
     *      and without any slashes). E.g., "webpbn.com"
     */
    var ScraperManager = {};

    /* Maps URLs to SiteSpecificScraper objects */
    var scraperMap = {};

    /**
     * Registers a scraper with the ScraperManager so that it can be used for scraping.
     *
     * @param scraper {object} an object that implements the SiteSpecificScraper interface
     */
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

    /**
     * Scrapes the specified puzzle from the specified URL.
     *
     * @param url {string} a URL (should be one that was returned by getSupportedURLs)
     * @param puzzleId {string} a puzzle ID
     * @param callback {function(Error,object)} Error will be non-null if an error occurred. The
     *              second argument is the generated puzzle object and will be null if an error
     *              occurred.
     */
    ScraperManager.scrape = function(url, puzzleId, callback) {
        if (!scraperMap[url]) {
            throw new Error("Scraper not found for URL: " + url);
        }

        scraperMap[url].scrape(puzzleId, callback);
    };

    /**
     * Returns the URLs supported by the ScraperManager.
     *
     * @returns {string[]} an array of string URLs
     */
    ScraperManager.getSupportedURLs = function() {
        return Object.keys(scraperMap);
    }

    exports.ScraperManager = ScraperManager;
})(window);