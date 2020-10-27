import Ember from 'ember';
import PriceConstants from '../../../models/price/price-constants';
import BaseArrayController from '../../base-array-controller';
import priceWidgetConfig from '../../../config/price-widget-config';
import appEvents from '../../../app-events';
import sharedService from '../../../models/shared/shared-service';
import responsiveHandler from '../../../helpers/responsive-handler';
import appConfig from '../../../config/app-config';
import AppEvents from '../../../app-events';

export default BaseArrayController.extend({
    model: Ember.A([]),
    title: null,
    appConfig: appConfig,
    fieldList: Ember.A([]),
    icon: null,
    showTopStockTabs: null,
    exgCode: null,
    mode: null,
    subMarket: -2, // Set default value to an unused value, since -1 is used as a sub market code
    timer: undefined,
    exchange: undefined,

    mainContextMenu: [], // Pop up Widget Parameters
    tableRow: null,

    tabs: [],
    isTopStockReqSent: false,

    activeTab: null,
    curruntActiveTabClass: 'active',
    unactiveTabClass: '',

    priceService: sharedService.getService('price'),

    onLoadWidget: function () {
        if (appConfig.customisation.isMobile) {
            var isDefaultExg = sharedService.getService('price').userDS.isPriceUserExchange(this.get('exg'));

            this.set('exg', isDefaultExg ? this.get('exg') : sharedService.userSettings.price.userDefaultExg);
            this.set('subMarket', this.priceService.exchangeDS.getDefaultSubMarket(this.get('exg')));
        }

        var exg = this.get('exg');
        var mode = this.get('mode');

        this.priceService.addFullMarketSymbolRequest(this.get('exg')); // TODO: [Subodha] Top Stock is not loading first time when subscribed in "onAddSubscription"
        this.priceService.subscribePriceMetaReady(this, this.get('wkey'));

        this.set('defaultExchangeForDropdown', {code: exg});
        this._generateFullContextMenu();

        // TODO [AROSHA] Move this Scroll enable method to global.
        // Ember.run.later(function () {
        //    Ember.$('.nano').nanoScroller();
        // }, 3000);

        this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.show, ['exg:', exg, '~', 'mode:', mode].join(''));
        this.setErrorMessage();
    },

    onAddSubscription: function () {
        appEvents.subscribeExchangeChanged(this.get('selectedLink'), this.get('wkey'), this);
        appEvents.subscribeSubMarketChanged(this.get('selectedLink'), this.get('wkey'), this);
    },

    onPriceMetaReady: function (isSuccess) {
        if (isSuccess && !this.get('isTopStockReqSent')) {
            var exchange = this.get('exg');

            this.set('subMarket', this.priceService.exchangeDS.getDefaultSubMarket(exchange));
            this.loadContent(exchange, this.get('mode'), this.get('subMarket'));
        }
    },

    onAfterRender: function () {
        var widgetId = '#' + 'table-' + this.get('wkey');
        this.initializeEventListner(widgetId, 'onWidgetClick');
        this.generateScrollBar(undefined, 4000);
    },

    onDataLoad: function () {
        // Initialize Responsive
        var that = this;

        if (!that.responsive) {
            Ember.run.later(function () {
                that.set('responsive', responsiveHandler.create({controller: that, widgetId: 'table-' + that.get('wkey'), callback: that.onResponsive}));
                that.responsive.addList('topstock-dDesc', [
                    {id: 'topstock-vol', width: 110},
                    {id: 'topstock-tovr', width: 110}
                ]);

                that.responsive.initialize();
            }, 300);
        }
    },

    onResponsive: function (responsiveArgs) {
        var fieldList = responsiveArgs.controller.get('fieldList');

        Ember.$.each(fieldList, function (id, field) {
            if (field.name === 'Volume') {
                if (responsiveArgs.responsiveLevel > 0) {
                    Ember.set(field, 'formatter', 'divideNumber');

                } else {
                    Ember.set(field, 'formatter', 'formatNumber');
                }
            }
        });

        Ember.$.each(fieldList, function (id, field) {
            if (field.name === 'Turnover') {
                if (responsiveArgs.responsiveLevel > 1) {
                    Ember.set(field, 'formatter', 'divideNumber');

                } else {
                    Ember.set(field, 'formatter', 'formatNumber');
                }
            }
        });
    },

    onPrepareData: function () {
        var exg = this.get('exg');
        var mode = this.get('mode');
        var subMkt = this.get('subMarket');

        this.set('exgCode', exg);
        this.set('exchange', this.priceService.exchangeDS.getExchange(exg));

        var subMktId = (subMkt === -2 || subMkt === undefined) ? this.priceService.exchangeDS.getDefaultSubMarket(exg) : subMkt;
        this.set('subMarket', subMktId);

        this.saveWidget({exg: exg, subMarket: subMktId});
        this.bindData(exg, mode);
        this.setModeParameters(mode);

        Ember.run.cancel(this.get('timer'));
        this.refreshTopStocks();
    },

    onUnloadWidget: function () {
        this.set('model', Ember.A());
        this.set('fieldList', Ember.A());

        Ember.run.cancel(this.get('timer'));
        this.unBindEvents();
    },

    onRemoveSubscription: function () {
        this.priceService.removeFullMarketSymbolRequest(this.get('exg'));

        appEvents.unSubscribeExchangeChanged(this.get('selectedLink'), this.get('wkey'));
        appEvents.unSubscribeSubMarketChanged(this.get('selectedLink'), this.get('wkey'));
        this.priceService.unSubscribePriceMetaReady(this.get('wkey'));
    },

    onClearData: function () {
        this.set('fieldList', Ember.A());
        this.set('subMarket', undefined);
        this.set('content', Ember.A());
        this.set('model', Ember.A());
    },

    setModeParameters: function (mode) {
        this.set('mode', mode);

        if (this.get('showTopStockTabs')) {
            var firstTabName, secondTabName, firstTabMode, secondTabMode;

            if (mode === 0 || mode === 1) {
                firstTabMode = 1;
                secondTabMode = 0;
                firstTabName = this.get('app').lang.labels.perChangeDes;
                secondTabName = this.get('app').lang.labels.changeDes;
            } else {
                firstTabMode = 3;
                secondTabMode = 2;
                firstTabName = this.get('app').lang.labels.perChangeDes;
                secondTabName = this.get('app').lang.labels.changeDes;
            }

            this.set('tabs', [{
                ID: 1,
                mode: firstTabMode,
                DisplayName: firstTabName, css: (mode === 1 || mode === 3) ? 'active' : ''
            }, {
                ID: 2,
                mode: secondTabMode,
                DisplayName: secondTabName, css: (mode === 0 || mode === 2) ? 'active' : ''
            }]);
        }
    },

    onLanguageChanged: function () {
        var exg = this.get('exg');
        var mode = this.get('mode');

        this.set('exgCode', exg);
        this.bindData(exg, mode, this.get('subMarket'));
        this._loadTopStock();
        this.setModeParameters(mode);
        this.setErrorMessage();
    },

    loadContent: function (exchange, mode, subMarket) {
        this.priceService.sendTopStocksRequest(exchange, mode, subMarket);
        this.set('isTopStockReqSent', true);
        this.setRequestTimeout(4, 'content.length');
        this.reBindData(exchange, mode, subMarket);
    },

    reBindData: function (exchange, mode, subMarket) {
        var that = this;
        this.set('model', null);

        Ember.run.later(function () {
            that.set('model', that.priceService.topStockDS.getTopStocksCollectionByType(exchange, mode, subMarket));
        }, 100);
    },

    refreshTopStocks: function () {
        this._loadTopStock();

        var timer = Ember.run.later(this, this.refreshTopStocks, PriceConstants.TimeIntervals.TopStocksUpdateInterval);
        this.set('timer', timer);
    },

    bindData: function (exchange, mode, subMarket) {
        var that = this;
        var topStockConfig = priceWidgetConfig.topStocks[mode];

        this.set('model', this.priceService.topStockDS.getTopStocksCollectionByType(exchange, mode, subMarket));
        this.set('title', this.get('app').lang.labels[topStockConfig.title]);
        this.set('titleCss', topStockConfig.titleCss ? topStockConfig.titleCss : '');

        Ember.$.each(topStockConfig.fields, function (key, item) {
            Ember.set(item, 'name', that.get('app').lang.labels[item.filed]);

            if (!item.col) {
                Ember.set(item, 'col', 'layout-col');
            }
        });

        this.set('fieldList', topStockConfig.fields);
        this.set('icon', topStockConfig.icon);
        this.set('showTopStockTabs', topStockConfig.showTopStockTabs);
    },

    onCheckDataAvailability: function () {
        var stock = this.priceService.topStockDS.getTopStocksCollectionByType(this.get('exg'), this.get('mode'), this.get('subMarket'));

        return stock.length !== 0;
    },

    onWidgetClick: function (event) {
        if (!appConfig.customisation.isMobile) {
            var tableRow = this.getParentElement(event, 'div.layout-row');
            var rowId = tableRow.attr('id');
            var selectedRow;

            if (rowId) {
                selectedRow = this.model[rowId];
                var stock = selectedRow.getProperties('exg', 'sym', 'inst');

                if (!stock.inst || !stock.exg) {
                    stock.inst = this.priceService.stockDS.getStock(this.get('exg'), stock.sym).inst;
                    stock.exg = this.get('exg');
                }

                sharedService.getService('sharedUI').invokeRightClick(stock, this.get('wkey'), event, this.menuComponent);
            }
        }
    },

    setActive: function (currentTab, css) {
        var tabArray = this.get('tabs');

        Ember.$.each(tabArray, function (key, tabObj) {

            if (tabObj.ID === currentTab.ID) {
                Ember.set(tabObj, 'css', css);
            } else {
                Ember.set(tabObj, 'css', '');
            }
        });
    },

    _loadTopStock: function () {
        if (this.priceService.isPriceMetadataReady()) {
            this.loadContent(this.get('exg'), this.get('mode'), this.get('subMarket'));
        }
    },

    _changeLink: function (option) {
        appEvents.unSubscribeExchangeChanged(this.get('selectedLink'), this.get('wkey'));

        if (option.code) {
            this.set('selectedLink', option.code);
            appEvents.subscribeExchangeChanged(this.get('selectedLink'), this.get('wkey'), this);
        } else {
            this.set('selectedLink', undefined);
        }

        this.saveWidget({selectedLink: option.code});
    },

    actions: {
        doubleClickRow: function (symbol) {
            if (symbol) {
                var inst = this.priceService.stockDS.getStock(this.exgCode, symbol.sym).inst;
                sharedService.getService('priceUI').showPopupWidget({container: this.container, controllerString: 'view:symbol-popup-view'}, {tabId: 0, sym: symbol.sym, exg: this.exgCode, inst: inst});
            }
        },

        clickRow: function (symbol) {
            if (symbol) {
                var quoteMenuId = appConfig.widgetId ? appConfig.widgetId.quoteMenuId : '';
                var watchListMenuId = appConfig.widgetId ? appConfig.widgetId.watchListMenuId : '';
                var sharedUIService = sharedService.getService('sharedUI');
                var inst = this.priceService.stockDS.getStock(this.exgCode, symbol.sym).inst;

                if (quoteMenuId) {
                    if (appConfig.customisation.isCompactMenuEnabled) {
                        sharedUIService.navigateMenu(watchListMenuId, quoteMenuId);
                    } else {
                        sharedUIService.navigateMenu(quoteMenuId);
                    }
                }

                AppEvents.onSymbolChanged(symbol.sym, this.exgCode, inst, this.get('selectedLink'));
            }
        },

        loadTab: function (tabItem) {
            var mode = tabItem.mode;

            this.set('mode', mode);
            this.bindData(this.exgCode, mode);
            this._loadTopStock();
            this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['exg:', this.exgCode, '~', 'mode:', this.mode].join(''));

            this.setActive(tabItem, this.curruntActiveTabClass);
        },

        setLink: function (option) {
            this._changeLink(option);
        },

        setTopStockExchange: function (exchg) {
            appEvents.onExchangeChanged(this.get('selectedLink'), exchg.code, undefined);
        },

        setTopStockSubMarket: function (mktId) {
            appEvents.onSubMarketChanged(this.get('selectedLink'), mktId);
        }
    }
});
