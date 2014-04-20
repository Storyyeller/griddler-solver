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
                solveState: "solveNotStarted",
                identifier: null,
                /* Possible square sizes:
                    "small",
                    "medium",
                    "large"
                 */
                squareSize: "medium",
                orderingValue: 0
            };
        },

        solve: function() {
            if (this.worker) {
                throw new Error("puzzle is already being solved");
            }

            this.set("currentStep", -1);

            var p = this.get("puzzle");
            if (!p.solution_steps) {
                p.solution_steps = [];
            } else {
                p.solution_steps.length = 0;
                this.trigger("stepsChanged");
            }

            this.worker = new Worker("js/solver/main.js");

            //TODO: do something useful on this event
            this.worker.addEventListener("error", function(evt) {
                console.log("A solver error occurred!!!");
            });

            var self = this;
            this.worker.addEventListener("message", function(evt) {
                if (evt.data.type === "done") {
                    self._cleanupSolve(true);
                    self._insertSolutionIntoPuzzle();
                    self.set("solveState", "solveCompleted");
                } else if (evt.data.type === "error") {
                    self._cleanupSolve(true);
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

        _cleanupSolve: function(workerAlreadyTerminated) {
            if (this.worker) {
                /* worker.terminate() SOMETIMES fails on Firefox if the worker has already been terminated.
                 * By fails, I mean no error is reported, the call does nothing, and code STOPS EXECUTING.
                 * Therefore, we have to check if the worker is already terminated before making the call. */
                if (!workerAlreadyTerminated) {
                    this.worker.terminate();
                }
                this.worker = null;
                clearInterval(this.timer);
            }
        },

        abortSolving: function() {
            if (this.worker) {
                this._cleanupSolve(false);
                this.set("solveState", "solveAborted");
            }
        }
    });
})(window);
