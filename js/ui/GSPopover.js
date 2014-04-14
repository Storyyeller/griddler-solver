(function(exports) {
    exports.GSPopover = function(triggerElement, popoverElement) {
        popoverElement.css("display", "none");
        popoverElement.css("position", "absolute");
        popoverElement.remove();
        $(document.body).append(popoverElement);

        function hoverIn(evt) {
            var top, left;

            top = evt.pageY - popoverElement.offset().top;
            left = evt.pageX - popoverElement.offset().left;

            popoverElement.css("display", "block");
            popoverElement.css("top", top);
            popoverElement.css("left", left);
            popoverElement.css("z-index", "999999");
        }

        function hoverOut(evt) {
            popoverElement.css("display", "none");
        }

        triggerElement.hover(hoverIn, hoverOut);
    };
})(window);