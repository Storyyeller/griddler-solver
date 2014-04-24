(function(exports) {
    var i = 0;

    /**
     * Turns a DOM element into a popover.
     *
     * @param triggerElement {DOMElement} a DOM element that, when clicked, will cause the popover to display
     * @param popoverElement {DOMElement} the actual popover that will be displayed when the trigger is clicked
     * @param top {boolean} whether the popover should display at the top or bottom of the trigger
     * @param left {boolean} whether the popover should display at the left or right of the trigger
     */
    exports.GSPopover = function(triggerElement, popoverElement, top, left) {
        var clickEventName = "click." + "popover" + (i++);

        var jBody = $(document.body);

        /* append the popover to the body so it displays on top of everything else */
        popoverElement.css("display", "none");
        popoverElement.css("position", "absolute");
        popoverElement.remove();
        jBody.append(popoverElement);

        function showPopover() {
            popoverElement.css("display", "block");
            popoverElement.css("z-index", "999999");

            /* add a body click handler that dismisses the popover
             * clickEventName is a name for the handler. Assigning the handler a name will allow us
             * to remove it later */
            jBody.on(clickEventName, function(evt) {
                hidePopover();
            })
        }

        function hidePopover() {
            popoverElement.css("display", "none");
            /* remove the popup dismissal click listener just so the body doesn't have too many
               listeners attached */
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

        function isPopoverBeingDisplayed() {
            return (popoverElement.css("display") !== "none");
        }

        triggerElement.click(function(evt) {
            /* stop proagation so the click event doesn't reach the body handler that dismisses
             the popover */
            evt.stopPropagation();

            if (isPopoverBeingDisplayed()) {
                hidePopover();
            } else {
                positionPopover();
                showPopover();
            }
        });

        popoverElement.click(function(evt) {
            /* stop propagation so a click event on the popover won't reach the body handler (if
               it does reach the body handler, the popup will be dismissed) */
            evt.stopPropagation();
        });
    };
})(window);