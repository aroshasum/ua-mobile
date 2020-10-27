import Ember from 'ember';
import layoutConfig from '../config/layout-config';
import appEvents from '../app-events';
import utils from '../utils/utils';
import sharedService from '../models/shared/shared-service';
import moduleInitializerConfig from '../config/module-initializer-config';
import appConfig from '../config/app-config';

export default Ember.Route.extend({
    appLayout: {},
    clickEventHandler: null,
    disableTopPanel: false,
    disableSubMenu: false,
    mainPanelHeight: 'widget-container-height',
    layoutMap: {},

    onDeviceReadyHandler: null,

    renderTemplate: function (controller, model) {
        this._super(controller, model); // Render the base template

        this.onDeviceReadyHandler = this.onDeviceReady.bind(this);
        this.initializeWrapper();

        this.set('appLayout', layoutConfig);
        sharedService.getService('sharedUI').registerService('appLayoutConfig', layoutConfig);

        this.get('controller').mainOutletStyle = 'col-xs-10 full-height';
        this.get('controller').rightPanelStyle = '';
        Ember.addObserver(sharedService.getService('sharedUI'), 'isChildViewEnabled', this.get('controller'), this.setChildViewEnabled);

        this.addDomReadyListener();
        this.addVisibilityChangeListener();
        this.addAppCloseListener();
        this.addDocumentClickListener();
        this.addOrientationChangeListener();
    },

    initializeWrapper: function () {
        var appNavigator = navigator.userAgent;

        if (appNavigator.indexOf('Mac OS') > -1 || appNavigator.indexOf('iPhone') > -1) {
            Ember.isIos = true;     // To be used to check device platform all over the app
            document.addEventListener('deviceready', this.onDeviceReadyHandler, false);     // Device Ready for Iphone
        } else if (appNavigator.indexOf('Android') > 0) {
            Ember.isAndroid = true;
            document.addEventListener('deviceready', this.onDeviceReadyHandler, false);     // Device Ready for Android
        }
    },

    onDeviceReady: function () {
        navigator.splashscreen.hide();

        this._loadModules();

        if (window.StatusBar && Ember.$.isFunction(window.StatusBar.overlaysWebView)) {
            window.StatusBar.overlaysWebView(false);
        }

        this.clickEventHandler = this.loadLastMenu.bind(this);
        document.addEventListener('backbutton', this.clickEventHandler, false);

        sharedService.getService('sharedUI').initializeTouchId();

        if (appConfig.customisation.isVersionCheckEnable) {
            Ember.run.later(function () {
                sharedService.getService('price').sendAppStoreVersionRequest(sharedService.getService('sharedUI').updateToLatestVersion);
            }, 2000);
        }

        if (window.plugins.Keyboard && Ember.$.isFunction(window.plugins.Keyboard.shrinkView)) {
            window.plugins.Keyboard.shrinkView(true); // To fix IOS 12 keyboard dismissal leaves viewport shifted
        }

        if (appConfig.customisation.isBlockedRootedDevice) {
            window.plugins.IRoot.isRooted(this._onRootedCallback);
        }
    },

    _loadModules: function () {
        var that = this;
        var modCount = 0;

        Ember.$.each(moduleInitializerConfig.lazyModules, function (key, module) {
            try {
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = module.path;
                script.async = true;

                script.onload = function () {
                    modCount++;

                    if (modCount >= moduleInitializerConfig.lazyModules.length) {
                        that._initModules();
                    }
                };

                document.head.appendChild(script);
            } catch (e) {
                utils.logger.logError('Error in module loading : ' + e);
            }
        });
    },

    _initModules: function () {
        var that = this;

        Ember.$.each(moduleInitializerConfig.lazyModules, function (key, module) {
            if (module.initializers && module.initializers.length > 0) {
                Ember.$.each(module.initializers, function (ind, initConfig) {
                    var initializer = initConfig ? that.container.lookupFactory(initConfig) : undefined;

                    if (initializer) {
                        initializer = initializer.create();
                        initializer.preInitialize();

                        moduleInitializerConfig.modules.pushObject(initializer);
                    }
                });
            }
        });

        Ember.$.each(moduleInitializerConfig.modules, function (key, module) {
            if (module) {
                module.postInitialize();
            }
        });

        this._initTemplate();
    },

    _initTemplate: function () {
        var that = this;
        var layoutContent = this.get('appLayout').layout;

        Ember.$.each(layoutContent, function (prop, content) {
            that.render(content.template, {
                into: 'application',
                outlet: prop + 'Outlet'
            });

            var containerController = that.controllerFor(content.template);
            containerController.initializeContainer(that, that.get('appLayout'));

            sharedService.getService('sharedUI').registerService(prop, containerController);
        });

        Ember.$.each(layoutContent, function (prop) {
            sharedService.getService('sharedUI').getService(prop).initializeUI();
        });

        this._initializeSharedComponents();
        this._initializeLayoutConfigMap();

        appEvents.onLayoutReady(this);
        // appEvents.triggerEvent(utils.Constants.EventTypes.OnLayoutReady, [this]);
    },

    loadLastMenu: function () {
        var popupElement = Ember.$('div[name=child-view-mobile]');
        var isPopupOpened = popupElement.attr('class').indexOf('child-view-enter') > -1;

        if (isPopupOpened) {
            sharedService.getService('priceUI').closeChildView(undefined, true);
        } else {
            // TODO: [satheeqh] Refactor sharedUI to class variable as many usages
            sharedService.getService('sharedUI').getService('mainPanel').loadLastMenuFromStack();

            // Uncomment below after implementing user confirmation exit
            // else {
            // throw new Error('Exit'); // This will suspend the app
            // }
        }

        this._closePopups();
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

    _onRootedCallback: function (isRooted) {
        if (isRooted) {
            Ember.isSecuredDevice = true;
            sharedService.getService('sharedUI').loginViewController.setDeviceError();
        }
    },

    setChildViewEnabled: function () {
        this.set('isChildViewEnabled', sharedService.getService('sharedUI').get('isChildViewEnabled'));

        Ember.run.next(this, function () {
            if (this.mainPanelHeight === 'widget-container-height-order-ticket' && !this.get('isChildViewEnabled')) {
                Ember.$('#notificationPanel').addClass('notification-hide');
            }
        });
    },

    addVisibilityChangeListener: function () {
        if (document.addEventListener) {
            document.addEventListener('visibilitychange', function () {
                appEvents.onVisibilityChanged(document.hidden);
            });
        }
    },

    addAppCloseListener: function () {
        window.onbeforeunload = function () {
            utils.webStorage.addString(utils.webStorage.getKey(utils.Constants.CacheKeys.LoggedIn), utils.Constants.No, utils.Constants.StorageType.Session);
            appEvents.onAppClose();
        };
    },

    addOrientationChangeListener: function () {
        if (window.addEventListener && window.DeviceOrientationEvent) {
            window.addEventListener('orientationchange', function () {
                appEvents.onOrientationChanged();
            });

            appEvents.onOrientationChanged(); // To set current orientation on first time load
        }
    },

    _initializeSharedComponents: function () {
        var messageViewer = this.container.lookupFactory('component:single-message-viewer').create();
        sharedService.getService('sharedUI').registerService('single-message-viewer', messageViewer);
    },

    addDocumentClickListener: function () {
        this.clickEventHandler = this.onDocumentClick.bind(this);
        document.addEventListener('mousedown', this.clickEventHandler, true);
    },

    setMainPanelHeight: function () {
        var disableTopPanel = this.get('disableTopPanel');
        var disableSubMenu = this.get('disableSubMenu');
        var notificationPanel = Ember.$('#notificationPanel');

        if (disableTopPanel) {
            Ember.set(this.get('controller'), 'mainPanelHeight', 'widget-container-height-order-ticket');
            notificationPanel.addClass('notification-hide');
        } else {
            // This is to remove animation of already shown notifications
            var notificationContainers = notificationPanel.find('.div-up');
            notificationContainers.addClass('div-up-top');
            notificationContainers.removeClass('div-up');

            Ember.set(this.get('controller'), 'mainPanelHeight', disableSubMenu ? 'widget-container-height-without-submenu' : 'widget-container-height');
            notificationPanel.removeClass('notification-hide');
        }

        if (sharedService.getService('sharedUI').get('isDelayedUserLogged')) {
            Ember.set(this.get('controller'), 'mainPanelHeight', 'delayed-widget-container-height');
        }
    }.observes('disableTopPanel', 'disableSubMenu'),

    onDocumentClick: function (e) {
        Ember.appGlobal.events.mousedown = e;
    },

    _initializeLayoutConfigMap: function () {
        var layoutMap = {};
        var menuArray = layoutConfig.layout.mainPanel.content;

        // Set Menu Content array to map
        Ember.$.each(menuArray, function (key, menu) {
            layoutMap[menu.title] = menu;

            // Set Tab Content array to map
            Ember.$.each(menu.tab, function (tabKey, tabItem) {
                var tabItemMap = layoutMap[menu.title].tabMap;

                if (tabItemMap) {
                    tabItemMap[tabItem.title] = tabItem;
                } else {
                    layoutMap[menu.title].tabMap = {};
                }
            });
        });

        this.set('layoutMap', layoutMap);
        sharedService.getService('sharedUI').setLayoutMap(layoutMap);
    },

    addDomReadyListener: function () {
        var that = this;

        window.addEventListener('load', function () {
            Ember.run.next(that, function () {
                if (!navigator.isNativeDevice) {
                    that._loadModules();
                }

                appEvents.onDomReady();
            });

            window.removeEventListener('load', function () {
            }); // Remove listener, no longer needed
        });
    },

    actions: {
        renderMenuItems: function (menuContent) {
            sharedService.getService('priceUI').resetLastMenuStack();
            sharedService.getService('sharedUI').getService('mainPanel').onRenderMenuItems(menuContent);
        },

        renderDirectTabItems: function (menuContent, tabContent) {
            sharedService.getService('sharedUI').getService('mainPanel').onRenderMenuItems(menuContent, undefined, tabContent.id);
        },

        renderTabItems: function (tabContent) {
            sharedService.getService('sharedUI').getService('mainPanel').onRenderTabItems(tabContent);
        },

        renderRightPanelItems: function (rightPanelContent) {
            sharedService.getService('sharedUI').getService('rightPanel').renderRightPanelView(rightPanelContent, {isUserClick: true});
            utils.analyticsService.trackEvent('right-panel', utils.Constants.GAActions.viewChanged, ['tab:', rightPanelContent.layoutTemplate].join(''));
        },

        escapeMainNavigation: function () {
            var leftPanel = sharedService.getService('sharedUI').getService('leftPanel');

            if (leftPanel) {
                leftPanel.hideMainMenu();
            }
        }
    }
});
