(function(exports) {

    /**
     * A view for the left sidebar. The left sidebar contains the open button, the export button, and
     * the recents list.
     */
    exports.SidebarView = Backbone.View.extend({
        tagName: "div",

        className: "sidebar ui-layout-west",

        events: {
            "click .open-button": "open",
            "click .export-button": "exportPuzzle",
            "click .recent-puzzle-link.clickable": "recentClicked",
            "click .clear-recents-button": "clearRecents"
        },

        initialize: function() {
            this.listenTo(AppModelSingleton, "change:currentPuzzle", this.updateButtonState);
            this.listenTo(AppModelSingleton, "change:currentPuzzle", this.updateRecents);
            this.listenTo(AppModelSingleton, "cacheUpdated", this.updateRecents);

            this.openDialog = new OpenDialogView();
        },

        open: function() {
            this.openDialog.show();
        },

        exportPuzzle: function() {
            var puzzle = AppModelSingleton.get("currentPuzzle").get("puzzle");
            AppModelSingleton.exportPuzzle(puzzle, "non");
        },

        updateButtonState: function() {
            /* only show the export button if a puzzle is loaded */
            if (AppModelSingleton.get("currentPuzzle")) {
                this.exportButton.show();
            } else {
                this.exportButton.hide();
            }

            /* When the export button is shown, the north pane needs to get taller (it doesn't
            automatically resize). We need to calculate the north pane's new natural height (which
            includes the height of the export button) and resize it to that. However we only want
            to do this recalculation if the layout exists -- we don't want to do it before this.layout
            has been set. */
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

        /**
         * Update the recents list (e.g., when a new puzzle has been opened)
         */
        updateRecents: function() {
            /* TODO: make more efficient. This function is called very frequently and the problem is
               that it completely destroys and recreates the entire list. */

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
                    /* the entry for the currently open puzzle should not be clickable */
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
            /* the text of the span that triggered this event is the identifier we want to load */
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

            /* use jQuery layout to divide the sidebar into north and center regions
             * the north region contains the open and export buttons
             * the center region is the recents container */
            this.layout = this.$el.layout(layoutOptions);

            /* use jQuery layout to divide the recents container into north and center regions
             * the north region is the text "Recents:". The center region is the scrollable
             * recents list */
            this.recentsContainer.layout(layoutOptions);

            return this;
        }
    });
})(window);
