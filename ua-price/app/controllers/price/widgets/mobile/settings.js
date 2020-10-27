import Ember from 'ember';
import BaseController from '../../../base-controller';
import ThemeDataStore from '../../../../models/shared/data-stores/theme-data-store';
import LanguageDataStore from '../../../../models/shared/language/language-data-store';
import sharedService from '../../../../models/shared/shared-service';
import ControllerFactory from '../../../controller-factory';
import appConfig from '../../../../config/app-config';

export default BaseController.extend({
    title: 'Settings',
    supportedThemes: Ember.A([]),
    supportedLanguages: Ember.A([]),
    priceService: sharedService.getService('price'),
    customSettingsPopup: false,
    tickerSpeed: '',

    isTickerSettingsEnabled: appConfig.customisation.isTickerSettingsEnabled,
    isSocialMediaSettingsEnabled: appConfig.customisation.isSocialMediaEnabled,
    isWatchListSettingsEnabled: appConfig.customisation.isWatchListSettingsEnabled,
    isShowBiometricAuthSignup: appConfig.customisation.showBiometricAuthSignup && sharedService.getService('sharedUI').deviceType,
    isAppLogEnabled: appConfig.loggerConfig.isAppLogEnabled,

    bioAuthActiveCss: 'theme-settings',

    onLoadWidget: function () {
        this.set('title', this.get('app').lang.labels.settings);
    },

    onPrepareData: function () {
        this.set('supportedThemes', this._getSupportedSettings(ThemeDataStore.getUserThemes()));
        this.set('supportedLanguages', this._getSupportedSettings(LanguageDataStore.getUserLanguages()));
        this.set('tickerSpeed', sharedService.userSettings.tickerSpeed);
    },

    _getSupportedSettings: function (supportedThemes) {
        var that = this;
        var settingsArray = Ember.A([]);

        Ember.$.each(supportedThemes, function (index, item) {
            item.langDesc = item.langKey ? that.get('app').lang.labels[item.langKey] : item.desc;
            settingsArray.pushObject(Ember.Object.create(item));
        });

        return settingsArray;
    },

    onAfterRender: function () {
        this.initializeThemeSettings();
        this.initializeLanguageSettings();

        if (this.isShowBiometricAuthSignup) {
            this.initializeBioAuthSettings();
        }
    },

    initializeThemeSettings: function () {
        this._initializeSettings(this.get('supportedThemes'), sharedService.userSettings.currentTheme);
    },

    initializeLanguageSettings: function () {
        this._initializeSettings(this.get('supportedLanguages'), sharedService.userSettings.currentLanguage);
    },

    initializeBioAuthSettings: function (isToggleSetting) {
        var bioArgs = sharedService.userSettings.biometricAuthArgs;
        var isBioAuthEnabled = !isToggleSetting;
        var bioAuthActiveCss = isToggleSetting ? 'theme-settings' : 'glyphicon glyphicon-ok';

        if (!bioArgs || bioArgs.isUserDenied) {
            isBioAuthEnabled = isToggleSetting;
            bioAuthActiveCss = isToggleSetting ? 'glyphicon glyphicon-ok' : 'theme-settings';
        }

        bioArgs.isUserDenied = !isBioAuthEnabled;
        sharedService.userSettings.save();

        this.set('bioAuthActiveCss', bioAuthActiveCss);
    },

    initializeTickerSettings: function (speed) {
        sharedService.userSettings.set('tickerSpeed', speed);
        sharedService.userSettings.save();
    },

    _initializeSettings: function (settingArray, currentValue) {
        Ember.$.each(settingArray, function (index, item) {
            Ember.set(item, 'active', currentValue && item && currentValue.indexOf(item.code) !== -1 ? 'glyphicon glyphicon-ok' : 'theme-settings');
        });
    },

    onLanguageChanged: function () {
        this.onLoadWidget();
        this.onPrepareData();
    },

    getTickerSpeed: function () {
        var speed = this.get('tickerSpeed');
        this.initializeTickerSettings(speed);
    }.observes('tickerSpeed'),

    actions: {
        changeTheme: function (code) {
            ThemeDataStore.changeTheme(code);
            this.initializeThemeSettings();
        },

        changeLanguage: function (code) {
            LanguageDataStore.changeLanguage(code);
            this.initializeLanguageSettings();
            this.initializeThemeSettings();
        },

        changeBioAuth: function () {
            this.initializeBioAuthSettings(true);
        },

        loadCustomSettingsPopup: function (customSetting) {
            var settingsPopup = appConfig.customisation[customSetting];

            if (settingsPopup && settingsPopup.routePath) {
                var widgetName = settingsPopup.widgetName;
                var routeString = settingsPopup.routePath;
                var controllerString = 'controller:' + routeString;
                var route = this.container.lookup('route:application');

                var widgetController = ControllerFactory.createController(this.container, controllerString);
                widgetController.initializeWidget({wn: widgetName});
                widgetController.set('parentController', this);
                this.set('customSettingsPopup', true);

                route.render(routeString, {
                    into: 'price/widgets/mobile/settings',
                    outlet: 'customSettingsOutlet',
                    controller: widgetController
                });
            }
        }
    }
});