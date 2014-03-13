(function(exports) {
    exports.SidebarView = Backbone.View.extend({
        tagName: "div",

        id: "leftSidebar",

        className: "ui-layout-west",

        events: {
            "click #openButton": "open",
            "click #exportButton": "exportPuzzle"
        },

        initialize: function(opts) {
            this.listenTo(AppModelSingleton, "change:currentPuzzle", this.updateButtonState);
        },

        open: function() {
            var openDialog = new OpenDialogView();
            openDialog.show();
        },

        exportPuzzle: function() {
            //TODO: export should pop up a dialog box
            var puzzle = AppModelSingleton.get("currentPuzzle").get("puzzle");
            AppModelSingleton.exportPuzzle(puzzle, "non");
        },

        updateButtonState: function() {
            var exportButton = this.$el.find("#exportButton");
            if (AppModelSingleton.get("currentPuzzle")) {
                exportButton.show();
            } else {
                exportButton.hide();
            }
        },

        render: function() {
            var templateFunction = TemplateLoader.get("Sidebar");
            this.$el.html(templateFunction());
            this.updateButtonState();
            this.delegateEvents();
            return this;
        }
    });
})(window);
