import Ember from 'ember';
import TableController from '../../../shared/table-controller';
import sharedService from '../../../../models/shared/shared-service';
import appEvents from '../../../../app-events';
import utils from '../../../../utils/utils';
import appConfig from '../../../../config/app-config';

export default TableController.extend({
    priceService: sharedService.getService('price'),
    tradeService: sharedService.getService('trade'),
    columnDeclarations: [],
    textFilter: undefined,
    isRefreshed: false,
    isNoSubMarket: false,
    currentSubMarketId: undefined,
    subMktMap: {},
    selectedLink: 1,

    isTablet: appConfig.customisation.isTablet,
    isMobile: appConfig.customisation.isMobile,

    onLoadWidget: function () {
        this.setCellViewsScopeToGlobal();

        // Subscribe for onExchangedChanged only from quote-watch-list - Need to pass 'isSubExgChanged' boolean from layout config args
        if (this.get('isSubExgChanged')) {
            appEvents.subscribeExchangeChanged(this.get('selectedLink'), this.get('wkey'), this);
        }
    },

    onPrepareData: function () {
        var exgCode = this.get('exg');
        this.priceService.exchangeDS.getExchangeMetadata(exgCode, undefined, this.onPriceMetaReceived.bind(this));

        this.set('exchange', this.priceService.exchangeDS.getExchange(exgCode));
        this.set('defaultExchangeForDropdown', {code: exgCode});

        this.loadContent();
        this.addObserver('masterContent.@each', this.filterStocks);
    },

    onAddSubscription: function () {
        var exg = this.get('exg');
        this.priceService.addFullMarketSymbolRequest(exg);

        if (this._isBoardEnabledExchange(exg)) {
            this.priceService.addXStreamBulkRequest(exg);
        }
    },

    onRemoveSubscription: function () {
        var exg = this.get('exg');
        this.priceService.removeFullMarketSymbolRequest(exg);

        if (this._isBoardEnabledExchange(exg)) {
            this.priceService.removeXStreamBulkRequest(exg);
        }
    },

    onClearData: function () {
        this.set('currentSubMarketId', undefined);
        this.set('content', Ember.A());
        this.set('masterContent', Ember.A());
    },

    onUnloadWidget: function () {
        this.set('defaultExchange', undefined);
        this.set('selectedExchange', undefined);

        if (this.get('isSubExgChanged')) {
            appEvents.unSubscribeExchangeChanged(this.get('selectedLink'), this.get('wkey'), this);
        }
    },

    onLanguageChanged: function (language) {
        this.setLangLayoutSettings(language);
        this.toggleProperty('isRefreshed');
    },

    loadContent: function (data) {
        var exg = this.get('exchange.exg');
        var stockArray = data ? data[exg] : undefined;
        var currentMktId = this.get('currentSubMarketId');
        var isNoSubMarket = this.get('isNoSubMarket');

        if (!stockArray) {
            var marketId = currentMktId ? currentMktId : this.priceService.exchangeDS.getDefaultSubMarket(exg);
            this.set('currentSubMarketId', marketId);

            if (!isNoSubMarket && exg && marketId && marketId !== -1) {
                stockArray = this.priceService.stockDS.getStockCollectionBySubMarket(exg, marketId);
            } else if (exg) {
                stockArray = this.priceService.stockDS.getSymbolCollectionByExchange(exg);
            }
        }

        this.set('content', stockArray);
        this.set('masterContent', stockArray);
    },

    checkFilterMatch: function (stock, textFilter) {
        var field;
        var isMatchedTextFilter = !textFilter;  // If a argument is false, that means that filter is not applied

        if (!isMatchedTextFilter) {
            for (field in stock) {
                if (stock.hasOwnProperty(field) && (field === 'dSym' || field === 'sym' || field === 'sDes' || field === 'lDes' || field === 'cid') && stock[field] && stock[field].toString().slice(0, textFilter.length).toLowerCase() === textFilter.toLowerCase()) {
                    isMatchedTextFilter = true;
                }
            }
        }

        return isMatchedTextFilter;
    },

    setDefaultSort: function () {
        var that = this;
        var sortColumn = this.get('sortCols') ? this.get('sortCols')[0] : '';
        var sortId = this.utils.validators.isAvailable(sortColumn) ? sortColumn : 'trades';
        var sortAsc = this.get('sortAsc');

        if (sortAsc !== undefined) {
            this.set('sortAscending', sortAsc);
        }

        this.set('sortProperties', [sortId]);
        this.saveWidget({sortAsc: this.get('sortAscending'), sortCols: this.get('sortProperties')});

        Ember.run.later(function () {
            var tableColumns = that.get('columns');

            // TODO: [satheeqh] Temporary fix to support watch-list array proxy
            var proxySortId = ['dataObj', sortId].join('.');

            Ember.$.each(tableColumns, function (key, column) {
                if (column.get('contentPath') === sortId || column.get('contentPath') === proxySortId) {
                    Ember.set(column, 'isSorted', true);
                    return false;
                }
            });
        }, 200);
    },

    filterStocks: (function () {
        var textFilter = this.get('textFilter');

        if (this.utils.validators.isAvailable(textFilter)) {
            var filteredStocks = this.get('masterContent').filter((function (that) {    //eslint-disable-line
                return function (stock) {
                    return that.checkFilterMatch(stock, textFilter);
                };
            })(this));

            this.set('content', filteredStocks);
        } else {
            this.set('content', this.get('masterContent'));
        }
    }).observes('textFilter'),

    triggerSymbolChange: function (rowData) {
        if (rowData) {
            appEvents.onSymbolChanged(rowData.sym, rowData.exg, rowData.inst, this.get('selectedLink'));

            this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.rowClick, ['sym:', rowData.sym, '~', rowData.exg].join(''));

            // Limit filter event trigger only while searching and clicking a row
            if (this.get('textFilter') && this.get('textFilter') !== '') {
                this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.search, ['filter:', this.get('textFilter')].join(''));
            }
        }
    },

    deleteWatchList: function () {
        var that = this;
        utils.messageService.showMessage(this.get('app').lang.messages.deleteConfirmation, utils.Constants.MessageTypes.Question, false, this.get('app').lang.labels.deleteWL,
            [{
                type: 'yes', btnAction: function () {
                    that.priceService.watchListDS.deleteWL(that.get('currentCustomWLId'));

                    that.loadCustomWL(that.get('myFavouritesIndex'));
                    that.saveWidget({customWatchListColumnArray: that.get('customWatchListColumnArray')});
                }
            }, {
                type: 'no', btnAction: function () {
                    Ember.$('#deleteWatchListBtn').removeClass('open');
                }
            }], null
        );
    },

    resetScroll: function () {
        var innerScroll = this.getAntiScroller();

        if (innerScroll) {
            innerScroll.scrollTop = 0;
        }
    },

    getAntiScroller: function () {
        var tableIdDiv = Ember.$('#' + this.get('tableComponentId'));
        return tableIdDiv && tableIdDiv.length > 0 ? tableIdDiv.children().closest('div').get('1').children[0].children[0] : undefined;
    },

    onPriceMetaReceived: function () {
        // Price meta ready callback
    },

    changeExchange: function (exchg) {
        var selectedExg = exchg.code ? exchg.code : exchg.exg;

        this.refreshWidget({exg: selectedExg, watchListType: sharedService.getService('price').watchListDS.watchListTypes.fullMarket});
        this.resetScroll();

        return selectedExg;
    },

    _isBoardEnabledExchange: function (exg) {
        var isTradeEnabled = appConfig.customisation.isTradingEnabled;

        if (isTradeEnabled) {
            var boardEnableExchanges = this.tradeService.settings.orderConfig.boardEnableExchanges;
            return boardEnableExchanges && boardEnableExchanges.indexOf(exg) > -1;
        }

        return false;
    },

    actions: {
        setLink: function (option) {
            this.set('selectedLink', option.code);
            this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.select, ['selectedLink:', this.get('selectedLink')].join(''));
        },

        clickRow: function (clickEvent) {
            this._super(clickEvent);
        },

        onSelectExchange: function (exchg) {
            return this.changeExchange(exchg);
        },

        renameCustomWLCallBack: function () {
            this.toggleProperty('isCustomWLChanged');
        },

        onSelectSubMarket: function (mktId) {
            if (mktId !== this.get('currentSubMarketId')) {
                var subMktMap = this.get('subMktMap');
                var exg = this.get('exchange.exg');

                this.priceService.removeFullMarketSymbolRequest(exg, this.get('currentSubMarketId'));
                this.set('currentSubMarketId', mktId);

                subMktMap[exg] = mktId;
                this.saveWidget({subMktMap: subMktMap});

                this.loadContent();
                this.priceService.addFullMarketSymbolRequest(exg, this.get('currentSubMarketId'));

                this.resetScroll();
            }
        }
    }
});