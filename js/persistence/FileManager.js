(function(exports) {
    /**
     * Handles parsing and serializing raw puzzle objects, serving as a facade for a bunch of
     * extension-specific parsers.
     *
     * This object is a singleton. To add support for a particular extension, create a FileParser
     * object and register it with this object via the registerParser function. A FileParser is
     * an object that contains the following functions:
     *
     *      function getSupportedExtensions() - returns an array of string extensions that parser
     *      supports. For example, if you were creating a parser for XML files, you would return
     *      ["xml"]
     *
     *      function parseString(string) - takes in a string of file contents as a parameter. The object
     *      should parse this string and return a raw puzzle object or null if the contents could
     *      not be parsed.
     *
     *      function serialize(rawPuzzle) - takes in a raw puzzle object and converts it to a string.
     *      This function is used for saving files. For example, an XML parser would return an XML
     *      representation of a puzzle that could then be saved to a file.
     */
    var FileManager = {};

    /* Maps extensions to FileParsers */
    var extensionMap = {};

    /**
     * Retrieves the parser for the specified extension
     *
     * @param extension {string} an extension without a leading dot
     * @returns {object|Error} a parser or an error object if a parser could not be found for the
     *              extension
     */
    function getParser(extension) {
        if (!extensionMap.hasOwnProperty(extension)) {
            return new Error("No parser found for extension: " + extension);
        }
        return extensionMap[extension];
    }

    /**
     * Parses the specified file contents using the specified parser.
     *
     * @param parser {object} the parser to use
     * @param contents {string} a string of file contents
     * @returns {object|Error} a puzzle object or an Error if the puzzle could not be parsed
     */
    function parse(parser, contents) {
        /* convert all line endings into the standard \n */
        contents = contents.replace(/\r\n/g, "\n");
        contents = contents.replace(/\r/g, "\n");

        var puzzle = parser.parseString(contents);
        if (!puzzle) {
            return new Error("Error parsing puzzle");
        }
        return puzzle;
    }

    /**
     * Registers a parser with the FileManager so that it can be used for parsing.
     *
     * @param parser {object} an object that implements the functions described in the FileManager
     *                  description
     */
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

    /**
     * Parses a file into a raw puzzle object. The appropriate parser is chosen based on the file's
     * extension.
     *
     * @param file {File} a JavaScript File object
     * @param callback {function(Error, object)} if the parse succeeds, the Error will be null.
     *              The second argument is the generated raw puzzle object and will be null if there
     *              was an error.
     */
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

    /**
     * Parses a string into a raw puzzle object.
     *
     * @param str {string} a string of file contents
     * @param extension {string} an extension (without a leading dot) used for selecting an
     *          appropriate parser
     * @param callback {function(Error, object)} if the parse succeeds, the Error will be null.
     *              The second argument is the generated raw puzzle object and will be null if there
     *              was an error.
     */
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

    /**
     * Generates a string representation of a raw puzzle object.
     *
     * @param puzzle {object} a raw puzzle object
     * @param extension {string} an extension (without a leading dot) used for selecting an
     *                  appropriate serializer
     * @param callback {function(Error, string} if the serialization succeeds, the Error will be
     *                  null. The second argument is the generated string object and will be null
     *                  if there was an error.
     */
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

    /**
     * Presents the passed string as a download to the user. This is typically used to present
     * serialized raw puzzle objects for download.
     *
     * @param str {string} the string you want the user to download
     * @param filename {string} a filename
     */
    FileManager.presentDownload = function(str, filename) {
        var blob = new Blob([str], {type: "text/plain;charset=utf-8"});
        saveAs(blob, filename);
    };

    /**
     * Returns true if a parser exists for the specified extension.
     *
     * @param extension {string} a file extension (without a leading dot)
     * @returns {boolean} true if a parser exists for the specified extension; false otherwise
     */
    FileManager.isExtensionSupported = function(extension) {
        return extensionMap.hasOwnProperty(extension);
    };

    /**
     * Returns an array of supported extensions.
     *
     * @returns {string[]} an array of string extensions (extensions will not have a leading dot)
     */
    FileManager.getSupportedExtensions = function() {
        return Object.keys(extensionMap);
    };

    exports.FileManager = FileManager;
})(window);