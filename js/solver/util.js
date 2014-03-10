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

// http://oli.me.uk/2013/06/08/searching-javascript-arrays-with-a-binary-search/
function hasB(arr, searchElement) {
  var minIndex = 0;
  var maxIndex = arr.length - 1;
  var currentIndex;
  var currentElement;

  while (minIndex <= maxIndex) {
      currentIndex = (minIndex + maxIndex) / 2 | 0;
      currentElement = arr[currentIndex];

      if (currentElement < searchElement) {
          minIndex = currentIndex + 1;
      }
      else if (currentElement > searchElement) {
          maxIndex = currentIndex - 1;
      }
      else {
          return true;
      }
  }

  return false;
}
