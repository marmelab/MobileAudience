/**
 * super simple carousel
 * animation between panes happens with css transitions
 */
function Carousel(element)
{
    var self          = this;
    var container     = null;
    var panes         = null;
    var pane_width    = 0;
    var pane_count    = null;
    var current_pane  = 0;
    var enabled       = true;

    element           = $(element);

    /**
     * initial
     */
    this.init = function() {
        container     = $(">ul", element);
        panes         = $(">ul>li", element);
        pane_width    = 0;
        pane_count    = panes.length;
        current_pane  = 0;

        this.setPaneDimensions();
        this.enable();

        element.hammer().on("release dragleft dragright swipeleft swiperight", handleHammer);

        return this;
    };

    /**
     * Disable carousel
     */
    this.disable = function(){
        enabled = false;

        return this;
    };

    /**
     * Enable carousel
     */
    this.enable = function(){
        enabled = true;

        return this;
    };

    /**
     * set the pane dimensions and scale the container
     */
    this.setPaneDimensions = function() {
        var height = $('div.chartContainer', panes[0]).height();
        pane_width = element.width();

        panes.each(function() {
            $(this).width(pane_width);
            $(this).height(height);
        });

        container.width(pane_width*pane_count);
        element.height(height);

        return this;
    };

    /**
     * show pane by index
     * @param   {Number}    index
     */
    this.showPane = function( index ) {
        if(!container){
            return;
        }

        // between the bounds
        index = Math.max(0, Math.min(index, pane_count-1));
        current_pane = index;

        var offset = -((100/pane_count)*current_pane);
        setContainerOffset(offset, true);

        e = new CustomEvent('slide', {
            detail: { slideNumber: current_pane },
            bubbles: true,
            cancelable: true
        });

        container[0].dispatchEvent(e);
    };


    function setContainerOffset(percent) {
        if(!container){
            return;
        }

        if(Modernizr.csstransforms) {
            container.css("transform", "translate("+ percent +"%,0)");
        }
        else {
            var px = ((pane_width*pane_count) / 100) * percent;
            container.css("left", px+"px");
        }
    }

    this.next = function() { return this.showPane(current_pane+1, true); };
    this.prev = function() { return this.showPane(current_pane-1, true); };

    function handleHammer(ev) {
        if(!enabled){
            return;
        }

        // disable browser scrolling
        ev.gesture.preventDefault();

        switch(ev.type) {
            case 'dragright':
            case 'dragleft':
                // stick to the finger
                var pane_offset = -(100/pane_count)*current_pane;
                var drag_offset = ((100/pane_width)*ev.gesture.deltaX) / pane_count;

                // slow down at the first and last pane
                if((current_pane == 0 && ev.gesture.direction == Hammer.DIRECTION_RIGHT) ||
                    (current_pane == pane_count-1 && ev.gesture.direction == Hammer.DIRECTION_LEFT)) {
                    drag_offset *= .4;
                }

                setContainerOffset(drag_offset + pane_offset);
                break;

            case 'swipeleft':
                self.next();
                ev.gesture.stopDetect();
                break;

            case 'swiperight':
                self.prev();
                ev.gesture.stopDetect();
                break;

            case 'release':

                // more then 50% moved, navigate
                var offset = Math.abs(ev.gesture.deltaX);

                if(offset > pane_width/2) {
                    if(ev.gesture.direction == 'right') {
                        self.prev();
                    } else {
                        self.next();
                    }
                }else {
                    self.showPane(current_pane, true);
                }

                break;
        }
    }
}
