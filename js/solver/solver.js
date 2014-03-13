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

var CellPairNode = function(cell1, cell2) {
    this.cell_ind1 = cell1.ind;
    this.cell_ind2 = cell2.ind;

    this.rnodes1 = []; //val1 -> rnode
    this.rnodes2 = []; //val2 -> rnode
    this.mywatches = {}; // valpair -> watched gpair
    this.listeners = {}; // valpair -> list of nodes

    this.inqueue = false;
};
CellPairNode.prototype.isValid = function(vpair) {
    return vpair in this.mywatches;
};
CellPairNode.prototype.update = function(epuz, puz) {
    var watches = this.mywatches;

    for(var pair in watches) {
        assert(typeof watches[pair] === "number");
        if (puz.checkGap(watches[pair])) {continue;} //watch still valid

        var v1 = hWord(pair), v2 = lWord(pair);
        var choices = intersectSorted(this.rnodes1[v1].choices, this.rnodes1[v2].choices);
        //Make sure all choices are valid. If we watch an invalid pair, we'll never wake up
        choices = choices.filter(puz.checkGap, puz);

        if (choices.length > 0) {
            watches[pair] = choices[0];
            epuz.addCellPairWakeup(choices[0], this);
        } else {
            this.listeners[pair].forEach(epuz.gappQ.push, epuz.gappQ);
            delete this.listeners[pair];
            delete watches[pair];
        }
    }
};

var GapPairNode = function(node1, node2) {
    this.node1 = node1;
    this.node2 = node2;
    this.matches = []; //val1 -> compatible val2. Garbage in entries not corresponding to valid val1
    this.cellpairs_dict = {}; //cell ind -> cellpairnode. global dict shared by all gappairs in row
    this.cellpairs_rev = false; //whether we're the first or second node in each pair

    this.inqueue = false;
};
GapPairNode.prototype.getCPairsNeeded = function(val1, val2) {
    var needed1 = this.node1.needed[val1];
    var needed2 = this.node2.needed[val2];

    if (this.cellpairs_rev) {
        var temp = needed2; needed2 = needed1; needed1 = temp;
    }

    var d = this.cellpairs_dict;
    var results = []

    for(var cind1 in needed1) {
        if (!(cind1 in d)) {continue;}
        var cpnode = d[cind1];
        var cind2 = cpnode.cell_ind2;
        assert(cind1 === cpnode.cell_ind1 && cind2 in d);

        if (!(cind2 in needed2)) {continue;}
        results.push([cpnode, makePair(needed1[cind1], needed2[cind2])]);
    }

    return results;
};
GapPairNode.prototype.isMatch = function(val1, val2) {
    return this.getCPairsNeeded(val1, val2).every(function (info) {return info[0].isValid(info[1]);});
};
GapPairNode.prototype.update = function(epuz, puz) {
    var n1vals = this.node1.vals;
    var ind2 = this.node2.ind;

    for(var i1=0; i1<n1vals.length; i1++){
        var val1 = n1vals[i1];
        var val2 = this.matches[val1];

        if (puz.checkGap(makePair(ind2, val2)) && this.isMatch(val1, val2)) {continue;}
        //old val2 match no longer valid - try to find a new one

        var newv2 = this.node2.vals.find(function(x) {return this.isMatch(val1, x)});
        if (newv2 !== undefined) {
            this.matches[val1] = newv2;
            epuz.addGapPairWakeup(makePair(ind2, newv2), this);
            // add self as listener to new cpairs. Don't bother trying to remove self from old ones
            this.getCPairsNeeded(val1, newv2).forEach(function (info) {
                info[0].listeners[info[1]].push(this);
            });
        } else {
            puz.pruneGap(makePair(this.node1.ind, val1));
        }
    }
};

