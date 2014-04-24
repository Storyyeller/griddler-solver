(function(exports) {
    /* TODO: do something if the browser doesn't support local storage */

    /* TODO: add more fine-grained events. Right now, there is only a single "cacheUpdated" event,
    so every object observing the cache has to respond to that event, even though that event may be
    triggered for updates an object isn't interested in. Perhaps we could add a "cacheOrderingChanged"
    event and a "cacheSizeChanged" event. */

    /**
     * Caches GriddlerModels using HTML5 local storage. The cache is ordered by the "orderingValue"
     * property in GriddlerModel. A GriddlerModel with a higher ordering value will come BEFORE one
     * with a lower ordering value.
     *
     * GriddlerModels are saved into the cache as strings (via serialization), so if you save a
     * GriddlerModel into the cache and later update that object, your update will not affect
     * the cached version.
     *
     * This object is a singleton.
     *
     * This also class emits the following events:
     *      "cacheUpdated" - whenever the cache has been changed
     *
     */
    var LocalGriddlerCache = Backbone.Model.extend({

        /**
         * Returns an array of identifiers for GriddlerModels that are in the cache in order of
         * their ordering values.  The identifier with the highest ordering value will be first
         * in the array.
         *
         * @returns {string[]} an ordered array of identifiers
         */
        getIdentifiers: function() {
            var orderMap = {};
            var identifiers = new Array(localStorage.length);
            for (var i = 0; i < localStorage.length; ++i) {
                identifiers[i] = localStorage.key(i);
                var model = this.get(identifiers[i]);
                orderMap[identifiers[i]] = model.get("orderingValue");
            }

            identifiers.sort(function(a, b) {
                return orderMap[b] - orderMap[a];
            });

            return identifiers;
        },

        /**
         * Retrieves a GriddlerModel from the cache.
         *
         * @param identifier {string} the identifier of the GriddlerModel to retrieve
         * @returns {GriddlerModel} the retrieved GriddlerModel
         */
        get: function(identifier) {
            var attributes = JSON.parse(localStorage.getItem(identifier));
            var griddlerModel = new GriddlerModel(attributes);
            return griddlerModel;
        },

        /**
         * Returns true if a GriddlerModel with the specified identifier is in the cache.
         *
         * @param identifier {string} the identifier
         * @returns {boolean} true or false
         */
        contains: function(identifier) {
            return !!localStorage.getItem(identifier);
        },

        /**
         * Moves the GriddlerModel with the specified identifier to the beginning of the cache. That is,
         * after this call, the specified GriddlerModel will have the highest ordering value in the
         * cache.
         *
         * @param identifier {string} a GriddlerModel identifier
         */
        touch: function(identifier) {
            var model = this.get(identifier);
            model.set("orderingValue", ++highestOrderingValue);
            this.insert(model);
            this._triggerCacheUpdated();
        },

        /**
         * Adds the specified GriddlerModel to the cache at the beginning (that is, it sets the
         * ordering value of the specified GriddlerModel to the highest ordering value in the cache,
         * and THEN serializes it into the cache).
         *
         * @param griddlerModel {GriddlerModel} the GriddlerModel to save
         */
        insert: function(griddlerModel) {
            //TODO: do something if the cache runs out of space
            griddlerModel.set("orderingValue", ++highestOrderingValue);
            localStorage.setItem(griddlerModel.get("identifier"), JSON.stringify(griddlerModel));
            this._triggerCacheUpdated();
        },

        /**
         * Removes the GriddlerModel with the specified identifier from the cache.
         *
         * @param identifier {string} a GriddlerModel identifier
         */
        remove: function(identifier) {
            localStorage.removeItem(identifier);
            this._triggerCacheUpdated();
        },

        /**
         * Clears the cache.
         */
        removeAll: function() {
            localStorage.clear();
            this._triggerCacheUpdated();
        },

        /**
         * Returns the size of the cache in megabytes.
         *
         * @returns {number} the size of the cache in megabytes
         */
        sizeInMegabytes: function() {
            var bytes = 0;
            for (var key in localStorage) {
                var value = localStorage.getItem(key);
                bytes += value.length * 2;
            }

            return bytes / 1024. / 1024.;
        },

        /**
         * Trigger a "cacheUpdated" event
         *
         * @private
         */
        _triggerCacheUpdated: function() {
            this.trigger("cacheUpdated");
        }
    });

    /* create the singleton */
    var cache = new LocalGriddlerCache();

    /* initialize the highest ordering value */
    var highestOrderingValue = Number.MIN_VALUE;
    var identifiers = cache.getIdentifiers();
    identifiers.forEach(function(identifier) {
        var current = cache.get(identifier).get("orderingValue");
        if (current > highestOrderingValue) {
            highestOrderingValue = current;
        }
    });

    /* TODO: figure out a system for intertab communication (Scenario: you start solving a puzzle in
    tab A. You then open tab B. Now the solve completes. You then click on that puzzle in the recents
    list in tab B. The old, unsolved version shows up...) */

    /* TODO: figure out why this isn't trapping storage events from other tabs */
    $(window).bind("storage", LocalGriddlerCache._triggerCacheUpdated);

    if (exports) {
        exports.LocalGriddlerCache = cache;
    }
})(window);