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

importScripts('basesolver.js');
var processRowSingle = function(gaps, grid_row, tc, r, sizes) {
    var C = grid_row.length, k = sizes.length;
    var gnode = new GapNode(gaps.length, [tc, r, 0]);
    gaps.push(gnode);

    if (k === 0) { //whole row empty
        var forbid = [];
        for(var p=0; p<C; ++p) {
            grid_row[p].forbidden[1].push(makePair(gnode.ind, 0));
            forbid.push(makePair(grid_row[p].ind, 1));
        }

        gnode.vals.push(0);
        gnode.forbidden.push(forbid);
        gnode.adj_forbidden.push([]);
        // gnode.val_data.push([0,C]);
    } else if (k === 1) { //single mark
        var size = sizes[0];

        for(var s=0; s<=C-size; ++s) {
            var key_ind = gnode.vals.length;
            var forbid = [];

            var forbidPair = function(p, cv) {
                assert(gnode.ind < gaps.length);

                var cell = grid_row[p];
                forbid.push(makePair(cell.ind, cv));
                cell.forbidden[cv].push(makePair(gnode.ind, key_ind));
            };

            //find which cell values are implied by this gap position
            for(var p=s; p<s+size; ++p) {forbidPair(p, 0);}
            for(var p=0; p<s; ++p) {forbidPair(p, 1);}
            for(var p=s+size; p<C; ++p) {forbidPair(p, 1);}
            gnode.vals.push(key_ind)
            gnode.forbidden.push(forbid);
            gnode.adj_forbidden.push([]);
            // gnode.val_data.push([0,s,s+size,C]);
            assert(gnode.vals.length === gnode.forbidden.length);
        }
        // postMessage(gnode.key_data + " vals " + JSON.stringify(gnode.val_data));
    }
};

var processRow = function(gaps, grid_row, tc, r, sizes) {
    var C = grid_row.length, k = sizes.length;
    if (k <= 1) {return processRowSingle(gaps, grid_row, tc, r, sizes);}

    var gn_offset = gaps.length;
    for(var i=1; i < k; ++i) {
        var gnode = new GapNode(gaps.length, [tc, r, i]);
        gaps.push(gnode);

        var smin = sum(sizes.slice(0,i)) + i-1;
        var emax = C - (sum(sizes.slice(i,k)) + k-i-1);

        for(var s=smin; s<emax; ++s){
            for(var e=s+1; e<=emax; ++e){
                var key_ind = gnode.vals.length;
                var forbid = [];

                var forbidPair = function(p, cv) {
                    assert(gnode.ind < gaps.length);

                    var cell = grid_row[p];
                    forbid.push(makePair(cell.ind, cv));
                    cell.forbidden[cv].push(makePair(gnode.ind, key_ind));
                    // postMessage("pr" + gnode.ind + " " + cell.ind);
                };

                //find which cell values are implied by this gap position
                for(var p=s; p<e; ++p) {forbidPair(p, 1);}
                for(var p=s-sizes[i-1]; p<s; ++p) {forbidPair(p, 0);}
                for(var p=e; p<e+sizes[i]; ++p) {forbidPair(p, 0);}
                if (i === 1){
                    for(var p=0; p<s-sizes[i-1]; ++p) {forbidPair(p, 1);}
                }
                if (i === k-1){
                    for(var p=e+sizes[i]; p<C; ++p) {forbidPair(p, 1);}
                }

                gnode.vals.push(key_ind);
                gnode.forbidden.push(forbid);
                // gnode.val_data.push([s,e]);
                gnode.val_edges.push([s, e]);
                gnode.adj_forbidden.push([]);
                assert(gnode.vals.length === gnode.forbidden.length);
            }
        }
    }

    // adjacency constraints
    for(var i=1; i < k-1; ++i){
        var left = gaps[gn_offset+i-1], right = gaps[gn_offset+i];
        var size = sizes[i];

        for(var xi=0; xi < left.vals.length; ++xi){
            for(var yi=0; yi < right.vals.length; ++yi){
                if (left.val_edges[xi][1] + size !== right.val_edges[yi][0]) {
                    left.adj_forbidden[xi].push(makePair(right.ind, yi));
                    right.adj_forbidden[yi].push(makePair(left.ind, xi));
                }
            }
        }
    }
};

var createPuzzle = function(data) {
    var rows = data.rows, cols = data.cols, grid = data.grid;
    var R = rows.length, C = cols.length;

    assert(R <= 255 && C <= 255);
    assert(grid === null || grid.length === R*C);

    var cells = new Array(R*C), cells_colview = new Array(R*C);
    for(var i=0; i<R*C; ++i) {
        var row = i/C|0, col = i%C;

        var node = cells[i] = new CellNode(i, [row, col]);
        cells_colview[col*R + row] = node;
        node.vals = [0, 1];
        node.forbidden = [[], []];
    }

    var gaps = [];
    for(var i=0; i<R; ++i) {
        var grid_row = cells.slice(i*C, i*C+C);
        processRow(gaps, grid_row, 'r', i, rows[i]);
    }
    for(var i=0; i<C; ++i) {
        var grid_row = cells_colview.slice(i*R, i*R+R);
        processRow(gaps, grid_row, 'c', i, cols[i]);
    }

    //make sure everything is sorted so binary search is possible
    for(var i=0; i<cells.length; i++) {
        var node = cells[i];
        for (var i2=0; i2<node.forbidden.length; ++i2) {sort(node.forbidden[i2]);}
    }
    for(var i=0; i<gaps.length; i++) {
        var node = gaps[i];
        for (var i2=0; i2<node.forbidden.length; ++i2) {sort(node.forbidden[i2]);}
        for (var i2=0; i2<node.adj_forbidden.length; ++i2) {sort(node.adj_forbidden[i2]);}
    }


    var puz = new Puzzle(R, C, cells, gaps);
    if (grid !== null){
        for(var i=0; i<R*C; ++i){
            if (grid[i] & 1 === 0) {puz.pruneCell(makePair(i, 0));}
            if (grid[i] & 2 === 0) {puz.pruneCell(makePair(i, 1));}
        }
    }
    return puz;
};

self.onmessage = function (oEvent) {
    var t0 = Date.now();
    var puz = createPuzzle(oEvent.data);
    puz.solve(postMessage, t0);
    self.close();
};