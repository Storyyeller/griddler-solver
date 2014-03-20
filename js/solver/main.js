"use strict";

// Public API
// Input:
// puzzle = {rows, cols, grid}
// where rows and cols are arrays of arrays giving the clues for each row and column
// and grid is the partially solved puzzle to start from, or null if nothing is filled in yet
// grid should be an R*C length array giving the bitmask of allowable values for square r*C+c
// with 1 = white, 2 = black, and 3 = unknown (white or black)
// There is currently no error handling, so the puzzle must be solveable

// Output:
// message of form {type, data} with type = "step", "done", or "error"
// step data of the form {type, newvals}
// type a string describing the logic type
// newvals is array of [square, [vals]] pairs with white = 0 and black = 1
// For example, to show that square 58 and 60 are known to be white, it would send
// {type:"step", data:{type:"line logic", newvals:[[58, [0]], [60, [0]]]}}

importScripts('createpuzzle.js');
self.onmessage = function (oEvent) {
    // try {
        var t0 = Date.now();
        var puz = createPuzzle(oEvent.data, postMessage);
        puz.solve(t0);
        self.close();
    // }
    // catch (e) {
    //    console.log(e.stack);
    // }
};