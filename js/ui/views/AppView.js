(function(exports) {
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

            this.$el.layout(layoutOptions);

            this.delegateEvents();

            return this;
        }
    });
})(window);

