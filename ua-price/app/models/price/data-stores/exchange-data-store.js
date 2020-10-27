import Ember from 'ember';
import Exchange from '../business-entities/exchange';
import sharedService from '../../../models/shared/shared-service';
import utils from '../../../utils/utils';

export default Ember.Object.extend({
    store: {},

    getExchange: function (exchange) {
        var store = this.get('store');
        var exchangeObj = store[exchange];

        if (!exchangeObj) {
            store[exchange] = Exchange.create({'exg': exchange});
        }

        return store[exchange];
    },

    /* *
     * Read exchange metadata from browser storage and load into to memory
     * @param language Current language
     */
    populateExchangeMetadata: function (language) {
        this.populatePriceMeta(language);
        this.populatePriceExchangeMeta(language);
        this.populatePriceSymbolMeta(language);
    },

    /* *
     * Request for exchange metadata from the server
     * This function will be required only in initializer as it loads metadata from browser storage in pre-initialize-
     * and request for update in post-initialize
     * Other usages simply call to other utility methods like changeLanguage(), getExchangeMetadata() etc.
     * It will invoke required functions to load metadata as per need
     * This function will not check for data availability, instead of this will request with current version
     * @param exchange Exchange to request metadata
     * @param successFn Callback function for success event
     * @param errorFn Callback function for error event
     */
    requestExchangeMetadata: function (exchange, successFn, errorFn) {
        this.priceService.loadExchangeMetadata([exchange], successFn, errorFn);
        this.priceService.loadExchangeSymbolData([exchange]);
    },

    /* *
     * Request for exchange metadata for multiple all user exchanges from server
     * This function will filter out most required exchanges from total user exchange list based on below algorithm-
     * -to achieve higher performance by reducing unnecessary data loading and processing
     * Filter fo most required exchanges can be modified only from here without affecting other usages
     */
    requestAllExchangeMetadata: function () {
        var userExchanges = this._getUserRequiredExchanges();

        this.priceService.loadExchangeMetadata(userExchanges);
        this.priceService.loadExchangeSymbolData(userExchanges);
    },

    getExchangeMetadata: function (exg, isGlobal, callBackFn) {
        var isUserAllowedGlobal = isGlobal /* && this.priceService.userDS.isPriceUserExchange(exg)*/;

        var successFn = function () {

            if (isUserAllowedGlobal) {
                sharedService.userSettings.set('price.currentExchange', exg);
                sharedService.userSettings.set('price.currentIndex', this.getExchange(exg).get('mainIdx'));
                sharedService.userSettings.save();
            }

            if (Ember.$.isFunction(callBackFn)) {
                callBackFn();
            }
        };

        if (isUserAllowedGlobal) {
            sharedService.userState.globalArgs.exg = exg;
        }

        // Pass callBackFn as error function to allow login while price meta request fails
        this.requestExchangeMetadata(exg, successFn.bind(this), callBackFn);
        sharedService.userSettings.addToFavoriteExgs(exg);
    },

    populatePriceExchangeMeta: function (language) {
        this.priceService.priceExchangeMeta.load(language);
        this.priceService.processPriceExchangeMeta(language);
    },

    populatePriceMeta: function (language) {
        this.priceService.priceMeta.load(language);
        this.priceService.processPriceMeta(language);
    },

    populatePriceSymbolMeta: function (language) {
        this.priceService.priceSymbolMeta.load(language);
        this.priceService.processPriceSymbolMeta(language);
    },

    getDefaultSubMarket: function (exchange) {
        var defSubMkt;
        var exchangeObj = this.getExchange(exchange);
        var subMarkets = exchangeObj.subMarketArray;

        if (subMarkets) {
            Ember.$.each(subMarkets, function (key, item) {
                if (item && item.def === utils.Constants.Yes) {
                    defSubMkt = item;
                    return false;
                }
            });
        }

        if (defSubMkt) {
            return defSubMkt.marketId;
        } else {
            if (subMarkets && subMarkets.length > 0) {
                return subMarkets[0].marketId;
            } else {
                return -1;
            }
        }
    },

    _getUserRequiredExchanges: function () {
        var secondaryExgs = sharedService.userSettings.price.secondaryExchanges;
        var favoriteExgs = sharedService.userSettings.getFavoriteExgs();
        var recentExgs = sharedService.userState.recentExgs;
        var requiredExgs = [sharedService.userSettings.price.userDefaultExg];

        requiredExgs = this._addToRequiredExgs(recentExgs, requiredExgs);

        var tempExgArray = (favoriteExgs.length > 0) ? favoriteExgs : secondaryExgs;
        requiredExgs = this._addToRequiredExgs(tempExgArray, requiredExgs);

        return requiredExgs;
    },

    _addToRequiredExgs: function (exgArray, requiredExgs) {
        var index;

        Ember.$.each(exgArray, function (id, exg) {
            index = requiredExgs.indexOf(exg);

            if (index === -1) {
                requiredExgs[requiredExgs.length] = exg;
            }
        });

        return requiredExgs;
    },

    isSubMarketAvailable: function (exg) {
        var exchange = this.getExchange(exg);

        return exchange.subMarketArray && exchange.subMarketArray.length > 0;
    },

    updateOffsetTime: function (dlsObj) {
        var store = this.get('store');
        var that = this;

        Ember.$.each(store, function (key, val) {
            that.setTimeZoneValue(val, dlsObj[val.tzId]);
        });
    },

    setTimeZoneValue: function (exchangeObj, dlsObj) {
        if (dlsObj) {
            var currentDate = new Date();
            var cDate = utils.formatters.formatDateToDisplayDate(currentDate, true);
            var sDate = dlsObj.sDate;
            var eDate = dlsObj.eDate;
            var dls = dlsObj.dls;

            if (cDate >= sDate && cDate <= eDate) {
                var tzo = exchangeObj.tzo;

                tzo = tzo + dls;
                exchangeObj.set('tzo', tzo);
            }
        }
    }
});
