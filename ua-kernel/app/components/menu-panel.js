import Ember from 'ember';
import LanguageDataStore from '../models/shared/language/language-data-store';
import sharedService from '../models/shared/shared-service';

export default Ember.Component.extend({
    app: LanguageDataStore.getLanguageObj(),

    load: function () {
        var viewName = 'view:widget-popup-view';
        var callbackFunc = sharedService.getService('sharedUI').showPopupWidget;

        var menuContent = [
            {
                id: 1, key: '', name: 'Trade', hasSubMenu: true, subMenuPopupId: 'subMenuPopup1', subMenu: [
                {
                    id: 1, key: 'buy', name: 'Order Blotter', config: {
                    callbackFunc: callbackFunc,
                    controllerString: 'controller:trade/widgets/order-ticket/order-ticket-portrait',
                    routeString: 'trade/widgets/order-ticket/order-ticket-portrait',
                    viewName: viewName
                }, args: {tabId: '1'}
                },
                {
                    id: 2, key: 'orderList', name: 'Order List', config: {
                    callbackFunc: callbackFunc, controllerString: 'controller:trade/widgets/order-list',
                    routeString: 'trade/widgets/order-list', viewName: viewName
                }, args: {tabId: '2', dimensions: {w: '900', h: '400'}}
                },
                {
                    id: 3, key: 'orderSearch', name: 'Order Search', config: {
                    callbackFunc: callbackFunc, controllerString: 'controller:trade/widgets/order-search',
                    routeString: 'trade/widgets/order-search', viewName: viewName
                }, args: {tabId: '3', dimensions: {w: '900', h: '400'}}
                },
                {
                    id: 4, key: 'portfolio', name: 'Portfolio', config: {
                    callbackFunc: callbackFunc, controllerString: 'controller:trade/widgets/portfolio',
                    routeString: 'trade/widgets/portfolio', viewName: viewName
                }, args: {tabId: '4', dimensions: {w: '900', h: '400'}}
                }
            ]
            },
            {id: 2, key: '', name: 'Customer', subMenu: [], hasSubMenu: false},
            {
                id: 3, key: '', name: 'Market', hasSubMenu: true, subMenuPopupId: 'subMenuPopup2', subMenu: [
                {
                    id: 1,
                    key: 'watchList',
                    name: 'WatchList',
                    config: {
                        callbackFunc: callbackFunc,
                        controllerString: 'controller:price/widgets/watch-list/watch-list',
                        routeString: 'price/widgets/watch-list/watch-list',
                        viewName: viewName
                    },
                    args: {tabId: 1, dimensions: {w: '900', h: '400'}}
                },
                {
                    id: 2,
                    key: 'heatmap',
                    name: 'Heat Map',
                    config: {
                        callbackFunc: callbackFunc,
                        controllerString: 'controller:price/widgets/heatmap',
                        routeString: 'price/widgets/heatmap',
                        viewName: viewName
                    },
                    args: {tabId: 0, dimensions: {w: '900', h: '500'}}
                },
                {
                    id: 3,
                    key: 'chart',
                    name: 'Pro Chart',
                    config: {
                        callbackFunc: callbackFunc,
                        controllerString: 'controller:chart/pro-chart',
                        routeString: 'chart/pro-chart',
                        viewName: viewName
                    },
                    args: {tabId: 0, dimensions: {w: '900', h: '500'}}
                }
            ]
            },
            {id: 4, key: '', name: 'Quote', subMenu: [], hasSubMenu: false},
            {id: 5, key: '', name: 'Company Profile', subMenu: [], hasSubMenu: false},
            {id: 6, key: '', name: 'Download', subMenu: [], hasSubMenu: false},
            {id: 7, key: '', name: 'View', subMenu: [], hasSubMenu: false}
        ];

        this.set('menuContent', menuContent);
    }.on('init'),

    actions: {
        showSubMenu: function (subMenuPopupId) {
            var subMenuModal = this.get(subMenuPopupId);
            subMenuModal.send('showModalPopup');
        },

        menuItemClicked: function (config, args, subMenuPopupId) {
            config.container = this.container;
            config.callbackFunc(config, args);

            // Close menu
            var modal = this.get(subMenuPopupId);
            modal.send('closeModalPopup');
        }
    }
});