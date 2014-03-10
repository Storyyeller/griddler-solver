(function(exports) {
    var WebPBNScraper = {};

    WebPBNScraper.scrape = function(id, callback) {
        $.post("http://webpbn.com/export.cgi", {
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
            if (data === "The ss format cannot handle multicolor puzzles\n") {
                callback(new Error("Puzzle " + id + " is a multicolor puzzle which is unsupported"), null);
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
            callback(new Error("Puzzle could not be found on webpbn.com"), null);
        });
    };

    WebPBNScraper.getURL = function() {
        return "webpbn.com";
    };

    if (exports) {
        exports.WebPBNScraper = WebPBNScraper;

        if (exports.ScraperManager) {
            exports.ScraperManager.registerScraper(WebPBNScraper);
        }
    }

})(window);