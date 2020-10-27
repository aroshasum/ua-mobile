/* global Hammer */
import Ember from 'ember';
import WidgetContainerController from '../controllers/widget-container-controller';
import sharedService from '../models/shared/shared-service';
import controllerFactory from './controller-factory';
import appEvents from '../app-events';
import appConfig from '../config/app-config';
import utils from '../utils/utils';

export default WidgetContainerController.extend({
    // Subscription key
    containerKey: 'mainPanel',
    outletName: 'standardOutlet',
    tabStateMap: {},

    // Tablet configs
    quoteMenuId: 2,
    fullQuoteTabId: 0,
    isTablet: appConfig.customisation.isTablet,

    init: function () {
        this._super();
        Ember.run.schedule('afterRender', this, this.onAfterRender);
    },

    onAfterRender: function () {
        if (this.tabContent) {
            Ember.$('div[name=mpl-' + this.tabContent.title + ']').css('z-index', 0);
        }

        if (this.get('isTablet')) {
            var that = this;
            var initHorizontalPosition = 0;
            var initVerticalPosition = 0;

            var hammerObj = new Hammer(document.getElementById('mainPanelOutletContainer'), this.options);
            hammerObj.get('swipe').set({velocity: 0.3});

            // Prevent default horizontal behavior and let Hammer handles it
            Ember.$('#mainPanelOutletContainer').bind('touchstart', function (e) {
                initVerticalPosition = e.originalEvent.touches[0].clientY;
                initHorizontalPosition = e.originalEvent.touches[0].clientX;
            });

            Ember.$('#mainPanelOutletContainer').bind('touchmove', function (e) {
                var currentY = e.originalEvent.touches[0].clientY;
                var currentX = e.originalEvent.touches[0].clientX;

                if (Math.abs(initVerticalPosition - currentY) < Math.abs(initHorizontalPosition - currentX)) {
                    e.preventDefault();
                }
            });

            hammerObj.on('swipeleft swiperight', function (ev) {
                Ember.run.debounce(that, 'onSwipe', ev, 500);
            });
        }
    },

    onSwipe: function (ev) {
        var that = this;
        var menuContent = that.menuContent;

        if (menuContent && menuContent.tab && menuContent.tab.length > 1) {
            var currentID;
            var nextTabID;
            var swipeDirection = 'swipeleft';
            var tabStateMap = that.get('tabStateMap');
            var tabLength = menuContent.tab.length;

            if (sharedService.userSettings.currentLanguage === 'AR') { // For Arabic Language
                swipeDirection = 'swiperight';
            }

            if (ev.type === swipeDirection) {
                if (tabStateMap[menuContent.title]) {
                    currentID = tabStateMap[menuContent.title].currentID;
                    nextTabID = currentID + 1 < tabLength ? currentID + 1 : 0;
                    tabStateMap[menuContent.title].currentID = nextTabID;
                } else {
                    nextTabID = 1;
                    tabStateMap[menuContent.title] = {currentID: nextTabID};
                }

            } else {
                if (tabStateMap[menuContent.title]) {
                    currentID = tabStateMap[menuContent.title].currentID;
                    nextTabID = currentID - 1 >= 0 ? currentID - 1 : tabLength - 1;
                    tabStateMap[menuContent.title].currentID = nextTabID;
                } else {
                    nextTabID = tabLength - 1;
                    tabStateMap[menuContent.title] = {currentID: nextTabID};
                }
            }

            sharedService.getService('sharedUI').getService('mainPanel').onRenderTabItems(menuContent.tab[nextTabID]);
        }
    },

    onLoadContainer: function () {
        this._super();
        appEvents.subscribeSymbolChanged(this.get('containerKey') + 'Container', this);
    },

    onUnloadContainer: function () {
        this._super();
        appEvents.unSubscribeSymbolChanged(this.get('containerKey') + 'Container');
    },

    onWorkspaceUpdated: function () {
        this.renderMenuView(this.menuContent, true);
    },

    onPostRender: function (menuContent, tabContent, renderOptions) {
        var rightPanelContainer = sharedService.getService('sharedUI').getService('rightPanel');

        if (rightPanelContainer) {
            var rightPanel = rightPanelContainer.getRightPanel(menuContent, tabContent, renderOptions);
            rightPanelContainer.renderRightPanelView(rightPanel, renderOptions, menuContent, tabContent);
        }
    },

    onSymbolChanged: function (symbol, exchange, insType) {
        if (!this.get('isTablet')) {
            var symbolPopupView = controllerFactory.createController(this.container, 'view:symbol-popup-view');
            symbolPopupView.show(0, symbol, exchange, insType);
        } else {
            var args = {sym: symbol, exg: exchange, inst: insType};
            var menuArray = this.get('appLayout').layout.mainPanel.content;
            var quoteMenuContent = menuArray[this.get('quoteMenuId')];

            this.onRenderMenuItems(quoteMenuContent, quoteMenuContent.tab[this.get('fullQuoteTabId')], args);
        }
    },

    onRenderInnerWidgetItems: function (innerWidgetContent, widgetDef) {
       this.onClearInnerWidget(this.menuContent.id, this.tabContent.id, widgetDef.id);

        if (this._getSavedInnerWidgetId(widgetDef.id) === innerWidgetContent.id) {
            return;
        }

        this.prepareWidget(this.menuContent, this.tabContent, widgetDef, undefined, innerWidgetContent);
    },

    onClearInnerWidget: function (menuContentId, tabContentId, widgetDefId) {
        // Close previous inner widget before render new inner widget
        if (this.controllers && this.controllers[menuContentId] && this.controllers[menuContentId][tabContentId]) {
            var controllerMap = this.controllers[menuContentId][tabContentId];

            Ember.$.each(controllerMap, function (wid, controller) {
                if (controller.bid === widgetDefId) {
                    controller.onClearRender();
                }
            });
        }
    },

    prepareWidget: function (menuContent, tabContent, widgetDef, args, innerWidgetContent) {
        var innerWidgetParams = this._prepareInnerWidget(menuContent, tabContent, widgetDef, innerWidgetContent, args);

        if (innerWidgetParams) {
            this.renderWidget(menuContent, tabContent, widgetDef, args, innerWidgetParams);
        }
    },

    getContainerArgs: function (menuContent) {
        var containerArgs = this._super(menuContent); // Call the getContainerArgs() function in base controller
        var widgetName = Ember.appGlobal.queryParams.appParams[utils.Constants.EmbeddedModeParams.Widget];

        if (Ember.appGlobal.queryParams.widgetParams) {
            Ember.$.each(Ember.appGlobal.queryParams.widgetParams, function (prop, val) {
                containerArgs[prop] = val;
            });
        }

        if (widgetName) {
            containerArgs.widget = widgetName;
        }

        return containerArgs;
    },

    responsiveCallback: function (containerName) {
        var that = this;

        if (containerName === this.tabContent.outlet.split('.').pop()) {
            Ember.$.each(that.tabContent.w, function (key, widgetDef) {
                if (widgetDef.resLevel !== undefined) {
                    that.prepareWidget(that.menuContent, that.tabContent, widgetDef, undefined, undefined);
                }
            });
        }
    },

    getLastActiveMenu: function (layoutArray) {
        var queryPage = Ember.appGlobal.queryParams.appParams[utils.Constants.EmbeddedModeParams.Page];
        var lastMenu = sharedService.userState.lastMenu;

        if (queryPage) {
            Ember.$.each(layoutArray, function (index, layout) {
                if (layout.title.toLowerCase() === queryPage.toLowerCase()) {
                    lastMenu = layout.id;
                    return false;
                }
            });
        }

        return lastMenu;
    },

    getLastActiveTab: function () {
        return sharedService.userState.lastTab;
    },

    saveLastActiveTab: function (menuContent, tabContent) {
        if (appConfig.customisation.isStateSavingEnabled) {
            var savedTabObj = sharedService.userState.lastTab;

            savedTabObj = savedTabObj || {};
            savedTabObj[menuContent.id] = tabContent.id;

            sharedService.userState.lastMenu = menuContent.id;
            sharedService.userState.lastTab = savedTabObj;
            sharedService.userState.save();
        }
    },

    saveLastActiveInnerWidget: function (widgetDef, innerWidget) {
        var savedInnerObj = sharedService.userState.lastInnerWidget;
        savedInnerObj = savedInnerObj || {};
        savedInnerObj[this.menuContent.id] = savedInnerObj[this.menuContent.id] || {};
        savedInnerObj[this.menuContent.id][this.tabContent.id] = savedInnerObj[this.menuContent.id][this.tabContent.id] || {};
        savedInnerObj[this.menuContent.id][this.tabContent.id][widgetDef.id] = innerWidget.id;

        sharedService.userState.lastInnerWidget = savedInnerObj;
        sharedService.userState.save();
    },

    languageChanged: function (language) {
        this._setWidgetDisplayTitle(this.get('tabContent'));
        this._super(language);
    },

    saveSettings: function (symbol, exchange, insType) {
        var menuId = this.menuContent.id;
        var savedSettings = sharedService.userState.lastArgs;

        savedSettings = savedSettings || {};
        savedSettings[menuId] = savedSettings[menuId] || {};

        savedSettings[menuId].sym = symbol;
        savedSettings[menuId].exg = exchange;
        savedSettings[menuId].inst = insType;

        sharedService.userState.lastArgs = savedSettings;
        sharedService.userState.save();
    },

    saveMenuArgs: function (menuArgs, menuContentId) {
        var menuId = menuContentId ? menuContentId : this.menuContent.id;
        var storedArgs = sharedService.userState.defaultWS.mainPanel || {};

        storedArgs[menuId] = storedArgs[menuId] || {};
        storedArgs[menuId] = Ember.$.extend({}, storedArgs[menuId], menuArgs);

        sharedService.userState.defaultWS.mainPanel = storedArgs;
        sharedService.userState.save();
    },

    saveTabArgs: function (tabArgs, menuContentId, tabContentId) {
        var menuId = menuContentId ? menuContentId : this.menuContent.id;
        var tabId = tabContentId ? tabContentId : this.tabContent.id;

        var storedArgs = this._createStoredContainerArgs(menuId, tabId);
        storedArgs[menuId].tab[tabId].c = Ember.$.extend({}, storedArgs[menuId].tab[tabId].c, tabArgs);

        sharedService.userState.defaultWS[this.get('containerKey')] = storedArgs;
        sharedService.userState.save();
    },

    saveTabWidget: function (widgetDef) {
        var menuId = this.menuContent.id;
        var tabId = this.tabContent.id;

        var storedArgs = this._createStoredArgs(menuId, tabId, 'w');
        storedArgs[menuId].tab[tabId].w[widgetDef.id] = storedArgs[menuId].tab[tabId].w[widgetDef.id] || {};
        storedArgs[menuId].tab[tabId].w[widgetDef.id].iw = widgetDef.iw;
        storedArgs[menuId].tab[tabId].w[widgetDef.id].id = widgetDef.id;

        sharedService.userState.defaultWS[this.get('containerKey')] = storedArgs;
        sharedService.userState.save();
    },

    removeTabWidget: function (widgetId) {
        var menuId = this.menuContent.id;
        var tabId = this.tabContent.id;

        var storedArgs = this._createStoredArgs(menuId, tabId, 'w');
        delete storedArgs[menuId].tab[tabId].w[widgetId];

        sharedService.userState.defaultWS[this.get('containerKey')] = storedArgs;
        sharedService.userState.save();

        Ember.$.each(this.get('tabList'), function (tabKey, tabObj) {
            if (tabObj.id === tabId) {
                Ember.$.each(tabObj.w, function (wKey, widget) {
                    if (widget && widget.id === widgetId) {
                        tabObj.w[widgetId - 1] = undefined;
                    }
                });
            }
        });
    },

    // TODO: [Atheesan]: Move this to base-layout after framework change done
    saveWorkspace: function () {
        var customWorkspaceObj = sharedService.userState.customWS;

        customWorkspaceObj = customWorkspaceObj || {};
        customWorkspaceObj[this.menuContent.id] = customWorkspaceObj[this.menuContent.id] || {};
        customWorkspaceObj[this.menuContent.id][this.tabContent.id] = customWorkspaceObj[this.menuContent.id][this.tabContent.id] || {};

        customWorkspaceObj[this.menuContent.id][this.tabContent.id] = Ember.$.map(Ember.$('.grid-stack > .grid-stack-item'), function (el) {
            var node = Ember.$(el).data('_gridstack_node');

            if (node) {
                return {
                    i: el.attributes['grid-index'].value,
                    act: el.attributes['active-c'].value,
                    x: node.x,
                    y: node.y,
                    w: node.width,
                    h: node.height,
                    mh: node.min_height
                };
            }
        });

        sharedService.userState.customWS = customWorkspaceObj;
        sharedService.userState.save();
    },

    // TODO: [Atheesan]: Move this to base-layout after framework change done
    getCustomWorkSpace: function (customObj) {
        if (this.menuContent && this.tabContent) {
            var savedCustomObj = customObj;

            savedCustomObj = savedCustomObj || {};
            savedCustomObj[this.menuContent.id] = savedCustomObj[this.menuContent.id] || {};
            savedCustomObj[this.menuContent.id][this.tabContent.id] = savedCustomObj[this.menuContent.id][this.tabContent.id] || {};

            return savedCustomObj[this.menuContent.id][this.tabContent.id];
        } else {
            return {};
        }
    },

    // Returns args to save in localStorage
    getSaveWidgetArgs: function (menuId, tabId, baseWidgetId, widgetId, widgetArgs) {
        var storedArgs = this._createStoredWidgetArgs(menuId, tabId, baseWidgetId);
        storedArgs[menuId].tab[tabId].w[baseWidgetId][widgetId] = widgetArgs;

        return storedArgs;
    },

    cacheMenu: function () {
        var that = this;
        var cacheList = [], nonCacheList = [];
        var menuList = this.get('appLayout').layout.mainPanel.content;
        var renderOptions = {isFirstTime: false, isBackground: true, isUserClick: false};

        Ember.$.each(menuList, function (menuIndex, menuContent) {
            // Cache process takes tab content, except the default landing tab
            // If default menu content, has more than one tab content, those are eligible to cache, if set in layout.config
            if (menuContent.id !== that.menuContent.id || menuContent.tab.length > 1) {
                that.renderMenuView(menuContent, false, renderOptions);

                Ember.$.each(menuContent.tab, function (tabIndex, tabContent) {
                    // Since iteration goes through all tab contents in a menu, need to skip the default landing tab content
                    if (menuContent.id !== that.menuContent.id || tabContent.id !== that.tabContent.id) {
                        var args = {menu: menuContent, tab: tabContent};

                        if (tabContent.cache) {
                            cacheList[cacheList.length] = args; // Eligible to cache
                        } else {
                            nonCacheList[nonCacheList.length] = args; // Sets only the z-index of containers, nothing will be rendered
                        }
                    }
                });
            }
        });

        Ember.$.each(nonCacheList, function (index, nonCacheTab) {
            that.renderTabView(nonCacheTab.menu, nonCacheTab.tab, false, renderOptions);
        });

        this._startCacheProcess(renderOptions, cacheList, 0);
    },

    _startCacheProcess: function (renderOptions, cacheList, index) {
        var that = this;

        if (cacheList && cacheList.length > 0) {
            Ember.run.next(function () {
                var cacheTab = cacheList[index];

                // If tab content is already cached, skip and move to next
                if (!that.tabCacheMap[cacheTab.title]) {
                    that.renderTabView(cacheTab.menu, cacheTab.tab, false, renderOptions);
                }

                if (index < cacheList.length - 1) {
                    // Recursively calls cache function with a delay, to allow main process to give CPU
                    that._startCacheProcess(renderOptions, cacheList, index + 1);
                }
            });
        }
    },

    _createStoredWidgetArgs: function (menuId, tabId, baseWidgetId) {
        var storedArgs = this._createStoredArgs(menuId, tabId, 'w');
        storedArgs[menuId].tab[tabId].w[baseWidgetId] = storedArgs[menuId].tab[tabId].w[baseWidgetId] || {};

        return storedArgs;
    },

    _createStoredContainerArgs: function (menuId, tabId) {
        return this._createStoredArgs(menuId, tabId, 'c');
    },

    _createStoredArgs: function (menuId, tabId, argType) {
        // Check existence of individual object's arguments and create if not exists, overwrite if exists
        var storedArgs = sharedService.userState.defaultWS[this.get('containerKey')] || {};

        storedArgs[menuId] = storedArgs[menuId] || {};
        storedArgs[menuId].tab = storedArgs[menuId].tab || {};
        storedArgs[menuId].tab[tabId] = storedArgs[menuId].tab[tabId] || {};
        storedArgs[menuId].tab[tabId][argType] = storedArgs[menuId].tab[tabId][argType] || {};

        return storedArgs;
    },

    _prepareInnerWidget: function (menuContent, tabContent, widgetDef, innerWidgetContent, args) {
        var that = this;
        var widgetDefIw;
        var isResInnerWidget = false;

        if (widgetDef.resLevel !== undefined) {
            var widgetLayoutName = tabContent.outlet.replaceAll('\.', '\/');
            var widgetLayout = that.container.lookup('controller:' + widgetLayoutName);
            var currentResLevel = widgetLayout.get('responsiveLevel');

            if (widgetDef.resLevel >= currentResLevel) {
                widgetDefIw = widgetDef.iwr;
                isResInnerWidget = true;
            } else if (widgetDef.iw) {
                widgetDefIw = widgetDef.iw;
            } else {
                return undefined;
            }
        } else {
            widgetDefIw = widgetDef.iw;
        }

        Ember.$.each(widgetDefIw, function (key, innerWidget) {
            var widgetDesc = that.get('app').lang.labels[innerWidget.desc];

            try {
                Ember.set(innerWidget, 'displayDesc', widgetDesc);
                Ember.set(innerWidget, 'css', '');
            } catch (e) {
                innerWidget.displayDesc = widgetDesc;
                innerWidget.css = '';
            }
        });

        var activeWidget = that._getDefaultInnerWidget(widgetDef.id, widgetDefIw, innerWidgetContent, isResInnerWidget);
        var customArgs = args || {};

        activeWidget.bid = widgetDef.id;
        customArgs.innerWidgets = {innerTabs: widgetDefIw, wDef: widgetDef, isAvailable: widgetDefIw.length > 1};

        return {
            activeWidget: activeWidget,
            customArgs: customArgs
        };
    },

    _renderResponsiveInnerWidget: function (respInnerWidgetMap, menuContent, tabContent, widgetDef, innerWidgetContent, args) {
        var that = this;

        Ember.$.each(respInnerWidgetMap, function (resLevel, resValue) {
            var newWidget = widgetDef;

            Ember.set(newWidget, 'iw', resValue);
            Ember.set(newWidget, 'id', newWidget.iw[0].resArgs.outletNo);

            delete newWidget.respEnable;

            Ember.set(newWidget.iw[0], 'def', true);
            Ember.set(newWidget.iw[0], 'id', 1);

            for (var i = 0; i < newWidget.iw.length; ++i) {
                delete newWidget.iw[i].resArgs;
                Ember.set(newWidget.iw[i], 'isShow', true);
            }

            that.prepareWidget(menuContent, tabContent, newWidget, args, innerWidgetContent);
        });
    },

    _getDefaultInnerWidget: function (widgetDefId, widgetDefIw, innerWidgetContent, isResInnerWidget) {
        var activeWidget;

        if (innerWidgetContent) {
            activeWidget = innerWidgetContent;
            activeWidget.isInnerWidget = true;
        } else if (isResInnerWidget) {
            Ember.$.each(widgetDefIw, function (key, widgetDef) {
                if (widgetDef.def === true) {
                    activeWidget = widgetDef;
                }
            });
        } else {
            activeWidget = this._getLastActiveInnerWidget(widgetDefId, widgetDefIw);
        }

        Ember.set(activeWidget, 'css', 'active');

        return activeWidget;
    },

    _getLastActiveInnerWidget: function (baseWidgetId, innerWidgetList) {
        var defInnerObj = {};
        var savedInnerId = this._getSavedInnerWidgetId(baseWidgetId);

        if (innerWidgetList) {
            Ember.$.each(innerWidgetList, function (key, innerObj) {
                if (savedInnerId > -1) {
                    if (innerObj.id === savedInnerId) {
                        defInnerObj = innerObj;
                        return false;
                    }
                } else if (innerObj.def) {
                    defInnerObj = innerObj;
                    return false;
                }
            });
        }

        return defInnerObj;
    },

    _getSavedInnerWidgetId: function (baseWidgetId) {
        var savedInnerObj = sharedService.userState.lastInnerWidget;

        return (savedInnerObj && savedInnerObj[this.menuContent.id] && savedInnerObj[this.menuContent.id][this.tabContent.id] &&
        savedInnerObj[this.menuContent.id][this.tabContent.id][baseWidgetId]) ?
            savedInnerObj[this.menuContent.id][this.tabContent.id][baseWidgetId] : -1;
    },

    _setWidgetDisplayTitle: function (tabContent) {
        var that = this;

        if (tabContent && tabContent.w) {
            Ember.$.each(tabContent.w, function (wKey, widgetDef) {
                if (widgetDef && widgetDef.iw) {
                    Ember.$.each(widgetDef.iw, function (iwKey, innerWidget) {
                        if (innerWidget) {
                            var widgetDesc = that.get('app').lang.labels[innerWidget.desc];

                            try {
                                Ember.set(innerWidget, 'displayDesc', widgetDesc);
                            } catch (e) {
                                innerWidget.displayDesc = widgetDesc;
                            }
                        }
                    });
                }
            });
        }
    },

    // TODO: [Atheesan]: Move this to base-layout after framework change done
    onPrepareTab: function (tabContent, menuContent, widgetArgs, customWS) {
        if (tabContent.custom && customWS) {
            // TODO: [Bashitha] Extend to support inner widget rendering
            var _getArgs = function (argType) {
                var _filterTabArgs = function (args, innerArgType) {
                    var filteredArgs = {};

                    if (args && args.tab && args.tab[tabContent.id] &&
                        args.tab[tabContent.id][innerArgType]) {
                        filteredArgs = args.tab[tabContent.id][innerArgType];
                    }

                    return filteredArgs;
                };

                var customArgs = _filterTabArgs(customWS[menuContent.id], argType); // Arguments stored in argument section in layout config
                var customStoredArgs = _filterTabArgs(customWS[menuContent.id], argType); // Arguments stored in user's local machine

                return {
                    mergedArgs: Ember.$.extend({}, customArgs, customStoredArgs),
                    customArgs: customArgs,
                    customStoredArgs: customStoredArgs
                };
            };

            var cArgs = _getArgs('c');
            var wArgs = _getArgs('w');

            // Priority given for arguments
            // 1. user's local machine
            // 2. argument section in layout config
            Ember.$.each(cArgs.mergedArgs, function (key) {
                Ember.set(tabContent, key, cArgs.customStoredArgs[key] ? cArgs.customStoredArgs[key] : cArgs.customArgs[key] ? cArgs.customArgs[key] : '');
            });

            Ember.$.each(wArgs.mergedArgs, function (key, val) {
                if (val.iw) {
                    if (!tabContent.w) { // If the widget is layout-selection then the property 'w' is not available
                        tabContent.w = {};
                    }

                    Ember.set(tabContent.w, key, {id: key, iw: val.iw});
                }
            });
        }

        return tabContent;
    },

    addNewMenuWorkspace: function () {
        var menuArray = this.get('appLayout').layout.mainPanel.content;
        var customMenuId = this.getCustomId(menuArray, menuArray.length + 1);

        var customMenu = {
            id: customMenuId,
            title: 'workspace',
            displayTitle: this.app.lang.labels.workspace,
            icon: 'glyphicon glyphicon-th',
            def: false,
            rightPanel: -1,
            custom: true,
            isEdited: false,
            tab: [{
                id: 1,
                cache: false,
                title: 'standardOutlet',
                displayTitle: this.app.lang.labels.custom,
                def: true,
                custom: true,
                layoutSelection: true,
                outlet: 'custom-workspace.layout-selection',
                w: []
            }]
        };

        menuArray.pushObject(customMenu);

        this.onRenderMenuItems(customMenu);
        this.saveTabArgs({
            title: 'standardOutlet',
            custom: true,
            cache: false,
            def: true,
            layoutSelection: true,
            outlet: 'custom-workspace.layout-selection'
        }, customMenuId, 1);

        this.saveMenuArgs({
            custom: true,
            isEdited: true,
            title: 'workspace',
            displayTitle: this.app.lang.labels.workspace,
            icon: 'glyphicon glyphicon-th',
            def: false,
            rightPanel: -1
        }, customMenuId);

        var menuPanelContent = sharedService.getService('sharedUI').getService('menuPanel');
        menuPanelContent.getSubMenuWidths();

        var customMenuInputId = ['custom-menu-input' + customMenuId].join('');
        menuPanelContent.set('customInputId', customMenuInputId);

        this.focusCustomInput(customMenuInputId);
    },

    addNewTabWorkspace: function (menuItem) {
        var tabContentArray = menuItem.tab;
        var customTabId = this.getCustomId(tabContentArray, tabContentArray.length + 1);

        if (menuItem.tab.length === 1) {
            var defaultTabObj = menuItem.tab[0];

            tabContentArray.removeObject(menuItem.tab[0]);
            tabContentArray.pushObject(defaultTabObj);
        }

        var customTab = {
            id: customTabId,
            cache: false,
            title: 'standardOutlet',
            displayTitle: this.app.lang.labels.custom,
            def: false,
            custom: true,
            isEdited: false,
            layoutSelection: true,
            outlet: 'custom-workspace.layout-selection',
            w: []
        };

        tabContentArray.pushObject(customTab);

        this.onRenderMenuItems(menuItem, customTabId);
        this.saveTabArgs({
            title: 'standardOutlet',
            custom: true,
            cache: false,
            def: false,
            isEdited: true,
            layoutSelection: true,
            outlet: 'custom-workspace.layout-selection'
        }, menuItem.id, customTabId);

        var menuPanelContent = sharedService.getService('sharedUI').getService('menuPanel');
        menuPanelContent.getSubMenuWidths();

        var customTabInputId = ['custom-tab-input' + menuItem.id + '' + customTabId].join('');
        menuPanelContent.set('customInputId', customTabInputId);

        this.focusCustomInput(customTabInputId);
    },

    focusCustomInput: function (customTabInputId) {
        Ember.run.later(function () {
            var customSelector = ['input#' + customTabInputId].join('');
            var customSelectorElement = Ember.$(customSelector);

            customSelectorElement.focus();
            customSelectorElement.select();
        }, 500);
    },

    getCustomId: function (contentArray, customId) {
        var isMenuIdAvailable = false;
        var cusId = customId;

        while (!isMenuIdAvailable) {
            isMenuIdAvailable = true;

            for (var i = 0; i < contentArray.length; i++) { // Cannot define anonymous fn if $.each used; ESLint error
                if (cusId === contentArray[i].id) {
                    isMenuIdAvailable = false;
                    cusId++;

                    break;
                }
            }
        }

        return cusId;
    },

    renameCustomWorkspace: function (displayTitle, isTabWorkspace) {
        if (displayTitle) {
            var menuTabContent = isTabWorkspace ? this.tabContent : this.menuContent;

            Ember.set(menuTabContent, 'displayTitle', displayTitle.toUpperCase());
            Ember.set(menuTabContent, 'customTitle', displayTitle);
            Ember.set(menuTabContent, 'isEdited', true);

            if (isTabWorkspace) {
                this.saveTabArgs({customTitle: displayTitle, isEdited: true});
            } else {
                this.saveMenuArgs({customTitle: displayTitle, isEdited: true});
            }

            sharedService.getService('sharedUI').getService('menuPanel').getSubMenuWidths();

            if (!isTabWorkspace) {
                this._resizeEditedMenu(menuTabContent);
            }
        }
    },

    editWorkspaceName: function (menuTabContent, isMenu) {
        if (menuTabContent.css) {
            var customInputId;

            Ember.set(menuTabContent, 'isEdited', false);

            if (isMenu) {
                customInputId = ['custom-menu-input' + menuTabContent.id].join('');
            } else {
                customInputId = ['custom-tab-input' + this.menuContent.id + '' + menuTabContent.id].join('');
            }

            sharedService.getService('sharedUI').getService('menuPanel').set('customInputId', customInputId);
            this.focusCustomInput(customInputId);
        }

        sharedService.getService('sharedUI').getService('menuPanel').getSubMenuWidths();

        if (isMenu) {
            this._resizeEditedMenu(menuTabContent);
        }
    },

    _resizeEditedMenu: function (menuTabContent) {
        Ember.run.later(function () {
            sharedService.getService('sharedUI').getService('menuPanel').setSubMenu(menuTabContent, false);
        }, 300);
    }
});
