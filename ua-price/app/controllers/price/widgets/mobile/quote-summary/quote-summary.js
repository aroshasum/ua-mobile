import Ember from 'ember';
import ControllerFactory from '../../../../controller-factory';
import utils from '../../../../../utils/utils';
import appConfig from '../../../../../config/app-config';
import MarketQuote from '../quote-summary/components/market-quote';
import SummaryChart from '../../mobile/components/summary-chart';
import layoutConfig from '../../../../../config/layout-config';
import sharedService from '../../../../../models/shared/shared-service';
import priceWidgetConfig from '../../../../../config/price-widget-config';
import searchResultItem from '../../../../../models/price/business-entities/search-result-item';
import QuoteBase from '../../../../../controllers/price/widgets/quote-base';
import appEvents from '../../../../../app-events';
import responsiveHandler from '../../../../../helpers/responsive-handler';

export default QuoteBase.extend({
    stock: {},
    panelFields: Ember.A(),
    chartController: undefined,
    isIndices: false,
    fields: {},

    priceService: sharedService.getService('price'),

    onLoadWidget: function () {
        this.set('appLayout', layoutConfig);
        appEvents.subscribeSymbolChanged(this.get('wkey'), this, this.get('selectedLink'));
    },

    onPrepareData: function () {
        var inst = this.get('inst');

        this.set('panelFields', Ember.A());
        this.set('isIndices', utils.AssetTypes.isIndices(inst));
        this.set('stock', this.priceService.stockDS.getStock(this.get('exg'), this.get('sym'), inst));

        this.renderPanelFields();
    },

    initializeResponsive: function () {
        var that = this;

        Ember.run.next(this, function () {
            that.set('responsive', responsiveHandler.create({
                controller: this,
                widgetId: 'hnav-panel-mobile',
                callback: this.onResponsive
            }));

            that.responsive.addList('hnav-panel-mobile', [{id: 'hnav-panel-mobile', width: 340}]);
            that.responsive.initialize();
        });
    },

    onAddSubscription: function () {
        var exg = this.get('exg');
        var sym = this.get('sym');
        var inst = this.get('inst');

        if (!this.get('isIndices')) {
            this.priceService.addSymbolRequest(exg, sym, inst);
        } else {
            this.priceService.addIndexRequest(exg, sym, inst);
        }
    },

    onRemoveSubscription: function () {
        var exg = this.get('exg');
        var sym = this.get('sym');
        var inst = this.get('inst');

        if (!this.get('isIndices')) {
            this.priceService.removeSymbolRequest(exg, sym, inst);
        } else {
            this.priceService.removeIndexRequest(exg, sym, inst);
        }
    },

    onAfterRender: function () {
        this.initializeButtonAnimation();
        this._renderChart();
        this.getSubMarket();
    },

    getSubMarket: function () {
        var that = this;
        var exchange = this.priceService.exchangeDS.getExchange(this.get('exg'));
        var subMarketArray = exchange.subMarketArray;
        var subMarket;

        if (subMarketArray && subMarketArray.length > 0) {
            Ember.$.each(subMarketArray, function (key, value) {
                if (value.marketId === that.get('stock').subMkt) {
                    subMarket = value.lDes;
                }
            });
        }

        this.set('subMarket', subMarket);
    },

    onClearData: function () {
        this.set('stock', {});

        var chartController = this.get('chartController');

        if (chartController && Ember.$.isFunction(chartController.onClearData)) {
            chartController.onClearData();
        }
    },

    onUnloadWidget: function () {
        var chartController = this.get('chartController');

        if (chartController && Ember.$.isFunction(chartController.onUnloadWidget)) {
            chartController.onUnloadWidget();
        }

        this.set('chartController', undefined);
    },

    renderPanelFields: function () {
        this._super(priceWidgetConfig.quote.panelIntraday, this.get('panelFields'));

        var that = this;
        var bidIndex;
        var offerIndex;
        var panelFields = this.get('panelFields');

        Ember.$.each(panelFields, function (key, value) {
            if (value.field === 'bbp') {
                bidIndex = key;
            }

            if (value.field === 'bap') {
                offerIndex = key;
            }
        });

        if (bidIndex && offerIndex) {
            that.set('bidOfferAvailable', true);

            if (bidIndex > offerIndex) {
                panelFields.splice(bidIndex, 1);
                panelFields.splice(offerIndex, 1);
            } else {
                panelFields.splice(offerIndex, 1);
                panelFields.splice(bidIndex, 1);
            }
        } else {
            that.set('bidOfferAvailable', false);
        }

        var slicingIndex = panelFields.length / 2;

        this.set('columnOne', panelFields.slice(0, Math.ceil(slicingIndex)));
        this.set('columnTwo', panelFields.slice(Math.ceil(slicingIndex), panelFields.length));
    },

    onLanguageChanged: function () {
        this.set('panelFields', Ember.A());
        this.renderPanelFields();
    },

    showValue: (function () {
        return utils.formatters.formatNumber(this.get('calculateNetCash'));
    }).property('calculateNetCash'),

    isTradingEnabled: function () {
        return appConfig.customisation.isTradingEnabled;
    }.property(),

    quoteSettings: {
        intZero: 0,
        emptyString: '',
        styles: {
            green: 'green',
            darkGreen: 'green-dark',
            red: 'red',
            darkRed: 'red-dark',
            white: 'white',
            upArrow: 'glyphicon-triangle-top glyphicon ',
            downArrow: 'glyphicon-triangle-bottom glyphicon '
        }
    },

    updatePercentageChangeCss: function () {
        var pctChg = this.get('stock.pctChg');
        var changeSign = '';
        var perChgCss = '';
        var changeCss = '';

        if (pctChg > this.quoteSettings.intZero) {
            changeSign = this.quoteSettings.styles.upArrow;
            perChgCss = this.quoteSettings.styles.green;
            changeCss = this.quoteSettings.styles.darkGreen;
        } else if (pctChg < this.quoteSettings.intZero) {
            changeSign = this.quoteSettings.styles.downArrow;
            perChgCss = this.quoteSettings.styles.red;
            changeCss = this.quoteSettings.styles.darkRed;
        } else {
            changeSign = this.quoteSettings.emptyString;
            perChgCss = this.quoteSettings.styles.white;
        }

        this.set('changeSign', changeSign);
        this.set('perChgCss', perChgCss);
        this.set('changeCss', changeCss);
    }.observes('stock.pctChg'),

    showOrderTicket: function (side) {
        sharedService.getService('tradeUI').showOrderTicket(this.container, side, this.get('stock'));
    },

    _renderChart: function () {
        var controllerString = 'controller:price/widgets/mobile/chart/quote-chart';
        var routeString = 'price/widgets/mobile/chart/quote-chart';
        var widgetKey = this.get('wkey') + '-chart';
        var widgetController = ControllerFactory.createController(this.container, controllerString);

        widgetController.set('sym', this.get('sym'));
        widgetController.set('exg', this.get('exg'));
        widgetController.set('inst', this.get('inst'));
        widgetController.set('wkey', widgetKey);
        widgetController.set('isShowTitle', false);
        widgetController.set('hideWidgetLink', true);
        widgetController.set('isDisableChartControls', true);
        widgetController.set('isShareIconDisabled', this.get('isShareIconDisabled'));

        widgetController.initializeWidget({wn: controllerString.split('/').pop()}, {widgetArgs: {selectedLink: this.get('selectedLink')}});
        var route = this.container.lookup('route:application');

        route.render(routeString, {
            into: 'price/widgets/mobile/quote-summary/quote-summary',
            outlet: 'quoteChartOutlet',
            controller: widgetController
        });

        this.set('chartController', widgetController);
        appEvents.subscribeThemeChanged(widgetController, 'quote-summary-chart');
    },

    saveToRecentSymbols: function () {
        var symbol;
        var groupingObj;
        var stock = this.get('stock');

        if (!Ember.$.isEmptyObject(stock)) {
            var config = priceWidgetConfig.globalSearch.groups;
            var exchange = this.priceService.exchangeDS.getExchange(stock.exg);

            symbol = searchResultItem.create();
            groupingObj = config[stock.ast] ? config[stock.ast] : config.other;

            symbol.setData({
                sym: stock.sym,
                exg: stock.exg,
                dSym: stock.dSym,
                inst: stock.inst,
                lDes: stock.lDes,
                sDes: stock.sDes,
                ast: stock.ast,
                subMkt: stock.subMkt,
                dispProp1: stock.get('dispProp1'),
                groupingObj: groupingObj
            });

            symbol.set('de', exchange.de);
            symbol.set('isAddedToCustomWatchList', this.priceService.watchListDS.isSymbolAvailableInCustomWL(symbol));

            this.priceService.searchDS.addRecentSearchedItem(symbol);
        }
    }.observes('stock.sym'),

    actions: {
        buy: function () {
            this.showOrderTicket(false);
        },

        sell: function () {
            this.showOrderTicket(true);
        }
    }
});

Ember.Handlebars.helper('market-quote', MarketQuote);
Ember.Handlebars.helper('summary-chart', SummaryChart);