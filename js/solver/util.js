"use strict";

// As of Firefox 27.0.1, WebWorkers don't have a reference to console. Firefox throws an
// error if you try to reference it. It also throws an error if you try to check for its
// presence with if (console). Checking if (self.console) seems to work.
var assert = function(x) {
    if (self.console) {
        console.assert(x);
    }
};

var print = function(x) {
    if (self.console) {
        console.log(JSON.stringify(x));
    }
};

var _add = function(a,b) {return a+b;};
var sum = function(seq) {return seq.reduce(_add, 0);};

//Warning, sorts in place!
var sort = function(arr) {
    arr.sort(function(a,b) {return a-b;});
    return arr;
};


var findL = function(arr, searchElement) {return arr.indexOf(searchElement);}
var findB = function(arr, searchElement) {
  // adapted from http://oli.me.uk/2013/06/08/searching-javascript-arrays-with-a-binary-search/
  var minIndex = 0;
  var maxIndex = arr.length - 1;

  while (minIndex <= maxIndex) {
      var curIndex = (minIndex + maxIndex) / 2 | 0;

      if (arr[curIndex] < searchElement) {
          minIndex = curIndex + 1;
      }
      else if (arr[curIndex] > searchElement) {
          maxIndex = curIndex - 1;
      }
      else {
          return curIndex;
      }
  }

  return -1;
};

var hasL = function(arr, searchElement) {return findL(arr, searchElement) !== -1;};
var hasB = function(arr, searchElement) {return findB(arr, searchElement) !== -1;};

var _discard = function(arr, arr_ind) {
    if (arr_ind !== -1) {arr.splice(arr_ind, 1);}
    return arr_ind !== -1;
};

var discardL = function(arr, x) {return _discard(arr, findL(arr, x));};
var discardB = function(arr, x) {return _discard(arr, findB(arr, x));};

