(function(exports) {

    /**
     * A view containing a Griddler, the buttons for stepping through it, all the step information,
     * the filename, the metadata, etc. Essentially, this view contains the Griddler board plus
     * all of its surrounding information.
     */
    exports.GriddlerView = Backbone.View.extend({
        tagName: "div",

        className: "griddler",

        events: {
            "click .next": "changeStep",
            "click .previous": "changeStep",
            "click .jumpBeginning": "changeStep",
            "click .jumpEnd": "changeStep",
            "change .squareSizeSelect": "changeSquareSize",
            "click .restart-solver-link": "restartSolver"
        },

        sanitizedLogicTypes: {
            "line logic" : "Line Logic",
            "reverse line logic": "Reverse Line Logic",
            "edge logic": "Edge Logic"
        },

        logicExplanations: {
            "line logic": "Line logic keeps track of the minimum and maximum length of space that any run of black and white squares can exist in. It uses this information to fill in squares that we know must be filled given the minimum or maximum amount of space in which that run can occur."
            , "reverse line logic": "Reverse line logic keeps track of, for every unknown cell, all of the gaps in that cell's row or column that can cause the cell to be a specific color. In the finished puzzle, every cell is part of at least one gap, so there must be at least one gap along the row and at least one along the column. If there are no gaps remaining that can cause a cell to be a specific color, that color is removed.<br /><br />This most commonly results in filling in white squares next to an existing black square. For example, say you have a row that consists only of one black square, while all the clues are 1s. You don't know which specific clue that black square corresponds to, so forward line logic won't help. However, you do know that no matter which clue it is, the squares next to it will still be white and hence can be filled in."
            , "edge logic": "Edge logic considers a pair of adjacent rows (or columns), usually but not necessarily on the edge of the puzzle. Say we're considering row 1 and row 2.<br /><br />For each pair of adjacent unknown cells, we can tell which pairs of colors are possible by examining the gaps on the intersecting columns. In some cases, one cell implies a value in the other. For each gap position in row 1, all of the implied cells in row 2 are calculated. If there is any gap in row 2 which has no possible values after this assignment, then the position for gap 1 can be ruled out."
        },

        initialize: function() {
            this.boardView = new BoardView({
                model: this.model
            });
            this.listenTo(this.model, "change:currentStep", this.updateState);
            this.listenTo(this.model, "stepsChanged", this.updateState);
            this.listenTo(this.model, "change:solveTime", this.updateTime);
            this.listenTo(this.model, "change:solveState", this.updateStepInfoState);
            this.listenTo(this.model, "change:solveState", this.updateTime);
            this.listenTo(this.model, "change:squareSize", this.updateSettings);
        },

        restartSolver: function() {
            this.model.solve();
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

        changeSquareSize: function(evt) {
            var selected = $(evt.target).val();
            this.model.set("squareSize", selected);
        },

        updateTime: function() {
            var container = this.$el.find("#solveTime");
            var time = this.model.get("solveTime");

            if (time === -1) {
                container.text("Solve not started");
            } else {
                var min = ~~(time / 60);
                var sec = time % 60;

                if (min === 0) {
                    container.text(sec + " sec");
                } else {
                    if (sec < 10) {
                        sec = "0" + sec;
                    }
                    container.text(min + ":" + sec + " min");
                }
            }

            var solveState = this.model.get("solveState");
            if (solveState === "solveCompleted") {
                container.text(container.text() + " ... done!");
            } else if (solveState === "solveAborted") {
                container.text(container.text() + " ... aborted!");
            } else if (solveState === "solveFailed") {
                container.text(container.text() + " ... failed!");
            }
        },

        updateState: function() {
            this.updateButtonState();
            this.updateStepInfoState();
            this.updateSettings();
        },

        updateSettings: function() {
            this.$el.find(".squareSizeSelect").val(this.model.get("squareSize"));
        },

        updateButtonState: function() {
            var puzzle = this.model.get("puzzle");
            var solutionDoesntExist = !puzzle.solution_steps;
            var currentStep = this.model.get("currentStep");
            this.prevBtn[0].disabled = solutionDoesntExist || (currentStep === -1);
            this.nextBtn[0].disabled = solutionDoesntExist || (currentStep === puzzle.solution_steps.length - 1);
            this.jumpBeginningBtn[0].disabled = this.prevBtn[0].disabled;
            this.jumpEndBtn[0].disabled = this.nextBtn[0].disabled;
        },

        updateStepInfoState: function() {
            var puzzle = this.model.get("puzzle");
            var currentStep = this.model.get("currentStep");
            var progressText, stepComment;

            if (!puzzle.solution_steps) {
                progressText = "Initializing solver";
            } else {
                progressText = "Step " + (currentStep + 1) + " / " + puzzle.solution_steps.length;
            }

            if (currentStep === -1) {
                stepComment = "";
                $(".step-more-info-popover-trigger").hide();
            } else {
                var logicType = puzzle.solution_steps[currentStep].type;

                stepComment = this.sanitizedLogicTypes[logicType];
                this.stepMoreInfoPopoverElement.html(this.logicExplanations[logicType]);

                $(".step-more-info-popover-trigger").show();
            }

            this.$el.find("#currentStep").text(progressText);
            this.$el.find(".step-logic-type").text(stepComment);

            var solveState = this.model.get("solveState");
            if (solveState === "solveFailed" || solveState === "solveAborted") {
                this.$el.find(".restart-solver-container").css("display", "inline");
            } else {
                this.$el.find(".restart-solver-container").css("display", "none");
            }
        },

        render: function() {
            var templateFunction = TemplateLoader.get("Griddler");
            var html = templateFunction({puzzle: this.model.get("puzzle"), identifier: this.model.get("identifier")});
            this.$el.html(html);
            this.$el.find(".board-container").append(this.boardView.$el);
            this.boardView.render();

            this.prevBtn = this.$el.find(".previous");
            this.nextBtn = this.$el.find(".next");
            this.jumpBeginningBtn = this.$el.find(".jumpBeginning");
            this.jumpEndBtn = this.$el.find(".jumpEnd");

            var layoutOptions = {
                applyDefaultStyles: false,
                defaults: {
                    spacing_open: 0,
                    spacing_closed: 0
                }
            };

            this.$el.layout(layoutOptions);

            var metadataTriggerElement = this.$el.find(".metadata-popover-trigger");
            var metadataPopoverElement = this.$el.find(".metadata-popover");
            var metadataPopover = new GSPopover(metadataTriggerElement, metadataPopoverElement, false, false);

            this.stepMoreInfoTriggerElement = this.$el.find(".step-more-info-popover-trigger");
            this.stepMoreInfoPopoverElement = this.$el.find(".step-more-info-popover");
            var stepMoreInfoPopover = new GSPopover(this.stepMoreInfoTriggerElement, this.stepMoreInfoPopoverElement, false, true);

            this.updateState();
            this.updateTime();
            this.delegateEvents();

            return this;
        }
    });
})(window);