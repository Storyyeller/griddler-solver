"use strict";

var _add = function(a,b) {return a+b;};
var sum = function(seq) {return seq.reduce(_add, 0);};

var discard = function(arr, x) {
    var arr_ind = arr.indexOf(x);
    if (arr_ind !== -1) {arr.splice(arr_ind, 1);}
    return arr_ind !== -1;
};

//Warning, sorts in place!
var sort = function(arr) {
    arr.sort(function(a,b) {return a-b;});
    return arr;
};

// adapted from http://oli.me.uk/2013/06/08/searching-javascript-arrays-with-a-binary-search/
function findB(arr, searchElement) {
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
}

function hasB(arr, searchElement) {return findB(arr, searchElement) !== -1;}