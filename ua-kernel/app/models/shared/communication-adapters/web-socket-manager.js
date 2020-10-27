import Ember from 'ember';
import WebSocketConnection from './web-socket-connection';
import utils from '../../../utils/utils';

export default function (requestHandler, responseHandler, service, subscriptionManager) {
    this.requestHandler = requestHandler; // Singleton request generator object
    this.responseHandler = responseHandler; // Class blue-print
    this.subscriptionManager = subscriptionManager;
    this.connectionSettings = {};
    this.socketMap = {};
    this.socketStatusMap = {};
    this.responseHandlerMap = {};
    this.service = service;
    this.maxRetryInterval = 30000;

    this.retryIntervals = [
        {limit: 6, interval: 5000},
        {limit: 12, interval: 10000},
        {limit: 16, interval: 15000}
    ];

    var that = this;

    var sendAuth = function (authRequest, connectionType, authParams) {
        _sendAuthRequest(authRequest, connectionType, that.responseHandler, {
            callbacks: {
                auth: {
                    successFn: authParams.authSuccess,
                    errorFn: authParams.authFailed,
                    postSuccessFn: function () {
                        if (authParams.resendSubscriptions) {
                            _resendCurrentSubscriptions(connectionType);
                        }
                    }
                }
            }
        });
    };

    var sendData = function (dataRequest, connectionType) {
        Ember.$.each(dataRequest, function (index, req) {
            getSocketConnection(connectionType).sendData(req);
        });
    };

    var sendPreAuthData = function (dataRequest, connectionType) {
        var socketConnection = getSocketConnection(connectionType);

        if (!that.responseHandlerMap[connectionType]) {
            socketConnection.initialize(that.responseHandler);
            that.responseHandlerMap[connectionType] = true;
        }

        Ember.$.each(dataRequest, function (index, req) {
            socketConnection.sendPreAuthData(req);
        });
    };

    var isConnected = function (connectionType) {
        return that.socketMap[connectionType] && that.socketMap[connectionType].isConnected();
    };

    var setConnectionSettings = function (connectionSettings) {
        that.connectionSettings = Ember.$.extend({}, that.connectionSettings, connectionSettings);
    };

    var _sendReconnectAuth = function (authRequest, connectionType, authSuccess) {
        _sendAuthRequest(authRequest, connectionType, undefined, authSuccess, true);
    };

    var _sendAuthRequest = function (authRequest, connectionType, respHandler, callbacks, isReconnection) {
        var socketConnection = getSocketConnection(connectionType);

        socketConnection.initialize(respHandler, callbacks, isReconnection);
        socketConnection.sendAuth(authRequest);

        that.responseHandlerMap[connectionType] = true;
    };

    var _onSocketConnect = function (socketConnection) {
        // Notify socket connection
        that.socketStatusMap[socketConnection.socketParams.type].retryCount = 0;
        that.service.setConnectionStatus(true);
    };

    var _onSocketDisconnect = function (socketConnection, retry) {
        // Notify socket disconnection
        var socketType = socketConnection.socketParams.type;
        that.service.setConnectionStatus(false);

        var retryCount = that.socketStatusMap[socketType].retryCount;
        that.socketStatusMap[socketType].retryCount = retryCount || 0;

        if (retry) {
            setTimeout(function () {
                // Checking whether already connected to fix sending reconnection request again
                if (!socketConnection.isConnectedToServer) {
                    var authReq = that.requestHandler.generateReconnectionAuthRequest();

                    if (authReq) {
                        utils.logger.logTrace('Reconnecting to ### ' + socketConnection.connectionPath);

                        _sendReconnectAuth(authReq, socketType, function () {
                            _resendCurrentSubscriptions(socketType);
                        });
                    }

                    that.socketStatusMap[socketType].retryCount++;
                }
            }, _getRetryInterval(that.socketStatusMap[socketType].retryCount));
        }
    };

    var _resendCurrentSubscriptions = function (connectionType) {
        var currentSubs = that.subscriptionManager.getCurrentSubscriptions();
        sendData(currentSubs, connectionType);
    };

    var getSocketConnection = function (connectionType) {
        if (!that.socketMap[connectionType]) {
            var socketParams = {
                ip: that.connectionSettings.ip,
                port: that.connectionSettings.port,
                secure: that.connectionSettings.secure,
                type: connectionType,
                onConnect: _onSocketConnect,
                onDisconnect: _onSocketDisconnect,
                enablePulse: that.connectionSettings.enablePulse,
                requestHandler: that.requestHandler
            };

            that.socketMap[connectionType] = new WebSocketConnection(socketParams);
            that.socketStatusMap[connectionType] = {};
        }

        return that.socketMap[connectionType];
    };

    var _getRetryInterval = function (retryCount) {
        var retryInterval = that.maxRetryInterval;

        Ember.$.each(that.retryIntervals, function (key, value) {
            if (retryCount <= value.limit) {
                retryInterval = value.interval;

                return false;
            }
        });

        return retryInterval;
    };

    var closeConnection = function (connectionType) {
        getSocketConnection(connectionType).closeConnection();
    };

    var clearConnection = function (connectionType) {
        closeConnection(connectionType);
        that.socketMap[connectionType] = '';
    };

    return {
        sendAuth: sendAuth,
        sendData: sendData,
        sendPreAuthData: sendPreAuthData,
        isConnected: isConnected,
        setConnectionSettings: setConnectionSettings,
        closeConnection: closeConnection,
        clearConnection: clearConnection,
        getSocketConnection: getSocketConnection
    };
}
