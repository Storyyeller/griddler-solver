"use strict";

//usage
// var worker = new Worker('solver.js');
// worker.addEventListener('message', function(e) {
//   console.log('Worker said: ', e.data);
// }, false);
// worker.addEventListener('error', function(e) {
//   console.log('Worker error: ', e.lineno, ' ', e.message);
// }, false);
// worker.postMessage(puzzle);

// Public API
// Input:
// puzzle = {rows, cols, grid}
// where rows and cols are arrays of arrays giving the clues for each row and column
// and grid is the partially solved puzzle to start from, or null if nothing is filled in yet
// grid should be an R*C length array giving the bitmask of allowable values for square r*C+c
// with 1 = white, 2 = black, and 3 = unknown (white or black)
// There is currently no error handling, so the puzzle must be solveable

// Output:
// steps of the form {type, newvals}
// type a string describing the logic type
// newvals is array of [square, [vals]] pairs with white = 0 and black = 1
// For example, to show that square 58 and 60 are known to be white, it would send newvals:[[58, [0]], [60, [0]]]

var solver = function() {
    var _add = function(a,b) {return a+b;};
    var sum = function(seq) {return seq.reduce(_add, 0);};

    var discard = function(arr, x) {
        var arr_ind = arr.indexOf(x);
        if (arr_ind !== -1) {arr.splice(arr_ind, 1);}
        return arr_ind !== -1;
    };

    // var assert = console.assert;
    var assert = function(x) {if (!x) {undefined.x;};};
    var hWord = function(x) {return (x >>> 16) & 0xFFFF;};
    var lWord = function(x) {return x & 0xFFFF;};
    var makePair = function(x, y) {return (x << 16) | y;};

    var IntrusiveQueue = function(vals) {
        this.q = [];
        vals = vals || [];
        for(var i=0; i<vals.length; ++i) {this.push(vals[i]);}
    };
    IntrusiveQueue.prototype.nonempty = function() {return this.q.length > 0;};
    IntrusiveQueue.prototype.pop = function() {
        this.q[0].inqueue = false;
        return this.q.shift();
    };
    IntrusiveQueue.prototype.push = function(x) {
        if (x.inqueue === false) {
            this.q.push(x);
            x.inqueue = true;
        }
    };

    var intersectForbidden = function(vals, forbidden) {
        assert(vals.length > 0);
        var forbids = vals.map(function(i) {return forbidden[i];});
        var cur = forbids[0];
        for (var i=1; i<forbids.length; ++i) {
            cur = cur.filter(function(x) {return forbids[i].indexOf(x) !== -1;});
        }
        return cur;
    };


    var CellNode = function(ind, key_data) {
        this.ind = ind;
        this.key_data = key_data;
        this.vals = [];
        this.forbidden = []; //val -> [pairs]
        this.inqueue = false;
    };
    CellNode.prototype.update = function(puz) {
        // postMessage("Updating cell " + this.key_data);
        // if (this.vals.length === 0) {postMessage(this.key_data + " ncs " + this.vals);}
        intersectForbidden(this.vals, this.forbidden).forEach(puz.pruneGap, puz);
    };


    var GapNode = function(ind, key_data) {
        this.ind = ind;
        this.key_data = key_data;
        this.vals = [];
        this.forbidden = []; //val -> [pairs]
        // this.val_data = []; //for debugging
        this.val_edges = [];
        this.adj_forbidden = [];
        this.inqueue = false;
    };
    GapNode.prototype.update = function(puz) {
        // postMessage("Updating gap " + this.key_data);
        // if (this.vals.length === 0) {postMessage(this.key_data + " ngs " + this.vals);}
        intersectForbidden(this.vals, this.forbidden).forEach(puz.pruneCell, puz);
        intersectForbidden(this.vals, this.adj_forbidden).forEach(puz.pruneGap, puz);
    };

    var RevCellNode = function(key_data, cpair, choices) {
        this.key_data = key_data;
        this.cpair = cpair;
        this.choices = choices;
        this.inqueue = false;
    };
    RevCellNode.prototype.update = function(puz) {
        this.choices = this.choices.filter(function(p) {return puz.gaps[hWord(p)].vals.indexOf(lWord(p)) !== -1;});
        if (this.choices.length === 0) {
            puz.pruneCell(this.cpair);
        }
    };

    var Puzzle = function(R, C, cells, gaps) {
        this.R = R; this.C = C; this.cells = cells; this.gaps = gaps;

        this.cellQ = new IntrusiveQueue(cells);
        this.gapQ = new IntrusiveQueue(gaps);
        this.revQ = new IntrusiveQueue();

        this.newcell_prunes = [];
    };
    Puzzle.prototype.pruneCell = function(pair) {
        var node_ind = hWord(pair), val = lWord(pair);
        var node = this.cells[node_ind];

        if (discard(node.vals, val)) {
            this.cellQ.push(node);
            this.newcell_prunes.push([node.ind, node.vals]);
            // postMessage("\tpruned " + node.key_data + " " + val);
        }
    };
    Puzzle.prototype.pruneGap = function(pair) {
        var node_ind = hWord(pair), val = lWord(pair);
        var node = this.gaps[node_ind];
        if (discard(node.vals, val)) {
            this.gapQ.push(node);
            // postMessage("\tpruned " + node.key_data + " " + node.val_data[val]);
        }
    };
    Puzzle.prototype.checkYield = function(msg_type, callback) {
        if (this.newcell_prunes.length > 0) {
            var msg = {type:msg_type, newvals:this.newcell_prunes};
            callback(msg);
            this.newcell_prunes = [];
        }

    }
    Puzzle.prototype.simplify = function(callback) {
        while(this.cellQ.nonempty() || this.gapQ.nonempty() || this.revQ.nonempty()){
            if (this.cellQ.nonempty()) {
                this.cellQ.pop().update(this);
            }

            if (this.gapQ.nonempty()) {
                this.gapQ.pop().update(this);
                this.checkYield('line logic', callback);
            }

            if (this.revQ.nonempty()) {
                this.revQ.pop().update(this);
                this.checkYield('reverse line logic', callback);
            }
            // postMessage(printSolution(this));
        }
    };
    Puzzle.prototype.createReverseNodes = function () {
        //create lists
        var lists = {'r':[], 'c':[]};
        var cinds = [];
        for(var i=0; i<this.cells.length; ++i) {
            for (var cv=0; cv<=1; ++cv) {
                pair = makePair(i, cv);
                lists['r'][pair] = [];
                lists['c'][pair] = [];
                cinds.push(pair)
            }
        }

        for(var i=0; i<this.gaps.length; ++i) {
            var gnode = this.gaps[i];
            var list = lists[gnode.key_data[0]];
            for (var vi=0; vi<gnode.vals.length; ++vi) {
                var val = gnode.vals[vi];
                var pair = makePair(i, val);
                var forbid = gnode.forbidden[val];
                for (var vi2=0; vi2<forbid.length; ++vi2) {
                    list[forbid[vi2]].push(pair);
                }
            }
        }

        var revnodes = [];
        for(var i=0; i<cinds.length; ++i) {
            var cpair = cinds[i];
            var cnode = this.cells[hWord(cpair)];
            if (cnode.vals.indexOf(lWord(cpair)) === -1) {continue;}

            revnodes.push(new RevCellNode(['r', cnode.key_data], cpair^1, lists['r'][cpair]));
            revnodes.push(new RevCellNode(['c', cnode.key_data], cpair^1, lists['c'][cpair]));
        }
        this.revQ = new IntrusiveQueue(revnodes);
        // postMessage(revnodes.length + " rnodes created");
    };
    Puzzle.prototype.solve = function(callback) {
        this.simplify(callback);
        this.createReverseNodes();
        this.simplify(callback);
    };

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

        var puz = new Puzzle(R, C, cells, gaps);
        if (grid !== null){
            for(var i=0; i<R*C; ++i){
                if (grid[i] & 1 === 0) {puz.pruneCell(makePair(i, 0));}
                if (grid[i] & 2 === 0) {puz.pruneCell(makePair(i, 1));}
            }
        }
        return puz;
    };

    return {
        createPuzzle:createPuzzle
    };
}();

onmessage = function (oEvent) {
    var puz = solver.createPuzzle(oEvent.data);
    puz.solve(postMessage);
};