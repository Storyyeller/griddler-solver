(function(exports) {
    function lengthOfLongestContainedArray(arr) {
        if (!arr.length) {
            return -1;
        }

        var max = 0;
        arr.forEach(function(child) {
            if (child.length > max) {
                max = child.length;
            }
        });
        return max;
    }

    var GriddlerView = Backbone.View.extend({
        tagName: "div",

        className: "GriddlerView",

        initialize: function() {
            this.listenTo(this.model, "change:currentStep", this.updateBoard);

            var puzzle = this.model.get("puzzle");
            this.maxColHints = lengthOfLongestContainedArray(puzzle.cols);
            this.maxRowHints = lengthOfLongestContainedArray(puzzle.rows);
        },

        //TODO: maintain history so you don't have to reapply every step if the user jumps backward
        updateBoard: function() {
            var currentStep = this.model.get("currentStep");
            var puzzle = this.model.get("puzzle");

            if (currentStep === this.lastAppliedStep + 1) {
                this._applySingleStep(puzzle.solution_steps[currentStep]);
            } else {
                for (var i = 0; i < this.squares.length; ++i) {
                    this.squares[i].removeClass();
                    this.squares[i].addClass("GriddlerSquare GriddlerUnknownSquare");
                }

                if (currentStep > -1) {
                    for (var i = 0; i <= currentStep; ++i) {
                        this._applySingleStep(puzzle.solution_steps[i]);
                    }
                }
            }

            this._highlightChangedSquares(currentStep, this.lastAppliedStep);
            this.lastAppliedStep = currentStep;
        },

        _applySingleStep: function(step) {
            var self = this;
            var puzzle = this.model.get("puzzle");
            step.newvals.forEach(function(newval) {
                var squareIndex = newval[0];
                var squareValue = newval[1][0];

                var type;
                if (squareValue === 0) {
                    type = "GriddlerEmptySquare";
                } else if (squareValue === 1) {
                    type = "GriddlerFilledSquare";
                }

                var square = self.squares[squareIndex];
                square.removeClass();
                square.addClass("GriddlerSquare " + type);
            });
        },

        _highlightChangedSquares: function(currentStep, previousStep) {
            var puzzle = this.model.get("puzzle");
            var self = this;

            if (previousStep >= 0) {
                var prevStep = puzzle.solution_steps[previousStep];
                prevStep.newvals.forEach(function(newval) {
                    var squareIndex = newval[0];
                    self.squares[squareIndex].removeClass("GriddlerChangedSquare");
                });
            }

            if (currentStep >= 0) {
                var step = puzzle.solution_steps[currentStep];
                step.newvals.forEach(function(newval) {
                    var squareIndex = newval[0];
                    self.squares[squareIndex].addClass("GriddlerChangedSquare");
                });
            }
        },

        render: function() {
            var puzzle = this.model.get("puzzle");

            var templateFunction = TemplateLoader.get("Griddler");
            var html = templateFunction({
                puzzle: puzzle,
                maxColHints: this.maxColHints,
                maxRowHints: this.maxRowHints
            });

            this.$el.html(html);

            var elements = this.$el.find(".inPlaySquaresContainer").find(".GriddlerSquare");
            this.squares = new Array(elements.length);
            for (var i = 0; i < elements.length; ++i) {
                this.squares[i] = $(elements[i]);
//                var col = i % puzzle.rows.length;
//                if (col % 5 === 0) {
//                    this.squares[i].css("border-left", "2px solid black");
//                }
            }

            this.lastAppliedStep = -1;
            this.updateBoard();

            return this;
        }
    });

    exports.GriddlerView = GriddlerView;
})(window);

