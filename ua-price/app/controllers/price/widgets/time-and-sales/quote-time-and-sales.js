import Ember from 'ember';
import TableController from '../../../shared/table-controller';
import HeaderCell from '../../../../views/table/dual-cells/header-cell';
import Cell from '../../../../views/table/cell';
import ClassicCell from '../../../../views/table/classic-cell';
import BuySellCell from '../../../../views/table/buy-sell-cell';
import UpDownCell from '../../../../views/table/up-down-cell';
import priceWidgetConfig from '../../../../config/price-widget-config';
import TableRow from '../../../../views/table/table-row';
import TSArrayProxy from './time-and-sales-array-proxy';
import priceConstants from '../../../../models/price/price-constants';
import appEvents from '../../../../app-events';
import sharedService from '../../../../models/shared/shared-service';
import appConfig from '../../../../config/app-config';

export default TableController.extend({
    InitialBacklogSize: 50,
    BacklogRequestFactor: 0.7,
    BacklogBatchSize: priceWidgetConfig.timeAndSales.BacklogBatchSize,

    customArrayProxy: undefined,
    tradeStore: {},
    isBacklogInitialized: false,
    minHeaderHeight: 25,

    // Column Parameters
    defaultColumnIds: priceWidgetConfig.timeAndSales.defaultColumnIds,
    defaultColumnMapping: priceWidgetConfig.timeAndSales.defaultColumnMapping,
    isShowTitle: true,
    stockDetails: {},
    rowHeight: '',

    isRefreshed: false,
    isFullMarket: false,
    tsPopUpWindow: undefined,

    dataLoadingIndicatorId: '',
    indicatorConfig: {isEmptyRowEnabled: true},

    exchange: {},

    priceService: sharedService.getService('price'),

    isDelayedUser: function () {
        return this.priceService.userDS.isExchangeDelayed(this.get('exg'));
    }.property('exg'),

    isShowUpgrade: function () {
        return this.utils.validators.isAvailable(appConfig.subscriptionConfig.upgradeSubscriptionPath) && this.get('isDelayedUser');
    }.property('exg'),

    onLoadWidget: function () {
        var wkey = this.get('wkey');
        var isShowTitle = this.get('hideTitle') ? !this.get('hideTitle') : true;

        this.set('dataLoadingIndicatorId', ['loadingIndicator', wkey].join('-'));
        this.set('isShowTitle', isShowTitle);
        this.setCellViewsScopeToGlobal();
        this.set('rowHeight', priceWidgetConfig.singleRowHeight);

        this.setDefaultColumns();
        this.setDefaultColumnDeclarations();

        if (!this.isFullMarket) {
            appEvents.subscribeSymbolChanged(wkey, this, this.get('selectedLink'));
        } else {
            appEvents.subscribeExchangeChanged(this.get('selectedLink'), wkey, this);
        }

        this.priceService.subscribeConnectionStatusChanged(wkey, this);
    },

    onAfterRender: function () {
        // To enable resizing the table in symbol-popup-view when resizing the popup window
        var widgetId = 'div#' + Ember.PopupContainerView.elementId;
        this.tsPopUpWindow = document.querySelector(widgetId);

        if (this.tsPopUpWindow) {
            this.tsPopUpWindow.onresize = this.bindFn(this.resizeTimeAndSalesTable);
        }
    },

    onPrepareData: function () {
        var exchange = this.get('exg');
        var symbol = this.get('sym');

        this.set('exchange', this.priceService.exchangeDS.getExchange(exchange));

        // Subscribe to data store in order to keep informed with backlog data ready and cache clear check.
        this.priceService.timeAndSalesDS.subscribeSymTS(exchange, symbol, this.get('wkey'), this);
        this.set('tradeStore', this.priceService.timeAndSalesDS.getTradeCollection(exchange, symbol));

        this.configArrayProxy();
        this.setErrorMessage();

        if (this.utils.validators.isAvailable(symbol)) {
            this.set('stockDetails', this.priceService.stockDS.getStock(exchange, symbol));
        }

        this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.show,
            symbol ? ['sym:', symbol, '~', exchange].join('') : exchange);
    },

    onPriceConnectionStatusChanged: function (stat) {
        if (stat) {
            // Reconnection success
            this._resetData();
        }
    },

    onAddSubscription: function () {
        if (!this.isFullMarket) {
            var isShowBuyerSeller = appConfig.customisation.isShowBuyerSeller;
            this.priceService.addTimeAndSalesRequest(this.get('exg'), this.get('sym'), isShowBuyerSeller);
        } else {
            this.priceService.addMarketTimeAndSalesRequest(this.get('exg'));
        }

        this._initDataBind();
    },

    onClearData: function () {
        this.priceService.timeAndSalesDS.unSubscribeSymTS(this.get('exg'), this.get('sym'), this.get('wkey'));
        this.removeObserver('customArrayProxy.realTimeContent.length', this.updateRealTimeContent);

        var customArrayProxy = this.get('customArrayProxy');

        if (customArrayProxy) {
            customArrayProxy.set('exg', undefined);
            customArrayProxy.set('sym', undefined);
            customArrayProxy.set('realTimeContent', []);
            customArrayProxy.set('backlogContent', []);
        }

        this.set('tradeStore', {});
        this.set('stockDetails', {});
        this.set('isBacklogInitialized', false);
    },

    onRemoveSubscription: function () {
        var isShowBuyerSeller = appConfig.customisation.isShowBuyerSeller;
        this.priceService.removeTimeAndSalesRequest(this.get('exg'), this.get('sym'), isShowBuyerSeller);
    },

    onUnloadWidget: function () {
        var wkey = this.get('wkey');

        // Set empty ember array to remove the current trade collection.
        this.set('content', []);

        this.set('exchange', {}); // Cannot clear this in onClear data as this will make a deadlock with observer

        if (!this.isFullMarket) {
            appEvents.unSubscribeSymbolChanged(wkey, this.get('selectedLink'));
        } else {
            appEvents.unSubscribeExchangeChanged(this.get('selectedLink'), wkey);
        }

        if (this.tsPopUpWindow) {
            this.tsPopUpWindow.onresize = null;
            this.tsPopUpWindow = undefined;
        }

        this.priceService.unSubscribeConnectionStatusChanged(wkey);
    },

    onLanguageChanged: function () {
        this.set('columnDeclarations', []);

        this.setErrorMessage();
        this.onLoadWidget();
        this.refreshTableComponent();
        this.refreshWidget({exg: this.get('exg')});
    },

    onResizeWidget: function () {
        this.toggleProperty('isRefreshed');
    },

    // TODO [ATHEESAN] Override JS bind using this function
    bindFn: function (fn) {
        var that = this;

        return function () {
            return fn.apply(that, arguments);
        };
    },

    resizeTimeAndSalesTable: function () {
        Ember.run.debounce(this, this.onResizeWidget, 200);
    },

    configArrayProxy: function () {
        var tradeStore = this.get('tradeStore');

        // Custom array proxy for time and sales content
        var customArrayProxy = TSArrayProxy.create({
            backlogBatchSize: this.BacklogBatchSize,
            content: []
        });

        this.set('customArrayProxy', customArrayProxy);
        customArrayProxy.set('exg', this.get('exg'));
        customArrayProxy.set('sym', this.get('sym'));
        customArrayProxy.set('realTimeContent', tradeStore.realTime);
        customArrayProxy.set('backlogContent', tradeStore.backlog);
    },

    updateFirstRecord: function () {
        this.removeObserver('customArrayProxy.realTimeContent.length', this.updateFirstRecord);

        if (this.get('customArrayProxy.realTimeContent.length') > 0) {
            this._refreshTableContent();
        }

        this.addObserver('customArrayProxy.realTimeContent.length', this.updateRealTimeContent);
        this.initBacklogRequest();
    },

    updateRealTimeContent: function () {
        // TODO: [satheeqh] Check timer performance against observers with debounce
        Ember.run.debounce(this, this._refreshTableContent, priceConstants.TimeIntervals.TimeAndSalesRealTimeDebounce);
    },

    initBacklogRequest: function () {
        if (!this.get('isBacklogInitialized')) {
            this.set('isBacklogInitialized', true);

            var exg = this.get('exg');
            var sym = this.get('sym');
            var tradeStore = this.get('tradeStore');

            if (tradeStore && tradeStore.backlog && tradeStore.backlog.length === 0) {
                var endSeq = tradeStore.realTime[0] ? tradeStore.realTime[0].seq : undefined;
                this.priceService.sendTimeAndSalesBacklogRequest(exg, sym, endSeq, this.InitialBacklogSize);
            } else {
                this.onBacklogDataReady(tradeStore.backlogLen);
            }
        }
    },

    onBacklogDataReady: function () {
        var that = this;

        // Remove all real time observers to stop adding new row while re calculation happens.
        this.removeObserver('customArrayProxy.realTimeContent.length', this.updateFirstRecord);
        this.removeObserver('customArrayProxy.realTimeContent.length', this.updateRealTimeContent);

        var tradeStore = this.get('tradeStore');
        var backlogCount = tradeStore.backlogLen;

        // Set new length to table array proxy
        this._setContentLength();

        var latestAvailSeq = tradeStore.backlogIndex > 0 ? tradeStore.backlog[tradeStore.backlogIndex - 1].seq : 0;

        if (tradeStore.backlogIndex <= this.get('customArrayProxy.backlogReqIndex')) {
            this.priceService.sendTimeAndSalesBacklogRequest(this.get('exg'), this.get('sym'), latestAvailSeq, this.BacklogBatchSize);
        } else {
            var factor = tradeStore.backlogIndex === backlogCount ? 1 : this.BacklogRequestFactor;
            this.set('customArrayProxy.latestBacklogSeq', latestAvailSeq);
            this.set('customArrayProxy.nextBacklogReqIndex', Math.round(tradeStore.backlogIndex * factor));
            this.set('customArrayProxy.isReqProcessing', false);

            if (backlogCount > 0) {
                this.get('customArrayProxy.content').pushObject({});
            }
        }

        Ember.run.later(this, function () { // This will improve fetching first backlog batch in Market T&S
            if (that.get('customArrayProxy.realTimeContent.length') !== tradeStore.realTime.length) {
                that._refreshTableContent();
            }

            that.addObserver('customArrayProxy.realTimeContent.length', that.updateRealTimeContent);
        }, 1);
    },

    cellViewsForColumns: {
        classic: 'Ember.ClassicCell',
        upDown: 'Ember.UpDownCell',
        buySell: 'Ember.BuySellCell'
    },

    setCellViewsScopeToGlobal: function () {
        Ember.HeaderCell = HeaderCell;
        Ember.Cell = Cell;
        Ember.ClassicCell = ClassicCell;
        Ember.UpDownCell = UpDownCell;
        Ember.BuySellCell = BuySellCell;
        Ember.TableRow = TableRow;
    },

    onMarketStatusChanged: function () {
        // Reset time and sales records on market pre-open
        // TODO: [satheeqh] Implement to support multiple widget usages
        var exgStat = this.get('exchange.stat');

        if (exgStat === priceConstants.MarketStatus.PreOpen) {
            this._resetData();
        }
    }.observes('exchange.stat'),

    _resetData: function () {
        var that = this;
        this.onClearData();

        Ember.run.next(this, function () { // Need to set prepare data on next cycle to support multiple widgets with same sym/exg
            that.onPrepareData();
            that._initDataBind();
        });
    },

    _initDataBind: function () {
        if (this.get('customArrayProxy.realTimeContent.length') === 0) {
            this.setRequestTimeout(4, 'customArrayProxy.content.length');
            this.addObserver('customArrayProxy.realTimeContent.length', this.updateFirstRecord);

            Ember.run.later(this, this.initBacklogRequest, 1);
        } else {
            this.set('isDataAvailable', true);
            this._refreshTableContent();
            this.initBacklogRequest();
        }
    },

    /* *
     * Ember table will refresh the viewport while adding an object to the content.
     * @private
     */
    _refreshTableContent: function () {
        var content = this.get('customArrayProxy.content');
        this._setContentLength();

        // Validate unnecessary unshift
        if (content && this.get('tradeStore.realTime.length') > 0 || this.get('tradeStore.backlogLen') > 0) {
            content.unshiftObject({});
        }
    },

    _setContentLength: function () {
        var backlogCount = this.get('tradeStore.backlogLen') || 0;
        var realTimeLength = this.get('tradeStore.realTime.length') || 0;

        var totalLen = realTimeLength + backlogCount;
        totalLen = totalLen > 0 ? totalLen - 1 : totalLen;

        this.set('customArrayProxy.content.length', totalLen);
    },

    actions: {
        setLink: function (option) {
            this.setWidgetLink(option);
        }
    },

    onCheckDataAvailability: function () {
        var tradeStore = this.get('tradeStore');

        return tradeStore && (tradeStore.realTime && tradeStore.realTime.length > 0 ||
            tradeStore.backlog && tradeStore.backlog.length > 0);
    }
});