(function(exports) {
    /**
     * This is the main application class. It is a singleton and facade. If you're familiar with
     * Cocoa development, it's akin to an AppDelegate. All UI classes interact with the backend
     * through this class.
     *
     * This class encapsulates the backend state of the application.
     *
     * This class also emits the following events:
     *      "cacheUpdated" - whenever the puzzles in the recents list change (no data passed with event)
     *      "cacheAlmostFull" - when the cache reaches a point where the user needs to start
     *      clearing things out (if the cache gets too full, things stop working correctly). An
     *      object with a "message" property containing a human readable message is passed along
     *      with this event.
     */

    /*
        TODO: improve how cache errors are handled. When cache utilization gets too large (above 90%),
        things stop working.  Currently we only display a message to the user telling them that
        utilization is >= 90%, but we need to do something better than that. Additionally, when the cache
        is 100% full, we simply catch the exception that gets generated and display an error message, but
        we need to do something better there too.
     */

    exports.AppModel = Backbone.Model.extend({
        defaults: function() {
            return {
                /**
                 * The current loaded GriddlerModel.
                 *
                 * This property should be treated as READ-ONLY.
                 *
                 * @type {GriddlerModel}
                 */
                currentPuzzle: null
            };
        },

        initialize: function() {
            this._setupCloseHandler();

            /* This class is a facade so it needs to reroute events from the cache through itself.
               That way, other classes only have to listen to this class -- they don't have to worry
               about figuring out which backend class they need to work with */
            this.listenTo(LocalGriddlerCache, "cacheUpdated", function() {
                this.trigger("cacheUpdated");
            })
        },

        /**
         * Sets up a callback that saves the state of currently loaded puzzle to the cache when the
         * window/tab is closed.
         *
         * @private
         */
        _setupCloseHandler: function() {
            /* some browsers emit "unload" and others emit "beforeunload", so we need to respond to
            both to catch all cases */

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

        /**
         * Prepares the app for loading a new puzzle by terminating the solver if it is currently
         * running and storing the currently loaded puzzle into the cache
         *
         * @private
         */
        _unloadCurrentPuzzle: function() {
            var currentPuzzle = this.get("currentPuzzle");
            if (currentPuzzle) {
                if (currentPuzzle.get("solveState") === "solveInProgress") {
                    currentPuzzle.abortSolving();
                }

                if (LocalGriddlerCache.contains(currentPuzzle.get("identifier"))) {
                    try {
                        /* update the version of the puzzle in the cache */
                        LocalGriddlerCache.insert(currentPuzzle);
                    } catch (err) {
                        /* TODO: handle this event better */
                        alert("Error: cache full. Puzzle could not be saved. Try clearing your recents.")
                    }

                }
            }
        },

        /**
         * Loads the specified puzzle.
         *
         * @param puzzle {object} a raw puzzle object
         * @param identifier {string} the identifier for the raw puzzle
         */
        loadPuzzle: function(puzzle, identifier) {
            var griddlerModel = new GriddlerModel({
                puzzle: puzzle,
                identifier: identifier
            });

            this._emitCacheFullEventIfNeeded();

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

        /**
         * Loads the specified GriddlerModel from the cache.
         *
         * @param identifier {string} a griddler identifier
         */
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

        /**
         * Returns an array of griddler identifiers currently in the cache. The most recently opened
         * identifiers will be at the beginning of the array.
         *
         * @returns {string[]} an array of griddler identifiers
         */
        getCachedIdentifiers: function() {
            return LocalGriddlerCache.getIdentifiers();
        },

        /**
         * Removes all griddlers currently in the cache.
         */
        clearCache: function() {
            LocalGriddlerCache.removeAll();
        },

        /**
         * Returns an array of file extensions the app is capable of parsing.
         *
         * @returns {string[]} an array of string file extensions
         */
        getSupportedExtensions: function() {
            return FileManager.getSupportedExtensions();
        },

        /**
         * Returns the URLs supported for puzzle scraping.
         *
         * @returns {string[]} an array of string URLs of the form ["webpbn.com", "griddlers.net"]
         */
        getSupportedURLs: function() {
            return ScraperManager.getSupportedURLs();
        },

        /**
         * Loads the specified file.
         *
         * @param file {File} a JavaScript file object
         * @param callback {function(Error)} a callback that will be invoked once the load is complete
         *                  the error will be null if the open was successful
         */
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

        /**
         * Scrapes and loads the specified puzzle from the specified URL.
         *
         * @param url {string} the URL to scrape from (should be one of the URLs returned by getSupportedURLs()
         * @param puzzleId {string} the ID of the puzzle you want to scrape
         * @param callback {function(Error)} a callback that will be invoked once the scraper has completed
         *                      if Error is non-null, an error occurred
         */
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

        /**
         * Presents the specified puzzle as a download
         *
         * @param puzzle {object} a raw puzzle object
         * @param extension {string} an extension - should be one returned by getSupportedExtensions
         */
        exportPuzzle: function(puzzle, extension) {
            /* TODO: this serialization code should be in GriddlerModel (that is, GriddlerModel
               should call FileManager), because a GriddlerModel should know how to serialize itself.
               This function should  be renamed to presentDownload and should really just be a
               redirect to FileManager.presentDownload */
            FileManager.serializePuzzle(puzzle, "non", function(err, str) {
                //TODO: view should handle displaying the error
                if (err) {
                    alert(err.message);
                    return;
                }

                //TODO: view should handle getting the filename
                var filename = window.prompt("Enter a filename: ", "export.non");
                if (filename && (filename = filename.trim()) !== "") {
                    if (filename.indexOf(".non") !== filename.length - 4) {
                        filename += ".non";
                    }
                    FileManager.presentDownload(str, filename);
                }
            });
        },

        /**
         * Triggers a "cacheAlmostFull" event if too much space in the cache has been used
         *
         * @private
         */
        _emitCacheFullEventIfNeeded: function() {
            var cacheMB = LocalGriddlerCache.sizeInMegabytes();
            if (cacheMB >= 9) {
                this.trigger("cacheAlmostFull", {
                    message: "Hey! The puzzles in your recents list are taking about 9 MB of space.  " +
                    "Beyond 9 MB, some things might not work correctly, so please export the puzzles " +
                    "you want to keep and clear your recents to ensure things keep running smoothly.  " +
                    "Thanks!"
                });
            }
        }
    });
})(window);