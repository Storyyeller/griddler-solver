(function(exports) {
    exports.GriddlerModel = Backbone.Model.extend({
        defaults: function() {
            return {
                currentStep: -1,
                puzzle: null,
                solveTime: -1,
                /* Possible solve states:
                    "solveNotStarted"
                    "solveInProgress"
                    "solveCompleted"
                    "solveAborted"
                    "solveFailed"
                 */
                solveState: "solveNotStarted"
            };
        },

        solve: function() {
            if (this.worker) {
                throw new Error("puzzle is already being solved");
            }

            var p = this.get("puzzle");
            if (!p.solution_steps) {
                p.solution_steps = [];
            } else {
                p.solution_steps.length = 0;
                this.trigger("stepsChanged");
            }

            var self = this;
            this.worker = new Worker("js/solver/main.js");
            this.worker.addEventListener("message", function(evt) {
                if (evt.data.type === "done") {
                    self._cleanupSolve();
                    self._insertSolutionIntoPuzzle();
                    self.set("solveState", "solveCompleted");
                } else if (evt.data.type === "error") {
                    self._cleanupSolve();
                    self.set("solveState", "solveFailed");
                } else if (evt.data.type === "step") {
                    p.solution_steps.push(evt.data.data);
                    self.trigger("stepsChanged");
                }
            }, false);

            this.set("solveTime", 0);
            this.set("solveState", "solveInProgress");
            this.timer = setInterval(function() {
                self.set("solveTime", self.get("solveTime") + 1);
            }, 1000);
            this.worker.postMessage(p);
        },

        _insertSolutionIntoPuzzle: function() {
            var p = this.get("puzzle");

            var solutionArray = new Array(p.rows.length);
            for (var i = 0; i < solutionArray.length; ++i) {
                solutionArray[i] = new Array(p.cols.length);
            }

            p.solution_steps.forEach(function(step) {
                step.newvals.forEach(function(newval) {
                    var squareIndex = newval[0];
                    var squareRow = ~~(squareIndex / p.cols.length);
                    var squareCol = squareIndex % p.cols.length;
                    var squareValue = newval[1][0];
                    solutionArray[squareRow][squareCol] = squareValue;
                });
            });

            /* overwrite existing solution */
            p.solution = solutionArray;
        },

        _cleanupSolve: function() {
            if (this.worker) {
                this.worker.terminate();
                this.worker = null;
                clearInterval(this.timer);
            }
        },

        abortSolving: function() {
            if (this.worker) {
                this._cleanupSolve();
                this.set("solveState", "solveAborted");
            }
        }
    });
})(window);
