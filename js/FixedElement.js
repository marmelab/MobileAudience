function FixedElement(selector){
    this.wasDisplayed     = null;
    this.element          = $(selector);
    this.lastScale        = 1;
    this.isZooming        = false;

    this.lastScrollLeft   = null;
    this.lastScrollTop    = null;

    this.touchX           = 0;
    this.touchY           = 0;
    this.scrollEnabled    = true;

    window.addEventListener('touchstart', this.handleTouchStart.bind(this));
    window.addEventListener('touchmove', this.handleTouchMove.bind(this));
    window.addEventListener('gesturestart', this.hide.bind(this), false);
    window.addEventListener('gestureend', this.show.bind(this), false);
    window.ondevicemotion = this.handleDeviceMotion.bind(this);


    $(window).hammer().on('release', this.handleRelease.bind(this));
    $(window).hammer().on('pinch', this.handlePinch.bind(this));
    $(window).hammer().on('doubletap', this.handleRelease.bind(this));

    this.lastScale  = window.detectZoom.zoom();
    this.handleRelease();

    document.addEventListener("touchmove", this.hide.bind(this), false);
    document.addEventListener("scroll", this.handleRelease.bind(this), false);
}


FixedElement.prototype.hide = function(){
    if(this.wasDisplayed == null){
        this.wasDisplayed = this.element.css('display') != 'none';
    }

    this.element.hide();
};

FixedElement.prototype.show = function(){
    if(this.wasDisplayed){
        this.element.show();
    }

    this.wasDisplayed = null;
};

FixedElement.prototype.disable = function(){
    this.element.hammer().off('release');
    this.element.hammer().off('pinch');
};

FixedElement.prototype.enable = function(){
    this.initListeners();
};

FixedElement.prototype.handleTouchStart = function(e){
    this.touchX = e.touches[0].screenX;
    this.touchY = e.touches[0].screenY;
};

FixedElement.prototype.handleTouchMove = function(e){
    this.hide();

    var xMovement = Math.abs(e.touches[0].screenX - this.touchX);
    var yMovement = Math.abs(e.touches[0].screenY - this.touchY);

    if((yMovement * 3) > xMovement && !this.scrollEnabled) {
        e.preventDefault();
    }
};

FixedElement.prototype.handleDeviceMotion = function(e) {
    // Retrieve acceleration axis depending of the orientation
    var axis = window.orientation == 0 ? 'x' : 'y';
    var acceleration = e.accelerationIncludingGravity[axis];

    // Coerce the acceleration value
    var diff = Math.abs(7-Math.abs(acceleration));

    // Display fixed element depending of the orientation
    if(diff < 0.5){
        this.hide();
    }else if (diff > 3) {
        this.show();
    }
};

FixedElement.prototype.handlePinch = function(e){
    if(!this.isZooming){
        // Trigger events
        var event = new CustomEvent('zoomStart');
        this.element[0].dispatchEvent(event);
    }

    this.isZooming = true;
};

FixedElement.prototype.handleRelease = function(e){
    var top         = $(window).scrollTop();
    var left        = $(window).scrollLeft();

    // Avoid showing element when the scroll is running
    if(this.lastScrollLeft == null || (this.lastScrollLeft != left && this.lastScrollTop != top)){
        this.lastScrollLeft = left;
        this.lastScrollTop = top;

        return setTimeout(this.handleRelease.bind(this), 100);
    }

    this.applyChanges();
};

FixedElement.prototype.applyChanges = function(force){
    force           = force != undefined ? force : false;
    var top         = $(window).scrollTop();
    var left        = $(window).scrollLeft();

    if(this.isZooming || force){
        this.lastScale  = window.detectZoom.zoom();
    }

    // Trigger events
    var event = new CustomEvent('zoomEnd', {detail: {scale: this.lastScale}});
    this.element[0].dispatchEvent(event);

    this.setPosition(1/this.lastScale, left * this.lastScale, top * this.lastScale);

    this.lastScrollLeft = null;
    this.lastScrollTop  = null;
    this.isZooming      = false;

    this.show();
};

/**
 *
 * @param {Number} scale
 * @param {Number} x
 * @param {Number} y
 */
FixedElement.prototype.setPosition = function(scale, x, y){
    this.element
        .css('transform-origin', 'left top')
        .css('transform', 'scale(' + scale + ') translate(' + x + 'px, ' + y + 'px)');
};
