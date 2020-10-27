import BaseController from '../../../base-controller';
import sharedService from '../../../../models/shared/shared-service';

export default BaseController.extend({
    stock: {},
    priceService: sharedService.getService('price'),

    onPrepareData: function () {
        this.priceService.addSymbolRequest(this.get('exg'), this.get('sym'), this.get('inst'));
        this.set('stock', this.priceService.stockDS.getStock(this.get('exg'), this.get('sym'), this.get('inst')));
        this.checkScreenResolution();
    },

    onClearData: function () {
        this.priceService.removeIndexRequest(this.get('exg'), this.get('sym'), this.get('inst'));
        this.set('stock', []);
    },

    checkScreenResolution: function () {
        var lowResolutionWidth = 340;

        if (window.screen.width <= lowResolutionWidth) {
            this.set('containerPaddingCss', 'low-res-padding-right');
        }
    }.on('init')
});

