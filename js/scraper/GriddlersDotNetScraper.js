(function(exports) {

    /**
     * A SiteSpecificScraper for griddlers.net. See ScraperManager.js for a description of
     * SiteSpecificScrapers.
     */
    var GriddlersDotNetScraper = {};

    /**
     * See the description of scrape() in ScraperManager.js
     */
    GriddlersDotNetScraper.scrape = function(id, callback) {
        callback(new Error("griddlers.net scraper not yet implemented"), null);
    };

    /**
     * See the description of getURL() in ScraperManager.js
     */
    GriddlersDotNetScraper.getURL = function() {
        return "griddlers.net";
    };

    if (exports) {
        exports.GriddlersDotNetScraper = GriddlersDotNetScraper;

        if (exports.ScraperManager) {
            exports.ScraperManager.registerScraper(GriddlersDotNetScraper);
        }
    }

})(window);