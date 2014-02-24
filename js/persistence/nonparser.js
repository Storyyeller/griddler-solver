(function(exports) {
    function stripQuotes(str) {
        if (str.length && str[0] === "\"") {
            str = str.substr(1);
        }
        if (str.length && str[str.length - 1] === "\"") {
            str = str.substr(0, str.length - 1);
        }
        return str;
    }

    function convertArrayElementsToNumbers(arr) {
        for (var i = 0; i < arr.length; ++i) {
            arr[i] = +(arr[i]);
        }
    }

    var supportedExtensions = ["non"];

    var NONParser = {};

    NONParser.getSupportedExtensions = function() {
        return supportedExtensions.slice(0);
    };

    NONParser.parse = function(fileContents) {
        var puzzle = {};
        puzzle.grid = null;

        var lines = fileContents.split("\n");
        var line;
        var i = 0;

        var domElement = $(document.createElement("div"));
        puzzle.metadata = {};
        while ((line = lines[i].trim()) !== "") {
            var firstSpaceIndex = line.indexOf(" ");
            var key = line.substring(0, firstSpaceIndex);
            var value = line.substring(firstSpaceIndex + 1);
            value = stripQuotes(value);
            //escape HTML special characters
            value = domElement.html(value).text();
            puzzle.metadata[key] = value;
            ++i;
        }

        i += 2;

        var rows = [];
        while ((line = lines[i].trim()) !== "") {
            var row = lines[i].split(",");
            convertArrayElementsToNumbers(row);
            rows.push(row);
            ++i;
        }
        puzzle.rows = rows;

        i += 2;

        var cols = [];
        while ((line = lines[i].trim()) !== "") {
            var col = lines[i].split(",");
            convertArrayElementsToNumbers(col);
            cols.push(col);
            ++i;
        }
        puzzle.cols = cols;

        return puzzle;
    };

    NONParser.serialize = function(puzzle) {

    };

    if (exports) {
        exports.NONParser = NONParser;
    }

    if (FileManager) {
        FileManager.registerParser(NONParser);
    }
})();