"use strict";

var print = function(x) {console.log(JSON.stringify(x));};
// var assert = function(x) {console.assert(x);}; //Doesn't seem to work, at least in Chrome
var assert = function(x) {
  if(!x) {
    console.log((new Error()).stack);
    undefined.x;
  }
};

var _add = function(a,b) {return a+b;};
var sum = function(seq) {return seq.reduce(_add, 0);};

// Sort an array of ints. Warning, sorts in place!
var sort = function(arr) {
    arr.sort(function(a,b) {return a-b;});
    return arr;
};

// find/has/discard L perform a linear search
// the B versions use binary search and hence are only usable for sorted arrays

// Find index of element, or -1 on failure
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

// check if element is in array
var hasL = function(arr, searchElement) {return findL(arr, searchElement) !== -1;};
var hasB = function(arr, searchElement) {return findB(arr, searchElement) !== -1;};


var _discard = function(arr, arr_ind) {
    if (arr_ind !== -1) {arr.splice(arr_ind, 1);}
    return arr_ind !== -1;
};

// discard element if present. return true if element was discarded
var discardL = function(arr, x) {return _discard(arr, findL(arr, x));};
var discardB = function(arr, x) {return _discard(arr, findB(arr, x));};