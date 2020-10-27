import Ember from 'ember';
import utils from '../../../utils/utils';
import PriceConstants from '../price-constants';

export default Ember.Object.extend({
    store: {},
    gmsByAssetType: Ember.A(),
    gmsSummaryByAssetType: Ember.A(),
    currentLanguage: '',
    status: 0,
    summarySymbolKeysByAssetType: {},

    init: function () {
        this._super();
        this.summarySymbolKeysByAssetType[PriceConstants.GmsType.Indices] = ['I:DJI', 'I:SP500', 'I:UKX', 'XU100', 'TASI', 'DFMGI', 'ADI', '11', 'GNRI', 'EGX30'];
        this.summarySymbolKeysByAssetType[PriceConstants.GmsType.Commodities] = ['PWTIUSDBR.SP', 'PBROUSDBR.SP', 'PXAUUSDOZ.SP', 'PXAGUSDOZ.SP', 'PXPTUSDOZ.SP', 'EBROUSDBR.SP', 'EWTIUSDBR.SP', 'SXAGUSDOZ.SP', 'SXPTUSDOZ.SP', 'SXAUUSDOZ.SP'];
        this.summarySymbolKeysByAssetType[PriceConstants.GmsType.Currencies] = ['EURUSD', 'EURSAR', 'EURAED'];
    },

    getGms: function (exchange, symbol, assetType, instrumentType) {
        var key = utils.keyGenerator.getKey(exchange, symbol);
        var store = this.get('store');
        var gmsObj = this.priceService.stockDS.getStock(exchange, symbol, instrumentType);

        if (!store[key]) {
            this.addToCategory(assetType, gmsObj);
            store[key] = gmsObj;
        }

        return gmsObj;
    },

    sendGmsRequest: function (language) {
        var reqStatus = utils.Constants.ReqStatus;

        if (this.currentLanguage !== language) {
            this.currentLanguage = language;
            this.set('status', reqStatus.NotSent);
        }

        if (this.status === reqStatus.NotSent || this.status === reqStatus.Failed) {
            this.priceService.sendGmsSummaryRequest();
            this.set('status', reqStatus.InProgress);
        }
    },

    addToCategory: function (assetType, gmsObj) {
        var currentGmsMapByAssetType = this.get('gmsByAssetType');

        if (currentGmsMapByAssetType[assetType]) {
            currentGmsMapByAssetType[assetType].pushObject(gmsObj);
        } else {
            currentGmsMapByAssetType[assetType] = Ember.A([gmsObj]);
        }
    },

    getGmsCollectionByAssetType: function (assetType) {
        var gmsByAssetType = this.get('gmsByAssetType');

        if (!gmsByAssetType[assetType]) {
            gmsByAssetType[assetType] = Ember.A([]);
        }

        return gmsByAssetType[assetType];
    },

    getSummaryCollectionByAssetType: function (assetType) {
        var summarySymbolKeys = this.summarySymbolKeysByAssetType[assetType];
        var assetSymbols = this.getGmsCollectionByAssetType(assetType);
        var gmsSummaryByAssetType = this.get('gmsSummaryByAssetType');
        var summarySymbols = gmsSummaryByAssetType[assetType];

        if (!summarySymbols) {
            summarySymbols = Ember.A([]);
            gmsSummaryByAssetType[assetType] = summarySymbols;
        }

        if (summarySymbols.length === 0) {
            if (summarySymbolKeys !== null) {
                Ember.$.each(assetSymbols, function (prop, gmsObj) {
                    if (summarySymbolKeys.indexOf(gmsObj.sym) > -1) {
                        summarySymbols.pushObject(gmsObj);
                    }
                });
            }
        }

        return summarySymbols;
    }
});
