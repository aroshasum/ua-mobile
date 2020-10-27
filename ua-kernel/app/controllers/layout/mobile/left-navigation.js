import Ember from 'ember';
import LeftNavigation from '../left-navigation';
import sharedService from '../../../models/shared/shared-service';
import controllerFactory from '../../controller-factory';
import appConfig from '../../../config/app-config';

export default LeftNavigation.extend({
    animationClass: '',
    blurEffect: '',
    isMainNavShown: false,
    helpHeader: '',
    isShareIconDisabled: appConfig.customisation.isShareIconDisabled,
    isHelpGuideEnabled: appConfig.customisation.isHelpGuideEnabled,
    isPasswordChangeEnable: appConfig.customisation.isPasswordChangeEnable,

    onLoadContainer: function () {
        this._super();
        this.setHeaderTexts();
    },

    toggleMainMenuView: function () {
        if (this.get('isMainNavShown')) {
            this.hideMainMenu();
        } else {
            this.showMainMenu();
        }
    },

    setMenuTitle: function () {
        var that = this;
        var menuArray = this.get('appLayout').layout.mainPanel.content;

        Ember.$.each(menuArray, function (menuId, menuObj) {
            that._changeLanguage(menuObj);

            Ember.$.each(menuObj.tab, function (tabId, tabObj) {
                that._changeLanguage(tabObj);
            });
        });
    },

    // This is overwritten because two seprate styles are used in Horizontal navigator and left navigation
    setActiveMenu: function (currentMenu) {
        var menuArray = this.get('appLayout').layout.mainPanel.content;

        // At first time, object behaves as a normal javascript object
        // After that object is an ember object
        // Still we cannot call .set() directly on the object
        // Need to call Ember.set() instead

        Ember.$.each(menuArray, function (key, menuObj) {
            try {
                Ember.set(menuObj, 'leftNavCss', '');
                Ember.set(menuObj, 'iconCss', '');
            } catch (e) {
                menuObj.leftNavCss = '';
                menuObj.iconCss = '';
            }
            if (menuObj.id === currentMenu.id) {
                try {
                    Ember.set(menuObj, 'leftNavCss', 'widgetmnu-active');
                    Ember.set(menuObj, 'iconCss', 'widgetmnu-icon-active');
                } catch (e) {
                    menuObj.leftNavCss = 'widgetmnu-active';
                    menuObj.iconCss = 'widgetmnu-icon-active';
                }
            }
        });
    },

    languageChanged: function () {
        this.setMenuTitle();
        this.setHeaderTexts();
    },

    _changeLanguage: function (menu) {
        var languageLabels = this.get('app').lang.labels;
        var menuKey = menu.mainMenuKey || menu.titleKey;
        var displayTitle = languageLabels[menuKey] ? languageLabels[menuKey] : languageLabels[menu.title];
        var displayHeader = menu.headerKey ? languageLabels[menu.headerKey] : displayTitle;

        try {
            Ember.set(menu, 'displayTitle', displayTitle);
            Ember.set(menu, 'displayHeader', displayHeader.toUpperCase());
        } catch (e) {
            menu.displayTitle = displayTitle;
            menu.displayHeader = displayHeader.toUpperCase();
        }
    },

    showMainMenu: function () {
        // var that = this;

        this.set('animationClass', 'main-menu-container main-menu-enter');
        this.set('isMainNavShown', true);

        // Commented to check performance - Blur Effect Applies After Main Menu Shown
        // Ember.set(this.router.get('controller'), 'blurEffectMain', 'blur-mobile-body');
        Ember.set(this.router.get('controller'), 'blurEffectMainHnav', 'visibility-hidden');

        this.loadMenuBackView(true);

        // Ember.run.later(function () {
        //    that.set('blurEffect', 'main-menu-blur');
        // }, 300);
    },

    hideMainMenu: function () {
        this.set('animationClass', 'main-menu-container top-zero bottom-zero main-menu-exit');
        this.set('isMainNavShown', false);
        this.set('blurEffect', '');

        this.loadMenuBackView();

        Ember.set(this.router.get('controller'), 'blurEffectMainHnav', '');
        Ember.set(this.router.get('controller'), 'blurEffectMain', '');
    },

    setHeaderTexts: function () {
        var helpText = this.get('app').lang.labels.help;

        if (helpText) {
            this.set('helpHeader', helpText.toUpperCase());
        }
    },

    loadMenuBackView: function (isLoadMenu, id) {
        var menuBackContainer = this.get('menuBackContainer');
        var menuBackUpCss = 'menu-back-main menu-back-view-up';
        var menuBackDownCss = 'menu-back-view-down';

        if (!menuBackContainer) {
            var containerId = id ? id : 'menuBackContainer';
            menuBackContainer = Ember.$('div#' + containerId);
        }

        if (isLoadMenu) {
            menuBackContainer.addClass(menuBackUpCss).removeClass(menuBackDownCss);
        } else {
            menuBackContainer.addClass(menuBackDownCss).removeClass('menu-back-view-up');

            Ember.run.later(function () {
                menuBackContainer.removeClass('menu-back-main');
            }, 200);    // Time for animation of Left Menu
        }
    },

    actions: {
        logout: function () {
            var utils = this.utils;

            utils.webStorage.addString(utils.webStorage.getKey(utils.Constants.CacheKeys.ManuallyLoggedOut), utils.Constants.Yes, utils.Constants.StorageType.Session);
            utils.applicationSessionHandler.logout();
        },

        invokeSettings: function () {
            var widgetController = controllerFactory.createController(this.container, 'controller:price/widgets/mobile/settings');
            var viewName = 'price/widgets/mobile/settings';

            widgetController.initializeWidget({wn: 'settings'});
            sharedService.getService('priceUI').showChildView(viewName, widgetController, widgetController.get('title'), 'settings-' + this.get('wkey'));

            this.hideMainMenu();
        },

        invokeAboutUs: function () {
            var widgetController = controllerFactory.createController(this.container, 'controller:price/widgets/mobile/about-us');
            var viewName = 'price/widgets/mobile/about-us';

            widgetController.initializeWidget({wn: 'aboutUs'});
            widgetController.set('isBackToLoginDisabled', true);
            sharedService.getService('priceUI').showChildView(viewName, widgetController, widgetController.get('title'), 'aboutUs-' + this.get('wkey'));

            this.hideMainMenu();
        },

        invokeChangePassword: function () {
            var widgetController = controllerFactory.createController(this.container, 'component:password-change');
            var viewName = 'components/password-change';
            var languageLabel = this.get('app').lang.labels.changePassword;

            widgetController.send('showModalPopup', false);
            sharedService.getService('priceUI').showChildView(viewName, widgetController, languageLabel, 'change-password-' + this.get('wkey'));

            this.hideMainMenu();
        },

        invokeHelp: function () {
            var widgetController = controllerFactory.createController(this.container, 'controller:price/widgets/mobile/help/guide-index');
            var viewName = 'price/widgets/mobile/help/guide-index';

            widgetController.initializeWidget({wn: 'help'});
            sharedService.getService('priceUI').showChildView(viewName, widgetController, widgetController.get('title'), 'help-' + this.get('wkey'));

            this.hideMainMenu();
        },

        hideMainMenu: function () {
            this.hideMainMenu();
        },

        onShareScreen: function () {
            this.hideMainMenu();

            // Delay screenshot until hide menu animation completes
            Ember.run.later(this, function () {
                sharedService.getService('priceUI').shareScreenshot('');
            }, 600);
        }
    }
});