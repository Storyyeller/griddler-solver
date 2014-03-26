(function(exports) {
    exports.ContentView = Backbone.View.extend({
        tagName: "div",

        className: "ui-layout-center",

        id: "contentContainer",

        initialize: function() {
            this.model = AppModelSingleton;
            this.listenTo(this.model, "change:currentPuzzle", this.render);
        },

        render: function() {
            this.$el.empty();

            var currentPuzzle = this.model.get("currentPuzzle");

            if (currentPuzzle) {
                this.griddlerView = new GriddlerView({
                    model: this.model.get("currentPuzzle")
                });
                this.$el.append(this.griddlerView.$el);
                this.griddlerView.render();
            }

            return this;
        }
    });
})(window);