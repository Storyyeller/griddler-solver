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

    function convertArrayElementsToIntegers(arr) {
        for (var i = 0; i < arr.length; ++i) {
            if (!isNumber(arr[i])) {
                return false;
            }
            var number = +(arr[i]);
            var integer = ~~number;
            if (number !== integer) {
                return false;
            }
            arr[i] = integer;
        }
        return true;
    }

    function isQuotedString(str) {
        return str.length >= 2 && str[0] === '"' && str[str.length - 1] === '"';
    }

    function isNumber(str) {
        return !isNaN(parseFloat(str)) && isFinite(str);
    }

    /**
     * A FileParser for NON files. See the documentation for FileManager for a description of
     * FileParsers.
     */
    var NONParser = {};

    /**
     * See the documentation for getSupportedExtensions() in FileManager.js
     *
     * @returns {string[]}
     */
    NONParser.getSupportedExtensions = function() {
        return ["non"];
    };

    /**
     * See the documentation for parseString() in FileManager.js
     *
     * @param fileContents {string}
     * @returns {string|null}
     */
    NONParser.parseString = function(fileContents) {
        var lines = fileContents.split("\n");

        var puzzle = {};
        puzzle.grid = null;
        puzzle.solution = null;
        puzzle.metadata = {};
        puzzle.rows = [];
        puzzle.cols = [];

        var domElement = $(document.createElement("div"));

        var state = "metadata";
        var i = 0;

        /* enter the state machine */
        while (i < lines.length) {
            var line = lines[i].trim();
            ++i;
            if (line === "") {
                continue;
            }

            /* Part I: state transition criteria */

            if (state === "metadata" && (line === "rows" || line === "columns")) {
                state = line;
                continue;
            }

            /* we allow columns to come before rows, even though rows are supposed to come before */
            if (state === "rows" && line === "columns") {
                /* we are now exiting the rows state and going to the columns state. If the rows
                array is empty, this puzzle does not have any rows, so throw an error.  Additionally,
                if we've already processed columns, that means the file has two column declarations,
                so throw an error. */

                if (!puzzle.rows.length || puzzle.cols.length) {
                    state = "error";
                    break;
                }
                state = "columns";
                continue;
            }

            if (state === "columns" && line === "rows") {
                /* we are now exiting the columns state and going to the rows state. If the columns
                * array is empty, this puzzle does not have any columns, so throw an error. Additionally,
                * if we've already processed rows, that means this file has two rows declarations,
                * so throw an error */
                if (!puzzle.cols.length || puzzle.rows.length) {
                    state = "error";
                    break;
                }
                state = "rows";
                continue;
            }

            if ((state === "rows" || state === "columns") && line.indexOf("goal") === 0) {
                state = "goal";
            }

            /* Part II: do the work for each state */

            if (state === "metadata") {
                var firstSpaceIndex = line.indexOf(" ");
                if (firstSpaceIndex === -1) {
                    state = "error";
                    break;
                }
                var key = line.substring(0, firstSpaceIndex);
                var value = line.substring(firstSpaceIndex + 1).trim();

                /* TODO: handle escaped quotation marks */
                if (isQuotedString(value)) {
                    value = stripQuotes(value);
                    /* escape HTML special characters by passing them through a DOM element */
                    value = domElement.html(value).text();
                } else if (isNumber(value)) {
                    value = +(value);
                } else {
                    state = "error";
                    break;
                }

                puzzle.metadata[key] = value;
            }

            if (state === "rows") {
                var row = line.split(",");
                if (row.length === 0 || !convertArrayElementsToIntegers(row)) {
                    state = "error";
                    break;
                }
                puzzle.rows.push(row);
            }

            if (state === "columns") {
                var col = line.split(",");
                if (col.length === 0 || !convertArrayElementsToIntegers(col)) {
                    state = "error";
                    break;
                }
                puzzle.cols.push(col);
            }

            if (state === "goal") {
                line = line.substring(4).trim(); //get rid of "goal" at the beginning
                line = stripQuotes(line);
                var regex = /^(0|1)*$/;
                var lineExpectedLength = puzzle.rows.length * puzzle.cols.length;
                if (line.length !== lineExpectedLength || !regex.test(line)) {
                    state = "error";
                    break;
                }

                var j = 0;
                var solution = new Array(puzzle.rows.length);
                for (j = 0; j < solution.length; ++j) {
                    solution[j] = new Array(puzzle.cols.length);
                }

                var lineIndex = 0;
                for (var row = 0; row < solution.length; ++row) {
                    for (var col = 0; col < solution[row].length; ++col) {
                        solution[row][col] = +line[lineIndex];
                        ++lineIndex;
                    }
                }

                puzzle.solution = solution;

                break;
            }
        }

        /* if the puzzle has no rows or columns, it's not valid */
        if (!puzzle.rows.length || !puzzle.cols.length) {
            state = "error";
        }

        return (state === "error") ? null : puzzle;
    };

    /**
     * See the documentation for serialize() in FileManager.js
     */
    NONParser.serialize = function(puzzle) {
        var buffer = [];
        for (var key in puzzle.metadata) {
            buffer.push(key);
            buffer.push(" ");
            if (typeof(puzzle.metadata[key]) === "string") {
                buffer.push('"');
                buffer.push(puzzle.metadata[key]);
                buffer.push('"');
            } else {
                buffer.push(puzzle.metadata[key]);
            }
            buffer.push("\n");
        }

        buffer.push("\nrows\n");
        puzzle.rows.forEach(function(row) {
            buffer.push(row.toString());
            buffer.push("\n");
        });

        buffer.push("\ncolumns\n");
        puzzle.cols.forEach(function(col) {
            buffer.push(col.toString());
            buffer.push("\n");
        });

        if (puzzle.solution) {
            buffer.push("\n");
            buffer.push('goal "');
            puzzle.solution.forEach(function(row) {
                buffer.push(row.join(""));
            });
            buffer.push('"');
        }

        return buffer.join("");
    };

    if (exports) {
        exports.NONParser = NONParser;
    }

    /* Register with FileManager */
    if (exports.FileManager) {
        exports.FileManager.registerParser(NONParser);
    }
})(window);