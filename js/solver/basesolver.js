"use strict";

importScripts('util.js');
// pack two 16bit ints into one so we can emulate tuple pairs
var MAXPAIRVAL = 0xFFFF;
var hWord = function(x) {return (x >>> 16) & 0xFFFF;};
var lWord = function(x) {return x & 0xFFFF;};
var makePair = function(x, y) {return (x << 16) | y;};

// A queue that ensures uniqueness of elements via an instrusive flag.
// Uses x.inqueue to store queue membership
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

// Intersect two sorted lists of ints
var intersectSorted = function(s1, s2) {
    return s1.filter(function(x) {return hasB(s2, x);});
};

// Intersect the forbidden sets corresponding to vals
var intersectForbidden = function(vals, forbidden) {
    assert(vals.length > 0);
    var forbids = vals.map(function(i) {return forbidden[i];});
    forbids.sort(function(a,b){return a.length - b.length;});

    var cur = forbids[0];
    for (var i=1; i<forbids.length; ++i) {
        cur = intersectSorted(cur, forbids[i]);
    }
    return cur;
};

// Common behavior of Cell and Gap nodes
// ind - a unique integer identifier, the index into Puzzle.cells/gaps where this node is found
// vals - sorted list of remaining valid values for the node. For cell nodes these will correspond to
//      possible colors. For gap nodes, they're just meaningless ints. val_data[val] gives the actual meaning
// forbidden - an array index by vals. For each val, a sorted list of (packed) gap/val pairs or cell/val pairs
//      forbidden by assigning val to this node
// inqueue - used by the queue
// update(puz) - Prunes all pairs which are forbidden by every remaining value of this node

// Constraint node representing a cell in the puzzle
var CellNode = function(ind, debuginfo) {
    this.ind = ind;
    this.vals = [];
    this.forbidden = []; //val -> [pairs]
    this.inqueue = false;
    this.debug = debuginfo
};
CellNode.prototype.update = function(puz) {
    intersectForbidden(this.vals, this.forbidden).forEach(puz.pruneGap, puz);
};

// Constraint node representing a gap (space between two runs of black) in the puzzle
var GapNode = function(ind, iscol, roworcolnum, debuginfo) {
    this.ind = ind;
    this.iscol = iscol;
    this.roworcolnum = roworcolnum; //for edge solver
    this.vals = [];
    this.forbidden = []; //val -> [pairs]
    this.needed = []; //val -> {cell:color} (which colors this choice forces)

    this.val_edges = []; //only used during puzzle creation - TODO remove
    this.adj_forbidden = []; //val -> [pairs] giving gap/val pairs forbidden by this choice
    this.inqueue = false;
    this.debug = debuginfo
    this.val_data = []; //for debugging
};
GapNode.prototype.update = function(puz) {
    intersectForbidden(this.vals, this.forbidden).forEach(puz.pruneCell, puz);
    intersectForbidden(this.vals, this.adj_forbidden).forEach(puz.pruneGap, puz);
};

// Used for reverse cell logic. Represents all the gap pairs in a given column or row
// that can make a given cell a given color
// choices - sorted list of gapval pairs
// cpair - the cellval pair of this node
// iscol - whether this node represents the column or the row of the cell
var RevCellNode = function(iscol, cpair, choices) {
    this.iscol = iscol;
    this.cpair = cpair;
    this.choices = choices;
    this.inqueue = false;
};
RevCellNode.prototype.update = function(puz) {
    this.choices = this.choices.filter(puz.checkGap, puz);
    if (this.choices.length === 0) {
        puz.pruneCell(this.cpair);
    }
    else {
        //check if there's any point in keeping this node alive
        var node_ind = hWord(this.cpair), val = lWord(this.cpair);
        if (puz.cells[node_ind].length > 1 && puz.checkCell(this.cpair)) {
            puz.addRNodeWakeup(this.choices[0], this);
        }
    }
};

