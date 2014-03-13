(function(exports) {
    var extensionMap = {};

    var FileManager = {};

    function getParser(extension) {
        if (!extensionMap.hasOwnProperty(extension)) {
            return new Error("No parser found for extension: " + extension);
        }
        return extensionMap[extension];
    }

    function parse(parser, contents) {
        contents = contents.replace(/\r\n/g, "\n");
        contents = contents.replace(/\r/g, "\n");

        var puzzle = parser.parseString(contents);
        if (!puzzle) {
            return new Error("Error parsing puzzle");
        }
        return puzzle;
    }

    FileManager.registerParser = function(parser) {
        if (typeof(parser.parseString) !== "function" ||
            typeof(parser.serialize) !== "function" ||
            typeof(parser.getSupportedExtensions) !== "function") {
            throw new Error("parser does not implement the required API");
        }

        parser.getSupportedExtensions().forEach(function(extension) {
            if (extensionMap[extension]) {
                throw new Error("parser already exists for extension: " + extension);
            }
            extensionMap[extension] = parser;
        });
    };

    FileManager.parseFile = function(file, callback) {
        var lastDot = file.name.lastIndexOf(".");
        if (lastDot === -1) {
            var err = new Error("File does not have an extension so its type cannot be determined");
            callback(err, null);
            return;
        }

        var extension = file.name.substring(lastDot + 1);
        var parser = getParser(extension);
        if (parser instanceof Error) {
            callback(parser, null);
            return;
        }

        var reader = new FileReader();
        reader.onloadend = function(evt) {
            if (evt.target.readyState === FileReader.DONE) {
                var fileContents = evt.target.result;
                var puzzle = parse(parser, fileContents);
                if (puzzle instanceof Error) {
                    callback(puzzle, null);
                } else {
                    callback(null, puzzle);
                }
            } else {
                callback(new Error("Error reading file"), null);
            }
        };

        reader.readAsText(file);
    };

    FileManager.parseString = function(str, extension, callback) {
        var parser = getParser(extension);
        if (parser instanceof Error) {
            callback(parser, null);
        } else {
            var puzzle = parse(parser, str);
            if (puzzle instanceof Error) {
                callback(puzzle, null);
            } else {
                callback(null, puzzle);
            }
        }
    };

    FileManager.serializePuzzle = function(puzzle, extension, callback) {
        var parser = getParser(extension);
        if (parser instanceof Error) {
            callback(parser, null);
            return;
        }

        var serialized = parser.serialize(puzzle);
        if (!serialized) {
            callback(new Error("Error saving puzzle"), null);
        } else {
            callback(null, serialized);
        }
    };

    FileManager.presentDownload = function(str, filename) {
        var blob = new Blob([str], {type: "text/plain;charset=utf-8"});
        saveAs(blob, filename);
    };

    FileManager.isExtensionSupported = function(extension) {
        return extensionMap.hasOwnProperty(extension);
    };

    FileManager.getSupportedExtensions = function() {
        return Object.keys(extensionMap);
    };

    exports.FileManager = FileManager;
})(window);