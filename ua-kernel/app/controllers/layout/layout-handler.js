import Ember from 'ember';
import LayoutConfig from '../../config/layout-config';
import LayoutConfigSecondary from '../../config/layout-config-secondary';
import sharedService from '../../models/shared/shared-service';
import utils from '../../utils/utils';

export default (function () {

    var getLayoutConfig = function (userId, windowId) {
        var layoutConf;

        if (utils.validators.isAvailable(windowId)) {
            layoutConf = new LayoutConfigSecondary();
        } else {
            layoutConf = new LayoutConfig();
        }
        layoutConf = _mergeStoredConfig(layoutConf);

        return layoutConf;
    };

    var renderTemplate = function (layoutConf, appRoute) {
        var layoutContent = layoutConf.layout;
        var sharedUIService = sharedService.getService('sharedUI');

        Ember.$.each(layoutContent, function (prop, content) {
            var containerController = appRoute.container.lookupFactory('controller:' + content.template).create();

            if (prop === 'menuPanel') {
                Ember.set(appRoute.get('controller'), 'isHorizontalPanel', containerController.isHorizontalPanel);
            }

            appRoute.render(content.template, {
                into: 'application',
                outlet: prop + 'Outlet',
                controller: containerController
            });

            containerController.initializeContainer(appRoute, layoutConf);

            sharedUIService.registerService(prop, containerController);
        });

        Ember.$.each(layoutContent, function (prop) {
            sharedUIService.getService(prop).initializeUI();
        });

        _adjustMainPanel(appRoute);
    };

    var _adjustMainPanel = function (appRoute) {
        var topBarStyle = '';
        var mainPanelStyle = '';

        if (Ember.appGlobal.multiScreen && Ember.appGlobal.multiScreen.isParentWindow) {
            topBarStyle = 'ms-top-bar';
            mainPanelStyle = 'mid-col-horizontal-panel mid-col';
        } else {
            topBarStyle = 'display-none';
            mainPanelStyle = 'mid-col-horizontal-panel-tp-excluded mid-col';
        }
        Ember.set(appRoute.get('controller'), 'topBarStyle', topBarStyle);
        Ember.set(appRoute.get('controller'), 'mainPanelContainerStyle', mainPanelStyle);
    };

    var _mergeStoredConfig = function (layoutConf) {
        var storedMainPanel = Ember.$.extend(true, {}, sharedService.userState.defaultWS.mainPanel); // Created a deep clone to avoid alteration in local storage object

        if (storedMainPanel) {
            Ember.$.each(storedMainPanel, function (menuId, menuContent) {
                var menuObj;
                var isMenuAvailable = false;

                if (menuContent.tab) {
                    Ember.$.each(menuContent.tab, function (tabId, savedTabContent) {
                        savedTabContent.id = parseInt(tabId, 10);

                        var widgetTabContent = savedTabContent;
                        var isTabAvailable = false;

                        Ember.$.each(layoutConf.layout.mainPanel.content, function (menuKey, menuContentObj) {
                            if (parseInt(menuId, 10) === menuContentObj.id) {
                                menuObj = menuContentObj;
                                isMenuAvailable = true;

                                Ember.$.each(menuContentObj.tab, function (tabKey, tabContentObj) {
                                    if (savedTabContent.id === tabContentObj.id) {
                                        widgetTabContent = tabContentObj;
                                        isTabAvailable = true;

                                        return false;
                                    }
                                });
                            }
                        });

                        var tabContent = _setContainerArgs(widgetTabContent, parseInt(menuId, 10), sharedService.userState.defaultWS.mainPanel);

                        if (menuObj && !isTabAvailable) {
                            menuObj.tab.pushObject(tabContent);
                        }
                    });

                    if (!isMenuAvailable) {
                        menuContent.id = parseInt(menuId, 10);

                        menuContent.tab = Ember.$.map(menuContent.tab, function (value) {
                            return [value];
                        });

                        if (menuContent.tab.length > 0) {
                            layoutConf.layout.mainPanel.content.pushObject(menuContent);
                        }
                    }
                }
            });
        }

        return layoutConf;
    };

    var _setContainerArgs = function (tabContent, menuId, storedArgs) {
        var filteredArgs = {};

        if (storedArgs && storedArgs[menuId] && storedArgs[menuId].tab && storedArgs[menuId].tab[tabContent.id] &&
            storedArgs[menuId].tab[tabContent.id].c) {
            filteredArgs = storedArgs[menuId].tab[tabContent.id].c;
        }

        Ember.$.each(filteredArgs, function (key) {
            Ember.set(tabContent, key, filteredArgs[key]);
        });

        return tabContent;
    };

    return {
        getLayoutConfig: getLayoutConfig,
        renderTemplate: renderTemplate
    };
})();