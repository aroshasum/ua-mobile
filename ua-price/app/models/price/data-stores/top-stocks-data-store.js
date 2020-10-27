import Ember from 'ember';
import topStock from '../business-entities/topstock';

export default Ember.Object.extend({
    topStocksMapByExgs: {},
    defaultSubMarket: -1,

    createTopStocks: function (exchange, type, topStocks, subMarket) { // Sub market is last argument because it will not available in some exchanges so it will be optional
        var that = this;
        var topStocksMapByExg = this.get('topStocksMapByExgs');
        var topStocksForExg = topStocksMapByExg[exchange] ? topStocksMapByExg[exchange] : {};
        var subMkt = subMarket ? subMarket : this.defaultSubMarket;
        var topStocksForSubMkt = topStocksForExg[subMkt] ? topStocksForExg[subMkt] : {};
        var topStockArr = topStocksForSubMkt[type] ? topStocksForSubMkt[type] : Ember.A([]);

        if (topStocks && topStocks.length > 0) {
            Ember.$.each(topStocks, function (index, topVal) {
                var tempObj = topStockArr.objectAt(index);
                var valueObj = Ember.Object.create(topVal);

                if (tempObj === undefined) {
                    tempObj = topStock.create();
                    topStockArr.pushObject(tempObj);
                }

                valueObj.set('stock', that.priceService.stockDS.getStock(exchange, topVal.sym));
                tempObj.set('val', valueObj);
            });

            if (topStockArr.length > topStocks.length) {
                topStockArr.removeAt(topStocks.length, topStockArr.length - topStocks.length);
            }
        } else {
            topStockArr.clear();
        }

        topStocksForSubMkt[type] = topStockArr;
        topStocksForExg[subMkt] = topStocksForSubMkt;
        topStocksMapByExg[exchange] = topStocksForExg;
    },

    getTopStocksCollectionByType: function (exchange, type, subMarket) {
        var topStocksMapByExg = this.get('topStocksMapByExgs');
        var subMkt = subMarket ? subMarket : this.defaultSubMarket;

        if (!topStocksMapByExg[exchange] || !topStocksMapByExg[exchange][subMkt] || !topStocksMapByExg[exchange][subMkt][type]) {
            this.createTopStocks(exchange, type, [], subMarket);
        }

        return topStocksMapByExg[exchange][subMkt][type];
    }
});
