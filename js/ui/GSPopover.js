(function(exports) {
    var i = 0;

    exports.GSPopover = function(triggerElement, popoverElement, top, left) {
        var clickEventName = "click." + "popover" + (i++);

        var jBody = $(document.body);

        popoverElement.css("display", "none");
        popoverElement.css("position", "absolute");
        popoverElement.remove();
        jBody.append(popoverElement);

        function showPopover() {
            popoverElement.css("display", "block");
            popoverElement.css("z-index", "999999");
            jBody.on(clickEventName, function(evt) {
                hidePopover();
            })
        }

        function hidePopover() {
            popoverElement.css("display", "none");
            jBody.off(clickEventName);
        }

        function positionPopover() {
            var offset = triggerElement.offset();

            var x, y;

            if (left) {
                x = offset.left - popoverElement.outerWidth(true);
            } else {
                x = offset.left + triggerElement.outerWidth(true);
            }

            if (top) {
                y = offset.top - popoverElement.outerHeight(true);
            } else {
                y = offset.top + triggerElement.outerHeight(true);
            }

            popoverElement.css("top", y);
            popoverElement.css("left", x);
        }

        triggerElement.click(function(evt) {
            positionPopover();
            showPopover();
            evt.stopPropagation();
        });

        popoverElement.click(function(evt) {
            evt.stopPropagation();
        });
    };
})(window);