"use strict";

importScripts('basesolver.js');
// var unsplit = function(puz, pairs){
//     var results = [];
//     pairs.forEach(function(x){
//         results.push([puz.gaps[hWord(x)].debug, lWord(x)]);
//     });
//     return results;
// };

var CellPairNode = function(epuz, puz, cell1, cell2, rnodes1, rnodes2) {
    this.cell_ind1 = cell1.ind;
    this.cell_ind2 = cell2.ind;
    this.rnodes1 = rnodes1; //val1 -> rnode or null. may be shared but doesn't matter
    this.rnodes2 = rnodes2; //val2 -> rnode or null

    this.mywatches = {}; // valpair -> watched gpair
    this.listeners = {}; // valpair -> list of nodes
    this.inqueue = false;

    //initialize everything
    for(var i1=0; i1<cell1.vals.length; i1++) {
        for(var i2=0; i2<cell2.vals.length; i2++) {
            var val1=cell1.vals[i1], val2=cell2.vals[i2];
            var pair = makePair(val1, val2);
            var choices = this.getChoices(pair, puz);

            if (choices.length > 0) {
                this.listeners[pair] = [];
                this.mywatches[pair] = choices[0];
                epuz.addCellPairWakeup(choices[0], this);
            }
        }
    }
};
CellPairNode.prototype.isValid = function(vpair) {
    return vpair in this.mywatches;
};
CellPairNode.prototype.getChoices = function(pair, puz) {
    var v1 = hWord(pair), v2 = lWord(pair);
    var choices = intersectSorted(this.rnodes1[v1].choices, this.rnodes2[v2].choices);
    //Make sure all choices are valid. If we watch an invalid pair, we'll never wake up
    return choices.filter(puz.checkGap, puz);
};
CellPairNode.prototype.update = function(epuz, puz) {
    var cell1 = puz.cells[this.cell_ind1];
    var cell2 = puz.cells[this.cell_ind2];
    //If one of the cells is known, stop immediately. No point in waking up listeneres
    //since they'll be worken up when the gap vals are pruned by the basic solver anyway
    if (cell1.vals.length <= 1 || cell2.vals.length <= 1) {return;}

    var watches = this.mywatches;
    for(var pair_ in watches) {
        var pair = parseInt(pair_);
        assert(typeof watches[pair] === "number");
        if (puz.checkGap(watches[pair])) {continue;} //watch still valid

        var choices = this.getChoices(pair, puz);
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

var GapPairNode = function(epuz, puz, node1, node2, cellpairs_dict, cellpairs_rev) {
    this.node1 = node1;
    this.node2 = node2;
    this.matches = {}; //val1 -> compatible val2. May have garbage in entries not corresponding to valid val1
    this.cellpairs_dict = cellpairs_dict; //cell ind -> cellpairnode. global dict shared by all gappairs in row
    this.cellpairs_rev = cellpairs_rev; //whether we're the first or second node in each pair
    this.inqueue = false;

    //initialize this.matches (and add appropriate listeners)
    var this_ = this;
    //Important! Make copy of vals before iterating, since we may prune vals, which causes issues
    node1.vals.slice().forEach(function(val1) {this_.findNewMatch(epuz, puz, val1);});
    puz.simplifyWithMessage('edge logic');
};
GapPairNode.prototype.getCPairsNeeded = function(val1, val2) {
    var needed1 = this.node1.needed[val1];
    var needed2 = this.node2.needed[val2];

    if (this.cellpairs_rev) {
        var temp = needed2; needed2 = needed1; needed1 = temp;
    }

    var d = this.cellpairs_dict;
    var results = []

    for(var cind1_ in needed1) {
        var cind1 = parseInt(cind1_);

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
GapPairNode.prototype.findNewMatch = function(epuz, puz, val1) {
    if (!hasB(this.node1.vals, val1)) {return;}

    var this_ = this;
    //array.find would be more efficient, but it's sadly not standard yet
    var newvals = this.node2.vals.filter(function(x) {return this_.isMatch(val1, x)});

    if (newvals.length > 0) {
        var newv2 = newvals[0];
        this.matches[val1] = newv2;
        epuz.addGapPairWakeup(makePair(this.node2.ind, newv2), this);
        // add self as listener to new cpairs. Don't bother trying to remove self from old ones
        this.getCPairsNeeded(val1, newv2).forEach(function (info) {
            info[0].listeners[info[1]].push(this_);
        });
    } else {
        puz.pruneGap(makePair(this.node1.ind, val1));
    }
};
GapPairNode.prototype.update = function(epuz, puz) {
    if (this.node1.vals.length <= 1) {return;}

    var n1vals = this.node1.vals;
    for(var i1=0; i1<n1vals.length; i1++){
        var val1 = n1vals[i1];
        var val2 = this.matches[val1];

        if (puz.checkGap(makePair(this.node2.ind, val2)) && this.isMatch(val1, val2)) {continue;}
        //old val2 match no longer valid - try to find a new one
        this.findNewMatch(epuz, puz, val1);
    }
};

var EdgePuzzle = function(puz) {
    this.puz = puz;
    this.cellpQ = new IntrusiveQueue();
    this.gappQ = new IntrusiveQueue();
    this.wakeup_dict_cp = {};
    this.wakeup_dict_gp = {};

    //bounding rectangle that has not yet been assigned edge nodes
    //half open range on indices that are first in the pair
    this.R1 = 0; this.R2 = puz.R-1;
    this.C1 = 0; this.C2 = puz.C-1;
    this.rnode_lookup = null;
    this.row_gaps = [], this.col_gaps = [];
};
EdgePuzzle.prototype.addCellPairWakeup = function(pair, cpnode) {
    this.wakeup_dict_cp[pair] = this.wakeup_dict_cp[pair] || [];
    this.wakeup_dict_cp[pair].push(cpnode);
};
EdgePuzzle.prototype.addGapPairWakeup = function(pair, gpnode) {
    this.wakeup_dict_gp[pair] = this.wakeup_dict_gp[pair] || [];
    this.wakeup_dict_gp[pair].push(gpnode);
};
EdgePuzzle.prototype.simplify = function() {
    // this.puz.simplify(); //we may have pruned things during creation

    while(this.cellpQ.nonempty() || this.gappQ.nonempty() || this.puz.newgap_prunes.length > 0){
        if (this.cellpQ.nonempty()) {
            this.cellpQ.pop().update(this, this.puz);
        }

        if (this.gappQ.nonempty()) {
            this.gappQ.pop().update(this, this.puz);
        }

        this.puz.simplifyWithMessage('edge logic');
        //wake up our nodes if anything was pruned by the basic solver
        var this_ = this;
        this.puz.newgap_prunes.forEach(function(pair) {
            if (pair in this_.wakeup_dict_cp) {
                this_.wakeup_dict_cp[pair].forEach(this_.cellpQ.push, this_.cellpQ);
                delete this_.wakeup_dict_cp[pair];
            }
            if (pair in this_.wakeup_dict_gp) {
                this_.wakeup_dict_gp[pair].forEach(this_.gappQ.push, this_.gappQ);
                delete this_.wakeup_dict_gp[pair];
            }
        });
        this.puz.newgap_prunes = [];
    }
};
EdgePuzzle.prototype.createLookups = function() {
    var puz=this.puz, C=puz.C, R=puz.R, numColors=puz.numColors;
    assert(!this.cellpQ.nonempty() && !this.gappQ.nonempty());

    this.rnode_lookup = {false:[], true:[]}; // iscol -> cell_ind -> cell_val -> corresponding rnode
    var rnode_lookup = this.rnode_lookup;
    var row_gaps = this.row_gaps, col_gaps = this.col_gaps;

    var nulls = []; for(var i=0; i<numColors; i++) {nulls.push(null);}
    for(var i=0; i<R*C; i++) {
        //.concat() performs a shallow copy
        rnode_lookup[false].push(nulls.concat()); rnode_lookup[true].push(nulls.concat());
    }
    puz.revnodes.forEach(function(rnode) {
        rnode_lookup[rnode.iscol][hWord(rnode.cpair)][lWord(rnode.cpair)] = rnode;
    });

    for(var i=0; i<R; i++) {row_gaps.push([]);}
    for(var i=0; i<C; i++) {col_gaps.push([]);}
    puz.gaps.forEach(function(gnode) {
        (gnode.iscol ? col_gaps : row_gaps)[gnode.roworcolnum].push(gnode);
    });
};
EdgePuzzle.prototype.createSingleRow = function(r, iscol, rnodes, row_gaps) {
    var puz=this.puz, C=puz.C, R=puz.R, cells=puz.cells, gaps=puz.gaps;
    var r2 = r+1;

    if (!iscol) {
        var climit=C, rmult=C, cmult=1;
    } else {
        var climit=R, rmult=1, cmult=C;
    }

    var gaps1 = row_gaps[r].filter(function(gn) {return gn.vals.length > 1;});
    var gaps2 = row_gaps[r2].filter(function(gn) {return gn.vals.length > 1;});
    if (gaps1.length === 0 || gaps2.length === 0) {return;} //stop immediately if there are no unknown gaps on this row pair

    var cellnode_d = {};
    var cpcount = 0;

    for(var c=0; c<climit; c++){
        var cell1 = cells[r*rmult + c*cmult];
        var cell2 = cells[r2*rmult + c*cmult];
        if (cell1.vals.length > 1 && cell2.vals.length > 1) {
            //node adds itself to our watches automatically in the constructor
            var node = new CellPairNode(this, puz, cell1, cell2, rnodes[cell1.ind], rnodes[cell2.ind]);
            cellnode_d[cell1.ind] = node;
            cellnode_d[cell2.ind] = node;
            cpcount += 1;
        }
    }
    //if there were no unknown adjacent cell pairs in this row, no point in continuing
    if (cpcount === 0) {return;}

    var epuz = this;
    gaps1.forEach(function(node1) {
        gaps2.forEach(function(node2) {
            //constructor automatically adds itself and may prune values
            new GapPairNode(epuz, puz, node1, node2, cellnode_d, false);
            new GapPairNode(epuz, puz, node2, node1, cellnode_d, true);
        });
    });
};
EdgePuzzle.prototype.createNextEdge = function() {
    //create edge constraints on the next rows in from the edges
    if(this.R1 < this.R2) {
        this.createSingleRow(this.R1, false, this.rnode_lookup[true], this.row_gaps);
        this.R1++;
    }
    if(this.R1 < this.R2) {
        this.createSingleRow(this.R2-1, false, this.rnode_lookup[true], this.row_gaps);
        this.R2--;
    }
    if(this.C1 < this.C2) {
        this.createSingleRow(this.C1, true, this.rnode_lookup[false], this.col_gaps);
        this.C1++;
    }
    if(this.C1 < this.C2) {
        this.createSingleRow(this.C2-1, true, this.rnode_lookup[false], this.col_gaps);
        this.C2--;
    }
};
EdgePuzzle.prototype.solve = function(t0) {
    var puz=this.puz, cells=puz.cells;

    puz.solve();
    this.puz.newgap_prunes = []; //obviously we don't care about any gaps pruned during basic solving
    this.createLookups();

    while(this.R1 < this.R2 || this.C1 < this.C2) {
        this.createNextEdge();
        this.simplify();
    }

    var solved = !cells.some(function(cell) {return cell.vals.length > 1;});
    var time = (Date.now() - t0)/1000;
    var callback = this.puz.callback; callback({type:'done', data:{solved:solved, time:time}});
}