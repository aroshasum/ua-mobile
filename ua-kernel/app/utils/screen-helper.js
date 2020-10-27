import Ember from 'ember';

export default (function () {
    var setZoomingFactor = function () {
        var width = screen.width;

        if (width === 1280) { // Detected 1280 x 800 resolution
            document.body.style.zoom = '110%';
            Ember.appGlobal.tabletConfig.zoomingFact = 1.1;
        }
    };

    return {
        setZoomingFactor: setZoomingFactor
    };
})();
