import Ember from 'ember';
import BaseController from './base-controller';
import ControllerFactory from './controller-factory';
import sharedService from '../models/shared/shared-service';

export default BaseController.extend({
    controllerString: '',
    widgetController: {},

    onLoadWidget: function () {
        this.set('controllerString', this.get('controllerString'));
        this.set('widgetOutlet', this.get('widgetOutlet'));
    },

    onAfterRender: function () {
        this._renderCachedWidget(true);
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

    updateContent: function () {
        var widgetController = this.get('widgetController');

        if (widgetController && Ember.$.isFunction(widgetController.updateContent)) {
            widgetController.updateContent();
        }
    },

    onClearData: function () {
        var widgetController = this.get('widgetController');

        if (widgetController && Ember.$.isFunction(widgetController.onClearData)) {
            widgetController.onClearData();
        }
    },

    onClearRender: function () {
        this.cacheDom();
    },

    cacheDom: function () {
        var widgetController = this.get('widgetController');
        Ember.appGlobal.tableCache[this.controllerString] = widgetController;

        if (widgetController && Ember.$.isFunction(widgetController.onRemoveSubscription)) {
            widgetController.onRemoveSubscription();
            widgetController.onUnloadWidget();

            var element = Ember.$('#' + widgetController.get('widgetContainerKey')).detach();
            Ember.appGlobal.tableCache[this.controllerString + '-DOM'] = element;

            if (element && element.length > 0) {
                Ember.$('#table-cache').append(element);
            }
        }
    },

    renderWidget: function () {
        var that = this;
        var controllerString = 'controller:' + this.controllerString;
        var routeString = this.controllerString;
        var widgetKey = this.get('wkey') + '-cached';

        // TODO: [satheeqh] Handle arguments passing to initialize widget

        var mainPanel = sharedService.getService('sharedUI').getService('mainPanel');
        var widgetController = ControllerFactory.createController(mainPanel.container, controllerString);
        var innerWidgets = this.get('innerWidgets');

        widgetController.set('sym', this.get('sym'));
        widgetController.set('exg', this.get('exg'));
        widgetController.set('inst', this.get('inst'));
        widgetController.set('wkey', widgetKey);
        widgetController.set('innerWidgets', innerWidgets);
        widgetController.set('widgetContainer', mainPanel);

        widgetController.set('afterRenderCb', function () {
            that._renderCachedWidget(false);
        });

        widgetController.initializeWidget({wn: controllerString.split('/').pop()}, {
            widgetArgs: {selectedLink: this.get('currentLink')},
            innerWidgets: innerWidgets
        });

        this.set('widgetController', widgetController);

        Ember.appGlobal.tableCache[this.controllerString] = widgetController;
        var route = mainPanel.container.lookup('route:application');
        var widgetOutlet = this.get('widgetOutlet');

        route.render(routeString, {
            into: 'main-panel-container-controller',
            outlet: widgetOutlet,
            controller: widgetController
        });
    },

    _renderCachedWidget: function (isFromCache) {
        var cachedWidgetInstance = Ember.appGlobal.tableCache[this.controllerString];

        if (cachedWidgetInstance) {
            var containerId = cachedWidgetInstance.get('widgetContainerKey');
            var element = Ember.$('#' + containerId);

            if (!element || (element && element.length === 0)) {
                element = Ember.appGlobal.tableCache[this.controllerString + '-DOM'];
            }

            if (element && element.length > 0) {
                var containerElem = Ember.$('#' + this.get('wkey'));
                var newWidth = 'width: calc(100% - 0px);'; // To update width on render and support on widget resize

                element[0].setAttribute('style', newWidth);
                containerElem.append(element.detach());

                if (isFromCache) {
                    Ember.run.next(this, function () {
                        cachedWidgetInstance.onLoadWidget();
                        cachedWidgetInstance.onPrepareData();
                        cachedWidgetInstance.onAddSubscription();
                    });
                }

                cachedWidgetInstance.set('selectedLink', this.get('selectedLink'));
                this.set('widgetController', cachedWidgetInstance);
            } else {
                this.utils.logger.logError('Cached instance not found. Widget: ' + this.controllerString);
            }
        } else {
            this.renderWidget();
        }
    }
});