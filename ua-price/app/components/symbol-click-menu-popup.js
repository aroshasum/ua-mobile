/* global Mousetrap */

import Ember from 'ember';
import BaseContextMenu from '../components/base-context-menu';
import utils from '../utils/utils';
import LanguageDataStore from '../models/shared/language/language-data-store';
import appConfig from '../config/app-config';
import sharedService from '../models/shared/shared-service';
import priceConstants from '../models/price/price-constants';

export default BaseContextMenu.extend({
    layoutName: 'components/symbol-click-menu-popup',

    // Pop up Widget Parameters
    selectedSymbol: undefined,
    mainContextMenu: [],
    contextMap: {},

    app: LanguageDataStore.getLanguageObj(),
    userSettings: sharedService.userSettings,

    isArabic: function () {
        return this.userSettings.currentLanguage === 'AR';
    }.property('userSettings.currentLanguage'),

    load: function () {
        this.set('priceService', sharedService.getService('price'));
        this.set('priceUIService', sharedService.getService('priceUI'));

        var sharedUIService = sharedService.getService('sharedUI');
        var callbackFunc = this.priceUIService.showPopupWidget;

        var contextItem = [[
            {view: {key: 'detailQuote', name: this.get('app').lang.labels.detailQuote, iconClass: 'icon-list-ul', shortcut: 'Alt + D'}, config: {callbackFunc: callbackFunc, controllerString: 'view:symbol-popup-view'}, args: {tabId: 0}},
            {view: {key: 'timeAndSales', name: this.get('app').lang.labels.timeAndSales, iconClass: 'icon-clock', shortcut: 'Alt + T'}, config: {callbackFunc: callbackFunc, controllerString: 'view:symbol-popup-view'}, args: {tabId: 1}},
            {view: {key: 'depthByPrice', name: this.get('app').lang.labels.depthByPrice, iconClass: 'icon-add-fav', shortcut: 'Alt + P'}, config: {callbackFunc: callbackFunc, controllerString: 'view:symbol-popup-view'}, args: {tabId: 2}},
            {view: {key: 'depthByOrder', name: this.get('app').lang.labels.depthByOrder, iconClass: 'icon-sitemap', shortcut: 'Alt + O'}, config: {callbackFunc: callbackFunc, controllerString: 'view:symbol-popup-view'}, args: {tabId: 3}},
            {view: {key: 'chart', name: this.get('app').lang.labels.chart, iconClass: 'icon-chart-bar', shortcut: 'Alt + C'}, config: {callbackFunc: callbackFunc, controllerString: 'view:symbol-popup-view'}, args: {tabId: 4}},
            {view: {key: 'alerts', name: this.get('app').lang.labels.alerts, iconClass: 'icon-bell', shortcut: 'Alt + A'}, config: {callbackFunc: callbackFunc, controllerString: 'view:symbol-popup-view'}, args: {tabId: 5}}
        ]];

        this.set('fullContextMenu', contextItem);

        if (appConfig.customisation.isTradingEnabled) {
            // Save for later usage when binding dynamic order sides
            this.contextMap['trade'] = {
                controllerString: 'controller:trade/widgets/order-ticket/order-ticket-portrait',
                routeString: 'trade/widgets/order-ticket/order-ticket-portrait',
                viewName: 'view:widget-popup-view',
                callbackFunc: sharedUIService.showPopupWidget.bind(sharedUIService)
            };

            this.set('tradeService', sharedService.getService('trade'));
            var tradeContextData = this.contextMap['trade'];

            var trdContextItems = [
                {
                    view: {key: 'orderSide_1', name: this.get('app').lang.labels.orderSide_1, menuClass: 'up-fore-color', iconClass: 'icon-arrow-circle-up up-fore-color', shortcut: 'Alt + B'},
                    config: {callbackFunc: tradeContextData.callbackFunc, controllerString: tradeContextData.controllerString, routeString: tradeContextData.routeString, viewName: tradeContextData.viewName},
                    args: {tabId: '1'}
                },
                {
                    view: {key: 'orderSide_2', name: this.get('app').lang.labels.orderSide_2, menuClass: 'down-fore-color', iconClass: 'icon-arrow-circle-down down-fore-color', shortcut: 'Alt + S'},
                    config: {callbackFunc: tradeContextData.callbackFunc, controllerString: tradeContextData.controllerString, routeString: tradeContextData.routeString, viewName: tradeContextData.viewName},
                    args: {tabId: '2'}
                }
            ];

            this.set('tradeContextMenu', trdContextItems);
        }
    }.observes('app.lang').on('init'),

    prepareContextMenu: function (rowData) {
        this.set('selectedSymbol', rowData);
        this._prepareCommonContextMenu(rowData);

        if (appConfig.customisation.isTradingEnabled) {
            this._prepareTradeContextMenu(rowData);
        }
    },

    bindKeyboardShortcut: function (wkey) {
        var that = this;

        // Keyboard functions
        Mousetrap.bind('alt+d', function () {
            // Show Detail Quote
            that.priceUIService.showPopupWidget({container: that.container, controllerString: 'view:symbol-popup-view'}, {tabId: 0, sym: that.selectedSymbol.sym, exg: that.selectedSymbol.exg, inst: that.selectedSymbol.inst});

            utils.analyticsService.trackEvent(that.get('gaKey'), 'keyboard-shortcut', ['shortcut:', 'alt+d', ',',
                'popup:', 0, ',', 'sym:', that.get('selectedSymbol.sym'), '~', that.get('selectedSymbol.exg')].join(''));
            return false;
        }, wkey);

        Mousetrap.bind('alt+t', function () {
            // Show Time and Sales
            that.priceUIService.showPopupWidget({container: that.container, controllerString: 'view:symbol-popup-view'}, {tabId: 1, sym: that.selectedSymbol.sym, exg: that.selectedSymbol.exg, inst: that.selectedSymbol.inst});

            utils.analyticsService.trackEvent(that.get('gaKey'), 'keyboard-shortcut', ['shortcut:', 'alt+t', ',',
                'popup:', 1, ',', 'sym:', that.get('selectedSymbol.sym'), '~', that.get('selectedSymbol.exg')].join(''));
            return false;
        }, wkey);

        Mousetrap.bind('alt+p', function () {
            // Show Depth by Price
            if (that.priceService.userDS.isWindowTypeAvailable([priceConstants.WindowType.MarketDepthByPrice, priceConstants.WindowType.MarketDepthByPriceAdvanced], that.selectedSymbol.exg)) {
                that.priceUIService.showPopupWidget({container: that.container, controllerString: 'view:symbol-popup-view'}, {tabId: 2, sym: that.selectedSymbol.sym, exg: that.selectedSymbol.exg, inst: that.selectedSymbol.inst});

                utils.analyticsService.trackEvent(that.get('gaKey'), 'keyboard-shortcut', ['shortcut:', 'alt+p', ',',
                    'popup:', 2, ',', 'sym:', that.get('selectedSymbol.sym'), '~', that.get('selectedSymbol.exg')].join(''));
            }

            return false;
        }, wkey);

        Mousetrap.bind('alt+o', function () {
            // Show Depth by Order
            if (that.priceService.userDS.isWindowTypeAvailable([priceConstants.WindowType.MarketDepthByOrder, priceConstants.WindowType.MarketDepthByOrderAdvanced], that.selectedSymbol.exg)) {
                that.priceUIService.showPopupWidget({container: that.container, controllerString: 'view:symbol-popup-view'}, {tabId: 3, sym: that.selectedSymbol.sym, exg: that.selectedSymbol.exg, inst: that.selectedSymbol.inst});

                utils.analyticsService.trackEvent(that.get('gaKey'), 'keyboard-shortcut', ['shortcut:', 'alt+o', ',',
                    'popup:', 3, ',', 'sym:', that.get('selectedSymbol.sym'), '~', that.get('selectedSymbol.exg')].join(''));
            }

            return false;
        }, wkey);

        Mousetrap.bind('alt+c', function () {
            // Show Chart
            that.priceUIService.showPopupWidget({container: that.container, controllerString: 'view:symbol-popup-view'}, {tabId: 4, sym: that.selectedSymbol.sym, exg: that.selectedSymbol.exg, inst: that.selectedSymbol.inst});

            utils.analyticsService.trackEvent(that.get('gaKey'), 'keyboard-shortcut', ['shortcut:', 'alt+c', ',',
                'popup:', 4, ',', 'sym:', that.get('selectedSymbol.sym'), '~', that.get('selectedSymbol.exg')].join(''));
            return false;
        }, wkey);

        Mousetrap.bind('alt+a', function () {
            // Show Alerts
            that.priceUIService.showPopupWidget({container: that.container, controllerString: 'view:symbol-popup-view'}, {tabId: 5, sym: that.selectedSymbol.sym, exg: that.selectedSymbol.exg, inst: that.selectedSymbol.inst});

            utils.analyticsService.trackEvent(that.get('gaKey'), 'keyboard-shortcut', ['shortcut:', 'alt+a', ',',
                'popup:', 5, ',', 'sym:', that.get('selectedSymbol.sym'), '~', that.get('selectedSymbol.exg')].join(''));
            return false;
        }, wkey);

        if (appConfig.customisation.isTradingEnabled) {
            var controllerString = 'controller:trade/widgets/order-ticket/order-ticket-portrait';
            var routeString = 'trade/widgets/order-ticket/order-ticket-portrait';
            var viewName = 'view:widget-popup-view';
            var sharedUIService = sharedService.getService('sharedUI');

            Mousetrap.bind('alt+b', function () {
                // Show Buy Order ticket
                sharedUIService.showPopupWidget({container: that.container, controllerString: controllerString, routeString: routeString, viewName: viewName}, {tabId: '1', sym: that.selectedSymbol.sym, exg: that.selectedSymbol.exg, inst: that.selectedSymbol.inst});

                utils.analyticsService.trackEvent(that.get('gaKey'), 'keyboard-shortcut', ['shortcut:', 'alt+b', ',',
                    'popup:', 5, ',', 'sym:', that.get('clickedRowSymbol'), '~', that.get('clickedRowExchange')].join(''));
                return false;
            }, wkey);

            Mousetrap.bind('alt+s', function () {
                // Show Buy Order ticket
                sharedUIService.showPopupWidget({container: that.container, controllerString: controllerString, routeString: routeString, viewName: viewName}, {tabId: '2', sym: that.selectedSymbol.sym, exg: that.selectedSymbol.exg, inst: that.selectedSymbol.inst});

                utils.analyticsService.trackEvent(that.get('gaKey'), 'keyboard-shortcut', ['shortcut:', 'alt+s', ',',
                    'popup:', 6, ',', 'sym:', that.get('clickedRowSymbol'), '~', that.get('clickedRowExchange')].join(''));
                return false;
            }, wkey);

            /* Mousetrap.bind('alt+l', function () {
                // Show Buy Order ticket
                sharedUIService.showPopupWidget({container: that.container, controllerString: controllerString, routeString: routeString, viewName: viewName}, {tabId: '2', sym: that.selectedSymbol.sym, exg: that.selectedSymbol.exg, inst: that.selectedSymbol.inst, qty: that.selectedSymbol.qty});

                utils.analyticsService.trackEvent(that.get('gaKey'), 'keyboard-shortcut', ['shortcut:', 'alt+l', ',',
                    'popup:', 7, ',', 'sym:', that.get('clickedRowSymbol'), '~', that.get('clickedRowExchange')].join(''));
                return false;
            }, wkey);*/
        }
    },

    _prepareCommonContextMenu: function (rowData) {
        var winTypeAvailable;
        var fullMenu = this.get('fullContextMenu');
        var that = this;

        Ember.$.each(fullMenu, function (outerIndex, outerMenu) {
            Ember.$.each(outerMenu, function (innerIndex, innerMenu) {
                var isDelayedExg = that.priceService.userDS.isExchangeDelayed(rowData.exg);

                if (innerMenu.view) {
                    switch (innerMenu.view.key) {
                        case 'depthByOrder':
                            winTypeAvailable = that.priceService.userDS.isWindowTypeAvailable([priceConstants.WindowType.MarketDepthByOrder, priceConstants.WindowType.MarketDepthByOrderAdvanced], rowData.exg);

                            if (!utils.AssetTypes.isEquityAssetType(rowData.inst) || !winTypeAvailable || isDelayedExg) {
                                innerMenu.view.displayStyle = 'display-none';
                            }

                            break;

                        case 'timeAndSales':
                            if (!utils.AssetTypes.isEquityAssetType(rowData.inst) || isDelayedExg) {
                                innerMenu.view.displayStyle = 'display-none';
                            }

                            break;

                        case 'depthByPrice':
                            winTypeAvailable = that.priceService.userDS.isWindowTypeAvailable([priceConstants.WindowType.MarketDepthByPrice, priceConstants.WindowType.MarketDepthByPriceAdvanced], rowData.exg);

                            if (!utils.AssetTypes.isEquityAssetType(rowData.inst) || !winTypeAvailable || isDelayedExg) {
                                innerMenu.view.displayStyle = 'display-none';
                            }

                            break;

                        case 'chart':
                            if (utils.AssetTypes.isOption(rowData.inst)) {
                                innerMenu.view.displayStyle = 'display-none';
                            }

                            break;

                        case 'alerts':
                            if (utils.AssetTypes.isIndices(rowData.inst) || !appConfig.customisation.isAlertEnabled) {
                                innerMenu.view.displayStyle = 'display-none';
                            }

                            break;

                        default:
                            innerMenu.view.displayStyle = '';
                            break;
                    }
                }
            });
        });

        this.set('fullContextMenu', fullMenu);
    },

    _prepareTradeContextMenu: function (rowData) {
        var tradeMenu = this.get('tradeContextMenu');
        this._amendDynamicOrderSides(tradeMenu, rowData.exg);

        var displayStyle = !utils.AssetTypes.isTradableAssetType(rowData.inst) ? 'display-none' : '';

        Ember.$.each(tradeMenu, function (index, menu) {
            menu.view.displayStyle = displayStyle;
        });

        this.set('tradeContextMenu', tradeMenu);
    },

    _amendDynamicOrderSides: function (tradeMenu, exchange) {
        var that = this;
        var tradeMetaDS = this.get('tradeService.tradeMetaDS');
        var tradeConstants = this.get('tradeService.constants');
        var tradeContextData = this.contextMap['trade'];

        if (tradeMetaDS) {
            var orderSideList = tradeMetaDS.getOrderSideMapByExchange(exchange);

            Ember.$.each(orderSideList, function (index, orderSide) {
                if (orderSide.code !== tradeConstants.OrderSide.Buy && orderSide.code !== tradeConstants.OrderSide.Sell) {
                    var sideKey = 'orderSide_' + orderSide.code;

                    tradeMenu[tradeMenu.length] = {
                        view: {
                            key: sideKey,
                            name: that.get('app').lang.labels[sideKey],
                            iconClass: 'icon-trade'
                        },
                        config: {
                            callbackFunc: tradeContextData.callbackFunc,
                            controllerString: tradeContextData.controllerString,
                            routeString: tradeContextData.routeString,
                            viewName: tradeContextData.viewName
                        },
                        args: {
                            tabId: orderSide.code
                        }
                    };
                }
            });
        }
    },

    _setRightClickMenu: function (config, args) {
        // Add selected symbol details to args object
        args.sym = this.selectedSymbol.sym;
        args.exg = this.selectedSymbol.exg;
        args.inst = this.selectedSymbol.inst;
        config.container = this.container;

        if (args.tabId === 7) {  // Todo [Anushka] Move the delete symbol option to watch-list data store
            this.priceService.watchListDS.deleteSymbol({sym: args.sym, exg: args.exg}, this.associatedController.get('currentCustomWLId'));
            this.closeModal();
        } else {
            config.callbackFunc(config, args);
        }
    },

    closeModal: function () {
        var modal = sharedService.getService('sharedUI').getService('modalPopupId');
        modal.send('closeModalPopup');
    },

    actions: {
        rightClickItem: function (config, args) {
            this._setRightClickMenu(config, args);
        },

        addNewWLWithStockCBAction: function (id) {
            this.associatedController.onCustomWlSelect(id);
            this.closeModal();

            utils.analyticsService.trackEvent(this.associatedController.get('gaKey'), utils.Constants.GAActions.click, ['newWatchListName:', this.associatedController.get('currentCustomWLName'), '~', 'symbol:', this.get('selectedSymbol').sym].join(''));
        },

        addStocksFromMenu: function (id) {
            this.priceService.watchListDS.addStocksToCustomWL(this.get('selectedSymbol'), id);
            this.closeModal();
        },

        position: function () {
            var fullHeight = document.documentElement.clientHeight;
            var fullWidth = document.documentElement.clientWidth;
            var popupParent = Ember.$('#rightClickExpanded1');
            var popup = Ember.$('#popup');
            var OffsetBottom = 4;
            var leftPosition;

            if (sharedService.userSettings.currentLanguage === 'AR') {
                if (popupParent.offset().left > popup.width()) {
                    leftPosition = 0 - popupParent.innerWidth();
                } else {
                    leftPosition = popupParent.innerWidth();
                    popup.css({'right': 'inherit'});
                }
            } else {
                leftPosition = fullWidth > popup.width() + popupParent.offset().left + popupParent.outerWidth() ? popupParent.innerWidth() : 0 - popupParent.innerWidth();
            }

            var top = fullHeight > popup.height() + popupParent.offset().top ? 0 : fullHeight - popup.outerHeight() - popupParent.offset().top - OffsetBottom;

            popup.css({'left': leftPosition, 'top': top, 'position': 'absolute'});
        }
    }
});
