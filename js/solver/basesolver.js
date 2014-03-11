"use strict";


importScripts('util.js');
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
    forbids.sort(function(a,b){return a.length - b.length;});

    var cur = forbids[0];
    for (var i=1; i<forbids.length; ++i) {
        cur = cur.filter(function(x) {return hasB(forbids[i], x);});
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
    this.choices = this.choices.filter(function(p) {return hasB(puz.gaps[hWord(p)].vals, lWord(p));});
    if (this.choices.length === 0) {
        puz.pruneCell(this.cpair);
    }
    else {
        //check if there's any point in keeping this node alive
        var node_ind = hWord(this.cpair), val = lWord(this.cpair);
        if (puz.cells[node_ind].length > 1 && hasL(puz.cells[node_ind], val)) {
            puz.addWakeup(this.choices[0], this);
        }
    }
};

var Puzzle = function(R, C, cells, gaps) {
    this.R = R; this.C = C; this.cells = cells; this.gaps = gaps;

    this.cellQ = new IntrusiveQueue(cells);
    this.gapQ = new IntrusiveQueue(gaps);
    this.revQ = new IntrusiveQueue();

    this.wakeup_dict = {}; // defaultdict {pair -> node list}
    this.newgap_prunes = []; //used for the edge solver

    this.newcell_prunes = []; //used for displaying steps
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
Puzzle.prototype.addWakeup = function(pair, rnode) {
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
        if (!hasL(cnode.vals, lWord(cpair))) {continue;}

        revnodes.push(new RevCellNode(['r', cnode.key_data], cpair^1, lists['r'][cpair]));
        revnodes.push(new RevCellNode(['c', cnode.key_data], cpair^1, lists['c'][cpair]));
    }
    this.revQ = new IntrusiveQueue(revnodes);
    // postMessage(revnodes.length + " rnodes created");
};
Puzzle.prototype.solve = function(callback, t0) {
    this.simplify(callback);
    this.createReverseNodes();
    this.simplify(callback);

    var solved = !this.cells.some(function(cell) {return cell.vals.length > 1;});
    var time = (Date.now() - t0)/1000;
    callback({type:'done', data:{solved:solved, time:time}});
};
