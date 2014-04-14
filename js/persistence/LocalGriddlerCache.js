(function(exports) {
    //TODO: do something if local storage is not present
    //TODO: need finer events

    var LocalGriddlerCache = Backbone.Model.extend({

        getIdentifiers: function() {
            var identifiers = new Array(localStorage.length);
            for (var i = 0; i < localStorage.length; ++i) {
                identifiers[i] = localStorage.key(i);
            }
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
            this._triggerCacheUpdated();
        },

        //TODO: do something if the cache runs out of space
        insert: function(griddlerModel) {
            localStorage.setItem(griddlerModel.get("identifier"), JSON.stringify(griddlerModel));

            //TODO: move the specified identifier to the "top" of the cache

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
        }

    });

    //TODO: figure out a system for intertab communication (Scenario: you start solving a puzzle in tab A. You then open tab B. Now the solve completes. You then click on that puzzle in the recents list in tab B. The old version shows up...)
    //TODO: figure out why this isn't trapping storage events from other tabs
    $(window).bind("storage", LocalGriddlerCache._triggerCacheUpdated);

    if (exports) {
        exports.LocalGriddlerCache = new LocalGriddlerCache();
    }
})(window);