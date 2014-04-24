(function(exports) {
    /**
     * A GriddlerModel represents a raw puzzle object and its view state.  Instances of this class
     * are displayed by the UI. UI classes should listen for changes in the properties described
     * below.
     *
     * This class also emits the following events:
     *      "stepsChanged" - whenever the solution_steps array changes (no data is sent with this event)
     */
    exports.GriddlerModel = Backbone.Model.extend({
        defaults: function() {
            return {
                /**
                 * The current solution step index being displayed. -1 means show the default board
                 * without any steps applied (i.e., all squares are unknown).
                 *
                 * This property may be read and written to.
                 *
                 * @type {number} (integer)
                 */
                currentStep: -1,

                /**
                 * The raw puzzle object to encapsulate
                 *
                 * This property should be treated as READ-ONLY.
                 *
                 * @type {object}
                 */
                puzzle: null,

                /**
                 * The amount of time (in seconds) it took to solve the puzzle. -1 means the puzzle
                 * hasn't been solved yet.
                 *
                 * This property should be treated as READ-ONLY. It will be set internally by this
                 * class. Just listen for changes.
                 *
                 * @type {number} integer
                 */
                solveTime: -1,

                /**
                 * Possible solve states:
                 *  "solveNotStarted"
                 *  "solveInProgress"
                 *  "solveCompleted"
                 *  "solveAborted" - e.g., user navigates away from page while solve is in progress
                 *  "solveFailed"
                 *
                 * This property should be treated as READ-ONLY. It will be set internally by this
                 * class. Just listen for changes.
                 *
                 *  @type {string}
                 */
                solveState: "solveNotStarted",

                /**
                 * A name for this puzzle. For local files, this is usually the filename. For
                 * scraped puzzles, this is usually "<website> <puzzleId>" (example: "webpbn 2")
                 *
                 * This property may be read and written to.
                 *
                 * @type {string}
                 */
                identifier: null,

                /**
                 * Possible square sizes:
                 *  "small",
                 *  "medium",
                 *  "large"
                 *
                 * This property may be read and written to.
                 *
                 *  @type {string}
                 */
                squareSize: "medium",

                /**
                 * Represents where in the recents list this puzzle should appear. The GriddlerModel
                 * with the highest ordering value is displayed at the top.
                 *
                 * This property may be read and written to.
                 *
                 * @type {number}
                 */
                orderingValue: 0
            };
        },

        /**
         * Begins solving this griddler. Any existing solution steps will be deleted. When the solve
         * is complete, the solution will be inserted into the raw puzzle object.
         */
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

            var self = this;

            this.worker.addEventListener("error", function(evt) {
                self._cleanupSolve(true);
                self.set("solveState", "solveFailed");
            });

            this.worker.addEventListener("message", function(evt) {
                if (evt.data.type === "done") {
                    self._cleanupSolve(true);
                    if (evt.data.data.solved) {
                        self._insertSolutionIntoPuzzle();
                        self.set("solveState", "solveCompleted");
                    } else {
                        self.set("solveState", "solveFailed");
                    }
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

        /**
         * Stops the solver if it is currently in progress. If it isn't in progress, this function
         * does nothing.
         */
        abortSolving: function() {
            if (this.worker) {
                this._cleanupSolve(false);
                this.set("solveState", "solveAborted");
            }
        },

        /**
         * Inserts the solution as a 2D array into the raw puzzle object.
         *
         * @private
         */
        _insertSolutionIntoPuzzle: function() {
            var p = this.get("puzzle");

            var solutionArray = new Array(p.rows.length);
            for (var i = 0; i < solutionArray.length; ++i) {
                solutionArray[i] = new Array(p.cols.length);
            }

            p.solution_steps.forEach(function(step) {
                step.newvals.forEach(function(newval) {
                    var squareIndex = newval[0];
                    var squareRow = ~~(squareIndex / p.cols.length); //~~ casts to an integer
                    var squareCol = squareIndex % p.cols.length;
                    var squareValue = newval[1][0];
                    solutionArray[squareRow][squareCol] = squareValue;
                });
            });

            /* overwrite existing solution */
            p.solution = solutionArray;
        },

        /**
         * Cleans up after a solve has been completed.
         *
         * @private
         *
         * @param {boolean} workerAlreadyTerminated Whether the worker was naturally terminated.
         *      If the solve completed successfully or the worker encountered an error, it terminates
         *      automatically, so this parameter should be true. See the comment inside the function
         *      for why this parameter is needed.
         *
         */
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
        }
    });
})(window);
