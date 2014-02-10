(function(exports) {
    var SolverAdapter = {};

    SolverAdapter.solve = function(puzzle, timeout, callback) {
        var steps = [];
        var worker = new Worker("js/solver/solver.js");
        worker.addEventListener("message", function (e) {
            steps.push(e.data);
        }, false);
        worker.postMessage(puzzle);

        setTimeout(function(evt) {
            worker.terminate();
            if (steps.length) {
                puzzle.solution_steps = steps;
            }
            callback(puzzle);
        }, timeout);
    };

    exports.SolverAdapter = SolverAdapter;
})(window);