var EdgePuzzle = function(puz) {
    this.puz = puz;

    this.cellpQ = new IntrusiveQueue();
    this.gappQ = new IntrusiveQueue();
    this.wakeup_dict_cp = {};
    this.wakeup_dict_gp = {};
};
EdgePuzzle.prototype.addCellPairWakeup = function(pair, cpnode) {
    this.wakeup_dict_cp[pair] = this.wakeup_dict_cp[pair] || [];
    this.wakeup_dict_cp[pair].push(cpnode);
};
EdgePuzzle.prototype.addGapPairWakeup = function(pair, gpnode) {
    this.wakeup_dict_gp[pair] = this.wakeup_dict_gp[pair] || [];
    this.wakeup_dict_gp[pair].push(gpnode);
};
EdgePuzzle.prototype.simplify = function(callback) {
    while(this.cellpQ.nonempty() || this.gappQ.nonempty()){
        if (this.cellpQ.nonempty()) {
            this.cellpQ.pop().update(this, this.puz);
        }

        if (this.gappQ.nonempty()) {
            this.gappQ.pop().update(this, this.puz);
        }

        this.puz.simplify(callback); //TODO make callback print edge logic
        //wake up our nodes if anything was pruned by the basic solver
        this.puz.newcell_prunes.forEach(function(pair) {
            if (pair in this.wakeup_dict_cp) {
                this.wakeup_dict_cp[pair].forEach(this.cellpQ.push, this.cellpQ);
                delete this.wakeup_dict_cp[pair];
            }
            if (pair in this.wakeup_dict_gp) {
                this.wakeup_dict_gp[pair].forEach(this.gappQ.push, this.gappQ);
                delete this.wakeup_dict_gp[pair];
            }
        });
        this.puz.newcell_prunes = [];
    }
};
EdgePuzzle.prototype.createSingleRow = function(r) {
    var puz=this.puz, C=puz.C, R=puz.R, cells=puz.cells, gaps=puz.gaps;
    var r2 = r+1;

    for(var c=0; c<C; c++){
        var cell1 = cells[r*C + c];
        var cell2 = cells[r2*C + c];
        if (cell1.vals.length > 1 && cell2.vals.length > 1) {
        }
    }


};
EdgePuzzle.prototype.createEdgeNodes = function() {
    assert(!this.cellpQ.nonempty() && this.gappQ.nonempty());



};






var processRowSingle = function(gaps, grid_row, tc, r, sizes) {
    var C = grid_row.length, k = sizes.length;
    var gnode = new GapNode(gaps.length, tc==='c');
    gaps.push(gnode);

    if (k === 0) { //whole row empty
        var needed = {};
        var forbid = [];
        for(var p=0; p<C; ++p) {
            grid_row[p].forbidden[1].push(makePair(gnode.ind, 0));
            needed[grid_row[p].ind] = 0;
            forbid.push(makePair(grid_row[p].ind, 1));
        }

        gnode.vals.push(0);
        gnode.forbidden.push(forbid);
        gnode.needed.push(needed);
        gnode.adj_forbidden.push([]);
        // gnode.val_data.push([0,C]);
    } else if (k === 1) { //single mark
        var size = sizes[0];

        for(var s=0; s<=C-size; ++s) {
            var key_ind = gnode.vals.length;
            var forbid = [];
            var needed = {};

            var forbidPair = function(p, cv) {
                assert(gnode.ind < gaps.length);

                var cell = grid_row[p];
                forbid.push(makePair(cell.ind, cv));
                needed[cell.ind] = cv^1;
                cell.forbidden[cv].push(makePair(gnode.ind, key_ind));
            };

            //find which cell values are implied by this gap position
            for(var p=s; p<s+size; ++p) {forbidPair(p, 0);}
            for(var p=0; p<s; ++p) {forbidPair(p, 1);}
            for(var p=s+size; p<C; ++p) {forbidPair(p, 1);}
            gnode.vals.push(key_ind)
            gnode.forbidden.push(forbid);
            gnode.needed.push(needed);
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
        var gnode = new GapNode(gaps.length, tc==='c');
        gaps.push(gnode);

        var smin = sum(sizes.slice(0,i)) + i-1;
        var emax = C - (sum(sizes.slice(i,k)) + k-i-1);

        for(var s=smin; s<emax; ++s){
            for(var e=s+1; e<=emax; ++e){
                var key_ind = gnode.vals.length;
                var forbid = [];
                var needed = {};

                var forbidPair = function(p, cv) {
                    assert(gnode.ind < gaps.length);

                    var cell = grid_row[p];
                    forbid.push(makePair(cell.ind, cv));
                    needed[cell.ind] = cv^1;
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
                gnode.needed.push(needed);
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

        var node = cells[i] = new CellNode(i);
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