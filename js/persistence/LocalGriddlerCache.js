(function(exports) {
    //TODO: do something if local storage is not present
    //TODO: need finer events

    var LocalGriddlerCache = Backbone.Model.extend({

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

        get: function(identifier) {
            var attributes = JSON.parse(localStorage.getItem(identifier));
            var griddlerModel = new GriddlerModel(attributes);
            return griddlerModel;
        },

        //TODO: rename to containsIdentifier
        contains: function(identifier) {
            return !!localStorage.getItem(identifier);
        },

        touch: function(identifier) {
            //TODO: move the specified identifier to the "top" of the cache
            var model = this.get(identifier);
            model.set("orderingValue", ++highestOrderingValue);
            this.insert(model);

            this._triggerCacheUpdated();
        },

        //TODO: do something if the cache runs out of space
        insert: function(griddlerModel) {
            //TODO: move the specified identifier to the "top" of the cache
            griddlerModel.set("orderingValue", ++highestOrderingValue);

            localStorage.setItem(griddlerModel.get("identifier"), JSON.stringify(griddlerModel));

            this._triggerCacheUpdated();
        },

        //TODO: rename to removeIdentifier
        remove: function(identifier) {
            localStorage.removeItem(identifier);
            this._triggerCacheUpdated();
        },

        removeAll: function() {
            localStorage.clear();
            this._triggerCacheUpdated();
        },

        _triggerCacheUpdated: function() {
            this.trigger("cacheUpdated");
        },

        sizeInMegabytes: function() {
            var bytes = 0;
            for (var key in localStorage) {
                var value = localStorage.getItem(key);
                bytes += value.length * 2;
            }

            return bytes / 1024. / 1024.;
        }

    });

    var cache = new LocalGriddlerCache();

    var highestOrderingValue = Number.MIN_VALUE;
    var identifiers = cache.getIdentifiers();
    identifiers.forEach(function(identifier) {
        var current = cache.get(identifier).get("orderingValue");
        if (current > highestOrderingValue) {
            highestOrderingValue = current;
        }
    });

    //TODO: figure out a system for intertab communication (Scenario: you start solving a puzzle in tab A. You then open tab B. Now the solve completes. You then click on that puzzle in the recents list in tab B. The old version shows up...)
    //TODO: figure out why this isn't trapping storage events from other tabs
    $(window).bind("storage", LocalGriddlerCache._triggerCacheUpdated);

    if (exports) {
        exports.LocalGriddlerCache = cache;
    }
})(window);