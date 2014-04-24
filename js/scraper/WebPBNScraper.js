(function(exports) {
    /**
     * A SiteSpecificScraper for webpbn.com
     */
    var WebPBNScraper = {};

    /**
     * See the description of scrape() in ScraperManager.js
     */
    WebPBNScraper.scrape = function(id, callback) {
        /* send a post request to our proxied version of webpbn.com (which is on our domain), since
        you can't make a cross-domain HTTP request */

        /* http://www.webpbn.com/export.cgi is a page where you can export puzzles in non format.
        The export functionality works by making a POST request. If you look at the requests made
        on that page using Chrome's developer tools, you can see that it makes a POST request with
        these parameters. Just in case you're wondering where they came from :) */
        $.post("/__proxy__/webpbn.com/export.cgi", {
            go: "1",
            sid: "",
            id: id,
            xml_clue: "on",
            xml_soln: "on",
            fmt: "ss",
            ss_soln: "on",
            sg_clue: "on",
            sg_soln: "on"
        }).done(function(data, textStatus, jqXHR) {
            var doesNotExistMessage = "Puzzle " + id + " does not exist\n";
            var notBeenPublishedMessage = "Puzzle " + id + " has not been published\n";
            var multiColorMessage = "The ss format cannot handle multicolor puzzles.\n";

            if (data === multiColorMessage) {
                callback(createMulticolorError(id), null);
            } else if (data === doesNotExistMessage || data === notBeenPublishedMessage) {
                callback(createNotFoundError(id), null);
            } else {
                FileManager.parseString(data, "non", function(err, puzzle) {
                    if (err) {
                        callback(new Error("Puzzle could not be parsed"), null);
                    } else {
                        callback(null, puzzle);
                    }
                });
            }
        }).fail(function(jqXHR, textStatus, errorThrown) {
            callback(createNotFoundError(id), null);
        });
    };

    /**
     * See the description of getURL() in ScraperManager.js
     * @returns {string}
     */
    WebPBNScraper.getURL = function() {
        return "webpbn.com";
    };

    function createNotFoundError(id) {
        return new Error("Puzzle " + id + " could not be found on webpbn.com");
    }

    function createMulticolorError(id) {
        return new Error("Puzzle " + id + " is a multicolor puzzle which is unsupported");
    }

    if (exports) {
        exports.WebPBNScraper = WebPBNScraper;

        if (exports.ScraperManager) {
            exports.ScraperManager.registerScraper(WebPBNScraper);
        }
    }

})(window);