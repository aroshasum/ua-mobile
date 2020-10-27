import Ember from 'ember';
import AppNavigation from './app-navigation';
import appConfig from '../../config/app-config';
import appEvents from '../../app-events';

export default AppNavigation.extend({
    subMenuWidthArray: [],
    subMenuWidthCss: '',
    isHorizontalPanel: true,
    customInputId: '',

    isCustomWorkSpaceEnabled: appConfig.customisation.isCustomWorkSpaceEnabled,

    onAfterRender: function () {
        if (Ember.appGlobal.events.isDomReady) {
            this.getSubMenuWidths();
        } else {
            appEvents.subscribeDomReady(this.get('containerKey'), this);
        }
    },

    onDomReady: function () {
        this.getSubMenuWidths();
        appEvents.unSubscribeDomReady(this.get('containerKey'));
    },

    languageChanged: function (language) {
        var that = this;
        var menuArray = this.get('appLayout').layout.mainPanel.content;

        this._super(language);

        Ember.$.each(menuArray, function (key, menuObj) {
            if (menuObj.tab.length > 1) {
                Ember.$.each(menuObj.tab, function (id, subMenu) {
                    if (that.utils.validators.isAvailable(subMenu.customTitle)) {
                        Ember.set(subMenu, 'displayTitle', subMenu.customTitle); // Rename custom workspace; Get from local storage
                    } else {
                        Ember.set(subMenu, 'displayTitle', that.get('app').lang.labels[subMenu.title]);
                    }
                });
            }
        });

        this.getSubMenuWidths();
    },

    setActiveMenu: function (currentMenu) {
        var menuArray = this.get('appLayout').layout.mainPanel.content;

        // At first time, object behaves as a normal javascript object
        // After that object is an ember object
        // Still we cannot call .set() directly on the object
        // Need to call Ember.set() instead

        Ember.$.each(menuArray, function (key, menuObj) {
            try {
                Ember.set(menuObj, 'css', '');
            } catch (e) {
                menuObj.css = '';
            }

            if (menuObj.id === currentMenu.id) {
                try {
                    Ember.set(menuObj, 'css', menuObj.tab.length === 1 ? 'active' : 'transform-menu appmnu-sidebar-active');
                } catch (e) {
                    menuObj.css = menuObj.tab.length === 1 ? 'active' : 'transform-menu appmnu-sidebar-active';
                }
            }
        });

        if (currentMenu.tab.length > 1 && appConfig.customisation.isMultipleMenuExpand) {
            this.initializeMenu(currentMenu);
        } else {
            this.collapseAllMenus(currentMenu);
        }
    },

    setMenuTitle: function () {
        var that = this;
        var menuArray = this.get('appLayout').layout.mainPanel.content;

        // At first time, object behaves as a normal javascript object
        // After that object is an ember object
        // Still we cannot call .set() directly on the object
        // Need to call Ember.set() instead

        Ember.$.each(menuArray, function (key, menuObj) {
            that.setTitle(menuObj);

            if (menuObj.tab.length > 1) {
                that.setTabDisplayTitle(menuObj.tab);
            }
        });
    },

    checkSpaceAvailability: function (currentMenu) {
        var menuArray = this.get('appLayout').layout.mainPanel.content;
        var subMenuWidthArray = this.get('subMenuWidthArray');
        var horizontalPanel = Ember.$('#horizontalPanel');
        var horizontalPanelWidth = horizontalPanel.length > 0 ? Ember.$('#horizontalPanel')[0].offsetWidth : undefined;
        var totalWidth = 0;
        var minimumAvailableSpace = 10;
        var availableSpace;

        if (subMenuWidthArray.length > 1) {
            Ember.$.each(menuArray, function (key, menuObj) {
                var id = menuObj.id;

                if (menuObj.isExpanded || menuObj.id === currentMenu.id) {
                    totalWidth = totalWidth + subMenuWidthArray[id].totalWidth;
                } else {
                    totalWidth = totalWidth + subMenuWidthArray[id].mainMenu;
                }
            });

            availableSpace = horizontalPanelWidth - totalWidth;
        }

        return availableSpace > minimumAvailableSpace;
    },

    initializeMenu: function (currentMenu) {
        if (this.checkSpaceAvailability(currentMenu)) {
            this.setSubMenu(currentMenu, true);
        } else {
            if (this.setMenuLevelOne(currentMenu)) {
                this.setSubMenu(currentMenu, true);
            } else {
                this.autoAdjustedMenu(currentMenu);
            }
        }
    },

    autoAdjustedMenu: function (currentMenu) {
        var that = this;
        var menuArray = this.get('appLayout').layout.mainPanel.content;

        Ember.$.each(menuArray, function (key, menuObj) {
            if (menuObj.tab.length > 1 && menuObj.defaultExpand && menuObj.isExpanded) {
                if (!that.checkSpaceAvailability(currentMenu)) {
                    that.setSubMenu(menuObj, false);
                } else {
                    return false;
                }
            }
        });

        this.setSubMenu(currentMenu, true);
    },

    setDefaultMenu: function () {
        var that = this;
        var menuArray = this.get('appLayout').layout.mainPanel.content;

        Ember.$.each(menuArray, function (key, menuObj) {
            if (menuObj.tab.length > 1) {
                var doExpand = menuObj.css === 'transform-menu appmnu-sidebar-active' || menuObj.defaultExpand && !menuObj.isExpanded;
                that.setSubMenu(menuObj, doExpand);
            }
        });
    },

    collapseAllMenus: function (currentMenu) {
        var that = this;
        var menuArray = this.get('appLayout').layout.mainPanel.content;

        this.setSubMenu(currentMenu, true);

        Ember.$.each(menuArray, function (key, menuObj) {
                if (menuObj.tab.length > 1 && !menuObj.defaultExpand && menuObj.isExpanded && menuObj.id !== currentMenu.id) {
                that.setSubMenu(menuObj, false);
            }
        });
    },

    setMenuLevelOne: function (currentMenu) {
        var that = this;
        var isCompleteMenuLevelOne = false;
        var menuArray = this.get('appLayout').layout.mainPanel.content;

        Ember.$.each(menuArray, function (key, menuObj) {
            if (menuObj.tab.length > 1 && !menuObj.defaultExpand && menuObj.isExpanded) {
                if (!that.checkSpaceAvailability(currentMenu)) {
                    that.setSubMenu(menuObj, false);
                } else {
                    isCompleteMenuLevelOne = true;
                    return false; // For break the loop
                }
            }
        });

        return isCompleteMenuLevelOne;
    },

    setSubMenu: function (currentMenu, expand) {
        var subMenuWidthArray = this.get('subMenuWidthArray');
        var element = Ember.$('#menuWrapper' + currentMenu.id);
        var firstElementIndex = 0;
        var width;

        if (expand) {
            width = subMenuWidthArray.length > 0 && subMenuWidthArray[currentMenu.id] ? subMenuWidthArray[currentMenu.id].totalWidth : 0;
        } else {
            width = subMenuWidthArray.length > 0 && subMenuWidthArray[currentMenu.id] ? subMenuWidthArray[currentMenu.id].mainMenu : 0;
        }

        if (element && element.length > 0) {
            try {
                Ember.set(currentMenu, 'isExpanded', expand);
            } catch (e) {
                currentMenu.isExpanded = expand;
            }

            element[firstElementIndex].style.width = width + 'px';
        }
    },

    getSubMenuWidths: function () {
        var that = this;
        var menuArray = this.get('appLayout').layout.mainPanel.content;
        var widthArray = [];

        Ember.run.later(function () {
            var horizontalPanel = Ember.$('#horizontalPanel');

            Ember.$.each(menuArray, function (key, menuObj) {
                var subMenu = horizontalPanel.find('#subMenu' + menuObj.id);
                var mainMenuId = horizontalPanel.find('#mainMenu' + menuObj.id);
                var mainMenu = Ember.$(mainMenuId);
                var mainMenuWidth = mainMenu.length > 0 ? mainMenu.width() : 0;
                var subMenuWidth = subMenu.length > 0 ? subMenu.width() : 0;

                widthArray[menuObj.id] = {mainMenu: mainMenuWidth, totalWidth: subMenu.length > 0 ? mainMenuWidth + subMenuWidth + 3 : 0};
            });

            that.set('subMenuWidthArray', widthArray);
            that.setDefaultMenu();
        }, 150);
    }
});