import Ember from 'ember';
import BaseWidgetContainer from '../base-widget-container';
import LanguageDataStore from '../../models/shared/language/language-data-store';
import ThemeDataStore from '../../models/shared/data-stores/theme-data-store';
import MessageViewer from '../../components/message-viewer';
import SettingsDropdown from '../../components/settings-dropdown';
import messageService from '../../utils/message-service';
import utils from '../../utils/utils';
import appConfig from '../../config/app-config';
import sharedService from '../../models/shared/shared-service';
import responsiveHandler from '../../helpers/responsive-handler';

export default BaseWidgetContainer.extend({
    // Subscription key
    containerKey: 'titleBar',
    layoutName: 'layout/title-bar',
    userSettings: null,
    appGlobal: undefined,
    msgArray: Ember.A(),
    gaKey: 'title-bar',
    toLang: LanguageDataStore.getChangeLanguageObj(),
    appVersion: appConfig.appVersion,
    isHideUsername: appConfig.customisation.isHideUsername,

    settings: [],
    supportedLanguages: LanguageDataStore.getUserLanguages(),
    supportedThemes: ThemeDataStore.getUserThemes(),
    isLanguageOptionAvailable: false,

    // This is used by global search component
    searchKey: '',

    tradeService: {},
    isTradingEnabled: false,
    priceService: {},
    app: LanguageDataStore.getLanguageObj(),

    defaultComp: undefined,
    currentComp: undefined,
    currentOutlet: undefined,
    cssStyleOne: '',
    cssStyleTwo: '',
    cssStyleDefault: '',
    newMessage: Ember.A(),
    messageArray: {},
    isNewMessageAvailable: true,
    messageOuterContainerCss: '',

    // Tablet configs
    isTablet: appConfig.customisation.isTablet,
    isSearchEnable: true,
    isChangeWidth: false,
    isLastLoginTimeEnable: true,
    isExpireSoon: false,

    titleConstants: {
        outletOne: 'titleBarOutletOne',
        outletTwo: 'titleBarOutletTwo',
        outletDefault: 'titleBarOutletDefault',

        cssConstants: {
            lowerDivCss: 'div-down notification-shadow',
            upperDivCss: 'div-up notification-shadow',
            hideCss: 'display-none',
            fadeOut: 'hide',
            fadeIn: 'show'
        }
    },

    isShowUpgrade: function () {
        return utils.validators.isAvailable(appConfig.subscriptionConfig.upgradeSubscriptionPath) && this.priceService.userDS.isDelayedExchangesAvailable();
    }.property('priceService.userDS.delayedExchg.length'),

    isDelayedExchangesAvailable: function () {
        return this.priceService.userDS.isDelayedExchangesAvailable();
    }.property('priceService.userDS.delayedExchg.length'),

    isShowRenewal: function () {
        this._updateSubscriptionExpiry();
        return utils.validators.isAvailable(appConfig.subscriptionConfig.renewSubscriptionPath) && this.priceService.userDS.isRealtimeExchangesAvailable() && this.priceService.userDS.willExpireRecently();
    }.property('priceService.userDS.expiryDate', 'priceService.userDS.delayedExchg.length', 'priceService.userDS.userExchg.length'),

    init: function () {
        this._super();
        this.priceService = sharedService.getService('price');

        var isTradingEnabled = appConfig.customisation.isTradingEnabled;
        this.set('isTradingEnabled', isTradingEnabled);

        if (isTradingEnabled) {
            var cusName = sharedService.userSettings.trade.fieldConfigs['cusName' + sharedService.userSettings.currentLanguage];

            // TODO: [satheeq] Verify and remove trade service access from title bar.
            this.set('tradeService', sharedService.getService('trade'));

            if (cusName) {
                this.addObserver('tradeService.userDS.' + cusName, this.setUsername);
            } else {
                this.addObserver('tradeService.userDS.cusNme', this.setUsername);
            }
        } else {
            this._updateSubscriptionExpiry();
        }

        this.set('userSettings', sharedService.userSettings);
        this.set('appGlobal', Ember.appGlobal);

        messageService.set('titleBar', this);      // Title bar shows messages

        this.initializeSettings();
        this.setTabletConfigs();

        // TODO [AROSHA] Move this Scroll enable method to global.
        Ember.run.later(function () {
            Ember.$('.nano').nanoScroller();
        }, 1000);
    },

    onAfterRender: function () {
        this.initializeResponsive();
    },

    fullScreenToggleTitle: function () {
        return this.setFullScreenToggleTitle();
    }.property(),

    setFullScreenToggleTitle: function () {
        if (this.utils.fullScreenHelper.isInFullScreen()) {
            this.set('fullScreenToggleTitle', this.get('app').lang.labels.exitFullScreen);
        } else {
            this.set('fullScreenToggleTitle', this.get('app').lang.labels.fullScreen);
        }
    },

    initializeResponsive: function () {
        this.set('responsive', responsiveHandler.create({controller: this, widgetId: 'appTitle', callback: this.onResponsive, enabledElementResize: true}));

        this.responsive.addList('title-middle', [
            {id: 'title-search', width: 490},
            {id: 'title-username', width: 490}
        ]);

        this.responsive.initialize();
    },

    onResponsive: function () {
        // Will callback here when responsive event changed
        // ToDo Create base component class and add this into it
    },

    setTabletConfigs: function () {
        this.set('showWidgetButtons', !appConfig.customisation.isTablet);
    },

    setDefaultComponent: function (templateName, comp) {
        var defaultComp = {templateName: templateName, comp: comp};
        var currentOutlet = this.get('titleConstants.outletDefault');
        var route = this.container.lookup('route:application');
        var containerPath = appConfig.customisation.isMobile ? 'layout/mobile/ticker-panel' : this.get('layoutName');

        this.set('defaultComp', defaultComp);

        route.render(templateName, {
            into: containerPath,
            outlet: currentOutlet,
            controller: comp
        });
    },

    renderNotificationTemplate: function (templateName, comp, isDefault, timeout, containerCss, isQueueDisabled) {
        var that = this;
        var isMobile = appConfig.customisation.isMobile;
        var currentOutlet;

        if (!isDefault) {
            var currentComp = this.get('currentComp');
            var newMessage = this.get('newMessage');

            if (!isQueueDisabled && currentComp && currentComp.templateName) {
                newMessage.pushObject({templateName: templateName, comp: comp});
                this.set('isNewMessageAvailable', true);

            } else {
                this.set('currentComp', {templateName: templateName, comp: comp});
                this.set('newMessage', []);
            }
        }

        comp.set('showMessage', true); // avoid confliction on child view back

        // This should move to single message viewer but should get full background
        if (comp && comp.type === utils.Constants.MessageTypes.Error) {
            comp.set('backgroundCss', isMobile ? 'down-back-color' : '');
            this.set('messageOuterContainerCss', isMobile ? '' : 'down-back-color title-panel-def');
        } else if (comp && comp.type === utils.Constants.MessageTypes.Info) {
            comp.set('backgroundCss', isMobile ? 'highlight-back-color-1' : '');
            this.set('messageOuterContainerCss', isMobile ? '' : 'highlight-back-color-2 title-panel-def');
        } else if (comp && comp.type === utils.Constants.MessageTypes.Success) {
            comp.set('backgroundCss', isMobile ? 'up-back-color' : '');
            this.set('messageOuterContainerCss', isMobile ? '' : 'up-back-color title-panel-def');
        } else {
            this.set('messageOuterContainerCss', containerCss ? containerCss : '');
        }

        if (isDefault) {
            currentOutlet = this.get('titleConstants.outletDefault');
        } else {
            this.setCurrentOutlet();
            currentOutlet = this.get('currentOutlet');
            this.set('messageOuterContainerCss', this.get('messageOuterContainerCss') + ' ticker-panel-message');

            Ember.run.later(function () {
                var queuedMsgArray = that.get('newMessage');
                var queuedMsg = queuedMsgArray[queuedMsgArray.length - 1];

                if (that.get('isNewMessageAvailable') && queuedMsg && queuedMsg.templateName) {
                    that.set('currentComp', {});
                    that.renderNotificationTemplate(queuedMsg.templateName, queuedMsg.comp);
                }
            }, 5000);
        }

        var route = this.container.lookup('route:application');
        var containerPath = isMobile ? 'layout/mobile/ticker-panel' : this.get('layoutName');

        route.render(templateName, {
            into: containerPath,
            outlet: currentOutlet,
            controller: comp
        });

        // TODO: [satheeqh] Refactor other hideNotification usages with timeout
        if (timeout && timeout > 0) {
            Ember.run.later(that, function () {
                that.hideNotificationTemplate(templateName);
                comp.set('showMessage', false);
            }, timeout);
        }
    },

    hideNotificationTemplate: function (templateName) {
        var that = this;
        that.set('messageOuterContainerCss', '');
        var currentComp = this.get('currentComp');

        if (currentComp && templateName === currentComp.templateName) {
            var defaultComp = this.get('defaultComp');
            var currentOutlet = this.get('currentOutlet');
            var animationTimeout = 400;

            if (defaultComp) {
                this.set('cssStyleOne', this.get('titleConstants.cssConstants.upperDivCss'));
                this.set('cssStyleTwo', this.get('titleConstants.cssConstants.upperDivCss'));
            } else {
                var route = this.container.lookup('route:application');
                var containerPath = appConfig.customisation.isMobile ? 'layout/mobile/ticker-panel' : 'layout/title-bar';

                route.disconnectOutlet({
                    parentView: containerPath,
                    outlet: currentOutlet
                });

                that.set('currentOutlet', undefined);
            }

            this.set('currentComp', undefined);

            // Hide closing component after Animation
            Ember.run.later(function () {
                that.set('cssStyleDefault', that.get('titleConstants.cssConstants.fadeIn'));
                that.set('cssStyleOne', that.get('titleConstants.cssConstants.hideCss'));
                that.set('cssStyleTwo', that.get('titleConstants.cssConstants.hideCss'));
            }, animationTimeout);
        }
    },

    setCurrentOutlet: function () {
        var outletOne = this.get('titleConstants.outletOne');
        var outletTwo = this.get('titleConstants.outletTwo');
        var currentOutlet = this.get('currentOutlet');

        if (currentOutlet) {
            switch (currentOutlet) {
                case outletOne:
                    this.set('currentOutlet', outletTwo);
                    this.set('cssStyleOne', this.get('titleConstants.cssConstants.upperDivCss'));
                    this.set('cssStyleTwo', this.get('titleConstants.cssConstants.lowerDivCss'));
                    break;

                case outletTwo:
                    this.set('currentOutlet', outletOne);
                    this.set('cssStyleOne', this.get('titleConstants.cssConstants.lowerDivCss'));
                    this.set('cssStyleTwo', this.get('titleConstants.cssConstants.upperDivCss'));
                    break;
            }

        } else {
            this.set('currentOutlet', this.get('titleConstants.outletTwo'));
            this.set('cssStyleOne', this.get('titleConstants.cssConstants.upperDivCss'));
            this.set('cssStyleTwo', this.get('titleConstants.cssConstants.lowerDivCss'));
        }

        this.set('cssStyleDefault', this.get('titleConstants.cssConstants.fadeOut'));
    },

    initializeSettings: function () {
        var that = this;
        var isActive;
        var app = this.get('app');

        if (appConfig.customisation.supportedLanguages.length > 1) {
            Ember.$.each(this.get('supportedLanguages'), function (index, item) {
                isActive = (item.code === sharedService.userSettings.currentLanguage);
                that.get('settings').pushObject({code: 'lang:' + item.code, des: item.desc, active: isActive});
            });

            // This object seperates theme and language lists.
            that.get('settings').pushObject({code: '', des: '', active: false});
            this.set('isLanguageOptionAvailable', true);
        }

        Ember.$.each(this.get('supportedThemes'), function (index, item) {
            isActive = (item.code === sharedService.userSettings.currentTheme);
            that.get('settings').pushObject({code: 'theme:' + item.code, des: app.lang.labels[item.langKey], active: isActive});
        });

        if (appConfig.customisation.isPasswordChangeEnable) {
            that.get('settings').pushObject({code: 'password:', des: app.lang.labels.changePassword, active: false});
        }

        if (appConfig.customisation.isTickerSettingsEnabled) {
            that.get('settings').pushObject({code: 'ticker:', des: app.lang.labels.tickerSettings, active: false});
        }

        if (utils.validators.isAvailable(appConfig.helpGuidePath)) {
            that.get('settings').pushObject({code: 'help:', des: app.lang.labels.help, active: false});
        }

        if (utils.validators.isAvailable(appConfig.subscriptionConfig.renewSubscriptionPath) && that.priceService.userDS.isRealtimeExchangesAvailable()) {
            that.get('settings').pushObject({code: 'renew:', des: app.lang.labels.renewSubscription, active: false});
        }

        if (appConfig.customisation.isAboutUsEnabled) {
            that.get('settings').pushObject({code: 'about:', des: app.lang.labels.aboutUs, active: false});
        }

        if (appConfig.customisation.isCacheClearEnabled) {
            that.get('settings').pushObject({code: 'clearCache:', des: app.lang.labels.clearCache, active: false});
        }

        if (appConfig.loggerConfig.isAppLogEnabled) {
            that.get('settings').pushObject({code: 'viewLog:', des: app.lang.labels.viewLog, active: false});
        }

        if (appConfig.customisation.isUserProfileEnabled) {
            that.get('settings').pushObject({code: 'userProfile:', des: app.lang.labels.userProfile, active: false});
        }

        if (appConfig.customisation.isSessionCustomize) {
            this.get('settings').pushObject({code: 'changeSessionTime:', des: app.lang.labels.changeSessionTime, active: false});
        }
    },

    showMessage: function (messageTag, messageType) {
        var langMessage = '';
        var msgArray = this.get('msgArray');

        if (messageTag) {
            langMessage = LanguageDataStore.getLanguageObj().lang.messages[messageTag];
        }

        if (msgArray.length > 0) {      // Only one msg is shown for now. modify this when extended service.
            msgArray.removeAt(0);
        }

        var messageClass = messageType ? messageType === this.utils.Constants.MessageTypes.Error ? 'text-danger' : 'tittle-bar-price-connected' : '';

        msgArray.pushObject({type: messageType, messageTag: messageTag, content: langMessage, messageClass: messageClass});
    },

    onLanguageChanged: function () {
        var messageArray = this.get('msgArray');

        Ember.$.each(messageArray, function (index, item) {
            Ember.set(item, 'content', LanguageDataStore.getLanguageObj().lang.messages[item.messageTag]);
        });

        this.set('settings', []);

        this._updateSettings();
        this.initializeSettings();
        this.setUsername();
        this.setFullScreenToggleTitle();
    }.observes('userSettings.currentLanguage'),

    connectionStatusStyle: function () {
        return this.get('msgArray').length > 0 &&
        this.get('msgArray')[0].type === this.utils.Constants.MessageTypes.Error ? 'connection-status-red' : 'connection-status-green';
    }.property('msgArray.@each'),

    setUsername: function () {
        var username;
        var isTradingEnabled = this.get('isTradingEnabled');

        if (isTradingEnabled) {
            var lstLgnTme = this.tradeService.userDS.get('lstLgnTme');

            if (lstLgnTme) {
                this.set('isLastLoginTimeEnable', true);
                this.set('shortLastLoginTime', utils.formatters.formatToDayMonthTime(lstLgnTme));
                this.set('lastLoginTime', utils.formatters.formatToDateTime(lstLgnTme));
            } else {
                this.set('isLastLoginTimeEnable', false);
            }
        }

        username = this._setUserName();

        this.set('username', username);
    }.observes('appGlobal.session.id'),

    _setUserName: function () {
        var customerName;

        if (this.get('isTradingEnabled')) {
            var cusName = this.tradeService.fieldConfigs['cusName' + sharedService.userSettings.currentLanguage];
            var tradeUser = this.tradeService.userDS;

            utils.logger.logTrace('Field configs cusName -' + cusName);

            if (cusName && tradeUser.get(cusName)) {
                utils.logger.logTrace('Username 01');
                customerName = tradeUser.get(cusName);
            } else if (tradeUser.get('cusNme')) {
                utils.logger.logTrace('Username 02');
                customerName = tradeUser.get('cusNme');
            } else {
                utils.logger.logTrace('Username 03');
                customerName = Ember.appGlobal.session.id;
            }
        } else {
            utils.logger.logTrace('Trading disabled username');
            customerName = Ember.appGlobal.session.id;
        }

        utils.logger.logTrace('Set Username -' + customerName);
        return customerName;
    },

    _updateSettings: function () {
        var tempArray = [];

        Ember.$.each(this.get('settings'), function (index, item) {
            if (item.code) {
                tempArray = item.code.split(utils.Constants.StringConst.Colon);
                Ember.set(item, 'active', (tempArray.length > 1) && (tempArray[1] === sharedService.userSettings.currentTheme) || (tempArray[1] === sharedService.userSettings.currentLanguage));
            }
        });
    },

    _showPasswordPopup: function () {
        var changePasswordPopup = sharedService.getService('sharedUI').getService('changePasswordPopup');
        changePasswordPopup.send('showModalPopup', true);
    },

    _showSessionTimePopup: function () {
        var sessionTimeoutPopup = sharedService.getService('sharedUI').getService('sessionTimeoutPopup');
        sessionTimeoutPopup.send('showModalPopup', true);
    },

    _showTickerSettingsPopup: function () {
        var tickerSettingsPopup = sharedService.getService('sharedUI').getService('tickerSettingsPopup');
        tickerSettingsPopup.send('showModalPopup', true);
    },

    _showUserProfilePopup: function () {
        var userProfilePopup = sharedService.getService('sharedUI').getService('userProfilePopup');

        if (userProfilePopup) {
            userProfilePopup.send('showModalPopup');
        }
    },

    _showAboutUsPopup: function () {
        var aboutUsPopup = sharedService.getService('sharedUI').getService('aboutUsPopup');
        aboutUsPopup.send('showModalPopup', true);
    },

    _showHelpGuide: function () {
        window.open(appConfig.helpGuidePath, '_blank');
    },

    _showRenewalPage: function () {
        window.open(utils.requestHelper.generateQueryString(appConfig.subscriptionConfig.renewSubscriptionPath, {
            user: sharedService.getService('price').userDS.username,
            language: sharedService.userSettings.get('currentLanguage')
        }), '_blank');
    },

    _clearCache: function () {
        var that = this;

        utils.messageService.showMessage(this.get('app').lang.messages.cacheClearMassage, utils.Constants.MessageTypes.Question, false, this.get('app').lang.labels.clearCache, [
            {
                type: 'yes', btnAction: function () {
                    that.priceService.priceMeta.clearSavedData();
                    that.priceService.priceExchangeMeta.clearSavedData();
                    that.priceService.priceSymbolMeta.clearSavedData();

                    that.utils.applicationSessionHandler.logout();
                }
            },
            {
                type: 'no', btnAction: undefined
            }], null
        );
    },

    _changeSettings: function (selectedSetting) {
        var codeKeys = selectedSetting.code.split(this.utils.Constants.StringConst.Colon);

        if (codeKeys.length > 1) {
            switch (codeKeys[0]) {
                case 'theme':
                    ThemeDataStore.changeTheme(codeKeys[1]);
                    this._updateSettings();

                    this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.settingsChanged, ['theme:', codeKeys[1]].join(''));
                    break;

                case 'lang':
                    LanguageDataStore.changeLanguage(codeKeys[1]);
                    this._updateSettings();

                    this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.settingsChanged, ['language:', codeKeys[1]].join(''));
                    break;

                case 'password':
                    this._showPasswordPopup();
                    break;

                case 'ticker':
                    this._showTickerSettingsPopup();
                    break;

                case 'about':
                    this._showAboutUsPopup();
                    break;

                case 'help':
                    this._showHelpGuide();
                    break;

                case 'renew':
                    this._showRenewalPage();
                    break;

                case 'clearCache':
                    this._clearCache();
                    break;

                case 'viewLog':
                    this._viewLog();
                    break;

                case 'userProfile':
                    this._showUserProfilePopup();
                    break;

                case 'sessionTime':
                    this._showSessionTimePopup();
                    break;

                default:
                    break;
            }
        }
    },

    _viewLog: function () {
        var controllerString = 'controller:shared/app-log';
        var routeString = 'shared/app-log';
        var popUpName = 'appLog';

        Ember.run.later(function () {
            sharedService.getService('sharedUI').renderFullScreenWidget(controllerString, routeString, popUpName, function () {});
        }, 1000);
    },

    showSearchPopup: function () {
        if (this.get('searchKey') !== '') {
            var modal = this.get('topBarSymbolSearch');
            modal.send('showModalPopup');
        }
    },

    searchKeyDidChange: function () {
        var searchKey = this.get('searchKey');

        if (searchKey && searchKey.length >= appConfig.searchConfig.minCharLenForSymbol) {
            Ember.run.debounce(this, this.showSearchPopup, 300);
        }
    }.observes('searchKey'),

    _updateSubscriptionExpiry: function () {
        var expDateString = sharedService.getService('price').userDS.expiryDate;

        if (utils.validators.isAvailable(expDateString)) {
            this.set('expiryDate', utils.formatters.formatToDate(expDateString));
        } else {
            this.set('expiryDate', sharedService.userSettings.displayFormat.noValue);
        }

        if (this.priceService.userDS.willExpireRecently()) {
            this.set('isExpireSoon', true);
        }
    },

    actions: {
        showSearchBox: function () {
            var that = this;
            var currentState = this.get('isChangeWidth');

            this.set('searchKey', '');

            Ember.run.later(function () {
                that.set('isChangeWidth', !currentState);
            }, 10);
        },

        showSearchPopup: function () {
            this.showSearchPopup();
        },

        closeSearchPopup: function () {
            var modal = this.get('topBarSymbolSearch');

            modal.send('closeModalPopup');
            this.set('searchKey', '');
        },

        logout: function () {
            this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.logout);
            this.utils.applicationSessionHandler.logout();
        },

        toggleFullScreen: function () {
            if (this.utils.fullScreenHelper.isInFullScreen()) {
                this.set('fullScreenToggleTitle', this.get('app').lang.labels.fullScreen);

                this.utils.fullScreenHelper.cancelFullScreen(document);
                this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.restore);
            } else {
                // document.body should be passed if the browser is IE
                // In IE 11 and above document.msFullscreenElement is null if not in fullscreen
                // otherwise undefined (in other browsers)
                this.set('fullScreenToggleTitle', this.get('app').lang.labels.exitFullScreen);

                if (document.msFullscreenElement === null) {
                    this.utils.fullScreenHelper.requestFullScreen(document.body);
                } else {
                    this.utils.fullScreenHelper.requestFullScreen(document.documentElement);
                }

                this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.maximize);
            }
        },

        changeSettings: function (selectedSetting) {
            this._changeSettings(selectedSetting);
        },

        changeLanguage: function (toLang) {
            LanguageDataStore.changeLanguage(toLang);
        },

        onWidgetClick: function () {
            Ember.appGlobal.activeWidget = 'titleBar';
        }
    }
});

Ember.Handlebars.helper('message-viewer', MessageViewer);
Ember.Handlebars.helper('settings-dropdown', SettingsDropdown);
