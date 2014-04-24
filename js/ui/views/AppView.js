(function(exports) {
    /**
     * The main view for the whole app. All other views should be within this main view.
     */
    exports.AppView = Backbone.View.extend({
        tagName: "body",

        initialize: function() {
            this.leftSidebar = new SidebarView();
            this.contentView = new ContentView();
        },

        render: function() {
            this.$el.empty();

            this.$el.append(this.leftSidebar.$el);
            this.$el.append(this.contentView.$el);

            this.leftSidebar.render();
            this.contentView.render();

            var layoutOptions = {
                applyDefaultStyles: false,
                defaults: {
                    spacing_open: 0,
                    spacing_closed: 0
                }
            };

            /* use jQuery layout to divide the page into west and center regions */
            this.$el.layout(layoutOptions);

            /* make sure our Backbone event handlers get attached */
            this.delegateEvents();

            return this;
        }
    });
})(window);

