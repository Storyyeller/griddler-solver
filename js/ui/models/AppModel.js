(function(exports) {
    exports.AppModel = Backbone.Model.extend({
        defaults: function() {
            return {
                currentPuzzle: null,
                error: null
            };
        },

        //TODO: do this in Backbone setter and get rid of custom function
        setPuzzle: function(puzzle) {
            var currentPuzzle = this.get("currentPuzzle");
            if (currentPuzzle && currentPuzzle.get("solveState") === "solveInProgress") {
                currentPuzzle.abortSolving();
            }

            var model = new GriddlerModel({
                puzzle: puzzle
            });

            this.set("currentPuzzle", model);
            model.solve();
        },

        openFile: function(file, callback) {
            var self = this;

            FileManager.parseFile(file, function(err, puzzle) {
                if (err) {
                    callback(err);
                } else {
                    self.setPuzzle(puzzle);
                    callback(null);
                }
            });
        },

        scrapePuzzle: function(url, puzzleId, callback) {
            var self = this;

            ScraperManager.scrape(url, puzzleId, function(err, puzzle) {
                if (err) {
                    callback(err);
                } else {
                    self.setPuzzle(puzzle);
                    callback(null);
                }
            });
        },

        exportPuzzle: function(puzzle, extension) {
            FileManager.serializePuzzle(puzzle, "non", function(err, str) {
                //set error var instead
                if (err) {
                    alert(err.message);
                    return;
                }

                var filename = window.prompt("Enter a filename: ", "export.non");
                if (filename && (filename = filename.trim()) !== "") {
                    if (filename.indexOf(".non") !== filename.length - 4) {
                        filename += ".non";
                    }
                    FileManager.presentDownload(str, filename);
                }
            });
        }
    });
})(window);