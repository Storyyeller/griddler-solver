(function(exports) {
    var extensionMap = {};

    var FileManager = {};

    FileManager.registerParser = function(parser) {
        parser.getSupportedExtensions().forEach(function(extension) {
            if (extensionMap[extension]) {
                throw new Error("parser already exists for extension: " + extension);
            }
            extensionMap[extension] = parser;
        });
    };

    FileManager.parse = function(file, callback) {
        var lastDot = file.name.lastIndexOf(".");
        if (lastDot === -1) {
            throw new Error("file does not have an extension so its type cannot be determined");
        }

        var extension = file.name.substring(lastDot + 1);

        if (!extensionMap[extension]) {
            throw new Error("no parser exists for extension: " + extension);
        }

        var reader = new FileReader();
        reader.onloadend = function(evt) {
            if (evt.target.readyState === FileReader.DONE) {
                var fileContents = evt.target.result;
                var parser = extensionMap[extension];
                var puzzle = parser.parse(fileContents);
                callback(puzzle);
            }
        }
        reader.readAsText(file);
    };

    FileManager.getSupportedExtensions = function() {
        return extensionMap.keys();
    };

    exports.FileManager = FileManager;
})(window);