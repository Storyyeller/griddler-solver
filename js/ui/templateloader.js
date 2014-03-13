(function() {
    var templates = {};

    window.TemplateLoader = {
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

        //TODO change name of function so it's not "get"
        get: function(name) {
            return templates[name];
        }
    };
})();