import Ember from 'ember';
import searchResultItem from '../../../models/price/business-entities/search-result-item';
import priceWidgetConfig from '../../../config/price-widget-config';
import PriceConstants from '../../../models/price/price-constants';
import utils from '../../../utils/utils';
import languageDataStore from '../../../models/shared/language/language-data-store';

export default Ember.Object.extend({
    symbolSearchResults: Ember.A(),
    recentSearchedItems: Ember.A(),
    app: languageDataStore.getLanguageObj(),

    initialFilteredContent: Ember.A(),
    initialFilteredMap: {},
    previousSearchNumber: {},

    filterSymbolFromLocalStorage: function (searchKey, exclInst, searchNumber) {
        var resultItem, groupingObj;
        var that = this;
        var stocks = this.getStockCollection();
        var config = priceWidgetConfig.globalSearch.groups;
        var priceUser = this.priceService.userDS;

        if (stocks) {
            var filteredContent = Ember.$.map(stocks, function (value) {
                var companyId = value.cid.toString();

                if (((utils.validators.isAvailable(value.sym) && value.sym.isExist(searchKey)) ||
                    (utils.validators.isAvailable(value.lDes) && value.lDes.isExist(searchKey)) ||
                    (utils.validators.isAvailable(value.sDes) && value.sDes.isExist(searchKey)) ||
                    (utils.validators.isAvailable(value.cid) && companyId.isExist(searchKey))) &&
                    utils.validators.isAvailable(value.inst) &&
                    (!exclInst || exclInst.length <= 0 || exclInst.indexOf(value.inst) < 0) && value.exg !== 'GLOBAL' &&
                    priceUser.isExchangeSubscribed(value.exg)) {

                    // Above line is intentionally left blank to separate conditional statement
                    // TODO: [Eranga G] Instrument types filtering is added temorary in order to avoid duplicating TASI
                    // symbol in search result. This statement can be removed after stopping adding index to stock collection

                    resultItem = searchResultItem.create();
                    groupingObj = config[value.ast] ? config[value.ast] : config.other;

                    resultItem.setData({
                        sym: value.sym,
                        exg: value.exg,
                        dSym: value.dSym,
                        inst: value.inst,
                        lDes: value.lDes,
                        sDes: value.sDes,
                        ast: value.ast,
                        subMkt: value.subMkt,
                        dispProp1: value.get('dispProp1'),
                        groupingObj: groupingObj
                    });

                    var exchange = that.priceService.exchangeDS.getExchange(value.exg);
                    resultItem.set('de', exchange.de ? exchange.de : exchange.exg);

                    return resultItem;
                }
            });

            if (filteredContent && filteredContent.length > 0) {
                var mergedContent = this._mergeServerLocalContent(filteredContent, searchNumber);

                this._groupFilteredContent(mergedContent, searchKey);
            } else {
                this._setSearchResultUnavailability();
            }
        }
    },

    getStockCollection: function () {
        return this.priceService.stockDS.getStockCollection();
    },

    _groupFilteredContent: function (filteredContent, searchKey) {
        var that = this;
        var hasType, type, groupSetting, assetType, resultArray, priority;
        var config = priceWidgetConfig.globalSearch.groups;
        var resultLimit = priceWidgetConfig.globalSearch.maxResultsForGroup;

        Ember.$.each(filteredContent, function (key, item) {
            assetType = item.get('ast');
            groupSetting = config[assetType] ? config[assetType] : config.other;

            /* if (item.sym.isExactMatch(searchKey) || item.lDes.isExactMatch(searchKey) || item.sDes.isExactMatch(searchKey)) {
             groupSetting = config.topHits;
             } else if (item.sym.isStartedWith(searchKey) || item.lDes.isStartedWith(searchKey) || item.sDes.isStartedWith(searchKey)) {
             hasStartingChar = true;
             }*/

            // TODO: [Nipun] Top Hits implementation should be done

            if (utils.validators.isAvailable(item.sym) && item.sym.isExactMatch(searchKey)) {
                priority = 1;
            } else if (utils.validators.isAvailable(item.sDes) && item.sDes.isExactMatch(searchKey)) {
                priority = 2;
            } else if (utils.validators.isAvailable(item.lDes) && item.lDes.isExactMatch(searchKey)) {
                priority = 3;
            } else if (utils.validators.isAvailable(item.sym) && item.sym.isStartedWith(searchKey)) {
                priority = 4;
            } else if (utils.validators.isAvailable(item.sDes) && item.sDes.isStartedWith(searchKey)) {
                priority = 5;
            } else if (utils.validators.isAvailable(item.lDes) && item.lDes.isStartedWith(searchKey)) {
                priority = 6;
            } else {
                priority = 7;
            }

            type = groupSetting.type;
            hasType = that.symbolSearchResults.findBy('type', type);

            if (!hasType) {
                that.symbolSearchResults.pushObject(Ember.Object.create({
                    type: type,
                    rank: groupSetting.rank,
                    name: that.app.lang.labels[groupSetting.lanKey],
                    colorCss: groupSetting.colorCss,
                    contents: Ember.A()
                }));
            }

            resultArray = that.symbolSearchResults.findBy('type', type).get('contents');

            item.set('priority', priority);
            resultArray.pushObject(item);

            if (resultArray.length > resultLimit) {
                resultArray.pop();
            }
        });

        Ember.$.each(this.symbolSearchResults, function (key, item) {
            item.set('contents', item.get('contents').sortBy('priority'));
        });

        var sortedSymbolSearchResult = this.symbolSearchResults.sortBy('rank');

        this.symbolSearchResults.clear();
        this.symbolSearchResults.pushObjects(sortedSymbolSearchResult);
    },

    _setSearchResultUnavailability: function () {
        if (this.symbolSearchResults.length === 0) {
            this.symbolSearchResults.pushObject(Ember.Object.create({
                isDataUnavailable: true
            }));
        }
    },

    _mergeServerLocalContent: function (filteredContent, searchNumber) {
        var that = this;
        this.symbolSearchResults.clear();

        if (this.previousSearchNumber !== searchNumber) {
            this.initialFilteredContent.clear();
            this.initialFilteredMap = {};
            this.previousSearchNumber = searchNumber;
        }

        if (this.initialFilteredContent.length > 0) {
            Ember.$.each(filteredContent, function (key, item) {
                var itemKey = [item.sym, item.exg].join('~');

                if (!that.initialFilteredMap[itemKey]) {
                    that.initialFilteredContent.pushObject(item);
                }
            });
        } else {
            Ember.$.each(filteredContent, function (key, item) {
                var itemKey = [item.sym, item.exg].join('~');
                that.initialFilteredMap[itemKey] = item;
            });

            this.initialFilteredContent.pushObjects(filteredContent);
        }

        return this.initialFilteredContent;
    },

    getSymbolSearchResults: function () {
        return this.symbolSearchResults;
    },

    filterSymbolSearchResults: function (searchKey, language, exclInst, params) {
        this.symbolSearchResults.clear();

        var searchNumber = Math.random();
        var userDataStore = this.priceService.userDS;

        this.filterSymbolFromLocalStorage(searchKey, exclInst, searchNumber);

        if (userDataStore.get('isMultipleUserExchangesAvailable') || userDataStore.isNonDefaultExchangesAvailable()) {
            this.priceService.sendSymbolSearchRequest(searchKey, language, PriceConstants.SymbolSearchPageSize, this.getFilteredContentFromServer.bind(this), params, searchNumber);
        }
    },

    getFilteredContentFromServer: function (isSuccess, searchKey, content, searchNumber) {
        if (isSuccess) {
            var mergedContent = this._mergeServerLocalContent(content, searchNumber);
            this._groupFilteredContent(mergedContent, searchKey);
        } else {
            this._setSearchResultUnavailability();
        }
    },

    addRecentSearchedItem: function (searchedItem) {
        if (searchedItem.sym) {
            var isAvailableInRecentArray = false;

            Ember.$.each(this.recentSearchedItems, function (key, recentSymbol) {
                if (recentSymbol.sym === searchedItem.sym) {
                    isAvailableInRecentArray = true;
                }
            });

            if (!isAvailableInRecentArray) {
                this.recentSearchedItems.pushObject(searchedItem);
            }
        }
    },

    getRecentSearchedItems: function () {
        return this.recentSearchedItems;
    }
});
