import Ember from 'ember';
import appConfig from '../config/app-config';
import webConnection from '../models/shared/communication-adapters/web-http-connection';
import sharedService from '../models/shared/shared-service';
import environmentConfig from '../config/environment';
import utils from './utils';

// TODO: [Amila] Implement the logs server uploading part. This can be integrated with SMM.
// TODO: [Amila] Discuss with the team and decide up to which level we are going to upload logs to the server.
// TODO: [Amila] My personal view is to provide the facility to ERROR level logs only

export default (function () {
    var logBuffer = [];

    // Constants
    var logLevel = {
        disableLogs: 0,
        logError: 1,
        logWarning: 2,
        logInfo: 3,
        logDebug: 4
    };

    var logPrefix = {
        error: 'ERROR: ',
        warn: 'WARN: ',
        info: 'INFO: ',
        debug: 'DEBUG: '
    };

    var loggerUrl = 'logger/';
    var isRequestInProgress = false;
    var lastSentIndex = 0;
    var isPeriodicUpdateStarted = false;

    var _browser = {};

    var logError = function (logEntry) {
        _amendLog(logEntry, logLevel.logError);
    };

    var logWarning = function (logEntry) {
        _amendLog(logEntry, logLevel.logWarning);
    };

    var logInfo = function (logEntry) {
        _amendLog(logEntry, logLevel.logInfo);
    };

    var logDebug = function (logEntry) {
        _amendLog(logEntry, logLevel.logDebug);
    };

    var logTrace = function (message) {
        if (appConfig.loggerConfig.isAppLogEnabled) {
            Ember.appGlobal.logger.stackTrace.push(new Date() + ' - ' + message);
        }

        logInfo(message);
    };

    var _amendLog = function (logEntry, logType) {
        try {
            if (appConfig.loggerConfig.consoleLogLevel >= logType) {
                _amendLogConsole(logEntry, logType);
            }

            if (appConfig.loggerConfig.serverLogLevel >= logType) {
                _amendLogToBuffer(logEntry, logType);
            }
        } catch (e) {
            window.console.error(['Logger error: ', e].join(''));
        }
    };

    var _amendLogConsole = function (logEntry, logType) {
        switch (logType) {
            case logLevel.logError:
                window.console.error([logPrefix.error, logEntry].join(''));
                break;

            case logLevel.logWarning:
                window.console.warn([logPrefix.warn, logEntry].join(''));
                break;

            case logLevel.logInfo:
                window.console.info([logPrefix.info, logEntry].join(''));
                break;

            case logLevel.logDebug:
                window.console.log([logPrefix.debug, logEntry].join(''));
                break;

            default:
                window.console.log(logEntry);
                break;
        }
    };

    var _amendLogToBuffer = function (logEntry, logType) {
        if (!isPeriodicUpdateStarted) {
            _browser = utils.browser.getBrowserInfo();

            setTimeout(function () {
                _periodicServerUpdate();
            }, appConfig.loggerConfig.logUpdateTimeout);

            isPeriodicUpdateStarted = true;
        }

        var messageType = '';
        var hasValidLogType = true;

        switch (logType) {
            case logLevel.logError:
                messageType = logPrefix.error;
                break;

            case logLevel.logWarning:
                messageType = logPrefix.warn;
                break;

            case logLevel.logInfo:
                messageType = logPrefix.info;
                break;

            case logLevel.logDebug:
                messageType = logPrefix.debug;
                break;

            default:
                hasValidLogType = false;

                window.console.log(logEntry);
                break;
        }

        if (hasValidLogType) {
            var userName = sharedService.userSettings.username;
            var appVersion = environmentConfig.APP.version;
            var logTime = utils.moment(new Date()).format('YYYYMMDDHHmmss');

            var serverLogEntry = {
                'message': logEntry,
                'message_type': messageType,
                'user_id': userName,
                'browser': _browser.name,
                'browser_version': _browser.version,
                'app_version': appVersion,
                'log_time': logTime,
                'env': appConfig.customisation.clientPrefix
            };

            logBuffer.push(serverLogEntry);
        }

        if (logBuffer.length > appConfig.loggerConfig.logBufferSize) {
            if (!isRequestInProgress) {
                _sendLogsToServer();
            }
        }
    };

    var _sendLogsToServer = function () {
        isRequestInProgress = true;
        lastSentIndex = logBuffer.length;
        var data = utils.jsonHelper.convertToJson({messages: logBuffer});

        _sendLogRequest(loggerUrl, 'POST', 'application/json', data, _onSuccess, _onError);
    };

    var _onSuccess = function () {
        logBuffer = logBuffer.slice(lastSentIndex);
        isRequestInProgress = false;
    };

    var _onError = function () {
        if (logBuffer.length > appConfig.loggerConfig.maxLogBufferSize) {
            logBuffer = [];
        }

        // If a network error is occurred, application will report many error logs and it will trigger the logger to
        // send another request to server immediately. So here a delay is added. So the requests will have a time between them.
        Ember.run.later(this, function () {
            isRequestInProgress = false;
        }, 10000);
    };

    var _sendLogRequest = function (url, type, contentType, data, onSuccess, onError) {
        webConnection.sendAjaxRequest({
            url: url,
            type: type,
            contentType: contentType,
            data: data,
            onSuccess: onSuccess,
            onError: onError
        });
    };

    var _periodicServerUpdate = function () {
        if (!isRequestInProgress && logBuffer.length > 0) {
            _sendLogsToServer();
        }

        setTimeout(function () {
            _periodicServerUpdate();
        }, appConfig.loggerConfig.logUpdateTimeout);
    };

    return {
        logError: logError,
        logWarning: logWarning,
        logInfo: logInfo,
        logDebug: logDebug,
        logTrace: logTrace
    };
})();
