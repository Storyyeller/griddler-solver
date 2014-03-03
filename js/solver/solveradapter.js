(function(exports) {
    var SolverAdapter = {};

    SolverAdapter.solve = function(puzzle, callbacks) {
        var worker = new Worker("js/solver/solver.js");
        worker.addEventListener("message", function (e) {
            var msg = e.data;
            callbacks[msg.type + "cb"](msg.data);
        }, false);
        worker.postMessage(puzzle);
    };

    exports.SolverAdapter = SolverAdapter;
})(window);