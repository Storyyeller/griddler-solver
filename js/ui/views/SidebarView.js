(function(exports) {
    exports.SidebarView = Backbone.View.extend({
        tagName: "div",

        className: "sidebar ui-layout-west",

        events: {
            "click .open-button": "open",
            "click .export-button": "exportPuzzle",
            /* TODO: make sure this makes logical sense */
            "click .recent-puzzle-link.clickable": "recentClicked",
            "click .clear-recents-button": "clearRecents"
        },

        initialize: function(opts) {
            this.listenTo(AppModelSingleton, "change:currentPuzzle", this.updateButtonState);
            this.listenTo(AppModelSingleton, "change:currentPuzzle", this.updateRecents);
            this.listenTo(AppModelSingleton, "cacheUpdated", this.updateRecents);

            this.openDialog = new OpenDialogView();
        },

        open: function() {
            this.openDialog.show();
        },

        exportPuzzle: function() {
            //TODO: export should pop up a dialog box
            var puzzle = AppModelSingleton.get("currentPuzzle").get("puzzle");
            AppModelSingleton.exportPuzzle(puzzle, "non");
        },

        updateButtonState: function() {
            if (AppModelSingleton.get("currentPuzzle")) {
                this.exportButton.show();
            } else {
                this.exportButton.hide();
            }

            if (this.layout) {
                var northPane = this.$el.find(".ui-layout-north");
                northPane.css("height", "auto");
                var naturalHeight = northPane.height();
                this.layout.sizePane("north", naturalHeight);
            }
        },

        clearRecents: function() {
            AppModelSingleton.clearCache();
        },

        //TODO: make more efficient.  It updates way too frequently.
        updateRecents: function() {
            var identifiers = AppModelSingleton.getCachedIdentifiers();
            if (!identifiers.length) {
                this.recentsContainer.css("display", "none");
            } else {
                this.recentsContainer.css("display", "block");

                var currentGriddlerModel = AppModelSingleton.get("currentPuzzle");
                var currentIdentifier = currentGriddlerModel ? currentGriddlerModel.get("identifier") : null;

                var buffer = [];
                identifiers.forEach(function(identifier) {
                    buffer.push("<span class='");
                    buffer.push((identifier === currentIdentifier) ? "recent-puzzle-link" : "recent-puzzle-link clickable");
                    buffer.push("'>");
                    buffer.push(identifier);
                    buffer.push("</span>");
                });

                this.recentLinks.html(buffer.join(""));
            }

            this.delegateEvents();
        },

        recentClicked: function(evt) {
            AppModelSingleton.loadCachedGriddler($(evt.target).text());
        },

        render: function() {
            var templateFunction = TemplateLoader.get("Sidebar");
            this.$el.html(templateFunction());

            this.exportButton = this.$el.find(".export-button");
            this.recentsContainer = this.$el.find(".recents-container");
            this.recentLinks = this.$el.find(".recent-links");

            this.updateButtonState();
            this.updateRecents();
            this.delegateEvents();

            var layoutOptions = {
                applyDefaultStyles: false,
                defaults: {
                    spacing_open: 0,
                    spacing_closed: 0
                }
            };
            this.layout = this.$el.layout(layoutOptions);
            this.recentsContainer.layout(layoutOptions);

            return this;
        }
    });
})(window);
