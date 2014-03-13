"use strict";


importScripts('util.js');
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

var intersectSorted = function(s1, s2) {
    return s1.filter(function(x) {return hasB(s2, x);});
};

var intersectForbidden = function(vals, forbidden) {
    assert(vals.length > 0);
    var forbids = vals.map(function(i) {return forbidden[i];});
    forbids.sort(function(a,b){return a.length - b.length;});

    var cur = forbids[0];
    for (var i=1; i<forbids.length; ++i) {
        // cur = cur.filter(function(x) {return hasB(forbids[i], x);});
        cur = intersectSorted(cur, forbids[i]);
    }
    return cur;
};

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

var GapNode = function(ind, iscol, roworcolnum, debuginfo) {
    this.ind = ind;
    this.iscol = iscol;
    this.roworcolnum = roworcolnum; //for edge solver
    this.vals = [];
    this.forbidden = []; //val -> [pairs]
    this.needed = []; //val -> {cell:color} (which colors this choice forces)

    this.val_edges = [];
    this.adj_forbidden = [];
    this.inqueue = false;
    this.debug = debuginfo
    this.val_data = []; //for debugging
};
GapNode.prototype.update = function(puz) {
    intersectForbidden(this.vals, this.forbidden).forEach(puz.pruneCell, puz);
    intersectForbidden(this.vals, this.adj_forbidden).forEach(puz.pruneGap, puz);
};

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

var Puzzle = function(R, C, cells, gaps) {
    this.R = R; this.C = C; this.cells = cells; this.gaps = gaps;
    this.numColors = 2;

    this.cellQ = new IntrusiveQueue(cells);
    this.gapQ = new IntrusiveQueue(gaps);
    this.revQ = new IntrusiveQueue();

    this.wakeup_dict = {}; // defaultdict {pair -> node list}
    this.newgap_prunes = []; //used for the edge solver
    this.revnodes = []; //keep track of revnodes for the edge solver

    this.newcell_prunes = []; //used for displaying steps
};
Puzzle.prototype.checkCell = function(pair) {
    var node_ind = hWord(pair), val = lWord(pair);
    return hasL(this.cells[node_ind].vals, val);
};
Puzzle.prototype.checkGap = function(pair) {
    var node_ind = hWord(pair), val = lWord(pair);
    return hasB(this.gaps[node_ind].vals, val);
};
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
Puzzle.prototype.addRNodeWakeup = function(pair, rnode) {
    this.wakeup_dict[pair] = this.wakeup_dict[pair] || [];
    this.wakeup_dict[pair].push(rnode);
};
Puzzle.prototype.checkYield = function(msg_type, callback) {
    if (this.newcell_prunes.length > 0) {
        // var msg = {type:'step', data:{type:msg_type, newvals:this.newcell_prunes}};
        // callback(msg);
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
            for(var k in needed) {
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
Puzzle.prototype.solve = function(callback, t0) {
    this.simplify(callback);
    this.createReverseNodes();
    this.simplify(callback);

    // var solved = !this.cells.some(function(cell) {return cell.vals.length > 1;});
    // var time = (Date.now() - t0)/1000;
    // callback({type:'done', data:{solved:solved, time:time}});
};
