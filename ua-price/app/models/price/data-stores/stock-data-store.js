import Ember from 'ember';
import stock from '../business-entities/stock';
import priceWidgetConfig from '../../../config/price-widget-config';
import utils from '../../../utils/utils';
import priceConstants from '../price-constants';
import appConfig from '../../../config/app-config';

export default Ember.Object.extend({
    subscriptionKey: 'stockDS',
    store: {},
    stockMapByExg: {},
    indexMapByExg: {},
    stockMapBySubMkt: {},
    assetTypesByExg: {},
    commoditiesCollection: Ember.A(),

    // Symbol Validation Params
    validationStockMap: {},
    isBulkAdditionInProgress: false,
    validationArrayMaxLength: 100,
    symbolValidationInterval: 1000, // 1 second
    counterMapByExg: {},
    stockPool: {},

    initialize: function () {
        this.priceService.subscribeFullMarketReceived(this.get('subscriptionKey'), this);
    },

    getStock: function (exchange, symbol, instype, subMarket, symbolStatus) {
        var key = utils.keyGenerator.getKey(exchange, symbol);
        var currentStore = this.get('store');
        var symbolObj = currentStore[key];
        var isAdded = false;

        if (!symbolObj) {
            var counterMapByExg = this.get('counterMapByExg');
            var stockPool = this.get('stockPool');

            if (!counterMapByExg[exchange]) {
                counterMapByExg[exchange] = 0;
            }

            var counter = counterMapByExg[exchange];
            var symStat = symbolStatus || priceConstants.SymbolStatus.Available;

            if (stockPool[exchange] && counter < stockPool[exchange].length && !utils.AssetTypes.isIndices(instype)) {
                symbolObj = stockPool[exchange][counter];
                symbolObj.setData({sym: symbol, exg: exchange, inst: instype, subMkt: subMarket, dSym: symbol, lDes: symbol, sDes: symbol, symStat: symStat});

                if (utils.validators.isAvailable(symbol)) {
                    counterMapByExg[exchange] = counter + 1;
                }

                isAdded = true;
            } else {
                symbolObj = stock.create({sym: symbol, exg: exchange, inst: instype, subMkt: subMarket, dSym: symbol, lDes: symbol, sDes: symbol, symStat: symStat});
            }

            currentStore[key] = symbolObj;

            if (instype !== undefined && utils.validators.isAvailable(symbol)) {
                this.addToOtherCollections(exchange, instype, symbolObj, subMarket, isAdded);
            }

            if (!this.get('isBulkAdditionInProgress')) {
                var validationStore = this.get('validationStockMap');
                validationStore[key] = symbolObj;
            }
        }

        return symbolObj;
    },

    getCommodity: function (exchange, symbol) {
        var key = utils.keyGenerator.getKey(exchange, symbol);
        var currentStore = this.get('store');
        var symbolObj = currentStore[key];

        if (!symbolObj) {
            var commodity = priceWidgetConfig.gms.findBy('sym', symbol);
            var commodities = this.get('commoditiesCollection');

            symbolObj = stock.create({sym: symbol, exg: exchange, dSym: symbol, lDes: symbol, sDes: symbol});
            symbolObj.icon = commodity.icon;
            commodities.pushObject(symbolObj);
            currentStore[key] = symbolObj;
        }

        return symbolObj;
    },

    initializeSymbolValidation: function () {
        var that = this;

        setTimeout(function () {
            that.validateSymbolsPeriodically();
        }, that.get('symbolValidationInterval'));
    },

    validateSymbolsPeriodically: function () {
        var that = this;
        var stockArray = [];
        var stockMap = that.get('validationStockMap');
        var count = 0;

        Ember.$.each(stockMap, function (key, val) {
            if (val) {
                stockArray[stockArray.length] = val;
                count++;

                if (count === that.get('validationArrayMaxLength')) {
                    that.priceService.sendSymbolValidationBulkRequest(stockArray);
                    stockArray = [];
                    count = 0;
                }
            }
        });

        if (stockArray.length > 0) {
            this.priceService.sendSymbolValidationBulkRequest(stockArray);
        }

        that.set('validationStockMap', {});

        setTimeout(function () {
            that.validateSymbolsPeriodically();
        }, that.get('symbolValidationInterval'));
    },

    removeFromValidationStockMap: function (exchange, symbol) {
        var key = utils.keyGenerator.getKey(exchange, symbol);
        var validationStockMap = this.get('validationStockMap');

        if (validationStockMap[key]) {
            validationStockMap[key] = undefined;
        }
    },

    setAnnouncement: function (annObj) {
        var exchange = annObj.exg;
        var symbol = annObj.sym;

        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            var stockObj = this.getStock(exchange, symbol);

            if (stockObj && (!stock.lAnn || stockObj.lAnn.dateObj > annObj.dateObj)) {
                stockObj.set('lAnn', annObj);
                stockObj.set('ann', annObj.get('dHed'));
            }
        }
    },

    addToOtherCollections: function (exchange, instype, stockObj, subMarket, isAdded) {
        var store = utils.AssetTypes.isIndices(instype) ? this.get('indexMapByExg') : this.get('stockMapByExg');

        if (!store[exchange]) {
            store[exchange] = Ember.A();
        }

        if (!isAdded && stockObj.isActive()) {
            store[exchange].pushObject(stockObj);
        }

        if (!utils.AssetTypes.isIndices(instype) && subMarket) {
            this.addToSubMarketStore(stockObj, exchange, subMarket);
        }

        this.addAssetType(exchange, instype, stockObj);
    },

    addToSubMarketStore: function (stockObj, exchange, subMarket) {
        var store = this.get('stockMapBySubMkt');

        if (!store[exchange]) {
            store[exchange] = {};
        }

        if (!store[exchange][subMarket]) {
            store[exchange][subMarket] = Ember.A();
        }

        if (stockObj.isActive()) {
            store[exchange][subMarket].pushObject(stockObj);
        }
    },

    addAssetType: function (exchange, instype, stockObj) {
        // Populate the unique instrument type array
        var isNoSubMarket = !stockObj.subMkt;
        var currentInstMapByExg = this.get('assetTypesByExg');
        var assetType, assetTypeDescription;

        if (appConfig.customisation.isGroupByAssetType){
            assetType = utils.AssetTypes.InstrumentToAssetMapping[instype];
            assetTypeDescription = utils.AssetTypes.AssetLangKeys[assetType];
        } else {
            assetType = instype;
            assetTypeDescription = utils.AssetTypes.InstrumentLangKeys[instype];
        }

        if (currentInstMapByExg[exchange]) {
            var arrInstTypes = currentInstMapByExg[exchange];
            var found = false;

            for (var a = 0; a < arrInstTypes.length; a++) {
                if (arrInstTypes[a].inst === assetType) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                arrInstTypes.pushObject({inst: assetType, desc: assetTypeDescription, isNoSubMarket: isNoSubMarket});
            }
        } else {
            currentInstMapByExg[exchange] = Ember.A([{inst: assetType, desc: assetTypeDescription, isNoSubMarket: isNoSubMarket}]);
        }
    },

    getIndexCollectionByExchange: function (exchange) {
        var indexMapByExg = this.get('indexMapByExg');

        if (!indexMapByExg[exchange]) {
            indexMapByExg[exchange] = Ember.A([]);
        }

        return indexMapByExg[exchange];
    },

    getSymbolCollectionByExchange: function (exchange) {
        var stockMapByExg = this.get('stockMapByExg');

        if (!stockMapByExg[exchange]) {
            this._createEmptyStockArray(stockMapByExg, exchange);
        }

        return stockMapByExg[exchange];
    },

    onFullMarketSnapshotReceived: function (exchange) {
        this._removeInactiveStocks(this.get('stockMapByExg')[exchange]);

        var that = this;
        var stocksBySubMkt = this.get('stockMapBySubMkt')[exchange];

        if (stocksBySubMkt) {
            Ember.$.each(stocksBySubMkt, function (subMkt) {
                that._removeInactiveStocks(stocksBySubMkt[subMkt]);
            });
        }
    },

    _removeInactiveStocks: function (stockArray) {
        if (stockArray) {
            var arrayLength = stockArray.length;

            for (var i = arrayLength - 1; i >= 0; i--) {
                if (!stockArray[i].isActive()) {
                    stockArray.splice(i, 1);
                }
            }
        }
    },

    _createEmptyStockArray: function (stockMapByExg, exchange) {
        var stockPool = this.get('stockPool');
        var symbolObj;

        stockMapByExg[exchange] = Ember.A([]);
        stockPool[exchange] = Ember.A([]);

        for (var count = 0; count < 25; count++) {
            symbolObj = stock.create({sym: '', exg: '', dSym: ''});
            stockMapByExg[exchange].pushObject(symbolObj);
            stockPool[exchange].pushObject(symbolObj);
        }
    },

    getAssetTypeCollectionByExchange: function (exchange) {
        var assetTypeMapByExg = this.get('assetTypesByExg');

        if (!assetTypeMapByExg[exchange]) {
            assetTypeMapByExg[exchange] = Ember.A([]);
        }

        return assetTypeMapByExg[exchange];
    },

    getStockCollection: function () {
        return this.get('store');
    },

    getStockCollectionBySubMarket: function (exchange, subMkt) {
        var store = this.get('stockMapBySubMkt');

        if (!store[exchange]) {
            store[exchange] = {};
        }

        if (!store[exchange][subMkt]) {
            store[exchange][subMkt] = Ember.A();
        }

        return store[exchange][subMkt];
    },

    beginBulkSymbolAddition: function () {
        this.set('isBulkAdditionInProgress', true);
    },

    endBulkSymbolAddition: function () {
        this.set('isBulkAdditionInProgress', false);
    }
});
