import Ember from 'ember';
import appConfig from '../config/app-config';
import utils from './utils';
import sharedService from '../models/shared/shared-service';
import appEvents from '../app-events';
import languageDataStore from '../models/shared/language/language-data-store';

export default (function () {
    var OneMinute = 60000; // One minute time interval in milliseconds 60 *1000
    var wkey = 'appSessionHandler';
    var isIdle = false;
    var timer;
    var lastActiveTime;
    var defaultIdleTime;
    var app;

    var initializeApplicationIdleCheck = function () {
        app = languageDataStore.getLanguageObj();
        defaultIdleTime = appConfig.customisation.applicationIdleCheckConfig.defaultIdleTime * OneMinute; // Minute to milliseconds

        if (appConfig.customisation.applicationIdleCheckConfig.isEnabledInactiveLogout) {
            bindUserEvents();
            setTimeInterval();
        }
    };

    var onVisibilityChanged = function (isHidden) {
        if (isHidden) {
            lastActiveTime = isIdle ? lastActiveTime : new Date().getTime();
            isIdle = true;
        } else if (appConfig.customisation.applicationIdleCheckConfig.isEnabledInactiveLogout) {
            checkIdle();
        }
    };

    var setTimeInterval = function () {
        timer = window.setInterval(checkIdle, OneMinute);
    };

    var bindUserEvents = function () {
        var that = this;

        if (appConfig.customisation.isMobile || appConfig.customisation.isTablet) {
            if (navigator.isNativeDevice) { // Native mobile register for cordova events
                document.addEventListener('pause', function () {
                    onVisibilityChanged(true);
                }, false);

                document.addEventListener('resume', function () {
                    onVisibilityChanged(false);
                }, false);
            } else { // Mobile version on browser
                appEvents.subscribeVisibilityChanged(that, wkey);
            }
        }

        document.onclick = function () {
            isIdle = false;
        };

        document.onmousemove = function () {
            isIdle = false;
        };

        document.onkeypress = function () {
            isIdle = false;
        };

        document.addEventListener('touchend', function () { // For mobile
            isIdle = false;
        }, false);
    };

    var checkIdle = function () {
        if (!isIdle) {
            lastActiveTime = new Date().getTime();
        }

        if (isIdle && lastActiveTime && new Date().getTime() - lastActiveTime >= defaultIdleTime) {
            utils.webStorage.addString(utils.webStorage.getKey(utils.Constants.CacheKeys.LoginErrorMsg), app.lang.messages.sessionExpired, utils.Constants.StorageType.Session);
            logout([app.lang.messages.sessionExpired, app.lang.messages.pleaseWait].join(', '));
        }

        isIdle = true;
    };

    var logout = function (message) {
        window.clearInterval(timer);
        isIdle = false;
        lastActiveTime = undefined;

        var url = window.location.href;
        var hashIndex = url.indexOf('#');

        if (Ember.appGlobal.multiScreen) {
            Ember.appGlobal.multiScreen.isParentLogoutFired = true;
        }

        if (hashIndex > 0 && hashIndex === url.length - 1) {
            url = url.substring(0, url.length - 1);
        }

        if (Ember.appGlobal.authType === 2) { // TODO: [Bashitha] Remove hard coded auth type
            if (!window.opener) { // window.opener will be available if the browser window is opened using window.open
                url = url.substring(0, url.indexOf('?'));

                _logoutWindow(url, message);
            } else {
                var closeWindow = function () {
                    window.open('', '_self').close();
                };

                window.setTimeout(function () {
                    closeWindow();
                }, 1000);
            }
        } else {
            _logoutWindow(url, message);
        }

        if (Ember.$.isFunction(utils.nativeHelper.closeWindows)) {
            utils.nativeHelper.closeWindows();
        }
    };

    var _logoutWindow = function (locationUrl, message) {
        // Retail
        // Hide popup when application log outs on reconnection failure
        var modal = sharedService.getService('sharedUI').getService('modalPopupId');

        if (modal) {
            modal.send('closeModalPopup');
        }

        utils.messageService.hideMessage();
        sharedService.getService('sharedUI').showSessionTimeout(message ? message : [app.lang.messages.closingSession, app.lang.messages.pleaseWait].join(', '), true);

        utils.webStorage.addString(utils.webStorage.getKey(utils.Constants.CacheKeys.LoggedIn), '0', utils.Constants.StorageType.Session);
        utils.logger.logInfo('Application refreshed. ' + message);

        window.location.href = locationUrl;
    };

    return {
        logout: logout,
        initializeApplicationIdleCheck: initializeApplicationIdleCheck,
        onVisibilityChanged: onVisibilityChanged
    };
})();
