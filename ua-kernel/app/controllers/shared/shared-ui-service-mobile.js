import Ember from 'ember';
import sharedService from '../../models/shared/shared-service';
import ControllerFactory from '../../controllers/controller-factory';
import languageDataStore from '../../models/shared/language/language-data-store';
import SharedUIService from './shared-ui-service';
import utils from '../../utils/utils';
import appConfig from '../../config/app-config';

export default SharedUIService.extend({
    isChildViewEnabled: false,
    deviceType: '',

    getTitleBar: function () {
        return this.getService('tickerPanel');
    },

    setChildViewEnable: function (isEnabled) {
        this.set('isChildViewEnabled', isEnabled);
    },

    invokeChangePassword: function (uiContainer) {
        if (uiContainer) {
            var widgetController = ControllerFactory.createController(this.container, 'component:password-change');
            var viewName = 'components/password-change';
            var app = languageDataStore.getLanguageObj();

            widgetController.set('isBackDisabled', true);
            widgetController.send('showModalPopup', false);

            sharedService.getService('priceUI').showChildView(viewName, widgetController, app.lang.labels.changePassword, 'change-password-mobile');
        }
    },

    initializeTouchId: function () {
        var that = this;

        if (window.plugins && window.plugins.touchid && Ember.$.isFunction(window.plugins.touchid.isAvailable)) {
            window.plugins.touchid.isAvailable(
                function (type) {
                    that.touchIdAvailableSuccess(type);
                }
            );
            // Ignore from JSHint and ESLint, as this is how it should be invoked for Android
            /*eslint-disable */
        } else if (FingerprintAuth &&  Ember.$.isFunction(FingerprintAuth.isAvailable)) {    // jshint ignore:line
            FingerprintAuth.isAvailable(    // jshint ignore:line
                /*eslint-enable */
                function (result) {
                    if (result.isAvailable) {
                        var deviceType = 'touch';
                        that.touchIdAvailableSuccess(deviceType);
                    }
                }
            );
        }
    },

    touchIdAvailableSuccess: function (deviceType) {
        var isRestrictedDeviceType = appConfig.customisation.restrictedBiometric && appConfig.customisation.restrictedBiometric.indexOf(deviceType) > -1;

        if (!isRestrictedDeviceType) {
            this.set('deviceType', deviceType);
            this.invokeBiometricAuth();
        }
    },

    invokeBiometricAuth: function () {
        var manuallyLoggedOut = utils.webStorage.getString(utils.webStorage.getKey(utils.Constants.CacheKeys.ManuallyLoggedOut), utils.Constants.StorageType.Session);

        if (manuallyLoggedOut !== utils.Constants.Yes) {
            this.loginViewController.invokeBiometricAuth();
        } else {
            var bioArgs = sharedService.userSettings.biometricAuthArgs;

            if (bioArgs && !bioArgs.isUserDenied && bioArgs.username) {
                Ember.$('#touchLogin').show();
            }

            utils.webStorage.addString(utils.webStorage.getKey(utils.Constants.CacheKeys.ManuallyLoggedOut), utils.Constants.No, utils.Constants.StorageType.Session);
        }
    },

    storeBiometricAuth: function (username, password, bioArgs) {
        var app = languageDataStore.getLanguageObj();

        if (app) {
            if (!bioArgs || !bioArgs.username) {
                this.registerBiometricAuth(username, password);     // This function need to be executed after condition check and before 'signUpBiometricAuth'
                this.signUpBiometricAuth();
            } else if (bioArgs.username !== username) {
                this.signUpBiometricAuth(username, password);
            } else {    // This is required in case of change password
                this.registerBiometricAuth(username, password);
            }
        }
    },

    signUpBiometricAuth: function (username, password) {
        var that = this;
        var deviceType = this.get('deviceType');
        var isSignUpWithCredentials = username && password;
        var app = languageDataStore.getLanguageObj();

        if (app) {
            var registerKey = isSignUpWithCredentials ? 'touchIdUserOverride' : (deviceType + 'IdRegister');
            var registerText = app.lang.messages[registerKey];
            var fallbackText = app.lang.messages.registerLater;

            if (registerText) {
                var touchAuthSuccess = function () {
                    utils.messageService.showMessage(app.lang.messages.touchIdSuccess, utils.Constants.MessageTypes.Info);

                    if (isSignUpWithCredentials) {
                        that.registerBiometricAuth(username, password);
                    }
                };

                var touchAuthCancel = function () {
                    utils.messageService.showMessage(app.lang.messages.signUpFail, utils.Constants.MessageTypes.Info);

                    if (!isSignUpWithCredentials) {
                        that.clearBiometricAuth();
                    }
                };

                if (window.plugins && window.plugins.touchid && Ember.$.isFunction(window.plugins.touchid.isAvailable)) {
                    window.plugins.touchid.verifyFingerprintWithCustomPasswordFallbackAndEnterPasswordLabel(
                        registerText,
                        fallbackText,
                        touchAuthSuccess,
                        touchAuthCancel
                    );
                    // Ignore from JSHint and ESLint, as this is how it should be invoked for Android
                    /*eslint-disable */
                } else if (FingerprintAuth &&  Ember.$.isFunction(FingerprintAuth.isAvailable)) {    // jshint ignore:line
                    var encryptConfig = {clientId: appConfig.customisation.clientPrefix};
                    FingerprintAuth.encrypt(encryptConfig, touchAuthSuccess, touchAuthCancel);    // jshint ignore:line
                    /*eslint-enable */
                }
            }
        }
    },

    registerBiometricAuth: function (username, password) {
        var savedSettings = sharedService.userSettings.biometricAuthArgs;

        if (!savedSettings) {
            savedSettings = {};
        }

        savedSettings.username = username;
        savedSettings.password = utils.crypto.encryptText(password, utils.Constants.Encryption.TDesSecondaryKey, utils.Constants.Encryption.TDesSecondaryIv);

        sharedService.userSettings.biometricAuthArgs = savedSettings;
        sharedService.userSettings.save();
    },

    clearBiometricAuth: function () {
        sharedService.userSettings.biometricAuthArgs = {isUserDenied: true};
        sharedService.userSettings.save();
    },

    resetUserDetails: function () {
        var username = sharedService.userSettings.username;
        var storedPwd = sharedService.userSettings.password;
        var password = utils.crypto.decryptText(storedPwd, utils.Constants.Encryption.TDesSecondaryKey, utils.Constants.Encryption.TDesSecondaryIv);

        this.loginViewController.setLastLoggedInUser(username, password);
    },

    showLoginViewControls: function () {
        this.loginViewController.showLoginView();
    }
});