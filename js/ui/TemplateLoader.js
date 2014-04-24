(function() {
    var templates = {};

    /**
     * A template cache. This class simply caches the contents of templates so they can be retrieved
     * by views later. With this cache, views don't have to make an HTTP request each time they want
     * to access a template, which dramatically improves performance. Only a single initial HTTP
     * request per template is needed when that template is loaded into the cache.
     */
    window.TemplateLoader = {
        /**
         * Loads the specified templates into the cache.
         *
         * @param names {string[]} an array of template file names (e.g., ["foo.html", "bar.html"]).
         *                          These files will be searched for in the "js/ui/templates/" directory
         * @param callback {function} a callback with no parameters that will be called once all the
         *                              templates have been retireved
         */
        load: function(names, callback) {
            var requests = [];
            names.forEach(function(name) {
                var url = "js/ui/templates/" + name + ".html";
                requests.push($.get(url, function(data) {
                    templates[name] = _.template(data);
                }));
            });
            $.when.apply(null, requests).done(callback);
        },

        /**
         * Retrieves a cached template as an Underscore template object.
         *
         * @param name {string} the template file name without ".html" at the end
         * @returns an Underscore template object
         */
        get: function(name) {
            return templates[name];
        }
    };
})();