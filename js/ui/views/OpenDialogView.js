(function(exports) {
    exports.OpenDialogView = Backbone.View.extend({
        tagName: "div",

        id: "openDialog",

        events: {
            "change #fileChooser": "openFile",
            "click #scrapeButton": "scrape",
            "keydown #puzzleId": "checkForEnter"
        },

        initialize: function() {
            this.render();
        },

        openFile: function(evt) {
            var files = evt.target.files;
            if (!files.length) {
                return;
            }

            var self = this;
            AppModelSingleton.openFile(files[0], function(err) {
                if (err) {
                    //TODO don't use alert
                    alert(err);
                } else {
                    self.hide();
                }
            });
        },

        scrape: function() {
            var puzzleId = this.$el.find("#puzzleId").val().trim();
            if (!puzzleId.length) {
                alert("Error: puzzle ID is blank");
                return;
            }
            var url = this.$el.find("#urlSelect").find(":selected").val();
            var self = this;
            AppModelSingleton.scrapePuzzle(url, puzzleId, function(err) {
                if (err) {
                    //TODO: don't use alert
                    alert(err);
                } else {
                    self.hide();
                }
            });
        },

        render: function() {
            var templateFunction = TemplateLoader.get("OpenDialog");
            var html = templateFunction({
                websites: ScraperManager.getSupportedURLs()
            });
            this.$el.html(html);
            this.delegateEvents();
            return this;
        },

        checkForEnter: function(evt) {
            if (evt.keyCode === 13) { //ENTER
                this.$el.find("#scrapeButton").click();
            }
        },

        show: function() {
            $.blockUI.defaults.css.top = "20%";
            $.blockUI.defaults.css.border = "";
            $.blockUI.defaults.css.backgroundColor = "";
            $.blockUI.defaults.css.cursor = "";
            $.blockUI.defaults.overlayCSS.cursor = "";
            $.blockUI( {
                message: this.$el
            });
            var self = this;
            $(document).on("keyup.opendialog", function(evt) {
                if (evt.keyCode === 27) { //ESC
                    self.hide();
                }
            });
            $(".blockOverlay").click(function() {
                self.hide();
            });
        },

        hide: function() {
            $.unblockUI();
            $(document).off("keyup.opendialog");
        }
    });
})(window);