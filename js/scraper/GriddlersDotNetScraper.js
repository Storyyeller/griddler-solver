(function(exports) {
    var GriddlersDotNetScraper = {};

    GriddlersDotNetScraper.scrape = function(id, callback) {
        callback(new Error("griddlers.net scraper not yet implemented"), null);
    };

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