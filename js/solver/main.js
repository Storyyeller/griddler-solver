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

// Note: this code assumes that Object.prototype is empty.

// The overall design is based on representing the puzzle as a constraint satisfaction problem
// and solving it via constraint propagation. However, it uses a domain specific representation
// for efficiency.
// There is a node for each cell in the puzzle with val representing the cell color
// and a node for each gap (white space between two fixed length black spaces) with val
// representing the position and length. It is necessary to use gaps rather than the black marks
// themselves since individual black marks don't contain the information required to see which
// cells are white (it is necessary to know the values of a pair of adjacent marks).
// There are cell <-> gap constraints representing color assignment as well as
// gap <-> gap constraints to assure adjacent gaps have compatible values
// The basic solver uses arc consistency, explained to the user as "line logic", seen in basesolver.js
// Line logic alone can solve the majority of puzzles, but it also has "reverse line logic" which
// augments the puzzle with extra nodes that reflect the constraint that any given cell must be
// covered by at least one gap in a given row or column. This does not add any constraints to the
// puzzle in the sense of reducing the solution space (which would be incorrect), but it does
// help propagate information that can't be found via arc consistency without the overhead of
// full path consistency
// The next step is "edge logic" which is a limited form of path consistency implemented in solver.js
// the goal of this is to solve the vast majority (around 97% in practice) of puzzles created for
// humans without the performance overhead of true path consistency.
// It works by temporarily performing path consistency between gaps in adjacent rows or columns and
// seeing if this allows the pruning of any gap values. It does not store the actual path constraints

// TODO:
// * add error reporting in case we're given a puzzle with no solutions
// * add brute force fallbacks so we can theoretically solve any puzzle. This will not yield steps
//		that can usefully be displayed to the user however
// * add support for multicolor and hidden clue puzzles. Our puzzle representation and solver already
//		supports this, however the puzzle creation code does not. It will need to be rewritten to set
//		up all the constraints correctly

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