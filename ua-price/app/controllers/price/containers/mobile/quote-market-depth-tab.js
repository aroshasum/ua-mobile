import BaseController from '../../../base-controller';
import sharedService from '../../../../models/shared/shared-service';
import priceConstants from '../../../../models/price/price-constants';

export default BaseController.extend({
    stock: {},
    windowTypes: {},
    isDepthByPriceAvailable: true,
    isDepthByOrderAvailable: true,

    priceService: sharedService.getService('price'),

    onPrepareData: function () {
        var symbol = this.get('sym');
        var exchange = this.get('exg');
        var insType = this.get('inst');

        this.priceService.addSymbolRequest(exchange, symbol, insType);
        this.set('stock', this.priceService.stockDS.getStock(exchange, symbol, insType));

        this.set('isDepthByOrderAvailable', this.priceService.userDS.isWindowTypeAvailable([priceConstants.WindowType.MarketDepthByOrder, priceConstants.WindowType.MarketDepthByOrderAdvanced], exchange));
        this.set('isDepthByPriceAvailable', this.priceService.userDS.isWindowTypeAvailable([priceConstants.WindowType.MarketDepthByPrice, priceConstants.WindowType.MarketDepthByPriceAdvanced], exchange));
    },

    onClearData: function () {
        this.priceService.removeIndexRequest(this.get('exg'), this.get('sym'), this.get('inst'));
        this.set('stock', []);
    }
});
