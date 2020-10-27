/* global Draggabilly */
/* global Mousetrap */
import Ember from 'ember';
import LanguageDataStore from '../models/shared/language/language-data-store';
import utils from '../utils/utils';
import sharedService from '../models/shared/shared-service';
import appEvents from '../app-events';
import appConfig from '../config/app-config';
import ControllerFactory from '../controllers/controller-factory';
import priceConstants from '../models/price/price-constants';

export default Ember.View.extend({
    dimensions: {
        w: 445,
        h: 339
    },

    userSettings: sharedService.userSettings,
    currentPosition: 0,
    displacementScale: 20, // Number of pixels between adjacent popups
    showWidget1: true,
    outletName: '',
    widgetId: '',
    widgetSymbol: '',
    widgetExchange: '',
    widgetIns: '', // Instrument Type
    widgetSymbolDescription: '',
    app: LanguageDataStore.getLanguageObj(),
    currentWidgetController: null,
    detailSymbol: {},
    mainCss: '',
    widgetClose: true,
    dockedMode: false,
    searchID: {},

    // Link Parameters
    links: [],
    currentLink: undefined,

    // Widget Ids
    detailQuoteWidgetId: 0,
    timeAndSalesWidgetId: 1,
    depthByPriceWidgetId: 2,
    depthByOrderWidgetId: 3,
    chartWidgetId: 4,
    alertsWidgetId: 5,

    classNames: [], // Ember framework will add this css class to the ember component
    windowTypes: {},
    activeWidget: undefined,

    priceService: {},

    isTradingEnabled: function () {
        var instId = this.get('detailSymbol.inst');

        return instId !== undefined && appConfig.customisation.isTradingEnabled && utils.AssetTypes.isTradableAssetType(instId);
    }.property('detailSymbol.inst'),

    popupContainerCss: function () {
        return this.get('dockedMode') ? 'full-height full-width' : 'symbol-pop popup-widget js-resizable';
    }.property(),

    popupHeightCss: function () {
        return this.get('dockedMode') ? 'height: calc(100% - 52px)' : '';
    }.property(),

    load: function () {
        this.priceService = sharedService.getService('price');
        this.outletName = 'out-' + Math.floor(Date.now());
        this.searchID = {popup: 'searchPopup' + this.get('outletName'), search: 'search' + this.get('outletName')};

        if (this.get('dockedMode')) {
            this.set('widgetClose', false);
            var symbol = this.get('detailSymbol');
            this.prepare(this.get('dockedWidgetId') ? this.get('dockedWidgetId') : 0, symbol.sym, symbol.exg, symbol.inst);
            this.set('mainCss', 's-popup-padding');
            this.set('classNames', ['full-height']);
        }

        this.template = Ember.HTMLBars.compile('<div class="popup-animation ' + this.get('popupContainerCss') + '">' +
        '<div id="title-handle" style="cursor: move;" class="link-fix">{{widget-header isSearchAvailable=true widgetTitle=view.detailSymbol.lDes searchedSymbol=view.detailSymbol.dispProp1 isWidgetCloseAvailable=view.widgetClose closeWidgetAction="closePopup" closeActionTarget=view linkOptions=view.links defaultSelectedLink=view.currentLink selectedLink=view.currentLink hideSymbol=true app=view.app searchID=view.searchID clickAction="clickAction"}}</div>' +

            '<div class="widget-container-new">{{#unless view.dockedMode}}{{partial "symbol-popup-summary"}}{{/unless}}<div id="tabs" class="layout-container widget-inner-tab-panel margin-8-top margin-9-left font-l overflow-visible full-width" data-tabs="tabs" style="margin-left: 0;margin-top: 0;">' +
            '<div class="layout-col widget-inner-tab-item" id =' + 'symPopViewW0' + this.get('outletName') + '><a class="h-middle full-width hint--bottom hint--rounded hint--bounce" data-hint={{view.app.lang.labels.detailQuote}} name="widgetOne" {{action "showWidget" 0 target="view"}} data-toggle="tab"><i class="layout-inline icon-list-ul"></i> <span class="layout-inline font-m symbol-popup-name pad-s-l">{{view.app.lang.labels.detailQuote}}</span></a></div>' +
            '<div class="layout-col widget-inner-tab-item {{unless view.windowTypes.tns "hide" ""}}" id =' + 'symPopViewW1' + this.get('outletName') + '><a class="h-middle full-width hint--bottom hint--rounded hint--bounce" data-hint={{view.app.lang.labels.timeAndSales}} name="widgetTwo" {{action "showWidget" 1 target="view"}} data-toggle="tab"><i class="layout-inline icon-clock"></i> <span class="layout-inline font-m symbol-popup-name pad-s-l">{{view.app.lang.labels.timeAndSales}}</span></a></div>' +
            '<div class="layout-col widget-inner-tab-item {{unless view.windowTypes.mdp "hide" ""}}" id =' + 'symPopViewW2' + this.get('outletName') + '><a class="h-middle full-width hint--bottom hint--rounded hint--bounce" data-hint={{view.app.lang.labels.depthByPrice}} name="widgetThree" {{action "showWidget" 2 target="view"}} data-toggle="tab"><i class="layout-inline icon-add-fav"></i> <span class="layout-inline font-m symbol-popup-name pad-s-l">{{view.app.lang.labels.depthByPrice}}</span></a></div>' +
            '<div class="layout-col widget-inner-tab-item {{unless view.windowTypes.mdo "hide" ""}}" id =' + 'symPopViewW3' + this.get('outletName') + '><a class="h-middle full-width hint--bottom hint--rounded hint--bounce" data-hint={{view.app.lang.labels.depthByOrder}} name="widgetFour" {{action "showWidget" 3 target="view"}} data-toggle="tab"><i class="layout-inline icon-sitemap"></i><span class="layout-inline font-m symbol-popup-name pad-s-l">{{view.app.lang.labels.depthByOrder}}</span></a></div>' +
            '<div class="layout-col widget-inner-tab-item {{unless view.windowTypes.chart "hide" ""}}" id =' + 'symPopViewW4' + this.get('outletName') + '><a class="h-middle full-width hint--bottom hint--rounded hint--bounce" data-hint={{view.app.lang.labels.chart}} name="widgetFive" {{action "showWidget" 4 target="view"}} data-toggle="tab"><i class="layout-inline icon-chart-bar"></i><span class="layout-inline font-m symbol-popup-name pad-s-l">{{view.app.lang.labels.chart}}</span></a></div>' +
            '<div class="layout-col widget-inner-tab-item {{unless view.windowTypes.alerts "hide" ""}}" id =' + 'symPopViewW5' + this.get('outletName') + '><a class="h-middle full-width hint--bottom hint--rounded hint--bounce" data-hint={{view.app.lang.labels.alerts}} name="widgetSix" {{action "showWidget" 5 target="view"}} data-toggle="tab"><i class="layout-inline icon-bell"></i><span class="layout-inline font-m symbol-popup-name pad-s-l">{{view.app.lang.labels.alerts}}</span></a></div>' +
            '</div><div class="popup-height" style="' + this.get('popupHeightCss') + '">{{outlet OUTLET_NAME}}</div></div></div>'.replace('OUTLET_NAME', '"' + this.outletName + '"'));

        this.set('showWidget1', true);

        if (!this.get('currentLink')) {
            this.set('currentLink', 0);
        }
    }.on('init'),

    setTabVisibility: function (stock) {
        if (!this._isDestroyed()) {
            this.set('detailSymbol', this.priceService.stockDS.getStock(stock.exg, stock.sym, stock.inst));
        }

        if (stock.inst === utils.AssetTypes.SukukBonds || stock.inst === utils.AssetTypes.Indices || utils.AssetTypes.isOption(stock.inst) || utils.AssetTypes.isForex(stock.inst)) {
            this.hideWidget(this.get('timeAndSalesWidgetId'));
            this.hideWidget(this.get('depthByPriceWidgetId'));
            this.hideWidget(this.get('depthByOrderWidgetId'));
            this.hideWidget(this.get('alertsWidgetId'));
        } else if (utils.AssetTypes.isOption(stock.inst)) {
            this.hideWidget(this.get('chartWidgetId'));
        } else if (!appConfig.customisation.isAlertEnabled) {
            this.hideWidget(this.get('alertsWidgetId'));
        } else {
            var isExchangeDelayed = this.priceService.userDS.isExchangeDelayed(stock.exg);
            var mdoAvailable = this.priceService.userDS.isWindowTypeAvailable([priceConstants.WindowType.MarketDepthByOrder, priceConstants.WindowType.MarketDepthByOrderAdvanced], stock.exg);
            var mdpAvailable = this.priceService.userDS.isWindowTypeAvailable([priceConstants.WindowType.MarketDepthByPrice, priceConstants.WindowType.MarketDepthByPriceAdvanced], stock.exg);

            if (!isExchangeDelayed) {
                this.showWidget(this.get('timeAndSalesWidgetId'));
            }

            if (mdoAvailable && !isExchangeDelayed) {
                this.showWidget(this.get('depthByOrderWidgetId'));
            }

            if (mdpAvailable && !isExchangeDelayed) {
                this.showWidget(this.get('depthByPriceWidgetId'));
            }
        }
    },

    onWidgetKeysChange: function (stock) {
        var previousInsType = this.get('detailSymbol') ? this.get('detailSymbol').inst : '';
        var currentWidgetId = this.get('widgetId');

        var isAdvancedMode = previousInsType !== utils.AssetTypes.SukukBonds && previousInsType !== utils.AssetTypes.Indices;
        var isSimpleMode = stock.inst === utils.AssetTypes.SukukBonds || stock.inst === utils.AssetTypes.Indices;
        var isCurrentTabNotInSimpleMode = currentWidgetId === this.get('timeAndSalesWidgetId') || currentWidgetId === this.get('depthByPriceWidgetId') || currentWidgetId === this.get('depthByOrderWidgetId');

        this.setTabVisibility(stock);

        if (isAdvancedMode && isSimpleMode && isCurrentTabNotInSimpleMode) {
            Ember.$('#symPopViewW' + currentWidgetId + this.get('outletName')).removeClass('active');

            this.unloadCurrentController();
            this.prepare(this.get('detailQuoteWidgetId'), stock.sym, stock.exg, stock.inst);
        } else {
            this.setProperties(stock.sym, stock.exg, stock.inst);
        }
    },

    setProperties: function (symbol, exchange, insType) {
        if (!this._isDestroyed()) {
            this.set('detailSymbol', this.priceService.stockDS.getStock(exchange, symbol, insType));

            var isExchangeDelayed = this.priceService.userDS.isExchangeDelayed(this.get('detailSymbol').exg);
            var mdoAvailable = this.priceService.userDS.isWindowTypeAvailable([priceConstants.WindowType.MarketDepthByOrder, priceConstants.WindowType.MarketDepthByOrderAdvanced], exchange);
            var mdpAvailable = this.priceService.userDS.isWindowTypeAvailable([priceConstants.WindowType.MarketDepthByPrice, priceConstants.WindowType.MarketDepthByPriceAdvanced], exchange);

            // Set true if widget required to be enabled, false to be disabled
            Ember.set(this.windowTypes, 'mdo', mdoAvailable && !isExchangeDelayed);
            Ember.set(this.windowTypes, 'mdp', mdpAvailable && !isExchangeDelayed);
            Ember.set(this.windowTypes, 'tns', !isExchangeDelayed);
            Ember.set(this.windowTypes, 'chart', !utils.AssetTypes.isOption(insType));
            Ember.set(this.windowTypes, 'alerts', (!utils.AssetTypes.isIndices(insType) && appConfig.customisation.isAlertEnabled));
        }
    },

    prepare: function (id, symbol, exchange, insType) {
        if (symbol) {
            this.setProperties(symbol, exchange, insType);
        }

        // Subscribe popup container
        appEvents.subscribeSymbolChanged(this.get('outletName'), this, this.get('currentLink'));

        this.preparePopUp(id);

        utils.analyticsService.trackEvent('popup:symbol-popup', utils.Constants.GAActions.show, ['sym:', symbol, '~', exchange].join(''));
    },

    preparePopUp: function (id) {
        var controllerString, routeString, mode, hideWidgetLink, targetController;
        var widgetId = id;

        var isExchangeDelayed = this.priceService.userDS.isExchangeDelayed(this.get('detailSymbol').exg);
        var mdoAvailable = this.priceService.userDS.isWindowTypeAvailable([priceConstants.WindowType.MarketDepthByOrder, priceConstants.WindowType.MarketDepthByOrderAdvanced], this.get('detailSymbol').exg);
        var mdpAvailable = this.priceService.userDS.isWindowTypeAvailable([priceConstants.WindowType.MarketDepthByPrice, priceConstants.WindowType.MarketDepthByPriceAdvanced], this.get('detailSymbol').exg);

        if (widgetId === this.timeAndSalesWidgetId && isExchangeDelayed) {
            widgetId = 0;
        }

        if (widgetId === this.depthByOrderWidgetId && (!mdoAvailable || isExchangeDelayed)) {
            widgetId = 0;
        }

        if (widgetId === this.depthByPriceWidgetId && (!mdpAvailable || isExchangeDelayed)) {
            widgetId = 0;
        }

        this.set('widgetId', widgetId);

        switch (widgetId) {
            case 0:
                controllerString = 'controller:price/widgets/detail-quote';
                routeString = 'price/widgets/detail-quote';
                break;

            case 1:
                controllerString = 'controller:price/widgets/time-and-sales/quote-time-and-sales';
                routeString = 'price/widgets/time-and-sales/quote-time-and-sales';
                break;

            case 2:
                controllerString = 'controller:price/widgets/quote-market-depth';
                routeString = 'price/widgets/quote-market-depth';
                mode = 1;
                break;

            case 3:
                controllerString = 'controller:price/widgets/quote-market-depth';
                routeString = 'price/widgets/quote-market-depth';
                mode = 2;
                break;

            case 4:
                controllerString = 'controller:chart/regular-chart';
                routeString = 'chart/regular-chart';
                hideWidgetLink = true;
                break;

            case 5:
                controllerString = 'controller:price/widgets/alert-price';
                routeString = 'price/widgets/alert-price';
                break;

            default:
                controllerString = 'controller:price/widgets/top-stocks';
                routeString = 'price/widgets/top-stocks';
                break;
        }

        var widgetKey = this.get('widgetId') + this.get('outletName');
        var widgetController = ControllerFactory.createController(this.container, controllerString);

        widgetController.set('sym', this.get('detailSymbol').sym);
        widgetController.set('exg', this.get('detailSymbol').exg);
        widgetController.set('inst', this.get('detailSymbol').inst);
        widgetController.set('wkey', widgetKey);
        widgetController.set('hideTitle', true);
        widgetController.set('hideWidgetLink', hideWidgetLink);

        if (mode) {
            widgetController.set('mode', mode);
        }

        if (utils.validators.isAvailable(this.get('widgetId'))) {
            // Un-subscribe previous widget
            appEvents.unSubscribeLanguageChanged(widgetKey);
            appEvents.unSubscribeThemeChanged(widgetKey);
        }

        // Subscribe new widget
        appEvents.subscribeLanguageChanged(widgetController, widgetKey);
        appEvents.subscribeThemeChanged(widgetController, widgetKey);

        widgetController.initializeWidget({wn: controllerString.split('/').pop()}, {widgetArgs: {selectedLink: this.get('currentLink')}});
        targetController = this.get('dockedMode') ? 'view-container-controller' : 'application';

        var route = this.container.lookup('route:application');
        route.render(routeString, {
            into: targetController,
            outlet: this.outletName,
            controller: widgetController
        });

        this.set('currentWidgetController', widgetController);
        this.set('links', widgetController.get('links'));
    },

    click: function () {
        var elem = document.getElementById(this.elementId);

        if (!Ember.PopupZIndex) {
            Ember.PopupZIndex = 2000;
        }

        Ember.PopupZIndex = Ember.PopupZIndex + 1;
        elem.style.zIndex = Ember.PopupZIndex;

        this.set('activeWidget', Ember.appGlobal.activeWidget);
        Ember.appGlobal.activeWidget = Ember.PopupZIndex;
        var that = this;

        Mousetrap.bind('esc', function () {
            that._closePopup();
        }, Ember.PopupZIndex);
    },

    hideWidget: function (widgetId) {
        Ember.$('#symPopViewW' + widgetId + this.get('outletName')).addClass('hide');
    },

    showWidget: function (widgetId) {
        Ember.$('#symPopViewW' + widgetId + this.get('outletName')).removeClass('hide');
    },

    getPopupCount: function () {
        var popupCount = Ember.appGlobal.session.popupCount;

        if (this.get('dimensions.h') + popupCount * this.get('displacementScale') > Ember.$(window).height() || this.get('dimensions.w') + popupCount * this.get('displacementScale') > Ember.$(window).width()) {
            Ember.appGlobal.session.popupCount = 0;
        } else {
            Ember.appGlobal.session.popupCount = popupCount + 1;
        }

        return popupCount;
    },

    show: function (id, symbol, exchange, insType) {
        Ember.PopupContainerView.addPopupView(this);

        var popupElement = document.getElementById(Ember.PopupContainerView.elementId);
        var popupElementId = this.elementId;
        var currentPosition = this.getPopupCount() * this.get('displacementScale');
        this.set('currentPosition', currentPosition);

        if (popupElement) {
            popupElement.setAttribute('style', 'height: 1px; max-height: 1px; position: absolute;');
        }

        // Subscribe popup container
        appEvents.subscribeLanguageChanged(this, this.get('outletName'));
        appEvents.subscribeThemeChanged(this, this.get('outletName'));

        this.prepare(id, symbol, exchange, insType);

        Ember.run.later(function () {
            var elem = document.getElementById(popupElementId);

            if (elem) {
                new Draggabilly(elem, { // eslint-disable-line
                    handle: '#title-handle',
                    x: 100,
                    y: 200
                });

                Ember.$('.js-resizable').resizable();
            }
        }, 1000);
    },

    setPopupPosition: function () {
        this.setTabVisibility(this.get('detailSymbol'));

        // Set active tab
        Ember.$('#symPopViewW' + this.get('widgetId') + this.get('outletName')).addClass('active');

        var elem = document.getElementById(this.elementId);
        var currentPosition = this.get('currentPosition');
        var leftPosition = currentPosition;

        if (!this.get('dockedMode')) {
            if (this.get('userSettings').currentLanguage === 'AR') {
                leftPosition = -(this.get('dimensions').w + currentPosition);
            }

            elem.setAttribute('style', 'position: absolute; top:' + currentPosition + 'px;left:' + leftPosition + 'px;');
        }

        this.click(); // To add the z-index when the popup is created
    }.on('didInsertElement'),

    unloadCurrentController: function () {
        var currentController = this.get('currentWidgetController');

        if (currentController) {
            currentController.closeWidget();
        }
    },

    languageChanged: function () {
        this.setPopupPosition();
    },

    setActiveTab: function (currentId) {
        for (var id = 0; id < 6; id++) {
            if (id === currentId) {
                Ember.$('#symPopViewW' + currentId + this.get('outletName')).addClass('active');
            } else {
                Ember.$('#symPopViewW' + id + this.get('outletName')).removeClass('active');
            }
        }
    },

    themeChanged: function () {
        // Symbol-popup-view should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    summaryViewSettings: {
        intZero: 0,
        emptyString: '',
        styles: {
            upForeColor: 'up-fore-color',
            downForeColor: 'down-fore-color',
            white: 'white',
            upArrow: 'glyphicon-triangle-top glyphicon ',
            downArrow: 'glyphicon-triangle-bottom glyphicon '
        }
    },

    updatePercentageChangeCss: function () {
        var changeSign, perChgCss;
        var changeCss = '';
        var pctChg = this.get('detailSymbol').pctChg;

        if (pctChg > this.summaryViewSettings.intZero) {
            changeSign = this.summaryViewSettings.styles.upArrow;
            perChgCss = this.summaryViewSettings.styles.upForeColor;
            changeCss = this.summaryViewSettings.styles.upForeColor;
        } else if (pctChg < this.summaryViewSettings.intZero) {
            changeSign = this.summaryViewSettings.styles.downArrow;
            perChgCss = this.summaryViewSettings.styles.downForeColor;
            changeCss = this.summaryViewSettings.styles.downForeColor;
        } else {
            changeSign = this.summaryViewSettings.emptyString;
            perChgCss = this.summaryViewSettings.styles.white;
        }

        this.set('changeSign', changeSign);
        this.set('perChgCss', perChgCss);
        this.set('changeCss', changeCss);
    }.observes('detailSymbol.pctChg'),

    showOrderTicketPopup: function (side) {
        var symbol = this.get('detailSymbol');
        var controllerString, routeString, viewName;
        controllerString = 'controller:trade/widgets/order-ticket/order-ticket-portrait';
        routeString = 'trade/widgets/order-ticket/order-ticket-portrait';
        viewName = 'view:widget-popup-view';

        var sharedUIService = sharedService.getService('sharedUI');
        sharedUIService.showPopupWidget({container: this.container, controllerString: controllerString, routeString: routeString, viewName: viewName}, {tabId: side, sym: symbol.sym, exg: symbol.exg, inst: symbol.inst});
    },

    myModel: null,

    _closePopup: function () {
        // Un-subscribe popup container
        appEvents.unSubscribeSymbolChanged(this.get('outletName'), this.get('currentLink'));

        this.unloadCurrentController();
        Ember.PopupContainerView.removeObject(this);

        // Un-subscribing the widget on language changed
        appEvents.unSubscribeLanguageChanged(this.get('widgetId') + this.get('outletName'));
        // Un-subscribing the symbol-popup-view on language changed
        appEvents.unSubscribeLanguageChanged(this.get('outletName'));
        // Un-subscribing the widget on theme changed
        appEvents.unSubscribeThemeChanged(this.get('widgetId') + this.get('outletName'));
        // Un-subscribing the symbol-popup-view on theme changed
        appEvents.unSubscribeThemeChanged(this.get('outletName'));

        Ember.appGlobal.activeWidget = this.get('activeWidget');
    },

    _isDestroyed: function () {
        return this.get('isDestroyed') || this.get('isDestroying');
    },

    _updateOnSymbolChange: function () {
        this._loadWidgetForSymbol(this.get('detailSymbol'));
    }.observes('detailSymbol.sym'),

    _loadWidgetForSymbol: function (stock) {
        this.onWidgetKeysChange({sym: stock.sym, exg: stock.exg, inst: stock.inst});

        var currentController = this.get('currentWidgetController');

        if (currentController) {
            currentController.onWidgetKeysChange({sym: stock.sym, exg: stock.exg, inst: stock.inst});
        }
    },

    actions: {
        clickAction: function (item) {
            this._loadWidgetForSymbol(item);
        },

        showWidget: function (id) {
            this.unloadCurrentController();
            this.preparePopUp(id);
            this.setActiveTab(id);
            utils.analyticsService.trackEvent('popup:symbol-popup', utils.Constants.GAActions.viewChanged, ['tab:', this.get('currentWidgetController') ? this.get('currentWidgetController').gaKey : id].join(''));
        },

        closePopup: function () {
            this._closePopup();
        },

        setLinkView: function (option) {
            if (this.get('currentLink') !== undefined && this.get('currentLink') !== 0) {
                appEvents.unSubscribeSymbolChanged(this.get('outletName'), this.get('currentLink'));
            }

            this.set('currentLink', option.code);

            if (this.get('currentLink') !== undefined && this.get('currentLink') !== 0) {
                appEvents.subscribeSymbolChanged(this.get('outletName'), this, this.get('currentLink'));
            }

            var currentController = this.get('currentWidgetController');

            if (currentController) {
                currentController.setWidgetLink(option);
            }
        },

        buy: function () {
            this.showOrderTicketPopup('1');
        },

        sell: function () {
            this.showOrderTicketPopup('2');
        }
    }
});
