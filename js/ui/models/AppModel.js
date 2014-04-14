(function(exports) {
    exports.AppModel = Backbone.Model.extend({
        defaults: function() {
            return {
                /*
                 * Other objects should NOT call Backbone's set() method to set this.
                 * The set() method should only be used internally by this object.
                 */
                currentPuzzle: null
            };
        },

        initialize: function() {
            this._setupCloseHandler();

            this.listenTo(LocalGriddlerCache, "cacheUpdated", function() {
                this.trigger("cacheUpdated");
            })
        },

        _setupCloseHandler: function() {
            var handlerCalled = false;
            var self = this;
            function unloadApp() {
                if (handlerCalled) {
                    return;
                }
                handlerCalled = true;

                self._unloadCurrentPuzzle();
            }

            var jWindow = $(window);
            jWindow.on("beforeunload", unloadApp);
            jWindow.on("unload", unloadApp);
        },

        //TODO: do this in Backbone setter and get rid of custom function
        _unloadCurrentPuzzle: function() {
            var currentPuzzle = this.get("currentPuzzle");
            if (currentPuzzle) {
                if (currentPuzzle.get("solveState") === "solveInProgress") {
                    currentPuzzle.abortSolving();
                }

                if (LocalGriddlerCache.contains(currentPuzzle.get("identifier"))) {
                    /* update the version of the puzzle in the cache */
                    LocalGriddlerCache.insert(currentPuzzle);
                }
            }
        },

        loadPuzzle: function(puzzle, identifier) {
            var model = new GriddlerModel({
                puzzle: puzzle,
                identifier: identifier
            });
            this.loadGriddlerModel(model);
        },

        loadCachedGriddler: function(identifier) {
            var current = this.get("currentPuzzle");
            if (current && identifier === current.get("identifier")) {
                return;
            }

            this._unloadCurrentPuzzle();
            var model = LocalGriddlerCache.get(identifier);
            this.set("currentPuzzle", model);

            LocalGriddlerCache.touch(identifier);
        },

        loadGriddlerModel: function(griddlerModel) {
            this._unloadCurrentPuzzle();
            this.set("currentPuzzle", griddlerModel);

            /* add the newly loaded griddler to the cache so it shows up in the recents list immediately */
            if (!LocalGriddlerCache.contains(griddlerModel.get("identifier"))) {
                LocalGriddlerCache.insert(griddlerModel);
            } else {
                LocalGriddlerCache.touch(griddlerModel.get("identifier"));
            }

            griddlerModel.solve();
        },

        getCachedIdentifiers: function() {
            return LocalGriddlerCache.getIdentifiers();
        },

        clearCache: function() {
            LocalGriddlerCache.removeAll();
        },

        getSupportedExtensions: function() {
            return FileManager.getSupportedExtensions();
        },

        openFile: function(file, callback) {
            var self = this;

            FileManager.parseFile(file, function(err, puzzle) {
                if (err) {
                    callback(err);
                } else {
                    self.loadPuzzle(puzzle, file.name);
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
                    self.loadPuzzle(puzzle, url + " " + puzzleId);
                    callback(null);
                }
            });
        },

        exportPuzzle: function(puzzle, extension) {
            FileManager.serializePuzzle(puzzle, "non", function(err, str) {
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