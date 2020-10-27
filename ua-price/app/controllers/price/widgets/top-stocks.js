import Ember from 'ember';
import PriceConstants from '../../../models/price/price-constants';
import BaseArrayController from '../../base-array-controller';
import responsiveHandler from '../../../helpers/responsive-handler';
import sharedService from '../../../models/shared/shared-service';
import appEvents from '../../../app-events';

export default BaseArrayController.extend({
    dimensions: {
        w: 4,
        h: 18
    },
    tgpContent: [],
    tlpContent: [],
    mavContent: [],
    topStocksRowCount: 5,
    timer: undefined,
    exchange: undefined,
    subMarket: -1,
    isTopStocksReqSent: false,

    priceService: sharedService.getService('price'),

    onLoadWidget: function () {
        Ember.run.later(function () {
            Ember.$('.nano').nanoScroller();
        }, 3000);

        this.priceService.subscribePriceMetaReady(this, this.get('wkey'));
        appEvents.subscribeExchangeChanged(-1, this.get('wkey'), this);

        this.setErrorMessage();
    },

    onPriceMetaReady: function (isSuccess) {
        if (isSuccess && !this.get('isTopStocksReqSent')) {
            var exchange = this.get('exg');
            this.set('subMarket', this.priceService.exchangeDS.getDefaultSubMarket(exchange));

            this.onPrepareData();
            this.loadContent(exchange);
        }
    },

    onPrepareData: function () {
        var exg = this.get('exg');
        var subMarket = this.priceService.exchangeDS.getDefaultSubMarket(exg);

        this.set('exchange', this.priceService.exchangeDS.getExchange(exg));
        this.set('subMarket', subMarket);

        if (this.priceService.isPriceMetadataReady()) {
            this.set('tgpContent', this.priceService.topStockDS.getTopStocksCollectionByType(exg, PriceConstants.TopStocksTypes.TopGainersByPercentageChange, subMarket));
            this.set('tlpContent', this.priceService.topStockDS.getTopStocksCollectionByType(exg, PriceConstants.TopStocksTypes.TopLosersByPercentageChange, subMarket));
            this.set('mavContent', this.priceService.topStockDS.getTopStocksCollectionByType(exg, PriceConstants.TopStocksTypes.MostActiveByVolume, subMarket));
        }

        this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.show, ['exg:', this.get('exg')].join(''));
    },

    onDataLoad: function () {
        // Initialize Responsive
        var that = this;

        if (!that.responsive) {
            Ember.run.later(function () {
                that.set('responsive', responsiveHandler.create({controller: that, widgetId: 'topstocks-' + that.get('wkey'), callback: that.onResponsive}));
                that.responsive.addList('topstoks-symbol', [
                    {id: 'topstocks-tl', width: 25}
                ]);

                that.responsive.initialize();
            }, 20);
        }
    },

    onAddSubscription: function () {
        if (this.get('mavContent.length') === 0) {
            this.setRequestTimeout(4, 'mavContent.length');
        }

        Ember.run.cancel(this.get('timer'));

        if (this.priceService.isPriceMetadataReady()) {
            this.loadContent(this.get('exg'));
        }
    },

    onClearData: function () {
        this.set('tgpContent', []);
        this.set('tlpContent', []);
        this.set('mavContent', []);
    },

    onUnloadWidget: function () {
        this.priceService.unSubscribePriceMetaReady(this.get('wkey'));
        Ember.run.cancel(this.get('timer'));
        this.unBindEvents();
    },

    onLanguageChanged: function () {
        this.setErrorMessage();
    },

    loadContent: function (exchange) {
        var that = this;
        var subMarket = this.get('subMarket');

        this.priceService.sendTopStocksRequest(exchange, PriceConstants.TopStocksTypes.TopGainersByPercentageChange, subMarket);
        this.priceService.sendTopStocksRequest(exchange, PriceConstants.TopStocksTypes.TopLosersByPercentageChange, subMarket);
        this.priceService.sendTopStocksRequest(exchange, PriceConstants.TopStocksTypes.MostActiveByVolume, subMarket);

        this.set('isTopStocksReqSent', true);

        // Update top stock data store periodically
        var timer = Ember.run.later(function () {
            that.loadContent(exchange);
        }, PriceConstants.TimeIntervals.TopStocksUpdateInterval);

        this.set('timer', timer);
    },

    onCheckDataAvailability: function () {
        var exg = this.get('exg');
        var subMarket = this.get('subMarket');
        var mavStock = this.priceService.topStockDS.getTopStocksCollectionByType(exg, PriceConstants.TopStocksTypes.MostActiveByVolume, subMarket);

        return mavStock.length > 0;
    },

    tgpFilteredContent: function () {
        return this.getFilteredContent(this.get('tgpContent'));
    }.property('tgpContent.@each'),

    tlpFilteredContent: function () {
        return this.getFilteredContent(this.get('tlpContent'));
    }.property('tlpContent.@each'),

    mavFilteredContent: function () {
        return this.getFilteredContent(this.get('mavContent'));
    }.property('mavContent.@each'),

    getFilteredContent: function (content) {
        var filteredArray = [];
        var rowCount = this.topStocksRowCount;

        Ember.$.each(content, function (index, item) {
            if (index === rowCount) {
                return false;
            }
            filteredArray.push(item);
        });

        return filteredArray;
    },

    onAfterRender: function () {
        var widgetId = '#' + 'topstocks-' + this.get('wkey');
        this.initializeEventListner(widgetId, 'onWidgetClick');
    },

    onWidgetClick: function (event) {
        var tableRow = this.getParentElement(event, 'div.layout-row');
        var table = this.getParentElement(event, 'div.layout-container');
        var rowId = tableRow.attr('id');
        var tableId = table.attr('id');

        if (rowId) {
            var symbolArray;

            if (tableId === 'topstock-tgp') {
                symbolArray = this.tgpContent;
            } else if (tableId === 'topstock-tlp') {
                symbolArray = this.tlpContent;
            } else if (tableId === 'topstock-mav') {
                symbolArray = this.mavContent;
            }

            if (symbolArray) {
                var symbolObj = symbolArray[rowId];

                if (symbolObj) {
                    var stock = symbolObj.getProperties('exg', 'sym', 'inst');

                    if (!stock.inst || !stock.exg) {
                        stock.inst = this.priceService.stockDS.getStock(this.get('exg'), stock.sym).inst;
                        stock.exg = this.get('exg');
                    }

                    sharedService.getService('sharedUI').invokeRightClick(stock, this.get('wkey'), event, this.menuComponent);
                }
            }
        }
    },

    actions: {
        doubleClickRow: function (symbol) {
            var inst = this.priceService.stockDS.getStock(this.get('exg'), symbol.sym).inst;
            if (symbol) {
                sharedService.getService('priceUI').showPopupWidget({container: this.container, controllerString: 'view:symbol-popup-view'}, {tabId: 0, sym: symbol.sym, exg: this.get('exg'), inst: inst});
            }
        }
    }
});
