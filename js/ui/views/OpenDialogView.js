(function(exports) {

    /**
     * An open dialog used to open local files and scrape.
     */
    exports.OpenDialogView = Backbone.View.extend({
        tagName: "div",

        className: "open-dialog",

        events: {
            "change #fileChooser": "openFile",
            "click #scrapeButton": "scrape",
            "keydown #puzzleId": "checkForEnter"
        },

        initialize: function() {
            this.listenTo(AppModelSingleton, "cacheAlmostFull", this.handleCacheAlmostFull);
            this.render();
        },

        handleCacheAlmostFull: function(data) {
            /* TODO: only show if dialog is open */
            alert(data.message);
        },

        openFile: function(evt) {
            var files = evt.target.files;
            if (!files.length) {
                return;
            }

            var self = this;
            AppModelSingleton.openFile(files[0], function(err) {
                if (err) {
                    /* TODO don't use alert */
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
                    /* TODO: don't use alert */
                    alert(err);
                } else {
                    self.hide();
                    self.$el.find("#puzzleId").val("");
                }
            });
        },

        render: function() {
            var templateFunction = TemplateLoader.get("OpenDialog");
            var html = templateFunction({
                websites: AppModelSingleton.getSupportedURLs(),
                extensions: AppModelSingleton.getSupportedExtensions()
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