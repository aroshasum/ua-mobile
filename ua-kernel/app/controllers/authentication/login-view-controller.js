/* global jQKeyboard */
import Ember from 'ember';
import sharedService from '../../models/shared/shared-service';
import languageDataStore from '../../models/shared/language/language-data-store';
import PriceConstants from '../../models/price/price-constants';
import utils from '../../utils/utils';
import appConfig from '../../config/app-config';
import sharedDataModuleInitializer from '../../models/shared/initializers/shared-data-module-initializer';
import environmentConfig from '../../config/environment';
import appEvents from '../../app-events';

export default function () {
    var that = this;
    var authType;
    var authController;
    var authFailCb;
    var authSuccessCb;
    var isDisableRegister;
    var isLoginCaptchaEnable = false;
    var uniqueCaptchaId;
    var controllerKey = 'loginViewController';

    var initialize = function () {
        Ember.$('#appName').text(appConfig.customisation.appName);

        if (!appConfig.customisation.isPoweredByEnabled) {
            Ember.$('#poweredByText').hide();
        }
    };

    var postInitialize = function (authTyp, authCtrl) {
        authType = authTyp;
        authController = authCtrl;
    };

    var showLoginCaptcha = function () {
        isLoginCaptchaEnable = true;
        _generateCaptchaImage(true);
    };

    var prepareLoginView = function (authSuccess, authFail, animateOnLoad) {
        authSuccessCb = authSuccess;
        authFailCb = authFail;

        _bindEvents();
        _setControlValues();
        _setDisplayTexts();

        setSelectedLanguageInLogin();

        if (appConfig.customisation.loginViewSettings.isPlayStoreDownloadLinks) {
            Ember.$('img#playStoreImg').attr('src', 'https://play.google.com/intl/en_us/badges/images/generic/en_badge_web_generic.png');
        }

        if (appConfig.customisation.loginViewSettings.isUsernameUpperCase) {
            Ember.$('#txtUsername').keyup(function () {
                setUpperCaseLetter();
            });
        }

        Ember.$('button#btnLogin').bind('click', function () {
            goToOtpLoginOrHome(authSuccess, authFail);
        });

        Ember.$('a#userRegisterLink').bind('click', function () {
            showUserRegistration();
        });

        Ember.$('a#registerLink').bind('click', function () {
            showRegistration();
        });

        Ember.$('a#delayedDataLink').bind('click', function () {
            goToDelayedDataHome(authSuccess, authFail);
        });

        Ember.$('a#contactUsLink').bind('click', function () {
            showContactUs();
        });

        Ember.$('a#takeATour').bind('click', function () {
            showTakeATour();
        });

        Ember.$('a#disclaimerLink').bind('click', function () {
            if (sharedService.userSettings.previousLoggedIn === utils.Constants.No) {
                sharedService.getService('sharedUI').set('isResetLoginStatus', true);
            }

            showAgreement();
        });

        Ember.$('a#privacyAndSecurityLink').bind('click', function () {
            if (sharedService.userSettings.previousLoggedIn === utils.Constants.No) {
                sharedService.getService('sharedUI').set('isResetLoginStatus', true);
            }

            showPrivacyAndSecurity();
        });

        Ember.$('a#lnkForgotPwd').bind('click', function () {
            showForgotPassword();
        });

        Ember.$('a#lnkProduct').bind('click', function () {
            showProduct();
        });

        Ember.$('a#lnkBoardOfDirectors').bind('click', function () {
            showBoardOfDirectors();
        });

        Ember.$('a#lnkContactUsPopup').bind('click', function () {
            showContactUsPopup();
        });

        Ember.$('a#linkTermsAndConditions').bind('click', function () {
            showTermsAndConditionsPopup();
        });

        Ember.$('a#lnkAboutUsPopup').bind('click', function () {
            showAboutUsPopup();
        });

        Ember.$('a#lnkOnlineAcc').bind('click', function () {
            showOnlineAccountConfirm();
        });

        Ember.$('a#touchIdLink').bind('click', function () {
            showBiometricRegistration();
        });

        Ember.$('a#touchLoginLink').bind('click', function () {
            invokeBiometricAuth();
        });

        Ember.$('a#brokerLink').bind('click', function () {
            showBrokerSelection();
        });

        Ember.$('a#loginHomeBtn').bind('click', function () {
            goToHome();
        });

        Ember.$('a#downStatementLink').bind('click', function () {
            showDownStatement();
        });

        Ember.$('a#customerDetailsLink').bind('click', function () {
            showCustomerDetails();
        });

        Ember.$('a#mutualFundsLink').bind('click', function () {
            showMutualFunds();
        });

        Ember.$('a#linkToRia').bind('click', function () {
            var riaLink = appConfig.customisation.riaLink;

            if (riaLink) {
                utils.browser.openWindow(riaLink);
            }
        });

        Ember.$('button#registerButton').bind('click', function () {
            showRegistration();
        });

        // Bind enter key to login
        bindEnterKeyLogin(authSuccess, authFail);
        _showLoginPage(animateOnLoad);
    };

    var invokeBiometricAuth = function () {
        var bioArgs = sharedService.userSettings.biometricAuthArgs;

        if (appConfig.customisation.showBiometricAuthSignup && bioArgs && !bioArgs.isUserDenied && bioArgs.username) {
            showBiometricAuth(authSuccessCb, authFailCb);
        } else {
            sharedService.getService('sharedUI').showLoginViewControls();
        }
    };

    var showBiometricRegistration = function () {
        var currentLangObj = languageDataStore.getLanguageObj().lang;

        if (currentLangObj && sharedService.userSettings.biometricAuthArgs.isUserDenied) {
            sharedService.userSettings.biometricAuthArgs.isUserDenied = false;
            sharedService.userSettings.save();
        }

        if (!isDisableRegister) {
            utils.messageService.showMessage(currentLangObj.messages.touchIdReRegister, utils.Constants.MessageTypes.Info);
            isDisableRegister = true;

            Ember.run.later(function () {
                isDisableRegister = false;
            }, 500);
        }
    };

    var setUpperCaseLetter = function () {
        var text = Ember.$('#txtUsername').val();
        Ember.$('#txtUsername').val(text.toUpperCase());
    };

    var showBrokerSelection = function () {
        var tradeUIService = sharedService.getService('tradeUI');

        if (tradeUIService) {
            tradeUIService.setBrokerageView();
        }
    };

    var showLoginView = function (loginMsg, animateOnLoad, isHideControls) {
        if (authType === 2) { // TODO: [Bashitha] Access authTypes enum from here
            Ember.$('[authType="retail"]').hide();
        }

        if (!loginMsg || !appConfig.customisation.isMobile) {
            _showLoginPage(animateOnLoad, authType, isHideControls);
        }

        if (loginMsg) {
            var loginMsgElem = Ember.$('div#loginMsg');
            loginMsgElem.html(loginMsg).show(); // Show request error message

            if (appConfig.customisation.isMobile) {
                loginMsgElem.removeClass('info-msg-background');
                loginMsgElem.css('background-color', '');
                loginMsgElem.addClass('error-msg-background');
            } else {
                loginMsgElem.css('background-color', '#e15848');
            }
        }

        _enableLoginControls();
    };

    var setDeviceError = function () {
        var currentLangObj = languageDataStore.getLanguageObj().lang;

        Ember.$('form#loginForm').hide();  // Hide login controllers
        Ember.$('div#deviceError').show();
        Ember.$('div#deviceErrorMsg').text(currentLangObj.messages.rootedDeviceError); // Set labels
    };

    var _showLoginPage = function (animateOnLoad, authenticationType, isHideControls) {
        Ember.$('div#divLogin').show(); // Show login page

        Ember.$('#txtUsername').hide();
        Ember.$('#txtPassword').hide();
        Ember.$('#loginButton').hide();
        Ember.$('#btnLogin').hide();
        Ember.$('#chkRemember').hide();
        Ember.$('#spanRemember').hide();
        Ember.$('#virtualKeyboard').hide();
        Ember.$('#registerDiv').hide();
        Ember.$('#register').hide();
        Ember.$('#forgotPwdDiv').hide();
        Ember.$('#userRegister').hide();
        Ember.$('#delayedData').hide();
        Ember.$('#contactUs').hide();
        Ember.$('#disclaimer').hide();
        Ember.$('#forgotPwd').hide();
        Ember.$('#mobileDownloadLinks').hide();
        Ember.$('#linkAppStore').hide();
        Ember.$('#linkPlayStore').hide();
        Ember.$('#proDownloadLink').hide();
        Ember.$('#quickLinksSection').hide();
        Ember.$('#onlineAcc').hide();
        Ember.$('#riaApplication').hide();
        Ember.$('#poweredByText').hide();
        Ember.$('#spanCopyright').hide();
        Ember.$('#termsAndConditions').hide();
        Ember.$('#help').hide();
        Ember.$('#divDownload').hide();
        Ember.$('#primaryLang').hide();
        Ember.$('#secondaryLang').hide();
        Ember.$('#loginCaptcha').hide();
        Ember.$('#corpSiteReportsLinks').hide();
        Ember.$('#corporateSite').hide();
        Ember.$('#reports').hide();
        Ember.$('div#deviceError').hide();

        if (appConfig.customisation.isMobile) {
            Ember.$('#lnkSignUp').hide();
            Ember.$('#poweredByText').hide();
            Ember.$('#forgotPasswordUrl').hide();
            Ember.$('#touchId').hide();
            Ember.$('#touchLogin').hide();
            Ember.$('#broker').hide();
            Ember.$('#remSubContainer').hide();
            Ember.$('#usernamePswd').hide();
            Ember.$('#appVersion').hide();
            Ember.$('#riaApplication').hide();
        }

        if (appConfig.customisation.isTablet) {
            Ember.$('span#spanBestView').hide();
            Ember.$('#touchId').hide();
            Ember.$('#touchLogin').hide();
        }

        if (!isHideControls) {
            if (!Ember.appGlobal.events.isDomReady && animateOnLoad) {
                Ember.$(window).load(function () {
                    _showLoginControls(authenticationType);
                });
            } else {
                _showLoginControls(authenticationType);
            }
        }
    };

    var _disableLoginControls = function () {
        Ember.$('div#divLogin').addClass('login-disable');

        Ember.run.later(function () {
            _enableLoginControls();
        }, PriceConstants.TimeIntervals.AuthenticationTimeout);
    };

    var _enableLoginControls = function () {
        Ember.$('div#divLogin').removeClass('login-disable');
    };

    var _showLoginControls = function (authenticationType) {
        if (authenticationType !== 2) {
            Ember.$('div#usernamePswd').addClass('credential-panel-down');
            Ember.$('#btnLogin').addClass('bottom-panel-down');
            Ember.$('div#linkPanel').addClass('link-panel-down');
            Ember.$('div#bottomPanel').addClass('bottom-panel-down');
            Ember.$('div#appVersion').addClass('bottom-panel-down');

            Ember.$('#txtUsername').show();
            Ember.$('#txtPassword').show();
            Ember.$('#loginButton').show();
            Ember.$('#btnLogin').show();
            Ember.$('#chkRemember').show();
            Ember.$('#spanRemember').show();
            Ember.$('#spanCopyright').show();
            Ember.$('#remSubContainer').show();
            Ember.$('#brandLogo').show();
            Ember.$('#appVersion').show();
            Ember.$('#usernamePswd').show();

            if (appConfig.customisation.isVirtualKeyboardEnable) {
                Ember.$('#virtualKeyboard').show();
            }

            if (appConfig.customisation.loginViewSettings.showTermsAndConditions) {
                Ember.$('#termsAndConditions').show();
            }

            if (sharedService.userSettings.biometricAuthArgs && sharedService.userSettings.biometricAuthArgs.isUserDenied) {
                Ember.$('#touchId').show();
            }

            var loginViewSettings = appConfig.customisation.loginViewSettings;

            if (loginViewSettings) {
                if (loginViewSettings.isSignUpEnabled) {
                    Ember.$('#lnkSignUp').show();
                }

                if (loginViewSettings.isPoweredByEnabled) {
                    Ember.$('#poweredByText').show();
                }

                if (loginViewSettings.isForgotPasswordEnabled) {
                    Ember.$('#forgotPwdDiv').show();
                    Ember.$('#registerDiv').show();
                    Ember.$('#forgotPwd').show();
                }

                if (loginViewSettings.isAppStoreDownloadLinks) {
                    Ember.$('#mobileDownloadLinks').show();
                    Ember.$('#linkAppStore').show();
                }

                if (loginViewSettings.isPlayStoreDownloadLinks) {
                    Ember.$('#mobileDownloadLinks').show();
                    Ember.$('#linkPlayStore').show();
                }

                if (loginViewSettings.isProDownloadLink) {
                    Ember.$('#proDownloadLink').show();
                }

                if (loginViewSettings.isQuickLinks) {
                    Ember.$('#quickLinksSection').show();
                }

                // Basic User Registartion
                if (loginViewSettings.isUserRegisterEnabled) {
                    Ember.$('#userRegister').show();
                }

                // OTP Registration
                if (loginViewSettings.isRegisterEnabled) {
                    Ember.$('#registerDiv').show();
                    Ember.$('#register').show();
                }

                if (loginViewSettings.isDelayedDataEnabled) {
                    Ember.$('#delayedData').show();
                }

                if (loginViewSettings.isContactUsEnabled) {
                    Ember.$('#contactUs').show();
                }

                if (loginViewSettings.isDisclaimerEnabled) {
                    Ember.$('#disclaimer').show();
                }

                if (loginViewSettings.isForgotPasswordEnabled) {
                    Ember.$('#forgotPasswordUrl').show();
                }

                if (loginViewSettings.isOnlineAccEnabled) {
                    Ember.$('#onlineAcc').show();
                }

                if (loginViewSettings.isRiaLinkEnabled) {
                    Ember.$('#riaApplication').show();
                }

                if (loginViewSettings.isHelpEnable) {
                    Ember.$('#help').show();
                }

                if (sharedService.userSettings.biometricAuthArgs && sharedService.userSettings.biometricAuthArgs.isUserDenied) {
                    Ember.$('#touchId').show();
                }

                if (appConfig.customisation.isBrokerageSelectionEnabled) {
                    Ember.$('#broker').show();
                }

                if (loginViewSettings.downloadURL) {
                    Ember.$('#divDownload').show();
                }

                if (loginViewSettings.isCorpSiteDownloadLink) {
                    Ember.$('#corpSiteReportsLinks').show();
                    Ember.$('#corporateSite').show();

                    if (loginViewSettings.isReportsDownloadLink) {
                        Ember.$('#corporateSite').addClass('pad-l-b');
                    }
                }

                if (loginViewSettings.isReportsDownloadLink) {
                    Ember.$('#corpSiteReportsLinks').show();
                    Ember.$('#reports').show();
                }
            }

            _toggleLanguageSelection();
        }
    };

    /* *
     * Show authentication failure message
     * @param reason Reason for authentication failure
     * @private
     */
    var showAuthFailMessage = function (reason, isHideControls) {
        Ember.$('div#ember-app-root').css('visibility', 'hidden'); // Hide ember application view
        Ember.$('div#mainIndexChart').hide(); // Hide main index chart container

        _setDisplayTexts();

        showLoginView(utils.formatters.convertUnicodeToNativeString(reason), false, isHideControls); // Show authentication failure reason

        utils.webStorage.addString(utils.webStorage.getKey(utils.Constants.CacheKeys.LoggedIn), utils.Constants.No, utils.Constants.StorageType.Session);
    };

    /* *
     * Show Price User Registration page
     */
    var showUserRegistration = function () {
        var controllerString = 'controller:price/widgets/user-registration/registration';
        var routeString = 'price/widgets/user-registration/registration';
        var popUpName = 'registrationPopUp';

        showFullScreenWidget(controllerString, routeString, popUpName);
    };

    /* *
     * Show Registration page
     */
    var showRegistration = function () {
        var registerExternalLink = appConfig.customisation.loginViewSettings.registerExternalLink;

        if (registerExternalLink) {
            var queryParams = {lang: sharedService.userSettings.currentLanguage};
            utils.browser.openWindow(registerExternalLink, queryParams);
        } else {
            var controllerString = 'controller:trade/widgets/registration-forgot-password/registration';
            var routeString = 'trade/widgets/registration-forgot-password/registration';
            var popUpName = 'registrationPopUp';

            showFullScreenWidget(controllerString, routeString, popUpName);
        }
    };

    /* *
     * Show Online Account Opening page
     */
    var showOnlineAccountConfirm = function () {
        var controllerString = 'controller:trade/widgets/online-account-opening';
        var routeString = 'trade/widgets/online-account-opening';
        var popUpName = 'onlineAccountPopUp';

        showFullScreenWidget(controllerString, routeString, popUpName);
    };

    /* *
     * Show Forgot Password page
     */
    var showForgotPassword = function () {
        var forgotPasswordExternalLink = appConfig.customisation.loginViewSettings.forgotPasswordExternalLink;

        if (forgotPasswordExternalLink) {
            var queryParams = {lang: sharedService.userSettings.currentLanguage};
            utils.browser.openWindow(utils.requestHelper.generateQueryString(forgotPasswordExternalLink, queryParams));
        } else {
            var controllerString = 'controller:trade/widgets/registration-forgot-password/forgot-password';
            var routeString = 'trade/widgets/registration-forgot-password/forgot-password';
            var popUpName = 'forgotPasswordPopUp';

            showFullScreenWidget(controllerString, routeString, popUpName, undefined, true);
        }
    };

    /* *
     * Redirect Brokerage Home page
     */
    var goToHome = function () {
        var homeExternalLink = appConfig.customisation.loginViewSettings.homeExternalLink;

        if (homeExternalLink) {
            utils.browser.openWindow(utils.requestHelper.generateQueryString(homeExternalLink));
        }
    };

    /* *
     * Redirect to DFN AMS
     */
    var showMutualFunds = function () {
        var mutualFundsLink = appConfig.customisation.loginViewSettings.mutualFundsLink;

        if (mutualFundsLink) {
            utils.browser.openWindow(utils.requestHelper.generateQueryString(mutualFundsLink));
        }
    };

    /* *
     * Show Downloadable Statements page
     */
    var showDownStatement = function () {
        var statementExternalLink = appConfig.customisation.loginViewSettings.statementExternalLink;

        if (statementExternalLink) {
            var queryParams = {lang: sharedService.userSettings.currentLanguage};
            utils.browser.openWindow(utils.requestHelper.generateQueryString(statementExternalLink, queryParams));
        }
    };

    /* *
     * Show Customer Details page
     */
    var showCustomerDetails = function () {
        var customerDetails = appConfig.customisation.loginViewSettings.customerDetails;

        if (customerDetails) {
            var queryParams = {lang: sharedService.userSettings.currentLanguage};
            utils.browser.openWindow(utils.requestHelper.generateQueryString(customerDetails, queryParams));
        }
    };

    /* *
     * Show Product page
     */
    var showProduct = function () {
        showLoginPopup(appConfig.customisation.loginViewSettings.productLink + sharedService.userSettings.currentLanguage.toLowerCase());
    };

    /* *
     * Show Board of Directors page
     */
    var showBoardOfDirectors = function () {
        showLoginPopup(appConfig.customisation.loginViewSettings.boardOfDirectors + sharedService.userSettings.currentLanguage.toLowerCase());
    };

    /* *
     * Show Contact Us page
     */
    var showContactUsPopup = function () {
        showLoginPopup(appConfig.customisation.loginViewSettings.contactUs + sharedService.userSettings.currentLanguage.toLowerCase());
    };

    /* *
    * Show Terms and condition popup
    */
    var showTermsAndConditionsPopup = function () {
        showTCPopup();
    };

    /* *
     * Show About Us page
     */
    var showAboutUsPopup = function () {
        showLoginPopup(appConfig.customisation.loginViewSettings.aboutUs + sharedService.userSettings.currentLanguage.toLowerCase());
    };

    /* *
    * Show Contact Us page
    */
    var showContactUs = function () {
        var linkUrl = sharedService.getService('price').settings.urlTypes.externalContactUsPage;
        var controllerString = 'controller:price/widgets/about-us';
        var routeString = 'price/widgets/about-us';
        var popUpName = 'contactUsPopUp';

        if (linkUrl) {
            window.open(linkUrl, '_blank');
        } else {
            showFullScreenWidget(controllerString, routeString, popUpName);
        }
    };

    /* *
     * Show Contact Us page
     */
    var showTakeATour = function () {
        var linkUrl = sharedService.getService('price').settings.urlTypes.takeATourUrl;

        if (linkUrl) {
            window.open(linkUrl, '_blank');
        }
    };

    /* *
   * Show Agreement page
   */
    var showAgreement = function () {
        var controllerString = 'controller:price/widgets/user-agreement';
        var routeString = 'price/widgets/user-agreement';
        var popUpName = 'agreementPopUp';

        showFullScreenWidget(controllerString, routeString, popUpName);
    };

    /* *
    * Show Privacy and Security page
    */
    var showPrivacyAndSecurity = function () {
        var controllerString = 'controller:price/widgets/privacy-and-security';
        var routeString = 'price/widgets/privacy-and-security';
        var popUpName = 'privacyAndSecurityPopUp';

        showFullScreenWidget(controllerString, routeString, popUpName);
    };

    /* *
     * Show OTP Login page
     */
    var showOtpLogin = function () {
        if (sharedService.userSettings.currentLoginStatus !== sharedDataModuleInitializer.loginStatus.loggedIn) {
            var tradeUIService = sharedService.getService('tradeUI');

            if (tradeUIService) {
                tradeUIService.loadOtpLogin();
                bindEnterKeyOtpLogin();
            }
        }

        // Timer to avoid showing the home page before OTP Login page loaded.
        Ember.run.later(function () {
            showHomePage();
        }, 1);
    };

    var showFullScreenWidget = function (controllerString, routeString, popUpName, link, isWidget, params) {
        var sharedUI = sharedService.getService('sharedUI');

        if (sharedService.userSettings.currentLoginStatus !== sharedDataModuleInitializer.loginStatus.loggedIn) {
            if (isWidget) {
                sharedUI.renderFullScreenWidget(controllerString, routeString, popUpName, function () {
                    hideRenderedPage();
                }, link, params);
            } else {
                sharedUI.renderFullScreenPopup(controllerString, routeString, popUpName, function () {
                    hideRenderedPage();
                }, link, params);
            }
        }

        // Timer to avoid showing the home page before popup page loaded.
        Ember.run.later(function () {
            showHomePage();
        }, 1);
    };

    var showLoginPopup = function (link) {
        var controllerString = 'controller:authentication/login-popup';
        var routeString = 'authentication/login-popup';
        var popUpName = 'loginPopUp';

        showFullScreenWidget(controllerString, routeString, popUpName, link);
    };

    var showTCPopup = function () {
        var controllerString = 'controller:trade/widgets/tc-agreement';
        var routeString = 'trade/widgets/tc-agreement';
        var popUpName = 'tc-agreement';

        showFullScreenWidget(controllerString, routeString, popUpName, undefined, true);
    };

    /* *
     * Hide Rendered page and show Login page
     */
    var hideRenderedPage = function () {
        _showLoginPage(false);

        Ember.$('div#ember-app-root').css('visibility', 'hidden'); // Hide ember application view

        var modal = sharedService.getService('sharedUI').getService('modalPopupId');

        modal.set('modalPopupStyle', '');
        modal.send('disableOverlay');
        modal.send('closeModalPopup');
    };

    /* *
     * Show home page
     * @private
     */
    var showHomePage = function () {
        sharedService.userSettings.previousLoggedIn = utils.Constants.Yes;
        sharedService.userSettings.save();

        utils.webStorage.addString(utils.webStorage.getKey(utils.Constants.CacheKeys.LoggedIn), utils.Constants.Yes, utils.Constants.StorageType.Session);
        utils.applicationSessionHandler.initializeApplicationIdleCheck();

        Ember.$('input#txtPassword').val(''); // Clear user typed password
        Ember.$('div#divLogin').hide(); // Hide login page

        Ember.$('div#ember-app-root').css('visibility', 'visible'); // Show ember application view
        Ember.$('div#mainIndexChart').show(); // Show main index chart container
    };

    var prepareLoginFailedView = function (username, password, authSuccess, authFail) {
        _closeOtpPopup();
        _bindEvents();
        _setDisplayTexts();
        setLastLoggedInUser(username, password);
        setSelectedLanguageInLogin();
        bindEnterKeyLogin(authSuccess, authFail);
    };

    /* *
     * Saves last logged-in user credentials
     * @param username username
     * @param password password
     * @private
     */
    var setLastLoggedInUser = function (username, password) {
        var isRemember = sharedService.userSettings.rememberMe === utils.Constants.Yes;
        Ember.$('input#chkRemember').prop('checked', isRemember);

        utils.logger.logTrace('setLastLoggedInUser - loaded remember me = ' + sharedService.userSettings.rememberMe);
        utils.logger.logTrace('setLastLoggedInUser - loaded username = ' + username);

        if (isRemember && utils.validators.isAvailable(username)) {
            var unmElem = Ember.$('input#txtUsername');
            utils.logger.logTrace('setLastLoggedInUser - username element length = ' + unmElem.length);

            unmElem.val(username);
            utils.logger.logTrace('setLastLoggedInUser - username set successfully');
        }

        utils.logger.logTrace('setLastLoggedInUser - remember password = ' + appConfig.loginConfig.isRememberPassword);

        var logPhrase = 'setLastLoggedInUser - loaded password = ';
        var passwordPhrase = utils.validators.isAvailable(password) ? 'password available' : 'password not available';

        utils.logger.logTrace(logPhrase + passwordPhrase);

        if (isRemember && appConfig.loginConfig.isRememberPassword && utils.validators.isAvailable(password)) {
            var pwdElem = Ember.$('input#txtPassword');
            utils.logger.logTrace('setLastLoggedInUser - password element length = ' + pwdElem.length);

            pwdElem.val(password);
            utils.logger.logTrace('setLastLoggedInUser - password set successfully');
        }
    };

    /* *
     * Set selected language in login page language selection controls
     * @private
     */
    var setSelectedLanguageInLogin = function () {
        if (appConfig.customisation.supportedLanguages.length > 1) {
            Ember.$('input[type="radio"][name="loginLang"]').val([sharedService.userSettings.currentLanguage]);
        } else {
            Ember.$('div#divLoginLang').hide(); // Hide login option
        }
    };

    /* *
     * Bind enter key to window
     * This enables the login at pressing enter key on any control
     * @private
     */
    var bindEnterKeyLogin = function (authSuccess, authFail) {
        Ember.$(window).unbind('keypress'); // Unbind key press events if bound previously

        Ember.$(window).bind('keypress', function (e) {
            if (e.which === utils.Constants.KeyCodes.Enter) { // Key code for 'Enter' key
                goToOtpLoginOrHome(authSuccess, authFail);
            }
        });
    };

    /* *
     * Bind enter key to window
     * This enables the otp login at pressing enter key on any control
     * @private
     */
    var bindEnterKeyOtpLogin = function () {
        Ember.$(window).unbind('keypress'); // Unbind key press events if bound previously

        Ember.$(window).bind('keypress', function (e) {
            if (e.which === utils.Constants.KeyCodes.Enter) { // Key code for 'Enter' key
                var indexOtpLoginPopup = sharedService.getService('sharedUI').getService('indexOtpLoginPopup');

                if (indexOtpLoginPopup) {
                    indexOtpLoginPopup.onOtpSubmit();
                }
            }
        });
    };

    /* *
     * Go to home page
     * @private
     */
    var goToOtpLoginOrHome = function (authSuccess, authFail, isTouchIdAuth) {
        if (_isSecuredDevice) {
            var username = Ember.$('input#txtUsername').val();
            var password = Ember.$('input#txtPassword').val();
            var loginMsgElem = Ember.$('div#loginMsg');

            var priceService = sharedService.getService('price');
            var currentLangObj = languageDataStore.getLanguageObj().lang;

            if (isTouchIdAuth) {
                var savedBiometricAuthArgs = sharedService.userSettings.get('biometricAuthArgs');

                if (savedBiometricAuthArgs && savedBiometricAuthArgs.username && savedBiometricAuthArgs.password) {
                    username = savedBiometricAuthArgs.username;
                    password = utils.crypto.decryptText(savedBiometricAuthArgs.password, utils.Constants.Encryption.TDesSecondaryKey, utils.Constants.Encryption.TDesSecondaryIv);
                }
            }

            if (!Ember.appGlobal.events.isLayoutReady) {
                appEvents.subscribeLayoutReady(controllerKey, that);

                loginMsgElem.css('background-color', '');
                loginMsgElem.html(currentLangObj.messages.authenticating).show();
                loginMsgElem.addClass('info-msg-background');
            } else if (utils.validators.isAvailable(username) && utils.validators.isAvailable(password)) {
                if (!isLoginCaptchaEnable) {
                    var loginMessage = '';

                    if (appConfig.customisation.loginViewSettings.showTermsAndConditions && !Ember.$('input#chkTermsAndConditions').is(':checked')) {
                        loginMsgElem.html(currentLangObj.messages.acceptTermsAndConditions).show();
                        loginMessage = currentLangObj.messages.acceptTermsAndConditions;
                    } else if (priceService.isPriceMetadataReady()) {
                        authController.authenticateUser(username, password, _isInitAllowed(username, password), authSuccess, authFail);

                        loginMsgElem.css('background-color', '');
                        loginMsgElem.html(currentLangObj.messages.authenticating).show();
                        loginMsgElem.removeClass('error-msg-background');
                        loginMsgElem.addClass('info-msg-background');

                        loginMessage = currentLangObj.messages.authenticating;
                        _disableLoginControls();
                    } else if (priceService.get('isDefaultMetaRequestFail')) {
                        loginMsgElem.html(currentLangObj.messages.metaFail).show();
                        loginMsgElem.addClass('error-msg-background');

                        loginMessage = currentLangObj.messages.metaFail;
                    } else {
                        that.authSuccessMetaReady = authSuccess;
                        that.authFailMetaReady = authFail;

                        priceService.subscribePriceMetaReady(that, controllerKey);

                        loginMsgElem.css('background-color', '');
                        loginMsgElem.html(currentLangObj.messages.retrievingMetadata).show();
                        loginMsgElem.addClass('info-msg-background');

                        loginMessage = currentLangObj.messages.retrievingMetadata;
                    }

                    utils.logger.logTrace('login-view-controller.goToOtpLoginOrHome() - ' + loginMessage);
                } else {
                    var captchaText = Ember.$('input#captchaText').val();

                    if (captchaText) {
                        _validateCaptchaText(captchaText);
                    } else {
                        loginMsgElem.removeClass('info-msg-background');
                        loginMsgElem.addClass('error-msg-background');
                        loginMsgElem.html(currentLangObj.messages.enterCaptcha).show();
                    }
                }
            } else {
                loginMsgElem.html(currentLangObj.messages.unmPwdNotEmpty).show();
            }

            loginMsgElem.show();
        }
    };

    /* *
     * Show Biometric Authentication
     * @private
     */
    var showBiometricAuth = function (authSuccess, authFail) {
        var currentLangObj = languageDataStore.getLanguageObj().lang;
        var deviceType = sharedService.getService('sharedUI').deviceType;
        var initialText = currentLangObj.messages[deviceType + 'IdScan'];
        var fallbackText = currentLangObj.messages.goToLogin;

        var touchAuthSuccess = function () {
            goToOtpLoginOrHome(authSuccess, authFail, true);
        };

        var touchAuthCancel = function () {
            Ember.$('div#divLogin').show();
            sharedService.getService('sharedUI').showLoginViewControls();
        };

        if (initialText) {
            if (window.plugins && window.plugins.touchid && Ember.$.isFunction(window.plugins.touchid.isAvailable)) {
                window.plugins.touchid.verifyFingerprintWithCustomPasswordFallbackAndEnterPasswordLabel(
                    initialText,
                    fallbackText,
                    touchAuthSuccess,
                    touchAuthCancel
                );
                // Ignore from JSHint and ESLint, as this is how it should be invoked for Android
                /*eslint-disable */
            } else if (FingerprintAuth && Ember.$.isFunction(FingerprintAuth.isAvailable)) {    // jshint ignore:line
                var encryptConfig = {clientId: appConfig.customisation.clientPrefix};
                FingerprintAuth.encrypt(encryptConfig, touchAuthSuccess, touchAuthCancel);    // jshint ignore:line
                /*eslint-enable */
            }

        }
    };

    /* *
    * Go user delayed user home page
    * @private
    */
    var goToDelayedDataHome = function (authSuccess, authFail) {
        var username = appConfig.customisation.delayedDataUserInfo.username;
        var password = appConfig.customisation.delayedDataUserInfo.password;
        var priceService = sharedService.getService('price');

        sharedService.getService('sharedUI').logInDelayedUser();
        Ember.$('div#mainPanelOutletContainer').addClass('delayed-widget-container-height');

        if (utils.validators.isAvailable(username) && utils.validators.isAvailable(password)) {
            if (priceService.isPriceMetadataReady()) {
                authController.authenticateUser(username, password, _isInitAllowed(username, password), authSuccess, authFail);
            } else {
                that.authSuccessMetaReady = authSuccess;
                that.authFailMetaReady = authFail;
                priceService.subscribePriceMetaReady(that, controllerKey);
            }
        }
    };

    this.onPriceMetaReady = function () {
        goToOtpLoginOrHome(authSuccessCb, authFailCb);
        sharedService.getService('price').unSubscribePriceMetaReady(controllerKey);
    };

    var onLayoutReady = function () {
        if (appConfig.customisation.isLoginIndexPanelEnabled) {
            requestIndexPanelData();
        }
    };

    /* *
     * Store user data in browser local storage
     * @param username Username
     * @param password Password
     * @private
     */
    var storeUserData = function (username, password) {
        var storingPwd = '';

        // Set user selected language
        var lang = Ember.$('input[type="radio"][name="loginLang"]:checked').val();
        if (lang) {
            sharedService.userSettings.set('currentLanguage', lang);
        }

        // Set remember me option
        var isRemember = Ember.$('input#chkRemember').is(':checked');
        var storingIsRemember = isRemember ? utils.Constants.Yes : utils.Constants.No;

        sharedService.userSettings.set('rememberMe', storingIsRemember);

        // Set username and password
        sharedService.userSettings.set('appToken', _getLoginToken(username)); // Dynamically injected to user settings
        sharedService.userSettings.set('verToken', _getLoginToken(password)); // Dynamically injected to user settings

        var storingUnm = isRemember ? username : '';
        sharedService.userSettings.set('username', storingUnm);

        if (isRemember && appConfig.loginConfig.isRememberPassword) {
            storingPwd = utils.crypto.encryptText(password, utils.Constants.Encryption.TDesSecondaryKey, utils.Constants.Encryption.TDesSecondaryIv);
        }

        sharedService.userSettings.set('password', storingPwd);
        sharedService.userSettings.save();

        utils.logger.logTrace('login-view-controller.storeUserData() - stored remember me = ' + storingIsRemember);
        utils.logger.logTrace('login-view-controller.storeUserData() - stored username = ' + storingUnm);

        var logPhrase = 'login-view-controller.storeUserData() - stored password = ';
        var passwordPhrase = utils.validators.isAvailable(storingPwd) ? 'password available' : 'password not available';

        utils.logger.logTrace(logPhrase + passwordPhrase);

        Ember.set(Ember.appGlobal.session, 'id', username);
        Ember.appGlobal.session.token = utils.crypto.generateHashedText(password);

        var bioArgs = sharedService.userSettings.biometricAuthArgs;
        var deviceType = sharedService.getService('sharedUI').deviceType;

        if (appConfig.customisation.showBiometricAuthSignup && deviceType && !(bioArgs && bioArgs.isUserDenied)) {
            sharedService.getService('sharedUI').storeBiometricAuth(username, password, bioArgs);
        }
    };

    /* *
     * request Index Panel Data
     */
    var requestIndexPanelData = function () {
        if (Ember.appGlobal.events.isLayoutReady) {
            sharedService.getService('price').addLoginIndexPanelRequest(loadIndexPanelData);
        } else {
            appEvents.subscribeLayoutReady(controllerKey, this);
        }
    };

    /* *
   * load Index Panel Data
   */
    var loadIndexPanelData = function (indexData) {
        var stockData = sharedService.getService('price').stockDS.getCommodity(indexData.exg, indexData.sym);
        var loginIndexContainer = Ember.$('div#loginIndexContainer');
        var loginIndexChangeContainer = Ember.$('div#loginIndexChangeContainer');
        var iconStyle = '';
        var pColor = '';
        var lastTradePrice = utils.formatters.formatNumber(stockData.ltd, 2);
        var chge = utils.formatters.formatNumber(stockData.chg, 2);
        var pChge = utils.formatters.formatNumberPercentage(stockData.pchg, 2);

        loginIndexContainer.children('#loginIndexSymbol').text(stockData.sym);
        loginIndexContainer.children('#loginIndexLTP').text(lastTradePrice);
        loginIndexChangeContainer.children('#loginIndexChange').text(chge);
        loginIndexChangeContainer.children('#loginIndexPChange').text('(' + pChge + ')');

        if (stockData.pchg > 0) {
            iconStyle = 'glyphicon-triangle-top  glyphicon up-fore-color';
            pColor = 'up-fore-color';
        } else {
            iconStyle = 'glyphicon-triangle-bottom  glyphicon down-fore-color';
            pColor = 'down-fore-color';
        }

        Ember.$('i#loginIndexIcon').addClass(iconStyle);
        loginIndexChangeContainer.addClass(pColor);
    };

    /* *
     * Checks whether application should be initialized for the given user before login
     * @param username User provided username
     * @param password User provided password
     * @returns {boolean} True if current credentials equals to stored credentials, false otherwise
     * @private
     */
    var _isInitAllowed = function (username, password) {
        var isInitAllowed = false;

        if (appConfig.customisation.smartLoginEnabled) {
            var storedUnmToken = sharedService.userSettings.appToken;
            var storedPwdToken = sharedService.userSettings.verToken;
            var isUserAvailable = utils.validators.isAvailable(storedUnmToken) && utils.validators.isAvailable(storedPwdToken);

            isInitAllowed = isUserAvailable && storedUnmToken === _getLoginToken(username) &&
                storedPwdToken === _getLoginToken(password) && utils.browser.isNetworkConnected();
        }

        return isInitAllowed;
    };

    /* *
     * Generate login token
     * @param loginValue Username or password
     * @returns {string} Token generated based on username or password
     * @private
     */
    var _getLoginToken = function (loginValue) {
        var loginToken = '';

        if (utils.validators.isAvailable(loginValue)) {
            var charCount = loginValue.length;
            var firstChar = loginValue.charAt(0);
            var lastChar = loginValue.charAt(charCount - 1);

            loginToken = utils.crypto.hashMd5([firstChar, lastChar, charCount].join(''));
        }

        return loginToken;
    };

    /* *
     * Set login control values
     * @private
     */
    var _setControlValues = function () {
        // Set language selection values
        if (appConfig.customisation.supportedLanguages.length >= 1) {
            Ember.$('input#priLangRadio').val(appConfig.customisation.supportedLanguages[0].code);
        }

        if (appConfig.customisation.supportedLanguages.length >= 2) {
            Ember.$('input#secLangRadio').val(appConfig.customisation.supportedLanguages[1].code);
        }
    };

    /* *
     * Change display texts on language change
     * @private
     */
    var _setDisplayTexts = function () {
        var currentLangObj = languageDataStore.getLanguageObj().lang;

        // Set button texts
        var loginText = currentLangObj.labels.login;
        loginText = appConfig.customisation.isMobile ? loginText.toUpperCase() : loginText;

        Ember.$('button#btnLogin').text(loginText);

        // Set placeholder texts
        Ember.$('input#txtUsername').attr('placeholder', currentLangObj.labels.username);
        Ember.$('input#txtPassword').attr('placeholder', currentLangObj.labels.password);
        Ember.$('input#captchaText').attr('placeholder', currentLangObj.labels.captchaText);

        // Login navigation
        Ember.$('a#loginHelpBtn').text(currentLangObj.labels.help);
        Ember.$('a#loginHomeBtn').text(currentLangObj.labels.home);
        Ember.$('a#downStatementLink').text(currentLangObj.labels.downloadableStatements);
        Ember.$('a#mutualFundsLink').text(currentLangObj.labels.mutualFund);
        Ember.$('a#customerDetailsLink').text(currentLangObj.labels.updateCustomerDetails);

        Ember.$('label#loginHelp').attr('tooltip', currentLangObj.messages.helpMessage);

        // Set labels
        Ember.$('span#spanRemember').text(currentLangObj.labels.rememberMe);
        Ember.$('span#spanNotMember').text(currentLangObj.labels.notMember);
        Ember.$('span#spanCannotLogin').text(currentLangObj.labels.cannotLogin);
        Ember.$('span#spanCallUs').text(currentLangObj.labels.callUs);
        Ember.$('span#spanVirtualKeyboard').text(currentLangObj.labels.virtualKeyboard);
        Ember.$('span#spanTermsAndConditions').text(currentLangObj.labels.termsAndConditions);
        Ember.$('span#termsAndConditions').text(currentLangObj.labels.termsAndConditionsKey);
        Ember.$('span#linkToRiaNote').text(currentLangObj.messages.linkToRiaNote);
        Ember.$('span#hotLinks').text(currentLangObj.labels.hotLinks);
        Ember.$('span#quickLinks').text(currentLangObj.labels.quickLinks);
        Ember.$('span#proDescription').text(currentLangObj.labels.proDescription);
        Ember.$('span#trdaeUsingPro').text(currentLangObj.labels.trdaeUsingPro);
        Ember.$('span#downloadMobileApps').text(currentLangObj.labels.downloadMobileApps);
        Ember.$('span#mobileAppsDescription').text(currentLangObj.labels.mobileAppsDescription);

        Ember.$('p#welcomeHeader').text(currentLangObj.labels.welcome);
        Ember.$('p#welcomeText').text(currentLangObj.labels.welcomeContent);

        // Set titles
        Ember.$('#loginTitle').text(currentLangObj.labels.login);

        // Set link texts
        Ember.$('a#lnkSignUp').text(currentLangObj.labels.signUp);
        Ember.$('a#lnkForgotPwd').text(currentLangObj.labels.forgotPwd);
        Ember.$('a#lnkProduct').text(currentLangObj.labels.product);
        Ember.$('a#lnkAboutUsPopup').text(currentLangObj.labels.aboutUs);
        Ember.$('a#lnkCorporateGovernance').text(currentLangObj.labels.corporateGovernance);
        Ember.$('a#lnkBoardOfDirectors').text(currentLangObj.labels.boardOfDirectors);
        Ember.$('a#lnkContactUsPopup').text(currentLangObj.labels.contactUs);
        Ember.$('a#captchaChange').text(currentLangObj.labels.changeCaptcha);

        Ember.$('a#userRegisterLink').text(currentLangObj.labels.register);
        Ember.$('a#registerLink').text(currentLangObj.labels.register);
        Ember.$('a#lnkOnlineAcc').text(currentLangObj.labels.openOnlineAccount);
        Ember.$('a#linkRegister').text(currentLangObj.labels.createFreeAccount);
        Ember.$('span#delayedPrices').text('(' + currentLangObj.labels.delayedPrices + ')');
        Ember.$('a#lnkHelp').text(currentLangObj.labels.help);
        Ember.$('a#delayedDataLink').text(currentLangObj.labels.delayedData);
        Ember.$('a#contactUsLink').text(currentLangObj.labels.contactUs);
        Ember.$('a#disclaimerLink').text(currentLangObj.labels.disclaimer);
        Ember.$('a#privacyAndSecurityLink').text(currentLangObj.labels.privacyAndSecurity);
        Ember.$('a#touchIdLink').text(currentLangObj.labels.touchIdLoginEnable);
        Ember.$('a#touchLoginLink').text(currentLangObj.labels.touchIdLogin);
        Ember.$('a#brokerLink').text(currentLangObj.labels.changeBroker);
        Ember.$('a#lnkDownload').text(currentLangObj.labels.downloadPro);
        Ember.$('a#lnkPro').text(currentLangObj.labels.downloadPro);
        Ember.$('a#lnkKSE').text(currentLangObj.labels.countryExchange);
        Ember.$('a#lnkCMALicense').text(currentLangObj.labels.cmaLicense);
        Ember.$('a#lnkCustomerComplaints').text(currentLangObj.labels.customerComplaints);
        Ember.$('a#lnkAwarenessGuidance').text(currentLangObj.labels.awarenessGuidance);
        Ember.$('a#linkToRia').text(currentLangObj.messages.linkToRia);
        Ember.$('#quickLinks').text(currentLangObj.labels.quickLinks);
        Ember.$('a#brokerName').text(currentLangObj.labels.brokerageName);
        Ember.$('a#takeATour').text(currentLangObj.labels.takeATour);
        Ember.$('a#linkTermsAndConditions').text(currentLangObj.labels.termsAndConditionsKey);
        Ember.$('a#lnkCorporateSite').text(currentLangObj.labels.corporateWebsite);
        Ember.$('a#lnkReports').text(currentLangObj.labels.reports);
        Ember.$('div#deviceErrorMsg').text(currentLangObj.messages.rootedDeviceError);

        Ember.$('button#registerButton').text(currentLangObj.labels.register);

        // Set copyright
        var copyrightText = currentLangObj.labels.copyright.replace('[CurrentYear]', new Date().getFullYear());
        Ember.$('span#spanCopyright').text(copyrightText);

        // For Clickable Brokerages
        Ember.$('span#copyrightYear').text(new Date().getFullYear() + ' \u00a9');
        Ember.$('a#copyrightBrokerName').text(currentLangObj.labels.brokerageName);
        Ember.$('span#allRightsReserved').text(currentLangObj.labels.allRightsReserved);

        // Set appVersion
        if (appConfig.customisation.isMobile) {
            Ember.$('#appVersion').text(appConfig.appVersion);
            Ember.$('span#primaryLang').text(appConfig.customisation.supportedLanguages[0].desc);

            if (appConfig.customisation.supportedLanguages.length > 1) {
                Ember.$('span#secondaryLang').text(appConfig.customisation.supportedLanguages[1].desc);
            }
        }

        // Set best view
        Ember.$('span#spanBestView').text(currentLangObj.labels.bestViewResolution);

        // Set language selection values
        if (appConfig.customisation.supportedLanguages.length > 1) {
            Ember.$('span#changeLangSpan').text(currentLangObj.labels.changeLang);
            Ember.$('span#priLangSpan').text(appConfig.customisation.supportedLanguages[0].desc);
            Ember.$('span#secLangSpan').text(appConfig.customisation.supportedLanguages[1].desc);
        }
    };

    var _bindEvents = function () {
        var virtualKeypadEnabler = Ember.$('input[type="checkbox"][name="virtualKeyboard"]');

        Ember.$('input[type="radio"][name="loginLang"]').bind('change', function () {
            Ember.$('div#loginMsg').html('').hide();

            languageDataStore.changeLanguage(this.value);
            _setDisplayTexts();
            _toggleLanguageSelection();
        });

        virtualKeypadEnabler.bind('change', function () {
            if (Ember.$(this).is(':checked')) {
                _showVirtualKeyPad();
            } else {
                jQKeyboard.removeKeypad();
            }
        });

        Ember.$('a#linkRegister').bind('click', function () {
            window.open(appConfig.subscriptionConfig.registrationPath + sharedService.userSettings.currentLanguage.toLowerCase(), '_blank');
        });

        Ember.$('#txtPassword').bind('click', function () {
            if (appConfig.customisation.isVirtualKeyboardEnable) {
                if (virtualKeypadEnabler.is(':checked')) {
                    _showVirtualKeyPad();
                } else {
                    jQKeyboard.removeKeypad();
                }
            }
        });

        Ember.$('#primaryLang').bind('click', function () {
            Ember.$('div#loginMsg').html('').hide();

            languageDataStore.changeLanguage(appConfig.customisation.supportedLanguages[0].code);
            Ember.$('#primaryLang').hide();
            Ember.$('#secondaryLang').show();
            _setDisplayTexts();
        });

        Ember.$('#secondaryLang').bind('click', function () {
            Ember.$('div#loginMsg').html('').hide();

            var languageCode = appConfig.customisation.supportedLanguages.length > 1 ? appConfig.customisation.supportedLanguages[1].code : '';

            if (languageCode) {
                languageDataStore.changeLanguage(appConfig.customisation.supportedLanguages[1].code);
                Ember.$('#secondaryLang').hide();
                Ember.$('#primaryLang').show();
                _setDisplayTexts();
            }
        });

        Ember.$('a#lnkDownload').bind('click', function () {
            var linkUrl = sharedService.getService('trade').settings.urlTypes.downloadURL + sharedService.userSettings.currentLanguage.toLowerCase();
            utils.browser.openWindow(linkUrl);
        });

        Ember.$('a#lnkPro').bind('click', function () {
            var linkUrl = sharedService.getService('trade').settings.urlTypes.downloadPro;
            utils.browser.openWindow(linkUrl);
        });

        Ember.$('a#linkAppStore').bind('click', function () {
            var linkUrl = sharedService.getService('trade').settings.urlTypes.downloadFromAppStore;
            utils.browser.openWindow(linkUrl);
        });

        Ember.$('a#linkPlayStore').bind('click', function () {
            var linkUrl = sharedService.getService('trade').settings.urlTypes.downloadFromPlayStore;
            utils.browser.openWindow(linkUrl);
        });

        Ember.$('a#lnkKSE').bind('click', function () {
            var linkUrl = sharedService.getService('trade').settings.urlTypes.kseLink;
            utils.browser.openWindow(linkUrl);
        });

        Ember.$('a#lnkCMALicense').bind('click', function () {
            var linkUrl = sharedService.getService('trade').settings.urlTypes.cmaLicenseLink + sharedService.userSettings.currentLanguage.toLowerCase();
            utils.browser.openWindow(linkUrl);
        });

        Ember.$('a#lnkCorporateGovernance').bind('click', function () {
            var linkUrl = sharedService.getService('trade').settings.urlTypes.coperateGovernance + sharedService.userSettings.currentLanguage.toLowerCase();
            utils.browser.openWindow(linkUrl);
        });

        Ember.$('a#lnkCustomerComplaints').bind('click', function () {
            var linkUrl = sharedService.getService('trade').settings.urlTypes.customerComplaints + sharedService.userSettings.currentLanguage.toLowerCase();
            utils.browser.openWindow(linkUrl);
        });

        Ember.$('a#lnkAwarenessGuidance').bind('click', function () {
            var linkUrl = sharedService.getService('trade').settings.urlTypes.awarenessGuidance + sharedService.userSettings.currentLanguage.toLowerCase();
            utils.browser.openWindow(linkUrl);
        });

        Ember.$('a#lnkCorporateSite').bind('click', function () {
            var linkUrl = sharedService.getService('trade').settings.urlTypes.linkCorporateSite;
            utils.browser.openWindow(linkUrl);
        });

        Ember.$('a#lnkReports').bind('click', function () {
            var linkUrl = sharedService.getService('trade').settings.urlTypes.linkReports;
            utils.browser.openWindow(linkUrl);
        });

        Ember.$('#spanTermsAndConditions').bind('click', function () {
            utils.browser.openWindow(appConfig.customisation.loginViewSettings.termsAndConditionURL);
        });

        Ember.$('a#brokerName').bind('click', function () {
            var linkUrl = sharedService.getService('price').settings.urlTypes.brokerLink;
            utils.browser.openWindow(linkUrl);
        });

        Ember.$('a#brokerageLogo').bind('click', function () {
            var linkUrl = sharedService.getService('price').settings.urlTypes.brokerLink;
            utils.browser.openWindow(linkUrl);
        });

        Ember.$('a#copyrightBrokerName').bind('click', function () {
            var linkUrl = sharedService.getService('price').settings.urlTypes.brokerLink;
            utils.browser.openWindow(linkUrl);
        });

        Ember.$('#helpLbl').bind('click', function () {
            if (Ember.appGlobal.selectedBrokerage) {
                utils.browser.openWindow(Ember.appGlobal.selectedBrokerage.helpGuide);
            } else {
                window.open(appConfig.customisation.loginViewSettings.helpURL, '_blank');
            }
        });

        Ember.$('#logElementShow').bind('click', function () {
            _showApplicationLog();
        });

        Ember.$('#logElementHide').bind('click', function () {
            _hideApplicationLog();
        });

        Ember.$('#captchaChange').bind('click', function () {
            _generateCaptchaImage();
        });
    };

    var _toggleLanguageSelection = function () {
        if (appConfig.customisation.supportedLanguages.length > 1) {
            if (sharedService.userSettings.currentLanguage === appConfig.customisation.supportedLanguages[0].code) {
                Ember.$('#primaryLang').hide();
                Ember.$('#secondaryLang').show();
            } else {
                Ember.$('#secondaryLang').hide();
                Ember.$('#primaryLang').show();
            }
        } else {
            Ember.$('#primaryLang').hide();
            Ember.$('#secondaryLang').hide();
        }
    };

    var _showVirtualKeyPad = function () {
        var targtElm = Ember.$('#txtPassword');
        var input = targtElm.get(0);

        jQKeyboard.activateKeypad(targtElm);

        var element = Ember.$('#jQKeyboardContainer');
        var checkBoxElement = Ember.$('span#spanVirtualKeyboard');
        var checkBoxTopVal = checkBoxElement.get(0).offsetTop;
        var vKeyboardTopVal = checkBoxTopVal + 25;

        element.get('0').style.top = vKeyboardTopVal + 'px';
        input.focus();
    };

    /* *
     * Close modal popup if loaded on session expired
     * @private
     */
    var _closeOtpPopup = function () {
        var modal = sharedService.getService('sharedUI').getService('modalPopupId');

        if (modal) {
            modal.set('modalPopupStyle', '');
            modal.send('disableOverlay');
            modal.send('closeModalPopup');
        }
    };

    var _getApplicationLog = function () {
        var priceService = sharedService.getService('price');
        var tradeService = sharedService.getService('trade');

        var debugInfo = {
            dateTime: new Date(),
            appVer: environmentConfig.APP.version,
            appUrl: window.location.href,
            tradeUrl: tradeService.webSocketManager.getSocketConnection('oms').getConnectionPath(),
            priceUrl: priceService.webSocketManager.getSocketConnection('qs').getConnectionPath(),
            tUser: tradeService.userDS.get('usrId'),
            tAlias: tradeService.userDS.get('lgnAls'),
            mubNo: tradeService.userDS.get('mubNo'),
            cusName: tradeService.userDS.get('cusNme'),
            pToken: tradeService.userDS.get('prcUsr'),
            pUser: priceService.userDS.get('username'),
            tAuthReq: Ember.appGlobal.logger.tradeAuthRequest,
            tAuthResp: Ember.appGlobal.logger.tradeAuthResponse,
            pAuthReq: Ember.appGlobal.logger.priceAuthRequest,
            pAuthResp: Ember.appGlobal.logger.priceAuthResponse,
            defExg: priceService.userDS.get('userExchg').join(','),
            delExg: priceService.userDS.get('delayedExchg').join(','),
            nonDefExg: priceService.userDS.get('nonDefExg').join(','),
            allExg: priceService.userDS.get('allExg').join(','),
            preUser: Ember.appGlobal.logger.preAuthPriceUser,
            postUser: Ember.appGlobal.logger.postAuthPriceUser
        };

        var debugTrace = utils.jsonHelper.convertToJson(debugInfo);
        debugTrace = appConfig.loggerConfig.isEncryptDebugLog ? utils.crypto.encryptText(debugTrace) : debugTrace;

        var debugStack = utils.jsonHelper.convertToJson(Ember.appGlobal.logger.stackTrace);
        debugStack = appConfig.loggerConfig.isEncryptDebugLog ? utils.crypto.encryptText(debugStack) : debugStack;

        return debugTrace + '\n\n\n' + debugStack;
    };

    var _showApplicationLog = function () {
        var logTextArea = Ember.$('#logTextArea');

        logTextArea.show();
        logTextArea.val(_getApplicationLog());
        logTextArea.select();
    };

    var _hideApplicationLog = function () {
        var logTextArea = Ember.$('#logTextArea');

        logTextArea.hide();
        logTextArea.val('');
    };

    var _onCaptchaImageResponse = function (img) {
        Ember.$('img#captchaImage').attr('src', 'data:image/png;base64,' + img);
    };

    var _generateCaptchaImage = function (showMsg, isFail) {
        Ember.$('#loginCaptcha').show();

        var loginMsgElem = Ember.$('div#loginMsg');
        var currentTime = new Date().getTime();
        var currentLangObj = languageDataStore.getLanguageObj().lang;
        uniqueCaptchaId = 'captcha-' + currentTime;

        loginMsgElem.css('background-color', '');

        if (showMsg) {
            if (isFail) {
                loginMsgElem.html(currentLangObj.messages.invalidCaptcha).show();
                loginMsgElem.removeClass('info-msg-background');
                loginMsgElem.addClass('error-msg-background');
            } else {
                loginMsgElem.html(currentLangObj.messages.captchaRequired).show();
                loginMsgElem.removeClass('error-msg-background');
                loginMsgElem.addClass('info-msg-background');
            }
        }

        sharedService.getService('trade').sendCaptchaImageRequest({
            unqReqId: uniqueCaptchaId
        }, function (img) {
            _onCaptchaImageResponse(img);
        });
    };

    var _validateCaptchaText = function (captchaText) {
        if (captchaText) {
            sharedService.getService('trade').sendCaptchaValidationRequest({
                unqReqId: uniqueCaptchaId,
                captcha: captchaText
            }, function (sts) {
                _onCaptchaTextResponse(sts);
            });
        }
    };

    var _onCaptchaTextResponse = function (sts) {
        if (sts === 1) {
            isLoginCaptchaEnable = false;

            Ember.$('#loginCaptcha').hide();
            goToOtpLoginOrHome(authSuccessCb, authFailCb);
        } else {
            _generateCaptchaImage(true, true);
        }
    };

    var _isSecuredDevice = function () {
        return !appConfig.customisation.isBlockedRootedDevice || !Ember.isSecuredDevice;
    };

    return {
        initialize: initialize,
        prepareLoginView: prepareLoginView,
        showLoginView: showLoginView,
        showHomePage: showHomePage,
        showAuthFailMessage: showAuthFailMessage,
        prepareLoginFailedView: prepareLoginFailedView,
        setLastLoggedInUser: setLastLoggedInUser,
        setSelectedLanguageInLogin: setSelectedLanguageInLogin,
        storeUserData: storeUserData,
        showOtpLogin: showOtpLogin,
        invokeBiometricAuth: invokeBiometricAuth,
        requestIndexPanelData: requestIndexPanelData,
        loadIndexPanelData: loadIndexPanelData,
        showAgreement: showAgreement,
        showPrivacyAndSecurity: showPrivacyAndSecurity,
        onLayoutReady: onLayoutReady,
        postInitialize: postInitialize,
        showLoginCaptcha: showLoginCaptcha,
        showFullScreenWidget: showFullScreenWidget,
        setDeviceError: setDeviceError,
        showTakeATour: showTakeATour
    };
}
