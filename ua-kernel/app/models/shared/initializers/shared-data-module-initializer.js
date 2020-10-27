import Ember from 'ember';
import BaseModuleInitializer from '../../../models/shared/initializers/base-module-initializer';
import languageLoader from '../../../models/shared/initializers/language-loader';
import sharedService from '../../../models/shared/shared-service';
import utils from '../../../utils/utils';
import appConfig from '../../../config/app-config';
import userSettings from '../../../config/user-settings';
import extendedSettingsL1 from '../../../config/extended-settings-level-1';
import extendedSettingsL2 from '../../../config/extended-settings-level-2';
import profileService from '../profile/profile-service';
import environmentConfig from '../../../config/environment';
import languageDataStore from '../../../models/shared/language/language-data-store';
import themeDataStore from '../../../models/shared/data-stores/theme-data-store';
import authenticationConstants from '../../../controllers/authentication/authentication-constants';

export default BaseModuleInitializer.extend({
    authType: undefined,
    authController: undefined,

    // TODO: [Bashitha] Temporary added to fix language change issue in Pro10+ embedded mode
    isLangChanged: false,
    newLanguage: '',

    loginStatus: {
        notLoggedIn: 1,
        prevLoggedIn: 2,
        loggedIn: 3
    },

    authTypes: {
        retail: 1,
        sso: 2
    },

    preInitialize: function (application) {
        languageLoader.loadLanguageData();

        // Intermediate level settings
        utils.configHelper.mergeConfigSettings(appConfig, extendedSettingsL1.appConfig);
        utils.configHelper.mergeConfigSettings(userSettings, extendedSettingsL1.userSettings);
        // Customization level settings
        utils.configHelper.mergeConfigSettings(appConfig, extendedSettingsL2.appConfig);
        utils.configHelper.mergeConfigSettings(userSettings, extendedSettingsL2.userSettings);

        // Mobile browsers not reset 'LoggedIn' status when reloading. (This is added to prevent OTP login window missing when reloading)
        utils.webStorage.addString(utils.webStorage.getKey(utils.Constants.CacheKeys.LoggedIn), '0', utils.Constants.StorageType.Session);

        this._setVersion();
        this._registerUtils(application);
        this._registerAnalyticsService();
        this._getQueryParameters();
        this._loadUserSettings();
        this._loadUserState();
        this._setAuthParams();

        profileService.loadProfileMeta();
    },

    postInitialize: function () {
        if (this.isLangChanged) {
            languageDataStore.changeLanguage(this.newLanguage.toUpperCase());
        }

        this._loadCurrentLoginStatus();
    },

    _setVersion: function () {
        var appVersion = environmentConfig.APP.version; // Long version set in package.json compatible with CMMi, ex: DFNUA<PRODUCT>_<CLIENT>_<EXG>_1.000.008.0
        appVersion = appVersion.split('+')[0];

        appConfig.appVersion = appVersion;
        appConfig.longVersion = appVersion;

        if (appVersion.indexOf('_') > -1) {
            var numericVersion = appVersion.substr(appVersion.lastIndexOf('_') + 1); // Extracted only the numeric part of the version
            appConfig.appVersion = numericVersion;

            if (numericVersion.indexOf('.') > -1) {
                appConfig.appVersion = numericVersion.substr(0, numericVersion.lastIndexOf('.')); // Remove build number from the version
            }
        }
    },

    _registerUtils: function (application) {
        try {
            application.register('utility:main', utils, {instantiate: false});
            application.inject('controller', 'utils', 'utility:main');
        } catch (e) {
            utils.logger.logError('Error in injecting  utilities : ' + e);
        }
    },

    _registerAnalyticsService: function () {
        sharedService.registerService('analytics', utils.analyticsService);
    },

    _getQueryParameters: function () {
        var that = this;

        Ember.appGlobal.queryParams = utils.requestHelper.getQueryParameters(window.location.href);
        Ember.appGlobal.queryParams.appParams = {};
        Ember.appGlobal.queryParams.widgetParams = {};

        Ember.$.each(Ember.appGlobal.queryParams, function (prop, value) {
            switch (prop) {
                case 'sso':
                    that._setSSOType(value);
                    break;

                case utils.Constants.EmbeddedModeParams.AppData:
                    that._processEmbeddedParameters(value);
                    break;

                case utils.Constants.EmbeddedModeParams.WidgetData:
                    if (utils.validators.isAvailable(value)) {
                        var widgetParams = utils.jsonHelper.convertFromJson(value);
                        Ember.appGlobal.queryParams.widgetParams = widgetParams ? widgetParams : {};
                    }

                    break;

                case 'lang':
                    that._changeLanguage(value);
                    break;

                case utils.Constants.EmbeddedModeParams.ChildWindowId:
                    if (utils.validators.isAvailable(value) && Ember.appGlobal.multiScreen) {
                        Ember.appGlobal.multiScreen.isParentWindow = false;
                    }

                    break;

                default:
                    break;
            }
        });
    },

    _setSSOType: function (ssoToken) {
        var secondAuthMode = appConfig.customisation.secondAuthenticationMode;
        appConfig.ssoToken = ssoToken;

        if (utils.validators.isAvailable(secondAuthMode)) {
            appConfig.customisation.authenticationMode = secondAuthMode;
        }
    },

    _loadUserSettings: function () {
        sharedService.userSettings.load();
        var isSettingsChanged = utils.configHelper.mergeConfigSettings(sharedService.userSettings, userSettings, true);

        if (!utils.validators.isAvailable(sharedService.userSettings.get('currentLanguage'))) {
            sharedService.userSettings.set('currentLanguage', userSettings.customisation.defaultLanguage);
            isSettingsChanged = true;
        }

        if (!sharedService.userSettings.get('favoriteExgs')) {
            sharedService.userSettings.set('favoriteExgs', {});
            isSettingsChanged = true;
        }

        if (isSettingsChanged) {
            sharedService.userSettings.save();
        }
    },

    _loadUserState: function () {
        sharedService.userState.load();
        sharedService.userState.defaultWS = sharedService.userState.defaultWS || {};
        sharedService.userState.globalWidgetConfig = sharedService.userState.globalWidgetConfig || {};
    },

    _loadCurrentLoginStatus: function () {
        var status = this.loginStatus.notLoggedIn;
        var loggedIn = utils.webStorage.getString(utils.webStorage.getKey(utils.Constants.CacheKeys.LoggedIn), utils.Constants.StorageType.Session);

        if (loggedIn === utils.Constants.Yes) {
            status = this.loginStatus.loggedIn;
        } else if (sharedService.userSettings.previousLoggedIn === utils.Constants.Yes) {
            status = this.loginStatus.prevLoggedIn;
        }

        sharedService.userSettings.set('currentLoginStatus', status);
        sharedService.userSettings.save();
    },

    _changeLanguage: function (language) {
        if (utils.validators.isAvailable(language)) {
            var currentLang = sharedService.userSettings.get('currentLanguage');

            if (language.toUpperCase() !== currentLang.toUpperCase()) {
                // TODO: [Bashitha] Temporary added to fix language change issue in Pro10+ embedded mode
                this.isLangChanged = true;
                this.newLanguage = language;
            }
        }
    },

    _changeTheme: function (theme) {
        if (utils.validators.isAvailable(theme)) {
            var currentTheme = sharedService.userSettings.get('currentTheme');

            if (theme !== currentTheme) {
                themeDataStore.changeTheme(theme.toLowerCase());
            }
        }
    },

    _processEmbeddedParameters: function (parameters) {
        var that = this;

        if (utils.validators.isAvailable(parameters)) {
            var appParams = utils.jsonHelper.convertFromJson(parameters);
            Ember.appGlobal.queryParams.appParams = appParams ? appParams : {};

            Ember.$.each(Ember.appGlobal.queryParams.appParams, function (prop, value) {
                switch (prop) {
                    case utils.Constants.EmbeddedModeParams.Language:
                        that._changeLanguage(value);
                        break;

                    case utils.Constants.EmbeddedModeParams.Theme:
                        that._changeTheme(value);
                        break;

                    default:
                        break;
                }
            });
        }
    },

    _setAuthParams: function () {
        switch (appConfig.customisation.authenticationMode) {
            case authenticationConstants.AuthModes.PriceRetail:
            case authenticationConstants.AuthModes.TradeRetailPriceSso:
                this.authType = this.authTypes.retail;
                Ember.appGlobal.authType = this.authTypes.retail;
                break;

            case authenticationConstants.AuthModes.PriceSso:
            case authenticationConstants.AuthModes.PriceSsoTradeSso:
            case authenticationConstants.AuthModes.TradeSsoPriceSso:
                this.authType = this.authTypes.sso;
                Ember.appGlobal.authType = this.authTypes.sso;
                break;

            default:
                break;
        }
    }
}).create();
