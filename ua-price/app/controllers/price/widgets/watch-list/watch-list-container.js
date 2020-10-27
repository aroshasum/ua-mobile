import Ember from 'ember';
import BaseController from '../../../base-controller';
import ControllerFactory from '../../../../controllers/controller-factory';
import sharedService from '../../../../models/shared/shared-service';

export default BaseController.extend({
    WathclistController: 'price/widgets/watch-list.watch-list',
    widgetController: {},
    isWidgetClosed: false,
    selectedLink: 1,
    isAllowedToActive: false,

    onAfterRender: function () {
        this._renderWatchlist(true);
    },

    onPrepareData: function () {
        var widgetController = this.get('widgetController');

        if (widgetController && Ember.$.isFunction(widgetController.onPrepareData)) {
            widgetController.onPrepareData();
        }
    },

    onBindData: function () {
        var widgetController = this.get('widgetController');

        if (widgetController && Ember.$.isFunction(widgetController.onBindData)) {
            widgetController.onBindData();
        }
    },

    onAddSubscription: function () {
        var widgetController = this.get('widgetController');

        if (widgetController && Ember.$.isFunction(widgetController.onAddSubscription)) {
            widgetController.onAddSubscription();
        }
    },

    onRemoveSubscription: function () {
        var widgetController = this.get('widgetController');

        if (widgetController && Ember.$.isFunction(widgetController.onRemoveSubscription)) {
            widgetController.onRemoveSubscription();
        }
    },

    onClearData: function () {
        var widgetController = this.get('widgetController');

        if (widgetController && !this.isWidgetClosed && Ember.$.isFunction(widgetController.onClearData)) {
            widgetController.onClearData();
        }
    },

    onClearRender: function () {
        this.cacheDom();
    },

    cacheDom: function () {
        var widgetController = this.get('widgetController');

        Ember.appGlobal.tableCache[this.WathclistController] = widgetController;
        Ember.appGlobal.tableCache[this.WathclistController + '-DOM'] = Ember.$('#' + widgetController.get('widgetContainerKey'));

        if (widgetController && Ember.$.isFunction(widgetController.closeWidget)) {
            widgetController.closeWidget();
            this.set('isWidgetClosed', true);
        }
    },

    renderWidget: function () {
        var that = this;
        var controllerString = 'controller:' + this.WathclistController;
        var routeString = this.WathclistController;
        var widgetKey = this.get('wkey') + '-cached';

        // TODO: [satheeqh] Handle arguments passing to initialize widget

        var mainContainer = sharedService.getService('sharedUI').getService('mainPanel').container;
        var widgetController = ControllerFactory.createController(mainContainer, controllerString);
        widgetController.set('sym', this.get('sym'));
        widgetController.set('exg', this.get('exg'));
        widgetController.set('inst', this.get('inst'));
        widgetController.set('wkey', widgetKey);
        widgetController.set('bid', this.get('bid'));
        widgetController.set('wid', this.get('wid'));

        // Send args to watch-list
        if (this.get('sortProperties')) {
            widgetController.set('sortProperties', this.get('sortProperties'));
        }

        if (this.get('sortCols')) {
            widgetController.set('sortCols', this.get('sortCols'));
        }

        if (this.get('sortAsc')) {
            widgetController.set('sortAsc', this.get('sortAsc'));
        }

        if (this.get('hideSuspendedFilter')) {
            widgetController.set('hideSuspendedFilter', this.get('hideSuspendedFilter'));
        }

        widgetController.set('afterRenderCb', function () {
            that._renderWatchlist(false);
        });

        widgetController.initializeWidget({wn: controllerString.split('/').pop()}, {widgetArgs: {selectedLink: this.get('selectedLink')}});

        widgetController.set('widgetContainer', this.get('widgetContainer'));
        widgetController.set('menuContent', this.get('menuContent'));
        widgetController.set('tabContent', this.get('tabContent'));

        this.set('widgetController', widgetController);

        Ember.appGlobal.tableCache[this.WathclistController] = widgetController;
        var route = mainContainer.lookup('route:application');

        route.render(routeString, {
            into: 'main-panel-container-controller',
            outlet: 'watchlistOutlet',
            controller: widgetController
        });
    },

    _renderWatchlist: function (isFromCache) {
        var cachedWidgetInstance = Ember.appGlobal.tableCache[this.WathclistController];

        if (cachedWidgetInstance) {
            var element = isFromCache ? Ember.appGlobal.tableCache[this.WathclistController + '-DOM'] : Ember.$('#' + cachedWidgetInstance.get('widgetContainerKey'));

            if (element && element.length > 0) {
                var containerElem = Ember.$('#' + this.get('wkey'));
                containerElem.html(element);

                if (isFromCache) {
                    Ember.run.next(this, function () {
                        cachedWidgetInstance.set('menuContent', this.get('menuContent'));
                        cachedWidgetInstance.set('tabContent', this.get('tabContent'));

                        cachedWidgetInstance.onBindData();
                        cachedWidgetInstance.onAddSubscription();

                        Ember.run.later(this, function () {
                            if (cachedWidgetInstance.responsive) {
                                cachedWidgetInstance.responsive.onPrepare();
                            } else {
                                cachedWidgetInstance.initializeResponsive();
                            }
                        }, 1000);
                    });
                }

                Ember.run.later(this, function () {
                    if (Ember.$.isFunction(cachedWidgetInstance.onResizeWidget)) {
                        cachedWidgetInstance.onResizeWidget();
                    }

                    if (Ember.$.isFunction(cachedWidgetInstance.setLangLayoutSettings)) {
                        cachedWidgetInstance.setLangLayoutSettings(sharedService.userSettings.currentLanguage);
                    }
                }, 100);

                cachedWidgetInstance.set('selectedLink', this.get('selectedLink'));
                this.set('widgetController', cachedWidgetInstance);
            } else {
                this.utils.logger.logError('Cached instance not found. Widget: ' + this.WathclistController);
            }
        } else {
            this.renderWidget();
        }
    }
});