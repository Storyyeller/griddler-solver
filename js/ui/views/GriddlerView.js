(function(exports) {
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
                container.text(container.text() + " ... solve aborted");
            } else if (solveState === "solveFailed") {
                container.text(container.text() + " ... failed");
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
            } else {
                stepComment = puzzle.solution_steps[currentStep].type;
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
            var metadataPopover = new GSPopover(metadataTriggerElement, metadataPopoverElement);

//            var stepMoreInfoTriggerElement = this.$el.find(".step-more-info-popover-trigger");
//            var stepMoreInfoPopoverElement = this.$el.find(".step-more-info-popover");
//            var stepMoreInfoPopover = new GSPopover(stepMoreInfoTriggerElement, stepMoreInfoPopoverElement);

            this.updateState();
            this.updateTime();
            this.delegateEvents();

            return this;
        }
    });
})(window);