// The main class representing a puzzle and the logic for line/reverse line solving
// callback - the function to call when a new step is produced
// cellQ, gapQ, revQ - the queues of cell/gap/rev nodes that are dirty and need to be updated
// wakeup_dict - gives list of revnodes that should be woken up when a specified gapval
//      pair is prunes. Only holds keys for which there is a nonempty list
// newgap_prunes - list of gapvals that have been pruned, for use by the edge solver
// newcell_prunes - list of [cell, remaining vals] array pairs s that have been pruned,
//      to display cells for the next step. TODO - clean this up
var Puzzle = function(R, C, cells, gaps, callback) {
    this.R = R; this.C = C; this.cells = cells; this.gaps = gaps;
    this.numColors = 2;
    this.callback = callback;

    this.cellQ = new IntrusiveQueue(cells);
    this.gapQ = new IntrusiveQueue(gaps);
    this.revQ = new IntrusiveQueue();

    this.wakeup_dict = {}; // defaultdict {pair -> node list}
    this.newgap_prunes = []; //used for the edge solver
    this.revnodes = []; //keep track of revnodes for the edge solver

    this.newcell_prunes = []; //used for displaying steps
};
//check if given cellval/gapval pair is still valid
Puzzle.prototype.checkCell = function(pair) {
    var node_ind = hWord(pair), val = lWord(pair);
    return hasL(this.cells[node_ind].vals, val);
};
Puzzle.prototype.checkGap = function(pair) {
    var node_ind = hWord(pair), val = lWord(pair);
    return hasB(this.gaps[node_ind].vals, val);
};
// remove cellval/gapval pair, updating dirty nodes and info as appropriate
Puzzle.prototype.pruneCell = function(pair) {
    var node_ind = hWord(pair), val = lWord(pair);
    var node = this.cells[node_ind];

    //cells assumed to have few vals so use linear rather than binary search
    if (discardL(node.vals, val)) {
        this.cellQ.push(node);
        this.newcell_prunes.push([node.ind, node.vals]);
    }
};
Puzzle.prototype.pruneGap = function(pair) {
    var node_ind = hWord(pair), val = lWord(pair);
    var node = this.gaps[node_ind];

    if (discardB(node.vals, val)) {
        this.gapQ.push(node);
        this.newgap_prunes.push(pair);

        if (pair in this.wakeup_dict) {
            this.wakeup_dict[pair].forEach(this.revQ.push, this.revQ);
            delete this.wakeup_dict[pair];
        }
    }
};
//registers revnode to be wokenup when given gapval is pruned
Puzzle.prototype.addRNodeWakeup = function(pair, rnode) {
    this.wakeup_dict[pair] = this.wakeup_dict[pair] || [];
    this.wakeup_dict[pair].push(rnode);
};
//used for indicating the end of a step
Puzzle.prototype.checkYield = function(msg_type, forcemsg) {
    if (this.newcell_prunes.length > 0 || forcemsg === true) {
        var msg = {type:'step', data:{type:msg_type, newvals:this.newcell_prunes}};
        var callback = this.callback; callback(msg); //can't use this.callback directly because Javascript is stupid
        this.newcell_prunes = [];
    }
}
//iterate until line logic converges
Puzzle.prototype.simplify = function() {
    while(this.cellQ.nonempty() || this.gapQ.nonempty() || this.revQ.nonempty()){
        if (this.cellQ.nonempty()) {
            this.cellQ.pop().update(this);
        }

        if (this.gapQ.nonempty()) {
            this.gapQ.pop().update(this);
            this.checkYield('line logic', false);
        }

        if (this.revQ.nonempty()) {
            this.revQ.pop().update(this);
            this.checkYield('reverse line logic', false);
        };
    }
};
// decides on cell prunings if any to display for a given edge logic step
// and creates the step, assuming the edge logic actually did anything
Puzzle.prototype.simplifyWithMessage = function(msg_type) {
    //Called by edge solver so we can display edge logic steps
    var force = this.cellQ.nonempty() || this.gapQ.nonempty();
    while(this.gapQ.nonempty()) {
        this.gapQ.pop().update(this);
    }
    this.checkYield(msg_type, force);
    this.simplify();
};
//this should only be called once, obviously.
Puzzle.prototype.createReverseNodes = function () {
    //create lists
    var lists = {false:{}, true:{}};
    var cinds = [];
    for(var i=0; i<this.cells.length; ++i) {
        for (var cv=0; cv<=this.numColors; ++cv) {
            pair = makePair(i, cv);
            lists[false][pair] = [];
            lists[true][pair] = [];
            cinds.push(pair)
        }
    }

    for(var i=0; i<this.gaps.length; ++i) {
        var gnode = this.gaps[i];
        var list = lists[gnode.iscol];
        for (var vi=0; vi<gnode.vals.length; ++vi) {
            var val = gnode.vals[vi];

            var pair = makePair(gnode.ind, val);
            var needed = gnode.needed[val];
            for(var k_ in needed) {
                var k = parseInt(k_);
                var forcedpair = makePair(k, needed[k]);
                list[forcedpair].push(pair);
            }
        }
    }

    var revnodes = this.revnodes;
    for(var i=0; i<cinds.length; ++i) {
        var cpair = cinds[i];
        var cnode = this.cells[hWord(cpair)];
        if (!hasL(cnode.vals, lWord(cpair))) {continue;}

        sort(lists[false][cpair]);
        sort(lists[true][cpair]);
        revnodes.push(new RevCellNode(false, cpair, lists[false][cpair]));
        revnodes.push(new RevCellNode(true, cpair, lists[true][cpair]));
    }
    this.revQ = new IntrusiveQueue(revnodes);
};
// solve puzzle with line/reverse line logic as far as possible
Puzzle.prototype.solve = function() {
    this.simplify();
    this.createReverseNodes();
    this.simplify();
};
