import Ember from 'ember';
import BaseModuleInitializer from '../../../models/shared/initializers/base-module-initializer';
import sharedDataModuleInitializer from '../../../models/shared/initializers/shared-data-module-initializer';
import languageInitializer from '../../../controllers/shared/initializers/language-initializer';
import themeInitializer from '../../../controllers/shared/initializers/theme-initializer';
import LoginViewController from '../../../controllers/authentication/login-view-controller';
import sharedService from '../../../models/shared/shared-service';
import utils from '../../../utils/utils';
import appConfig from '../../../config/app-config';
import LanguageDataStore from '../../../models/shared/language/language-data-store';
import SharedUIService from '../shared-ui-service';
import appEvents from '../../../app-events';

export default BaseModuleInitializer.extend({
    loginViewController: undefined,

    preInitialize: function () {
        var that = this;
        var service = this.createService();

        this.set('sharedUIService', service);

        sharedService.registerService(service.subscriptionKey, service);
        appEvents.subscribeLayoutReady(service.subscriptionKey, service);

        // appEvents.subscribeEvent(utils.Constants.EventTypes.OnLayoutReady, service.subscriptionKey, service);

        this.loginViewController = new LoginViewController();
        sharedService.getService('sharedUI').set('loginViewController', this.loginViewController);

        languageInitializer.prepareLanguageView();
        this.loginViewController.initialize();

        themeInitializer.prepareThemeView(function () {
            that._showLoginView();
        });

        // Show landing page in retail authentication mode only to prevent delay in loading landing page
        // In sso mode authenticator instance from dependent initializers is not set at this point
        if (sharedDataModuleInitializer.authType === sharedDataModuleInitializer.authTypes.retail) {
            this._showLandingPage();
        }
    },

    postInitialize: function () {
        this.loginViewController.postInitialize(sharedDataModuleInitializer.authType, sharedDataModuleInitializer.authController);

        // Show landing page in sso authentication mode only to prevent not setting authenticator instance from dependent initializers
        if (sharedDataModuleInitializer.authType === sharedDataModuleInitializer.authTypes.sso) {
            this._showLandingPage();
        }
    },

    createService: function () {
        return new SharedUIService();
    },

    _showLoginView: function () {
        var that = this;

        if (sharedDataModuleInitializer.authType === sharedDataModuleInitializer.authTypes.retail) {
            this.loginViewController.prepareLoginView(function (_username, _password, allowInit) {
                that._retailAuthSuccess(_username, _password, allowInit);
            }, function (reason, _username, _password) {
                that._retailAuthFail(reason, _username, _password);
            }, false);
        } else {
            sharedDataModuleInitializer.authController.authenticateUser(appConfig.ssoToken, function () {
                that._ssoAuthSuccess();
            }, function (reason) {
                that._ssoAuthFail(reason);
            });
        }
    },

    _showLandingPage: function () {
        if (sharedDataModuleInitializer.authType === sharedDataModuleInitializer.authTypes.retail) {
            this._showRetailLandingPage();
        } else {
            this._showSsoLandingPage();
        }
    },

    _showRetailLandingPage: function () {
        var that = this;
        var password = '';
        var username = sharedService.userSettings.username;
        var storedPwd = sharedService.userSettings.password;
        var isRemember = sharedService.userSettings.rememberMe === utils.Constants.Yes;

        if (isRemember && utils.validators.isAvailable(storedPwd)) {
            password = utils.crypto.decryptText(storedPwd, utils.Constants.Encryption.TDesSecondaryKey, utils.Constants.Encryption.TDesSecondaryIv);
        }

        var isUserAvailable = utils.validators.isAvailable(username) && utils.validators.isAvailable(password);

        if (isUserAvailable && sharedService.userSettings.currentLoginStatus === sharedDataModuleInitializer.loginStatus.loggedIn) {
            sharedDataModuleInitializer.authController.authenticateUser(username, password, true, function (_username, _password, allowInit) {
                that._retailAuthSuccess(_username, _password, allowInit);
            }, function (reason, _username, _password) {
                that._retailAuthFail(reason, _username, _password);
            });
        } else {  // TODO [Arosha} change this temporary bypass of language and theme selections
            this.loginViewController.setLastLoggedInUser(username, password);
            this._prepareLoginView(true);
        }
    },

    _prepareIndexLoginPanel: function () {
        if (appConfig.customisation.isLoginIndexPanelEnabled) {
            this.loginViewController.requestIndexPanelData();
        }
    },

    _prepareLoginView: function (animateOnLoad) {
        var that = this;
        this._showAuthFailMessage();

        this.loginViewController.prepareLoginView(function (_username, _password, allowInit) {
            that._retailAuthSuccess(_username, _password, allowInit);
        }, function (reason, _username, _password) {
            that._retailAuthFail(reason, _username, _password);
        }, animateOnLoad);

        this._prepareIndexLoginPanel();
    },

    _showAuthFailMessage: function () {
        var loginMsgKey = utils.webStorage.getKey(utils.Constants.CacheKeys.LoginErrorMsg);
        var authFailReason = utils.webStorage.getString(loginMsgKey, utils.Constants.StorageType.Session);

        if (sharedDataModuleInitializer.authType === sharedDataModuleInitializer.authTypes.sso) {
            authFailReason = utils.validators.isAvailable(authFailReason) ? authFailReason : LanguageDataStore.getLanguageObj().lang.messages.loggedOut;
        }

        if (utils.validators.isAvailable(authFailReason)) {
            utils.webStorage.remove(loginMsgKey, utils.Constants.StorageType.Session);
            this.loginViewController.showLoginView(utils.formatters.convertUnicodeToNativeString(authFailReason), true); // Show authentication failure reason
        }
    },

    _showSsoLandingPage: function () {
        var that = this;
        var ssoToken = appConfig.ssoToken;

        if (utils.validators.isAvailable(ssoToken)) {
            if (sharedService.userSettings.currentLoginStatus === sharedDataModuleInitializer.loginStatus.loggedIn ||
                sharedService.userSettings.currentLoginStatus === sharedDataModuleInitializer.loginStatus.prevLoggedIn) {
                sharedDataModuleInitializer.authController.authenticateUser(ssoToken, function () {
                    that._ssoAuthSuccess();
                }, function (reason) {
                    that._ssoAuthFail(reason);
                });
            } else {
                if (appConfig.customisation.supportedLanguages.length > 1) {
                    languageInitializer.showLanguageView();
                } else {
                    themeInitializer.showThemeView();
                }
            }
        } else {
            this.loginViewController.showLoginView(LanguageDataStore && LanguageDataStore.getLanguageObj() ? LanguageDataStore.getLanguageObj().lang.messages.loggedOut : 'You Have Been Logged Out.', true); // TODO: [Bashitha] Move to language file with proper message
        }
    },

    _retailAuthSuccess: function (username, password, allowInit) {
        if (allowInit) {

            if (!sharedService.getService('sharedUI').isDelayedUserLogged) {
                this.loginViewController.storeUserData(username, password);
            }

            var tradeService = sharedService.getService('trade');

            if (tradeService && tradeService.userDS && tradeService.userDS.authSts === tradeService.constants.AuthStatus.OtpEnabled) {
                this.loginViewController.showOtpLogin();
            } else {
                if (appConfig.customisation.isUserAgreementEnabled && sharedService.userSettings.previousLoggedIn === utils.Constants.No) {
                    this.loginViewController.showAgreement();
                } else {
                    this.loginViewController.showHomePage();
                }

                Ember.$(window).unbind('keypress'); // Unbind enter key pressing event from window
            }

            this._postAuthSuccess();
        }
    },

    _retailAuthFail: function (reason, username, password) {
        var that = this;

        this.loginViewController.showAuthFailMessage(reason);

        this.loginViewController.prepareLoginFailedView(username, password, function (_username, _password, allowInit) {
            that._retailAuthSuccess(_username, _password, allowInit);
        }, function (_reason, _username, _password) {
            that._retailAuthFail(_reason, _username, _password);
        });
    },

    _ssoAuthSuccess: function () {
        this.loginViewController.showHomePage();
        this._postAuthSuccess();
    },

    _ssoAuthFail: function (reason) {
        this.loginViewController.showAuthFailMessage(reason);
    },

    _postAuthSuccess: function () {
        var that = this;

        Ember.run.next(function () {
            try {
                that.sharedUIService.getService('mainPanel').cacheMenu();
            } catch (e) {
                utils.logger.logError(e);
            }
        });
    }
});