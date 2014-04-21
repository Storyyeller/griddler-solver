(function(exports) {
    var WebPBNScraper = {};

    WebPBNScraper.scrape = function(id, callback) {
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