(function(exports) {
    var PageView = Backbone.View.extend({
        tagName: "body",

        initialize: function() {
            this.leftSidebar = new LeftSidebar({
                pageView: this
            });
        },

        solve: function() {
            var input = $("<input type='file' />");

            var self = this;

            input.on("change", function(evt) {
                var files = evt.target.files;
                if (!files.length) {
                    return;
                }

                self.centerContentArea.empty();

                var opts = {
                    lines: 13, // The number of lines to draw
                    length: 20, // The length of each line
                    width: 10, // The line thickness
                    radius: 30, // The radius of the inner circle
                    corners: 1, // Corner roundness (0..1)
                    rotate: 0, // The rotation offset
                    direction: 1, // 1: clockwise, -1: counterclockwise
                    color: '#000', // #rgb or #rrggbb or array of colors
                    speed: 1, // Rounds per second
                    trail: 60, // Afterglow percentage
                    shadow: false, // Whether to render a shadow
                    hwaccel: false, // Whether to use hardware acceleration
                    className: 'spinner', // The CSS class to assign to the spinner
                    zIndex: 2e9, // The z-index (defaults to 2000000000)
                    top: 'auto', // Top position relative to parent in px
                    left: 'auto' // Left position relative to parent in px
                };

                var spinner = new Spinner(opts).spin(self.centerContentArea[0]);

                FileManager.parse(files[0], function(puzzle) {
                    SolverAdapter.solve(puzzle, 1000, function(puzzle) {
                        spinner.stop();

                        if (!puzzle.solution_steps) {
                            alert("Error solving puzzle");
                            return;
                        }

                        self.showPuzzle(puzzle);
                    });
                });

            });

            input.click();
        },

        showPuzzle: function(puzzle) {
            var griddlerModel = new GriddlerModel({
                puzzle: puzzle
            });

            this.puzzleView = new PuzzleView({
                model: griddlerModel
            });

            this.centerContentArea.empty();
            this.centerContentArea.append(this.puzzleView.$el);
            this.puzzleView.render();
        },

        render: function() {
            this.$el.empty();

            this.leftSidebar.$el.addClass("ui-layout-west");
            this.$el.append(this.leftSidebar.$el);
            this.leftSidebar.render();

            this.centerContentArea = $(document.createElement("div"));
            this.centerContentArea.attr("id", "contentArea");
            this.centerContentArea.addClass("ui-layout-center");

            if (this.puzzleView) {
                this.centerContentArea.append(this.puzzleView.$el);
            }

            this.$el.append(this.centerContentArea);

            if (this.puzzleView) {
                this.puzzleView.render();
            }

            var layoutOptions = {
                applyDefaultStyles: false,
                defaults: {
                    spacing_open: 1,
                    spacing_closed: 1
                }
            };

            this.$el.layout(layoutOptions);

            return this;
        }
    });

    var LeftSidebar = Backbone.View.extend({
        tagName: "div",

        id: "leftSidebar",

        events: {
            "click #openButton": "solve"
        },

        initialize: function(opts) {
            this.pageView = opts.pageView;
        },

        solve: function() {
            this.pageView.solve();
        },

        render: function() {
            this.$el.empty();

            var titleText = $(document.createElement("p"));
            titleText.text("Griddler Solver");
            titleText.attr("id", "titleText");
            this.$el.append(titleText);

            var openButton = $(document.createElement("button"));
            openButton.attr("id", "openButton");
            openButton.html("Open...");
            this.$el.append(openButton);

            //TODO do this everywhere
            this.delegateEvents();

            return this;
        }
    });

    function createDiv(className, child) {
        var div = $(document.createElement("div"));
        if (className) {
            div.addClass(className);
        }

        if (child) {
            div.append(child);
            for (var i = 2; i < arguments.length; ++i) {
                div.append(arguments[i]);
            }
        }

        return div;
    }

    var GriddlerModel = Backbone.Model.extend({
        defaults: function() {
            return {
                currentStep: -1,
                puzzle: null
            };
        }
    });

    var MetadataView = Backbone.View.extend({
        tagName: "div",

        id: "metadataContainer",

        initialize: function() {
            this.listenTo(this.model, "change:puzzle", this.render);
        },

        render: function() {
            this.$el.empty();

            var metadata = this.model.get("puzzle").metadata;
            for (var key in metadata) {
                if (metadata.hasOwnProperty(key)) {
                    var elem = $(document.createElement("span"));
                    elem.html("<strong>" + key + "</strong>: " + metadata[key]);
                    this.$el.append(elem);
                }
            }

            return this;
        }
    });

    var PuzzleView = Backbone.View.extend({
        tagName: "div",

        id: "puzzleContainer",

        initialize: function() {
            var modelParam = {
                model: this.model
            };

            this.metadataView = new MetadataView(modelParam);
            this.griddlerView = new GriddlerView(modelParam);
            this.stepInfoView = new StepInfoView(modelParam);
            this.buttonsView = new ButtonsView(modelParam);
        },

        render: function() {
            this.$el.empty();

            var div = createDiv(null, this.griddlerView.$el, this.buttonsView.$el);
            div.css("display", "inline-block");
            div.css("vertical-align", "top");
            this.$el.append(this.metadataView.$el);
            this.$el.append(div);
            this.$el.append(this.stepInfoView.$el);

            this.metadataView.render();
            this.griddlerView.render();
            this.stepInfoView.render();
            this.buttonsView.render();

            return this;
        }
    });

    var ButtonsView = Backbone.View.extend({
        tagName: "div",

        id: "buttonsContainer",

        events: {
            "click .next": "changeStep",
            "click .previous": "changeStep",
            "click .jumpBeginning": "changeStep",
            "click .jumpEnd": "changeStep"
        },

        initialize: function() {
            this.listenTo(this.model, "change:puzzle", this.updateButtonState);
            this.listenTo(this.model, "change:currentStep", this.updateButtonState)
        },

        changeStep: function(evt) {
            var target = $(evt.currentTarget);

            var newStep;
            if (target.hasClass("previous")) {
                newStep = this.model.get("currentStep") - 1;
            } else if (target.hasClass("next")) {
                newStep = this.model.get("currentStep") + 1;
            } else if (target.hasClass("jumpBeginning")) {
                newStep = -1;
            } else if (target.hasClass("jumpEnd")) {
                newStep = this.model.get("puzzle").solution_steps.length - 1;
            }

            this.model.set("currentStep", newStep);
        },

        updateButtonState: function() {
            this.previousButton[0].disabled = (this.model.get("currentStep") === -1);
            this.nextButton[0].disabled = (this.model.get("currentStep") === this.model.get("puzzle").solution_steps.length - 1);
            this.jumpToBeginningButton[0].disabled = this.previousButton[0].disabled;
            this.jumpToSolutionButton[0].disabled = this.nextButton[0].disabled;
        },

        render: function() {
            this.$el.empty();

            var buttonTemplate = _.template("<button class='<%= className %>'><%= buttonText %></button>");

            this.previousButton = $(buttonTemplate({ buttonText: "<< Previous", className: "previous" }));
            this.nextButton = $(buttonTemplate({ buttonText: "Next >>", className: "next" }));
            this.jumpToBeginningButton = $(buttonTemplate({ buttonText: "Jump to Beginning", className: "jumpBeginning"}));
            this.jumpToSolutionButton = $(buttonTemplate({ buttonText: "Jump to Solution", className: "jumpEnd" }));

            this.$el.append(this.previousButton);
            this.$el.append(this.nextButton);
            this.$el.append($(document.createElement("p")));
            this.$el.append(this.jumpToBeginningButton);
            this.$el.append(this.jumpToSolutionButton);

            this.updateButtonState();

            return this;
        }
    });

    var StepInfoView = Backbone.View.extend({
        tagName: "div",

        id: "stepInfoContainer",

        initialize: function() {
            this.listenTo(this.model, "change:currentStep", this.updateStepInfo);
            this.listenTo(this.model, "change:puzzle", this.updateStepInfo);
        },

        updateStepInfo: function() {
            var curr = this.model.get("currentStep");
            if (curr === -1) {
                this.$el.html("Beginning");
            } else {
                var puzzle = this.model.get("puzzle");
                var total = puzzle.solution_steps.length;
                var comment = puzzle.solution_steps[curr].type;

                this.$el.html("Step " + (curr + 1) + " / " + total + "<br /><br />" + comment);
            }
        },

        render: function() {
            this.$el.empty();
            this.updateStepInfo();
            return this;
        }
    });

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

    var SquareView = Backbone.View.extend({
        tagName: "div",

        className: "GriddlerSquare",

        initialize: function() {
            this.setType("unknown");
        },

        render: function() {
            return this;
        },

        setText: function(text) {
            this.$el.text(text);
        },

        setType: function(type) {
            this.$el.removeClass();
            this.$el.addClass("GriddlerSquare");

            if (type === "hint") {
                this.$el.addClass("GriddlerHintSquare");
            } else if (type === "outOfPlay") {
                this.$el.addClass("GriddlerOutOfPlaySquare");
            } else if (type === "unknown") {
                this.$el.addClass("GriddlerUnknownSquare");
            } else if (type === "empty") {
                this.$el.addClass("GriddlerEmptySquare");
            } else if (type === "filled") {
                this.$el.addClass("GriddlerFilledSquare");
            }
        }
    });

    var GriddlerView = Backbone.View.extend({
        tagName: "div",

        className: "GriddlerView",

        initialize: function() {
            this.listenTo(this.model, "change:currentStep", this.updateBoard);
            //TODO: support this event
            //this.listenTo(this.model, "change:puzzle", this.updateBoard);

            var puzzle = this.model.get("puzzle");
            this.maxColHints = lengthOfLongestContainedArray(puzzle.cols);
            this.maxRowHints = lengthOfLongestContainedArray(puzzle.rows);
            var totalRows = this.maxColHints + puzzle.rows.length;
            var totalCols = this.maxRowHints + puzzle.cols.length;

            this.squares = [];
            this.squares.length = totalRows;
            for (var r = 0; r < totalRows; ++r) {
                var row = [];
                row.length = totalCols;
                for (var c = 0; c < totalCols; ++c) {
                    row[c] = this.createSquare(r, c, puzzle);
                }
                this.squares[r] = row;
            }
        },

        createSquare: function(row, col, opts) {
            var square = new SquareView();
            if (row < this.maxColHints && col < this.maxRowHints) {
                square.setType("outOfPlay");
            } else if (col < this.maxRowHints) {
                square.setType("hint");
                var hintRowIndex = row - this.maxColHints;
                var hintColIndex = col - (this.maxRowHints - opts.rows[hintRowIndex].length);
                square.setText(opts.rows[hintRowIndex][hintColIndex]);
            } else if (row < this.maxColHints) {
                square.setType("hint");
                var hintRowIndex = col - this.maxRowHints;
                var hintColIndex = row - (this.maxColHints - opts.cols[hintRowIndex].length);
                square.setText(opts.cols[hintRowIndex][hintColIndex]);
            } else {
                square.setType("unknown");
            }

            return square;
        },

        updateBoard: function() {
            for (var r = this.maxColHints; r < this.squares.length; ++r) {
                for (var c = this.maxRowHints; c < this.squares[r].length; ++c) {
                    this.squares[r][c].setType("unknown");
                }
            }

            var currentStep = this.model.get("currentStep");
            if (currentStep === -1) {
                return;
            }

            var puzzle = this.model.get("puzzle");

            for (var i = 0; i <= currentStep; ++i) {
                var step = puzzle.solution_steps[i];
                this.applyStep(step);
            }
        },

        applyStep: function(step) {
            var self = this;
            var puzzle = this.model.get("puzzle");
            step.newvals.forEach(function(newval) {
                var squareIndex = newval[0];
                var squareRow = ~~(squareIndex / puzzle.cols.length);
                var squareCol = squareIndex % puzzle.cols.length;
                var squareValue = newval[1][0];

                squareRow += self.maxColHints;
                squareCol += self.maxRowHints;

                var type;
                if (squareValue === 0) {
                    type = "empty";
                } else if (squareValue === 1) {
                    type = "filled";
                }

                self.squares[squareRow][squareCol].setType(type);
            });
        },

        render: function() {
            this.$el.empty();

            for (var r = 0; r < this.squares.length; ++r) {
                var row = $(document.createElement("div"));
                row.addClass("GriddlerRow");

                for (var c = 0; c < this.squares[r].length; ++c) {
                    row.append(this.squares[r][c].render().$el);
                }

                this.$el.append(row);
            }

            this.updateBoard();

            return this;
        }
    });

    exports.GriddlerView = GriddlerView;
    exports.PageView = PageView;
})(window);

