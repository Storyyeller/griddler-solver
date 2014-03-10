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
                this.puzzleView = new PuzzleView({
                    model: this.model.get("currentPuzzle")
                });
                this.$el.append(this.puzzleView.$el);
                this.puzzleView.render();
            }

            return this;
        }
    });
})(window);