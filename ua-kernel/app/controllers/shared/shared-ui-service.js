import Ember from 'ember';
import appConfig from '../../config/app-config';
import ControllerFactory from '../controller-factory';
import appEvents from '../../app-events';
import webConnection from '../../models/shared/communication-adapters/web-http-connection';
import utils from '../../utils/utils';
import languageDataStore from '../../models/shared/language/language-data-store';
import sharedService from '../../models/shared/shared-service';

export default Ember.Object.extend({
    serviceMap: {},
    subscriptionKey: 'sharedUI',
    container: null,
    layoutMap: {},
    loginViewController: {},
    isSocialMediaSettingsUpdated: false,
    isDelayedUserLogged: false,
    isResetLoginStatus: false,

    init: function () {
        this._super();
        appEvents.subscribeDomReady(this.subscriptionKey, this);
    },

    onDomReady: function () {
        Ember.run.next(this, function () { // It is required in mobile to execute this in next loop
            webConnection.setRequestPermission(true);
            webConnection.sendPendingRequest();
        });
    },

    registerService: function (type, service) {
        this.serviceMap[type] = service;
    },

    getService: function (type) {
        return this.serviceMap[type];
    },

    invokeChangePassword: function (uiContainer) {
        if (uiContainer) {
            var changePasswordPopup = this.getService('changePasswordPopup');
            changePasswordPopup.send('showModalPopup', false);
        }
    },

    invokeRightClick: function (stock, wkey, event, menuComponent) {
        menuComponent.initialize(wkey, stock);

        if (event && event.button === 2 && !appConfig.customisation.isMobile) {
            var viewName = 'components/symbol-click-menu-popup';
            var modal = this.getService('modalPopupId');

            modal.set('widgetId', wkey);
            menuComponent.showPopup(menuComponent, viewName, modal); // Todo [Anushka] view popup to right click
        }
    },

    renderFullScreenPopup: function (controllerString, routeString, popUpName, callbackFn, link, params) {
        var widgetController = this.getService(popUpName);

        if (!widgetController) {
            widgetController = ControllerFactory.createController(this.container, controllerString);
            this.registerService(popUpName, widgetController);
        }

        widgetController.set('loginViewCallbackFn', callbackFn);

        if (link) {
            widgetController.set('link', link);
        }

        if (params) {
            Ember.$.each(params, function (key, value) {
                widgetController.set(key, value);
            });
        }

        var modal = this.getService('modalPopupId');

        if (modal) {
            modal.send('enableOverlay');
            modal.send('showModalPopup');
            modal.set('modalPopupStyle', 'full-height full-width');
        }

        var route = this.container.lookup('route:application');

        route.render(routeString, {
            into: 'application',
            outlet: 'modalPopupContent',
            controller: widgetController
        });

        widgetController.initializeWidget({wn: controllerString});
    },

    renderFullScreenWidget: function (controllerString, routeString, widgetContainerKey, callbackFn, link, params) {
        var widgetController = ControllerFactory.createController(this.container, controllerString);

        widgetController.initializeWidget({wn: controllerString.split('/').pop()});

        widgetController.set('widgetContainerKey', widgetContainerKey);
        widgetController.set('loginViewCallbackFn', callbackFn);

        if (link) {
            widgetController.set('link', link);
        }

        if (params) {
            Ember.$.each(params, function (key, value) {
                widgetController.set(key, value);
            });
        }

        var route = this.container.lookup('route:application');

        route.render(routeString, {
            into: 'application',
            outlet: 'fullScreenWidgetOutlet',
            controller: widgetController
        });
    },

    onLayoutReady: function (appLayout) {
        this.container = appLayout.container;
    },

    setLayoutMap: function (layoutMap) {
        this.layoutMap = layoutMap;
    },

    getTitleBar: function () {
        return this.getService('titleBar');
    },

    navigateMenu: function (menuTitle, tabTitle, isAddedToLastMenuStack) {
        var menuContent = this.layoutMap[menuTitle];

        if (menuContent) {
            var tabId = tabTitle ? menuContent.tabMap[tabTitle].id : undefined;
            this.getService('mainPanel').onRenderMenuItems(menuContent, undefined, tabId, !isAddedToLastMenuStack); // Enable Navigate Back option when navigating with this function
        }
    },

    refreshPanelWidgets: function (args) {
        var that = this;
        var panelContainers = ['mainPanel', 'rightPanel', 'topPanel'];

        Ember.$.each(panelContainers, function (id, container) {
            var widgetContainer = that.getService(container);

            if (widgetContainer && Ember.$.isFunction(widgetContainer.refreshContainerWidgets)) {
                widgetContainer.refreshContainerWidgets(args);
            }
        });
    },

    showSessionTimeout: function (reason, isHideControls) {
        // Assuming there is no login back after session timeout and application should refresh after this state.
        Ember.$('div#ember-app-root').css('display', 'none');

        this.loginViewController.showAuthFailMessage(reason, isHideControls);
    },

    notifySocialMediaSettings: function () {
        this.toggleProperty('isSocialMediaSettingsUpdated');
    },

    logInDelayedUser: function () {
        this.set('isDelayedUserLogged', true);
    },

    logOutDelayedUser: function () {
        this.set('isDelayedUserLogged', false);
    },

    showReloadConfirmation: function () {
        var that = this;
        var app = languageDataStore.getLanguageObj();

        Ember.run.next(function () {
            utils.messageService.showMessage(app.lang.messages.newerVersionAvailable,
                utils.Constants.MessageTypes.Info,
                false,
                app.lang.labels.confirm,
                [{type: utils.Constants.MessageBoxButtons.Yes, btnAction: that._reloadApplication.bind(that)},
                    {type: utils.Constants.MessageBoxButtons.No}]
            );
        });
    },

    showPopupWidget: function (config, args) {
        var controllerString, routeString;
        controllerString = config.controllerString;
        routeString = config.routeString;

        var widgetController = config.container.lookupFactory(controllerString).create();
        widgetController.set('hideTitle', true);
        widgetController.set('routeString', routeString);

        var widgetPopupView = config.container.lookupFactory(config.viewName).create({dimensions: args.dimensions});
        args.widgetPopupView = widgetPopupView;

        var params = {widgetArgs: args}; // Send full arg object

        // var params = {
        //    widgetArgs: {
        //        sym: args.sym,
        //        exg: args.exg,
        //        inst: args.inst,
        //        side: args.tabId,
        //        order: args.order,
        //        qty: args.qty,
        //        widgetPopupView: widgetPopupView
        //    }
        // };

        widgetPopupView.show(widgetController, function () {
            widgetController.initializeWidget({wn: controllerString.split('/').pop()}, params);
        });

        // Close menu
        var modal = this.getService('modalPopupId');
        modal.send('closeModalPopup');
    },

    _reloadApplication: function () {
        window.location.reload();
    },

    updateToLatestVersion: function (versionData) {
        // Ignore from JSHint and ESLint, as this is how it should be invoked for Android and iPhone
        /*eslint-disable */
        if (versionData && cordova && cordova.getAppVersion && Ember.$.isFunction(cordova.getAppVersion.getVersionNumber) && cordova.plugins && cordova.plugins.market) {    // jshint ignore:line
            var that = sharedService.getService('sharedUI');

            cordova.getAppVersion.getVersionNumber(function (version) {    // jshint ignore:line
                /*eslint-enable */
                var storeData = Ember.isIos ? versionData.appStoreData : versionData.playStoreData;

                if (storeData && storeData.version !== version && sharedService.userSettings.storeVersion !== storeData.version) {
                    if (storeData.isCriticalUpdate) {
                        that._openAppStore();
                    } else {
                        var app = languageDataStore.getLanguageObj();
                        var buttons = [{type: 'ok', btnAction: that._openAppStore}, {type: 'cancel'}];

                        utils.messageService.showMessage(app.lang.messages.newerVersionAvailable, utils.Constants.MessageTypes.Question, false, app.lang.labels.question, buttons);
                    }

                    that._saveRejectedVersion(storeData.version);
                }
            });
        }
    },

    _openAppStore: function () {
        // Ignore from JSHint and ESLint, as this is how it should be invoked for Android and iPhone
        /*eslint-disable */
        var appVersion = cordova.getAppVersion;    // jshint ignore:line

        if (cordova && cordova.plugins && cordova.plugins.market && appVersion) {    // jshint ignore:line
            if (Ember.isIos) {
                appVersion.getAppName(function (appName) {
                    cordova.plugins.market.open(appName);    // jshint ignore:line
                });
            } else {
                appVersion.getPackageName(function (packageName) {
                    cordova.plugins.market.open(packageName);    // jshint ignore:line
                });
            }
            /*eslint-enable */
        }
    },

    _saveRejectedVersion: function (version) {
        sharedService.userSettings.storeVersion = version;
        sharedService.userSettings.save();
    }
});
