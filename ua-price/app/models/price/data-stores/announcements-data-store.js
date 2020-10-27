import Ember from 'ember';
import announcement from '../business-entities/announcement';
import PriceConstants from '../price-constants';
import WebStorage from '../../../utils/web-storage';
import utils from '../../../utils/utils';
import sharedService from '../../../models/shared/shared-service';

export default Ember.Object.extend({
    store: {},
    annStoreArray: Ember.A(),
    newsStoreArray: Ember.A(),
    annNewsStoreArray: Ember.A(),
    storeMapBySymbolExchange: {},
    isNewItemsAvailable: true,
    annCacheTimerID: undefined,
    contentSearchStore: Ember.A(),
    searchStore: {},
    isCachingEnabled: true,

    createAnnouncement: function (annsId, type, sym, exg) {
        var that = this;
        var currentStore = that.get('store');

        currentStore[type] = currentStore[type] || {};

        if (!currentStore[type][annsId]) {
            var annObj = this.getAnnouncement(annsId, type, sym, exg);
            var arr = Ember.A();
            var annNewsArr = that.get('annNewsStoreArray');

            if (type === PriceConstants.ResponseType.Data.ResponseNews) {
                arr = that.get('newsStoreArray');
            } else if (type === PriceConstants.ResponseType.Data.ResponseAnnouncement) {
                arr = that.get('annStoreArray');
            }

            arr.pushObject(annObj);
            annNewsArr.pushObject(annObj);
            that.isNewItemsAvailable = true;

            // Initiate the timer for caching. At least n items needs to be there for caching
            if (!that.get('annCacheTimerID')) {
                var timerID = setTimeout(function () {
                    that.cacheAnnouncementsTimer(PriceConstants.TimeIntervals.AnnouncementCachingInterval * 30);
                }, PriceConstants.TimeIntervals.AnnouncementCachingInterval);

                that.set('annCacheTimerID', timerID);
            }
        }

        return currentStore[type][annsId];
    },

    addToOtherCollections: function (annObj, type) {
        var key = utils.keyGenerator.getKey(annObj.exg, annObj.sym);
        var currentStore = this.get('storeMapBySymbolExchange');

        currentStore[type] = currentStore[type] || {};

        var annCollectionBySym = currentStore[type][key];

        if (annCollectionBySym) {
            // Add to announcement collection which is managed for symbol
            annCollectionBySym.pushObject(annObj);
        }
    },

    getAnnouncement: function (annId, type, sym, exg) {
        var currentStore = this.get('store');
        currentStore[type] = currentStore[type] || {};

        var annObj = currentStore[type][annId];

        if (!annObj) {
            var dSymExg;

            if (utils.validators.isAvailable(sym)) {
                dSymExg = sym;
            } else {
                var exchangeObj = sharedService.getService('price').exchangeDS.getExchange(exg);
                dSymExg = exchangeObj && exchangeObj.de ? exchangeObj.de : exg;
            }

            annObj = announcement.create({
                type: type,
                id: annId
            });

            var dispProp1;
            var that = this;

            if (sym && sym.indexOf(',') > -1) {
                var symArray = sym.split(',');
                var dispPropArray = [];

                Ember.$.each(symArray, function (indexValue, symValue) {
                    dispProp1 = that._getDispProp1(symValue, exg);
                    dispPropArray[dispPropArray.length] = dispProp1 ? dispProp1 : dSymExg;
                });

                annObj.set('dispProp1', dispPropArray.join(', '));
            } else if (sym) {
                dispProp1 = this._getDispProp1(sym, exg);
                annObj.set('dispProp1', (dispProp1 ? dispProp1 : dSymExg));
            } else {
                annObj.set('dispProp1', dSymExg);
            }

            currentStore[type][annId] = annObj;
        }

        return annObj;
    },

    cacheAnnouncementNews: function () {
        if (this.isCachingEnabled) {
        // Flag for validating if there are new items available
            if (this.isNewItemsAvailable) {
                var storageObj = {};

                var newsSlicedArr = this.get('newsStoreArray').sortBy('dDt').slice(Math.max(this.get('newsStoreArray').get('length') - PriceConstants.AnnouncementNewsCashSize, 0));
                var annSlicedArr = this.get('annStoreArray').sortBy('dDt').slice(Math.max(this.get('annStoreArray').get('length') - PriceConstants.AnnouncementNewsCashSize, 0));

                storageObj[PriceConstants.ResponseType.Data.ResponseNews] = newsSlicedArr;
                storageObj[PriceConstants.ResponseType.Data.ResponseAnnouncement] = annSlicedArr;

                WebStorage.addObject(WebStorage.getKey(utils.Constants.CacheKeys.LatestAnnouncements), storageObj, utils.Constants.StorageType.Local);
                this.isNewItemsAvailable = false;
            }
        }
    },

    cacheAnnouncementsTimer: function (nextCachingInterval) {
        if (this.isCachingEnabled) {
            // This function will cache the top n items, which will be used for next time loading.
            // Caching will periodically check and update to have the latest ones in the cash
            this.cacheAnnouncementNews();

            var that = this;
            // Next execution
            var timerID = setTimeout(function () {
                that.cacheAnnouncementsTimer(PriceConstants.TimeIntervals.AnnouncementCachingInterval * 30);
            }, nextCachingInterval);

            that.set('annCacheTimerID', timerID);
        }
    },

    getAnnCollectionBySymbol: function (exchange, symbol) {
        var key = utils.keyGenerator.getKey(exchange, symbol);
        var currentStore = this.get('storeMapBySymbolExchange');
        var annCollectionBySym = currentStore[key];

        if (!annCollectionBySym) {
            annCollectionBySym = Ember.A([]);
            currentStore[key] = annCollectionBySym;
        }

        return annCollectionBySym;
    },

    loadCachedStore: function () {
        if (this.isCachingEnabled) {
            var that = this;

            var _loadAnnNews = function (dataArray) {
                if (dataArray) {
                    Ember.$.each(dataArray, function (key, value) {
                        var annObj = value;

                        if (annObj && annObj.hed) {
                            var newAnnObj = that.createAnnouncement(annObj.id, annObj.type);
                            newAnnObj.setData(annObj);
                        }
                    });
                }
            };

            var storageObj = WebStorage.getObject(WebStorage.getKey(utils.Constants.CacheKeys.LatestAnnouncements));

            if (storageObj) {
                _loadAnnNews(storageObj[PriceConstants.ResponseType.Data.ResponseNews]);
                _loadAnnNews(storageObj[PriceConstants.ResponseType.Data.ResponseAnnouncement]);
            }
        }
    },

    removeAnnCollectionBySymbol: function (exchange, symbol) {
        var key = utils.keyGenerator.getKey(exchange, symbol);
        var currentStore = this.get('storeMapBySymbolExchange');

        currentStore[key] = null;
    },

    getContentSearchResult: function () {
        return this.get('contentSearchStore');
    },

    getAnnouncementSearchCollection: function (key) {
        var searchStore = this.get('searchStore');

        if (!searchStore[key]) {
            searchStore[key] = Ember.A([]);
        }

        return searchStore[key];
    },

    removeAnnouncementSearchCollection: function (key) {
        var searchStore = this.get('searchStore');

        if (searchStore[key]) {
            searchStore[key] = null;
        }
    },

    filterContentSearchResults: function (searchKey, language, isEnabledAnnSearch, isEnabledNewsSearch, notifyFn) {
        this.get('contentSearchStore').clear();

        if (isEnabledAnnSearch) {
            this.priceService.sendAnnouncementSearchRequest({
                searchKey: searchKey,
                language: language,
                pageSize: PriceConstants.AnnouncementSearchPageSize,

                reqSuccessFn: function () {

                },

                reqFailureFn: function () {
                    notifyFn();
                }
            }, this.get('contentSearchStore'));
        }

        if (isEnabledNewsSearch) {
            this.priceService.sendNewsSearchRequest({
                searchKey: searchKey,
                language: language,
                pageSize: PriceConstants.NewsSearchPageSize,

                reqSuccessFn: function () {
                },

                reqFailureFn: function () {
                    notifyFn();
                }
            });
        }
    },

    _getDispProp1: function (sym, exg) {
        if (sym && exg) {
            var stockObj = this.priceService.stockDS.getStock(exg, sym);
            return stockObj.get('dispProp1');
        }
    },

    _formatDisplaySymExg: function (sym, exg) {
        var dSymExg;
        var isSymAvailable = utils.validators.isAvailable(sym);
        var symExg = isSymAvailable ? sym : exg;

        // To add delayed icon when when the symbol and exchange are same in the announcement object. eg: sym: 'TDWL', exg: 'TDWL'
        // DFM exchange having a symbol DFM.
        if (sym === exg) {
            isSymAvailable = false;
        }

        if (symExg.indexOf(utils.Constants.StringConst.Comma) >= 0) {
            var that = this;
            var dSymExgArray = [];
            var symExgArray = symExg.split(utils.Constants.StringConst.Comma);

            symExgArray.forEach(function (value) {
                var symExgItem = value.trim();

                dSymExgArray[dSymExgArray.length] = isSymAvailable ? that.priceService.stockDS.getStock(exg, symExgItem).dSym : that.priceService.exchangeDS.getExchange(symExgItem).de;
            });

            dSymExg = dSymExgArray.join(', ');
        } else {
            dSymExg = isSymAvailable ? this.priceService.stockDS.getStock(exg, sym).dSym : this.priceService.exchangeDS.getExchange(exg).de;
        }

        return dSymExg;
    }
});
