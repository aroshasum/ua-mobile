import Ember from 'ember';
import GlobalSearch from '../components/global-search';
import appEvents from '../app-events';
import sharedService from '../models/shared/shared-service';
import LanguageDataStore from '../models/shared/language/language-data-store';
import utils from '../utils/utils';

export default Ember.Controller.extend({
    app: LanguageDataStore.getLanguageObj(),
    appLayout: {},

    // Properties required to draw common panel at the top of the widget container
    tabList: [],

    // Controlling which controls to be shown based on the loaded container
    showTabs: false,
    displayTabs: {},

    // Store ember route for later usages
    router: undefined,

    // Information about loaded widgets
    controllers: undefined,
    widgetArgs: {},

    // Required to save widget specific settings in user's local machine on demand
    menuContent: undefined,
    tabContent: undefined,
    tabCacheMap: undefined,
    menuTabMap: {},
    containerMap: {},

    // This is used by global search component
    searchKey: '',

    init: function () {
        this._super();
        Ember.run.schedule('afterRender', this, this.afterRender);
    },

    initializeContainer: function (router, appLayout) {
        this.router = router;
        this.controllers = {};
        this.widgetArgs = appLayout.args[this.get('containerKey')] || {};
        this.set('appLayout', appLayout);
        this.onLoadContainer();
    },

    initializeUI: function () {
        this.onRenderUI();
    },

    initializePostRender: function (menuContent, tabContent, renderOptions) {
        this.onPostRender(menuContent, tabContent, renderOptions);
    },

    closeContainer: function () {
        this.onUnloadContainer();
    },

    onLoadContainer: function () {
        appEvents.subscribeLanguageChanged(this, this.get('containerKey') + 'Container');
        appEvents.subscribeThemeChanged(this, this.get('containerKey') + 'Container');
        appEvents.subscribeVisibilityChanged(this, this.get('containerKey') + 'Container');
        appEvents.subscribeWorkspaceUpdated(this.get('containerKey') + 'Container', this);
        appEvents.subscribeAppClose(this.get('containerKey') + 'Container', this);
    },

    onUnloadContainer: function () {
        appEvents.unSubscribeLanguageChanged(this.get('containerKey') + 'Container');
        appEvents.unSubscribeThemeChanged(this.get('containerKey') + 'Container');
        appEvents.unSubscribeVisibilityChanged(this.get('containerKey') + 'Container');
    },

    onPrepareTab: function (tabContent) {
        return tabContent;
    },

    onRenderUI: function () {
        // Specific widget containers should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    onPostRender: function () {
        // Specific widget containers should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    onWorkspaceUpdated: function () {
        // Specific widget containers should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    saveLastActiveTab: function () {
        // Specific widget containers should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    afterRender: function () {
        this.onAfterRender();
    },

    onAfterRender: function () {
        // Specific widget containers should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    clearRender: function (menuContent, tabContent) {
        if (this.controllers && this.controllers[menuContent.id] && this.controllers[menuContent.id][tabContent.id]) {
            var controllerMap = this.controllers[menuContent.id][tabContent.id];

            Ember.$.each(controllerMap, function (wid, controller) {
                if (controller) {
                    controller.onClearRender();
                }
            });
        }
    },

    closeContainerWidgets: function (menuContent, tabContent) {
        var that = this;

        if (this.controllers && this.controllers[menuContent.id] && this.controllers[menuContent.id][tabContent.id]) {
            var controllerMap = this.controllers[menuContent.id][tabContent.id];

            Ember.$.each(controllerMap, function (wid, controller) {
                if (controller) {
                    controller.closeWidget(tabContent.cache);

                    if (!tabContent.cache) {
                        that.controllers[menuContent.id][tabContent.id][wid] = undefined;
                    }
                }
            });
        }
    },

    setContainerWidget: function (menuId, tabId, widgetId, widgetController) {
        if (!this.controllers[menuId]) {
            this.controllers[menuId] = {};
        }

        if (!this.controllers[menuId][tabId]) {
            this.controllers[menuId][tabId] = {};
        }

        this.controllers[menuId][tabId][widgetId] = widgetController;
    },

    getContainerArgs: function (menuContent) {
        var containerArgs = {};

        var _filterContainerArgs = function (args) {
            var filteredArgs = {};

            if (args && args[menuContent.id] && args[menuContent.id].args) {
                filteredArgs = args[menuContent.id].args;
            }

            return filteredArgs;
        };

        var customArgs = _filterContainerArgs(this.widgetArgs); // Arguments stored in argument section in layout config
        var customStoredArgs = _filterContainerArgs(sharedService.userState.defaultWS[this.get('containerKey')]); // Arguments stored in user's local machine
        var globalArgs = sharedService.userState.globalArgs;

        var mergedArgs = Ember.$.extend({}, customArgs, customStoredArgs, globalArgs);

        // Priority given for arguments
        // 1. user's local machine
        // 2. Global saved args
        // 3. argument section in layout config
        Ember.$.each(mergedArgs, function (key) {
            containerArgs[key] = customStoredArgs[key] ? customStoredArgs[key] :
                globalArgs[key] || globalArgs[key] === 0 ? globalArgs[key] :
                    customArgs[key] ? customArgs[key] : '';
        });

        return containerArgs;
    },

    getWidgetArgs: function (widgetDef, tabContent, menuContent) {
        var widgetArgs = {};
        var containerArgs = this.getContainerArgs(menuContent); // Arguments passed via widget container

        var customArgs = this.filterWidgetArgs(this.widgetArgs, widgetDef, tabContent, menuContent); // Arguments stored in argument section in layout config
        var customStoredArgs = this.filterWidgetArgs(sharedService.userState.defaultWS[this.get('containerKey')], widgetDef, tabContent, menuContent); // Arguments stored in user's local machine

        var mergedArgs = Ember.$.extend({}, customArgs, containerArgs, customStoredArgs);

        // Priority given for arguments
        // 1. user's local machine
        // 2. argument section in layout config
        // 3. arguments passed via widget container
        Ember.$.each(mergedArgs, function (key) {
            widgetArgs[key] = customStoredArgs[key] || customStoredArgs[key] === 0 ? customStoredArgs[key] :
                containerArgs[key] || containerArgs[key] === 0 ? containerArgs[key] :
                    customArgs[key] || customArgs[key] === 0 ? customArgs[key] : '';
        });

        return {
            widgetArgs: widgetArgs,
            storedArgs: customStoredArgs
        };
    },

    filterWidgetArgs: function (args, widgetDef, tabContent, menuContent) {
        var filteredArgs = {};

        if (args && args[menuContent.id] && args[menuContent.id].tab && args[menuContent.id].tab[tabContent.id] &&
            args[menuContent.id].tab[tabContent.id].w && args[menuContent.id].tab[tabContent.id].w[widgetDef.bid] &&
            args[menuContent.id].tab[tabContent.id].w[widgetDef.bid][widgetDef.id]) {
            filteredArgs = args[menuContent.id].tab[tabContent.id].w[widgetDef.bid][widgetDef.id];
        }

        return filteredArgs;
    },

    saveSettings: function () {
        // Specific widget should implement this method to provide specific functionality
        // Otherwise base function will be executed
    },

    saveWidgetArgs: function (widgetId, baseWidgetId, widgetArgs) {
        var menuId = this.menuContent.id;
        var tabId = this.tabContent.id;

        sharedService.userState.defaultWS[this.get('containerKey')] = this.getSaveWidgetArgs(menuId, tabId, baseWidgetId, widgetId, widgetArgs);
        sharedService.userState.save();
    },

    saveGlobalWidgetArgs: function (widgetArgs, widgetArgsKey) {
        if (widgetArgsKey) {
            var stateObj = sharedService.userState.globalWidgetConfig[widgetArgsKey] ? sharedService.userState.globalWidgetConfig[widgetArgsKey] : {};

            Ember.$.each(widgetArgs, function (key, value) {
                stateObj[key] = value;
            });

            sharedService.userState.globalWidgetConfig[widgetArgsKey] = stateObj;
            sharedService.userState.save();
        }
    },

    getSaveWidgetArgs: function () {
        return {};
    },

    languageChanged: function (language) {
        this._changeControllerLanguage(this.controllers, language);
    },

    themeChanged: function (theme) {
        this._changeControllerTheme(this.controllers, theme);
    },

    onAppClose: function () {
        this._closeController(this.controllers);
    },

    onVisibilityChanged: function (isHidden) {
        this._changeControllerVisibility(this.controllers, isHidden);
    },

    addContainerToMap: function (containerController, menuContent, tabContent) {
        var containerMap = this.containerMap;

        containerMap[menuContent.id] = containerMap[menuContent.id] || {};
        containerMap[menuContent.id][tabContent.id] = containerController;
    },

    refreshContainerWidgets: function (args) {
        var controllers = this.controllers;

        if (controllers) {
            Ember.$.each(controllers, function (menuId, tabMap) {
                Ember.$.each(tabMap, function (tabId, widgetMap) {
                    Ember.$.each(widgetMap, function (widgetKey, controller) {
                        if (controller) {
                            controller.onWidgetKeysChange(args);
                        }
                    });
                });
            });
        }
    },

    _changeControllerLanguage: function (controllers, language) {
        if (controllers) {
            Ember.$.each(controllers, function (menuId, tabMap) {
                Ember.$.each(tabMap, function (tabId, widgetMap) {
                    Ember.$.each(widgetMap, function (widgetKey, controller) {
                        if (controller) {
                            try {
                                controller.languageChanged(language);
                            } catch (e) {
                                utils.logger.logError(e);
                            }
                        }
                    });
                });
            });
        }
    },

    _changeControllerTheme: function (controllers, theme) {
        Ember.$.each(controllers, function (menuId, tabMap) {
            Ember.$.each(tabMap, function (tabId, widgetMap) {
                Ember.$.each(widgetMap, function (widgetKey, controller) {
                    if (controller) {
                        try {
                            controller.themeChanged(theme);
                        } catch (e) {
                            utils.logger.logError(e);
                        }
                    }
                });
            });
        });
    },

    _changeControllerVisibility: function (controllers, isHidden) {
        Ember.$.each(controllers, function (menuId, tabMap) {
            Ember.$.each(tabMap, function (tabId, widgetMap) {
                Ember.$.each(widgetMap, function (widgetKey, controller) {
                    if (controller) {
                        try {
                            controller.onVisibilityChanged(isHidden);
                        } catch (e) {
                            utils.logger.logError(e);
                        }
                    }
                });
            });
        });
    },

    _closeController: function (controllers) {
        Ember.$.each(controllers, function (menuId, tabMap) {
            Ember.$.each(tabMap, function (tabId, widgetMap) {
                Ember.$.each(widgetMap, function (widgetKey, controller) {
                    if (controller) {
                        try {
                            controller.closeWidget();
                        } catch (e) {
                            utils.logger.logError(e);
                        }
                    }
                });
            });
        });
    },

    actions: {
        showSearchPopup: function () {
            var modal = this.get('popupSymbolSearch');
            modal.send('showModalPopup');
        },

        closeSearchPopup: function () {
            var modal = this.get('popupSymbolSearch');
            modal.send('closeModalPopup');
        },

        customizeCustomWorkSpace: function (menuId, tabId) {
            var that = this;

            // Timer to ensure tab rendering happen before dropdown was initialized
            Ember.run.later(function () {
                if (tabId) {
                    if (menuId && that.containerMap[menuId][tabId] && Ember.$.isFunction(that.containerMap[menuId][tabId].customizeCustomWorkspace)) {
                        that.containerMap[menuId][tabId].customizeCustomWorkspace(false); // False if tab content
                    }
                } else {
                    if (that.containerMap[menuId]) {
                        Ember.$.each(that.containerMap[menuId], function (key, container) {
                            if (Ember.$.isFunction(container.customizeCustomWorkspace)) {
                                container.customizeCustomWorkspace(true); // True if menu content
                                return false;
                            }
                        });
                    }
                }
            }, 1);
        }
    }
});

Ember.Handlebars.helper('global-search', GlobalSearch);
