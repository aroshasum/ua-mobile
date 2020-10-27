import Ember from 'ember';
import utils from '../../../utils/utils';
import OptionStockEntity from '../business-entities/option-stock-entity';

export default Ember.Object.extend({
    store: {},
    stockEntityMap: {},

    getOptionStock: function (exchange, symbol) {
        var currentStore = this.get('store');
        var key = utils.keyGenerator.getKey(exchange, symbol);

        return currentStore[key];
    },

    setOptionStockEntityList: function (entityList) {
        var that = this;

        if (entityList) {
            Ember.$.each(entityList, function (key, val) {
                var stockEntityObj;
                var currentStore = that.get('store');
                var callKey = utils.keyGenerator.getKey(val.optExg, val.cSym);
                var putKey = utils.keyGenerator.getKey(val.optExg, val.pSym);

                if (!currentStore[callKey]) {
                    stockEntityObj = OptionStockEntity.create({baseSym: val.sym, trdExg: val.exg, optPrd: val.optPrd,
                        strkPrc: val.strkPrc, nearMon: val.nearMon, optWeek: val.optWeek, optExg: val.optExg});

                    var callStock = that.priceService.stockDS.getStock(val.optExg, val.cSym, utils.AssetTypes.Option);
                    var putStock = that.priceService.stockDS.getStock(val.optExg, val.pSym, utils.AssetTypes.Option);

                    stockEntityObj.set('cStock', callStock);
                    stockEntityObj.set('pStock', putStock);

                    that._addToOtherCollection(val.exg, val.sym, val.optPrd, stockEntityObj);
                }

                if (!currentStore[callKey]) {
                    currentStore[callKey] = stockEntityObj;
                }

                if (!currentStore[putKey]) {
                    currentStore[putKey] = stockEntityObj;
                }
            });
        }
    },

    getOptionStockList: function (exchange, symbol, optPeriod) {
        return optPeriod ? this._getStockCollection(exchange, symbol, optPeriod) : Ember.A();
    },

    getDefaultOptionPeriod: function (exchange, symbol) {
        var defaultPeriod;
        var periodList = this.priceService.optionPeriodDS.getOptionPeriodList(exchange, symbol);

        if (periodList.length > 0) {
            defaultPeriod = periodList.sortBy('optPrd')[0];
        }

        return defaultPeriod ? defaultPeriod.optPrd : undefined;
    },

    _addToOtherCollection: function (exchange, symbol, optPeriod, entityObj) {
        this._getStockCollection(exchange, symbol, optPeriod, entityObj);
    },

    _getStockCollection: function (exchange, symbol, optPeriod, entityObj) {
        var stockEntityMap = this.get('stockEntityMap');

        if (!stockEntityMap[exchange]) {
            stockEntityMap[exchange] = {};
        }

        if (!stockEntityMap[exchange][symbol]) {
            stockEntityMap[exchange][symbol] = {};
        }

        if (!stockEntityMap[exchange][symbol][optPeriod]) {
            stockEntityMap[exchange][symbol][optPeriod] = Ember.A();
        }

        if (entityObj) {
            stockEntityMap[exchange][symbol][optPeriod].pushObject(entityObj);
        }

        return stockEntityMap[exchange][symbol][optPeriod];
    }
});
