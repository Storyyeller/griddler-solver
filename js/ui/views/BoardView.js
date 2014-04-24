(function(exports) {
    /**
     * Takes a 2D array and returns the length of the longest row.
     *
     * @param arr {Array[]} a 2d array
     * @returns {number} the length of the longest row
     */
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

    /**
     * A view for a Griddler grid. This view contains the grid and the hint squares only (no surrounding
     * information like what step you're on, etc.)
     */
    var BoardView = Backbone.View.extend({
        tagName: "div",

        className: "board",

        initialize: function() {
            this.listenTo(this.model, "change:currentStep", this.updateBoard);
            this.listenTo(this.model, "change:squareSize", this._changeSquareSize);

            var puzzle = this.model.get("puzzle");
            this.maxColHints = lengthOfLongestContainedArray(puzzle.cols);
            this.maxRowHints = lengthOfLongestContainedArray(puzzle.rows);

            var squareSize = this.model.get("squareSize");
            this.squareClass = this._convertSizeToCSSClass(squareSize);
        },

        /**
         * Updates the board so that it displays the currentStep.
         */
        updateBoard: function() {
            /* TODO: maintain history/cache so we don't have to reapply every step if the user jumps backward */

            var currentStep = this.model.get("currentStep");
            var puzzle = this.model.get("puzzle");

            if (currentStep === this.lastAppliedStep + 1) {
                this._applySingleStep(puzzle.solution_steps[currentStep]);
            } else {
                /* reset board to its initial state */
                for (var i = 0; i < this.squares.length; ++i) {
                    this.squares[i].removeClass();
                    this.squares[i].addClass("board-square board-unknown-square");
                    this.squares[i].addClass(this.squareClass);
                }

                if (currentStep > -1) {
                    /* reapply steps starting from the beginning */
                    for (var i = 0; i <= currentStep; ++i) {
                        this._applySingleStep(puzzle.solution_steps[i]);
                    }
                }
            }

            this._highlightChangedSquares(currentStep, this.lastAppliedStep);
            this.lastAppliedStep = currentStep;
        },

        /**
         * Takes the current state of the board and applies the specified step to it.
         *
         * @param step {object} a step object (from a raw puzzle object)
         *
         * @private
         */
        _applySingleStep: function(step) {
            var self = this;
            var puzzle = this.model.get("puzzle");
            step.newvals.forEach(function(newval) {
                var squareIndex = newval[0];
                var squareValue = newval[1][0];

                var type;
                if (squareValue === 0) {
                    type = "board-empty-square";
                } else if (squareValue === 1) {
                    type = "board-filled-square";
                }

                var square = self.squares[squareIndex];
                square.removeClass();
                square.addClass(self.squareClass);
                square.addClass("board-square " + type);
            });
        },

        /**
         * Highlights the squares that changed between the specified steps.
         *
         * @param currentStep {number} the current step for which you want to highlight changed squares
         * @param previousStep {number} the previous step used for determing what changed
         *
         * @private
         */
        _highlightChangedSquares: function(currentStep, previousStep) {
            var puzzle = this.model.get("puzzle");
            var self = this;

            if (previousStep >= 0) {
                var prevStep = puzzle.solution_steps[previousStep];
                prevStep.newvals.forEach(function(newval) {
                    var squareIndex = newval[0];
                    self.squares[squareIndex].removeClass("board-changed-square");
                });
            }

            if (currentStep >= 0) {
                var step = puzzle.solution_steps[currentStep];
                step.newvals.forEach(function(newval) {
                    var squareIndex = newval[0];
                    self.squares[squareIndex].addClass("board-changed-square");
                });
            }
        },

        _changeSquareSize: function() {
            var size = this.model.get("squareSize");
            var newClass = this._convertSizeToCSSClass(size);
            this.$el.removeClass(this.squareClass).addClass(newClass);
            this.squareClass = newClass;
        },

        _convertSizeToCSSClass: function(size) {
            if (size === "small") {
                return "board-small";
            }

            if (size === "medium") {
                return "board-medium";
            }

            if (size === "large") {
                return "board-large";
            }

            return null;
        },

        render: function() {
            var puzzle = this.model.get("puzzle");

            var templateFunction = TemplateLoader.get("Board");
            var html = templateFunction({
                puzzle: puzzle,
                maxColHints: this.maxColHints,
                maxRowHints: this.maxRowHints
            });

            this.$el.html(html);

            /* TODO: inPlaySquaresContainer should be in dash-case, not camelCase (this requires
             * changing the template and CSS too) */
            var elements = this.$el.find(".inPlaySquaresContainer").find(".board-square");
            this.squares = new Array(elements.length);
            for (var i = 0; i < elements.length; ++i) {
                this.squares[i] = $(elements[i]);
            }

            this.lastAppliedStep = -1;
            this.updateBoard();

            this.$el.addClass(this.squareClass);

            return this;
        }
    });

    exports.BoardView = BoardView;
})(window);

