import Ember from 'ember';
import BaseModuleInitializer from '../../../models/shared/initializers/base-module-initializer';
import sharedDataModuleInitializer from '../../../models/shared/initializers/shared-data-module-initializer';
import priceRetailAuthenticator from '../../../controllers/authentication/price-retail-authenticator';
import priceSsoAuthenticator from '../../../controllers/authentication/price-sso-authenticator';
import PriceService from '../../../models/price/price-service';
import sharedService from '../../../models/shared/shared-service';
import profileService from '../../../models/shared/profile/profile-service';
import utils from '../../../utils/utils';
import priceSettings from '../../../config/price-settings';
import priceWidgetConfig from '../../../config/price-widget-config';
import extendedSettingsL1 from '../../../config/extended-settings-level-1';
import extendedSettingsL2 from '../../../config/extended-settings-level-2';
import priceConstants from '../../../models/price/price-constants';
import appConfig from '../../../config/app-config';
import authenticationConstants from '../../../controllers/authentication/authentication-constants';
import environment from 'universal-app/config/environment';
import formatterExtension from '../../../models/shared/formatter-extension';

export default BaseModuleInitializer.extend({
    preInitialize: function () {
        var service;
        Ember.appGlobal.priceUser = {};

        this._mergeConfigSettings();

        if (Ember.appGlobal.multiScreen && !Ember.appGlobal.multiScreen.isParentWindow) { // if Child window of DT multiple window scenario
            var parentWindow = window.opener;
            service = parentWindow.Ember.appGlobal.multiScreen.parentSharedService.getService('price');
        } else {
            service = this.createService();
        }

        this.set('priceService', service);
        sharedService.registerService(service.subscriptionKey, service);

        // Overwrite formatter.js functions
        formatterExtension.overwritePrototypes(service);

        service.createDataStores();

        this._loadConfigs();
        this._loadPriceUserSettings();
        this._setAuthParams();
        this._setConnectionSettings();
        this._loadPriceUser();
        this._populateExchangeMetadata();
        this._loadPriceUserData();
    },

    postInitialize: function () {
        this.priceService.announcementDS.loadCachedStore();
        this.priceService.exchangeDS.requestExchangeMetadata(sharedService.userSettings.price.currentExchange);
        this.priceService.subscribeAuthSuccess(sharedService.getService('analytics'), 'analytics');

        profileService.initialize();
    },

    createService: function () {
        return PriceService.create();
    },

    _mergeConfigSettings: function () {
        // Intermediate level settings
        utils.configHelper.mergeConfigSettings(priceSettings, extendedSettingsL1.priceSettings);
        utils.configHelper.mergeConfigSettings(priceWidgetConfig, extendedSettingsL1.priceWidgetConfig);
        // Customization level settings
        utils.configHelper.mergeConfigSettings(priceSettings, extendedSettingsL2.priceSettings);
        utils.configHelper.mergeConfigSettings(priceWidgetConfig, extendedSettingsL2.priceWidgetConfig);

        // Increased socket frame processing latency based on device
        if (appConfig.customisation.isTablet) {
            priceConstants.TimeIntervals.WebSocketInQueueProcessingInterval = 500;
        }
    },

    _loadPriceUser: function () {
        // Load data as fresh, if version not available in local storage
        this.priceService.userDS.load();
        var authVersionMeta = this.priceService.userDS.get('metaVersion');

        if (!utils.validators.isAvailable(authVersionMeta) || isNaN(authVersionMeta)) {
            authVersionMeta = 0;
        }

        this.priceService.userDS.set('metaVersion', authVersionMeta);

        if (appConfig.customisation.isEmbeddedMode) {
            this.priceService.userDS.set('username', Ember.appGlobal.queryParams.appParams[utils.Constants.EmbeddedModeParams.Username]);
            this.priceService.userDS.set('sessionId', Ember.appGlobal.queryParams.appParams[utils.Constants.EmbeddedModeParams.Session]);
        }
    },

    _populateExchangeMetadata: function () {
        this.priceService.exchangeDS.populateExchangeMetadata(sharedService.userSettings.currentLanguage);
    },

    _loadPriceUserData: function () {
        this.priceService.priceUserData.load();
    },

    _setAuthParams: function () {
        switch (appConfig.customisation.authenticationMode) {
            case authenticationConstants.AuthModes.PriceRetail:
                sharedDataModuleInitializer.authController = priceRetailAuthenticator;
                break;

            case authenticationConstants.AuthModes.PriceSso:
            case authenticationConstants.AuthModes.PriceSsoTradeSso:
                sharedDataModuleInitializer.authController = priceSsoAuthenticator;
                break;

            default:
                break;
        }
    },

    _setConnectionSettings: function () {
        var embeddedPort = Ember.appGlobal.queryParams.appParams[utils.Constants.EmbeddedModeParams.Port];
        var settings = environment.APP.isTestMode ? environment.APP.priceConnectionParameters.primary : priceSettings.connectionParameters.primary;

        var connectionSettings = {
            ip: settings.ip,
            port: embeddedPort ? embeddedPort : settings.port,
            secure: settings.secure,
            reconnectInterval: priceConstants.Pulse.ReconnectionTimeInterval,
            enablePulse: true
        };

        this.priceService.webSocketManager.setConnectionSettings(connectionSettings);
    },

    _loadConfigs: function () {
        this.priceService.set('settings', priceSettings);
        this.priceService.set('constants', priceConstants);
    },

    _loadPriceUserSettings: function () {
        var isSettingsChanged;

        if (sharedService.userSettings.price) {
            isSettingsChanged = utils.configHelper.mergeConfigSettings(sharedService.userSettings.price, priceSettings.configs, true);
        } else {
            Ember.set(sharedService.userSettings, 'price', priceSettings.configs);
            isSettingsChanged = true;
        }

        if (!utils.validators.isAvailable(sharedService.userSettings.get('price.currentExchange'))) {
            sharedService.userSettings.set('price.currentExchange', priceSettings.configs.defaultExchange);
            isSettingsChanged = true;
        }

        if (!utils.validators.isAvailable(sharedService.userSettings.get('price.currentIndex'))) {
            sharedService.userSettings.set('price.currentIndex', priceSettings.configs.defaultIndex);
            isSettingsChanged = true;
        }

        if (sharedService.userSettings.get('price.secondaryExchanges').length === 0) {
            sharedService.userSettings.set('price.secondaryExchanges', priceSettings.configs.secondaryExchanges);
            isSettingsChanged = true;
        }

        if (!utils.validators.isAvailable(sharedService.userSettings.get('price.userDefaultExg'))) {
            sharedService.userSettings.set('price.userDefaultExg', priceSettings.configs.defaultExchange);
            isSettingsChanged = true;
        }

        if (isSettingsChanged) {
            sharedService.userSettings.save();
        }

        if (!sharedService.userState.globalArgs.exg) {
            sharedService.userState.globalArgs.exg = sharedService.userSettings.price.currentExchange;
        }
    }
});
