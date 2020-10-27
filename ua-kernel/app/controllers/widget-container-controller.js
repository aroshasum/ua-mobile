import Ember from 'ember';
import BaseWidgetContainer from '../controllers/base-widget-container';
import sharedService from '../models/shared/shared-service';
import ControllerFactory from './controller-factory';
import appConfig from '../config/app-config';
import utils from '../utils/utils';

export default BaseWidgetContainer.extend({
    activeTab: null,
    clickEventHandler: null,
    sharedUIService: sharedService.getService('sharedUI'),

    onLoadContainer: function () {
        this._super();
        this.set('tabCacheMap', {});
        this.set('widgetCacheMap', {});
    },

    loadLastMenuFromStack: function () {
        var defaultMenuId = 0;
        var currentMenu = this.get('menuContent');
        var lastMenu = sharedService.getService('priceUI').popLastMenuStack();
        var mainPanel = sharedService.getService('sharedUI').getService('mainPanel');
        var isAddedToLastMenuStack = false;     // Set 'true' if full stack is required.

        if (lastMenu) {
            var newMenuContent = lastMenu.menuContent;
            var newTabContent = lastMenu.tabContent;

            if (newTabContent.def) {
                mainPanel.onRenderMenuItems(newMenuContent, undefined, undefined, isAddedToLastMenuStack);
            } else if (newMenuContent.title === currentMenu.title) {
                mainPanel.onRenderTabItems(newTabContent, isAddedToLastMenuStack);
            } else {
                mainPanel.onRenderMenuItems(newMenuContent, undefined, newTabContent.id, isAddedToLastMenuStack);
            }
        } else if (currentMenu.title !== this.get('appLayout').layout.mainPanel.content[defaultMenuId].title) {
            lastMenu = this.get('appLayout').layout.mainPanel.content[defaultMenuId];
            mainPanel.onRenderMenuItems(lastMenu, undefined, undefined, isAddedToLastMenuStack);
        } else {
            var that = this;
            var languageTexts = that.get('app').lang;

            utils.messageService.showMessage(languageTexts.messages.confirmExit,
                utils.Constants.MessageTypes.Question,
                false,
                languageTexts.labels.confirm,

                [{type: utils.Constants.MessageBoxButtons.Ok,
                    btnAction: function () {
                        if (navigator && navigator.app) {
                            navigator.app.exitApp();
                        }
                    }
                },
                {type: utils.Constants.MessageBoxButtons.Cancel,
                    btnAction: function () {
                        this.closeMessageBox();
                    }
                }]
            );
        }
    },

    loadWidget: function (menuId, tabId) {
        var widget = {};
        var mainPanel = this.get('appLayout').layout.mainPanel.content;

        if (menuId) {
            Ember.$.each(mainPanel, function (key, menuObj) {
                if (menuObj.id === menuId) {
                    widget.menuContent = menuObj;

                    if (tabId && menuObj.tab) {
                        Ember.$.each(menuObj.tab, function (tabKey, tabContent) {
                            if (tabContent.id === tabId) {
                                widget.tabContent = tabContent;
                            }
                        });
                    }
                }
            });

            if (menuId === this.get('menuContent').id) {
                sharedService.getService('sharedUI').getService('mainPanel').onRenderTabItems(widget.tabContent);
            } else {
                sharedService.getService('sharedUI').getService('mainPanel').onRenderMenuItems(widget.menuContent, undefined, widget.tabContent.id);
            }
        }
    },

    _closePopups: function () {
        var titlePanel = sharedService.getService('sharedUI').getService('titleBar');

        if (titlePanel) {
            titlePanel.closeSearchPopup();
            titlePanel.toggleDisplay(true);
        }

        if (sharedService.getService('sharedUI').getService('leftPanel')) {
            sharedService.getService('sharedUI').getService('leftPanel').hideMainMenu();
        }
    },

    onRenderUI: function () {
        var defaultMenu = this._getDefaultMenu();
        this.renderMenuView(defaultMenu, true, {isFirstTime: true, isBackground: false, isUserClick: false});
    },

    onRenderMenuItems: function (menuContent, lastTab, tabId, isAddedToLastMenuStack) {     // Added tabId to direct load Tab- Mobile
        // Not allowed to load same menu more than once consecutively
        if (this.menuContent && this.menuContent.id === menuContent.id && this.tabContent && (tabId || this.tabContent.def) && (!tabId || this.tabContent.id === tabId)) {
            if (sharedService.getService('sharedUI').getService('leftPanel')) {
                sharedService.getService('sharedUI').getService('leftPanel').hideMainMenu();
            }

            return;
        }

        this.set('isPreviousMenuSelected', this.menuContent.id === menuContent.id);
        this.set('parentMenuTab', this.tabContent.id);
        sharedService.getService('priceUI').closeChildView(undefined, true);
        this._closePopups();
        this.router.set('disableTopPanel', menuContent.disableTopPanel);
        this.renderMenuView(menuContent, false, {isFirstTime: false, isBackground: false, isUserClick: true}, lastTab, tabId, isAddedToLastMenuStack);
    },

    onRenderTabItems: function (tabContent, isAddedToLastMenuStack) {
        // Not allowed to load same menu more than once consecutively
        if (this.tabContent && this.tabContent.id === tabContent.id && this.tabContent.title === tabContent.title) {
            return;
        }

        if (this.get('isPreviousMenuSelected') && this.get('parentMenuTab') === tabContent.id) {
            sharedService.getService('priceUI').resetLastMenuStack();
        }

        var preparedTab = this.onPrepareTab(tabContent, this.menuContent, this.widgetArgs, sharedService.userState.defaultWS[this.get('containerKey')]);
        this.renderTabView(this.menuContent, preparedTab, false, {isFirstTime: false, isBackground: false, isUserClick: true}, isAddedToLastMenuStack);
        this.setActiveTabTitle(this.tabContent);
    },

    onRenderCss: function (tabContent) {
        var preparedTab = this.onPrepareTab(tabContent, this.menuContent, this.widgetArgs, sharedService.userState.defaultWS[this.get('containerKey')]);
        this.setMenuCss(this.menuContent, preparedTab);
        this.setActiveTabTitle(this.tabContent);
    },

    getContainerArgs: function (menuContent) {
        // TODO: [Bashitha] Remove container level arguments and introduce to widget level

        var symbol, exchange, insType;
        var containerArgs = this._super(menuContent); // Call the getContainerArgs() function in base controller
        var savedSettings = sharedService.userState.lastArgs;
        var globalArgs = sharedService.userState.globalArgs;

        // When exchange changed, first symbol of the exchange has high priority than widget wise local symbol change
        if (savedSettings && savedSettings.sym && savedSettings.exg && savedSettings.exg === globalArgs.exg) {  // Below content changed for Mobile - container args common for all containers - Line 50,51,52,53
            symbol = savedSettings.sym;
            exchange = savedSettings.exg;
            insType = savedSettings.inst;
        } else {
            var store = sharedService.getService('price').stockDS.get('stockMapByExg');

            if (store) {
                exchange = globalArgs.exg;
                var symbolList = store[exchange];

                // Symbol list will not be unavailable when exchange change
                if (symbolList && symbolList.length > 0) {
                    var defaultSymbol = symbolList[0];

                    symbol = defaultSymbol.sym; // Get first symbol as the default symbol
                    insType = defaultSymbol.inst;
                }
            }
        }

        if (exchange) {
            containerArgs.subMarket = sharedService.getService('price').exchangeDS.getDefaultSubMarket(exchange);
        }

        containerArgs.sym = symbol;
        containerArgs.exg = exchange;
        containerArgs.inst = insType;

        return containerArgs;
    },

    renderMenuView: function (menuContent, isReRender, renderOptions, lastTab, tabId, isAddedToLastMenuStack) {
        // TODO: [Bashitha] Implement a component for main menu and set active css within the component and raise the event
        var leftPanelContainer = sharedService.getService('sharedUI').getService('leftPanel');
        var hnavPanelContainer = sharedService.getService('sharedUI').getService('hnavPanel');
        var isActiveMenu = renderOptions && (renderOptions.isFirstTime || renderOptions.isUserClick);

        if (leftPanelContainer && isActiveMenu) {
            leftPanelContainer.setActiveMenu(menuContent);
            hnavPanelContainer.setActiveMenu(menuContent, tabId);

            var activeTab = (tabId || tabId === 0) ? menuContent.tab[tabId - 1] : menuContent;
            this.setActiveTabTitle(activeTab, menuContent.title);

            this.set('activeTab', lastTab || menuContent);
        }

        // Prepare tabs by merging with saved arguments
        var that = this;
        var preparedTabs = [];

        Ember.$.each(menuContent.tab, function (key, tabContent) {
            preparedTabs[preparedTabs.length] = that.onPrepareTab(tabContent, menuContent, that.widgetArgs, sharedService.userState.defaultWS[that.get('containerKey')]);
        });

        this._prepareMenu(menuContent, preparedTabs);

        if (isActiveMenu) {
            var defaultTab = that._getDefaultTab(menuContent.id, preparedTabs, lastTab, tabId); // Added tabId - Mobile
            that.renderTabView(menuContent, defaultTab, isReRender, renderOptions, isAddedToLastMenuStack);
        }
    },

    setMenuCss: function (menuContent, tabContent) {
        this._clearPrevActiveTab(this.get('prevMenuContent'), tabContent);
        this.set('prevMenuContent', menuContent.tab);
        this._setActiveTab(menuContent, tabContent);
    },

    renderTabView: function (menuContent, tabContent, isReRender, renderOptions, isAddedToLastMenuStack) {
        // Not allowed to load same tab more than once consecutively
        if (!isReRender && sharedService.userState.lastMenu === menuContent.id &&
            sharedService.userState.lastTab && sharedService.userState.lastTab[menuContent.id] === tabContent.id) {
            return;
        }

        if (renderOptions && !renderOptions.isFirstTime && !renderOptions.isBackground) {
            this.set('activeTab', tabContent);
        }

        this._setScreenRotation(tabContent, renderOptions);

        this._renderViewport(menuContent, tabContent, renderOptions);

        // Selected layout may change for each tab
        if (menuContent.custom) {
            this.router.controllerFor(tabContent.outlet).onLoadLayoutContainer(this.router, menuContent, tabContent, this);
        }

        var that = this;
        var prevMenu = this.menuContent;
        var prevTab = this.tabContent;

        if (renderOptions && (renderOptions.isFirstTime || renderOptions.isUserClick)) {
            this.menuContent = menuContent;
            this.tabContent = tabContent;

            this._clearPrevActiveTab(this.get('prevMenuContent'), tabContent);
            this.set('prevMenuContent', menuContent.tab);
            this._setActiveTab(menuContent, tabContent);
        }

        that._prepareTab(menuContent, tabContent, renderOptions);
        that.initializePostRender(menuContent, tabContent, renderOptions);

        if (prevTab && renderOptions && renderOptions.isUserClick) {
            // Store Last Menu Stack on Demand
            var titleBarContainer = sharedService.getService('sharedUI').getService('titleBar');
            titleBarContainer.set('isBackEnable', false);

            if (isAddedToLastMenuStack || sharedService.getService('priceUI').getLastMenuStack().length > 0) {
                titleBarContainer.set('isBackEnable', true);
            }

            if (isAddedToLastMenuStack && sharedService.getService('priceUI').getLastMenuStack().length === 0) {
                sharedService.getService('priceUI').pushLastMenuStack(prevMenu, prevTab);
            }

            // Remove existing widgets
            Ember.run.later(function () {
                if (prevMenu.id !== that.menuContent.id || prevTab.id !== that.tabContent.id) {
                    that.closeContainerWidgets(prevMenu, prevTab);
                }
            }, 1000);
        }

        this.utils.analyticsService.trackPage([menuContent.title, tabContent.outlet.split('.').pop()].join(':'));
    },

    renderWidget: function (menuContent, tabContent, widgetDef, args, innerWidgetParams) {
        var widgetArgs, widgetController;
        var activeWidget = innerWidgetParams ? innerWidgetParams.activeWidget : widgetDef;
        activeWidget.cacheInBackground = widgetDef.cacheInBackground;
        activeWidget.loadFromCache = widgetDef.loadFromCache;

        if (!activeWidget.loadFromCache) {
            var templateName = (menuContent.custom && !tabContent.preset) ? 'custom-workspace.custom-layout-view' : tabContent.outlet;
            widgetController = ControllerFactory.createController(this.container, 'controller:' + activeWidget.wn, tabContent.isSingleton);  // Mobile change - tabContent.isSingleton

            this.router.render(activeWidget.wn, {
                into: templateName,
                outlet: 'w' + widgetDef.id,
                controller: widgetController
            });

            if (innerWidgetParams) {
                this.saveLastActiveInnerWidget(widgetDef, innerWidgetParams.activeWidget);
            }

            this.setContainerWidget(menuContent.id, tabContent.id, widgetDef.id, widgetController);

            // Call initializeWidget() in each loaded widget with arguments
            widgetArgs = this.getWidgetArgs(activeWidget, tabContent, menuContent);
            widgetArgs = this._setWidgetArgs(args, widgetArgs); // 'args' will contain default arguments passed in to widgets. Ex: mode: 1 for MDP
            widgetArgs = this._setWidgetArgs(innerWidgetParams ? innerWidgetParams.customArgs : undefined, widgetArgs);
        } else {
            var menu = this.menuContent.id;
            var tab = this.tabContent.id;
            var controllerMap = this.controllers;

            if (controllerMap && controllerMap[menu] && controllerMap[menu][tab]) {     // Quick Menu changes lead some parameters undefined.
                widgetController = controllerMap[menu][tab][widgetDef.id];
            }
        }

        if (widgetController) {
            widgetController.initializeWidget(activeWidget, widgetArgs, this, menuContent, tabContent);
        }

        return widgetController;
    },

    prepareWidget: function (menuContent, tabContent, widgetDef) {
        this.renderWidget(menuContent, tabContent, widgetDef);
    },

    languageChanged: function (language) {
        this.set('widgetTitle', this.get('app').lang.labels[this.menuContent.widgetTitle]);

        this._setTabDisplayTitle(this.get('tabList'));
        this._super(language);
    },

    _setWidgetArgs: function (args, widgetArgs) {
        if (args) {
            // Args will contain default arguments passed in to widgets. Ex: mode: 1 for MDP
            widgetArgs.widgetArgs = widgetArgs.widgetArgs || {};

            Ember.$.each(args, function (prop, val) {
                widgetArgs.widgetArgs[prop] = val;
            });
        }

        return widgetArgs;
    },

    _renderViewport: function (menuContent, tabContent, renderOptions) {
        var outletName = tabContent.cache ? tabContent.title : this.get('outletName');

        if (renderOptions && (renderOptions.isFirstTime || (renderOptions.isBackground && tabContent.cache) ||
            (renderOptions.isUserClick && tabContent.cache && !this.tabCacheMap[tabContent.title]) ||
            (renderOptions.isUserClick && !tabContent.cache))) {
            this.router.render(tabContent.outlet, {
                into: this.get('appLayout').layout[this.get('containerKey')].template,
                outlet: outletName
            });
        }

        var containerController = this.router.controllerFor(tabContent.outlet, true);

        if (containerController) {
            containerController.set('menuContent', menuContent);
        }

        if (renderOptions && renderOptions.isFirstTime) {
            Ember.$('div[name=mpl-' + outletName + ']').css('z-index', 0);
        }

        if (renderOptions && renderOptions.isUserClick) {
            if (this.tabContent.cache || tabContent.cache) {
                var prevOutlet = this.tabContent.cache ? this.tabContent.title : this.get('outletName');
                var zIndexPrev = -(this.menuContent.id * 100 + this.tabContent.id * 10);

                Ember.$('div[name=mpl-' + prevOutlet + ']').css('z-index', zIndexPrev);
                Ember.$('div[name=mpl-' + outletName + ']').css('z-index', 0);
            }

            if (!this.tabContent.cache && tabContent.cache) {
                this.router.disconnectOutlet({
                    parentView: this.get('appLayout').layout[this.get('containerKey')].template,
                    outlet: this.get('outletName')
                });
            }
        }

        if (renderOptions && renderOptions.isBackground && !(this.tabContent.title === tabContent.title && tabContent.cache)) {
            var zIndexCurrent = -(menuContent.id * 100 + tabContent.id * 10);
            Ember.$('div[name=mpl-' + tabContent.title + ']').css('z-index', zIndexCurrent);
        }
    },

    _prepareTab: function (menuContent, tabContent, renderOptions) {
        if (renderOptions && (!renderOptions.isBackground || tabContent.cache)) {
            if (tabContent.w !== undefined) {
                var isCached = this.tabCacheMap[tabContent.title];

                for (var i = 0; i < tabContent.w.length; ++i) {
                    var widgetDef = tabContent.w[i];

                    widgetDef.cacheInBackground = renderOptions && renderOptions.isBackground && tabContent.cache;
                    widgetDef.loadFromCache = renderOptions && renderOptions.isUserClick && tabContent.cache && isCached;

                    if (widgetDef) {
                        this.prepareWidget(menuContent, tabContent, widgetDef);
                    }
                }

                this.tabCacheMap[tabContent.title] = tabContent.cache;
            }
        }
    },

    _setActiveTab: function (menuContent, currentTab) {
        var tabArray = menuContent.tab;

        if (currentTab.expandId !== -1) {  // Note that expandId = -1 for tab contents which are not showing in main menu panel
            Ember.$.each(tabArray, function (key, tabObj) {
                Ember.set(tabObj, 'leftNavCss', '');
                Ember.set(tabObj, 'css', '');
                Ember.set(tabObj, 'iconCss', '');

                if (tabObj.id === currentTab.id) {
                    Ember.set(tabObj, 'leftNavCss', 'widgetmnu-active');
                    Ember.set(tabObj, 'css', 'bold fore-color tab-highlight');
                    Ember.set(tabObj, 'iconCss', 'widgetmnu-icon-active');

                    if (!tabObj.def) {
                        try {
                            Ember.set(menuContent, 'leftNavCss', '');
                            Ember.set(menuContent, 'css', '');
                            Ember.set(menuContent, 'iconCss', '');
                        } catch (e) {
                            menuContent.leftNavCss = '';
                            menuContent.css = '';
                            menuContent.iconCss = '';
                        }
                    }
                }
            });
        }
    },

    _clearPrevActiveTab: function (tabArray, tabContent) {
        if (tabContent.expandId !== -1 && tabArray && tabArray.length > 0) {
            Ember.$.each(tabArray, function (key, tabObj) {
                Ember.set(tabObj, 'leftNavCss', '');
            });
        }
    },

    _getDefaultMenu: function () {
        var savedLayout, configLayout;
        var contentArray = this.get('appLayout').layout[this.get('containerKey')].content;
        var savedMenuId = this.getLastActiveMenu();

        savedMenuId = savedMenuId ? parseInt(savedMenuId, 10) : -1;

        if (contentArray && contentArray.length > 0) {
            Ember.$.each(contentArray, function (index, layout) {
                if (savedMenuId > -1 && layout.id === savedMenuId) {
                    savedLayout = layout;
                    return false;
                }

                if (layout.def) {
                    configLayout = layout;
                }
            });
        }

        // noinspection JSUnusedAssignment
        return savedLayout ? savedLayout : configLayout;
    },

    _getDefaultTab: function (menuId, menuTabs, lastTab, tabId) { // Added tabId to direct load Tab- Mobile
        var defTab = {};
        var savedTabObj = this.getLastActiveTab();
        var savedTabId = (savedTabObj && savedTabObj[menuId]) ? savedTabObj[menuId] : tabId ? tabId : -1;

        if (lastTab) {
            defTab = lastTab;
        }
        else if (menuTabs && menuTabs.length > 0) {
            Ember.$.each(menuTabs, function (index, tab) {
                if (savedTabId > -1) {
                    if (tab.id === savedTabId) {
                        defTab = tab;
                        return false;
                    }
                } else if (tabId > -1 && tab.id === tabId) {
                    defTab = tab;

                    return false;
                } else if (tab.def) {
                    defTab = tab;

                    return false;
                }
            });
        }

        return defTab;
    },

    _prepareMenu: function (menuContent, menuTabs) {
        this.set('showTitle', menuContent.isShowTitle);
        this.set('widgetTitle', this.get('app').lang.labels[menuContent.widgetTitle]);

        if (menuTabs) {
            this._setTabDisplayTitle(menuTabs);
            this.set('tabList', menuTabs);
            this.set('showTabs', menuTabs.length > 1 && !menuContent.isHideTab);

            Ember.set(this.get('displayTabs'), menuContent.title, 0);
            Ember.set(this.get('menuTabMap'), menuContent.title, menuTabs);
        }
    },

    _setTabDisplayTitle: function (menuTabs) {
        var that = this;

        if (menuTabs) {
            Ember.$.each(menuTabs, function (key, tab) {
                try {
                    Ember.set(tab, 'displayTitle', that.get('app').lang.labels[tab.titleKey]);
                } catch (e) {
                    tab.displayTitle = that.get('app').lang.labels[tab.titleKey];
                }
            });
        }
    },

    setActiveTabTitle: function (content, contentId) {
        var titleBarContainer = sharedService.getService('sharedUI').getService('titleBar');
        titleBarContainer.setActiveTabName(content, contentId);
    },

    _setScreenRotation: function (tabContent, renderOptions) {
        if (window.screen && window.screen.orientation && Ember.$.isFunction(window.screen.orientation.unlock)) { // For android 6.0 and above
            if (renderOptions && !renderOptions.isBackground) {
                if (tabContent.isRotationAllowed) {
                    window.screen.orientation.unlock();
                } else {
                    window.screen.orientation.lock('portrait');
                }
            } else if (appConfig.customisation.isDefaultRotationDisabled) {
                window.screen.orientation.lock('portrait');
            }
        }
    }
});