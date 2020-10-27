/* global Queue */
import Ember from 'ember';
import SocketResponseHandler from '../../../shared/protocols/web-socket/socket-response-handler';
import PriceConstants from '../../price-constants';
import sharedService from '../../../shared/shared-service';
import ChartConstants from '../../../chart/chart-constants';
import utils from '../../../../utils/utils';
import appConfig from '../../../../config/app-config';
import languageDataStore from '../../../../models/shared/language/language-data-store';

export default SocketResponseHandler.extend({
    init: function () {
        var that = this;

        this._super();
        this.inputQueue = new Queue();

        this.processTimer = setTimeout(function () {
            that.processResponse();
        }, PriceConstants.TimeIntervals.WebSocketInQueueProcessingInterval);
    },

    /* *
     * Processes message frames from the server
     */
    _processMessage: function (message, onSocketReady) {
        // Fetch the response message type
        var type = message[PriceConstants.ResponseType.MessageType];

        switch (type) {
            case PriceConstants.ResponseType.Data.ResponseEquity:
                this._processStockResponse(message);
                break;

            case PriceConstants.ResponseType.Data.ResponseIndex:
                this._processIndexResponse(message);
                break;

            case PriceConstants.ResponseType.Data.ResponseExchange:
                this._processExchangeResponse(message);
                break;

            case PriceConstants.ResponseType.Data.ResponseMarketDepthByPrice:
                this._processMarketDepth(message, PriceConstants.MarketDepthType.DepthByPrice);
                break;

            case PriceConstants.ResponseType.Data.ResponseMarketDepthByOrder:
                this._processMarketDepth(message, PriceConstants.MarketDepthType.DepthByOrder);
                break;

            case PriceConstants.ResponseType.Data.ResponseOHLC:
                this._processOHLCResponse(message);
                break;

            case PriceConstants.ResponseType.Data.ResponseTOVPOHLC:
                this._processTOPVOHLCResponse(message);
                break;

            case PriceConstants.ResponseType.Data.ResponseAnnouncement:
            case PriceConstants.ResponseType.Data.ResponseNews:
                this._processNewsAnnouncementResponse(message, type);
                break;

            case PriceConstants.ResponseType.Data.ResponseTopStocks:
                this._processTopStockResponse(message);
                break;

            case PriceConstants.ResponseType.Authentication:
                this._processAuthResponse(message, this.callbacks.auth, onSocketReady);
                break;

            case PriceConstants.ResponseType.Data.ResponseTimeAndSales:
                this._processTimeAndSalesResponse(message);
                break;

            case PriceConstants.ResponseType.Data.ResponseTimeAndSalesDetail:
                this._processTimeAndSalesResponse(message);
                break;

            case PriceConstants.ResponseType.Data.ResponseFullMarketEnd:
                this._processFullMarketEndResponse(message);
                break;

            case PriceConstants.ResponseType.Data.ResponseAlertHistory:
            case PriceConstants.ResponseType.Data.ResponseAlert:
                this._processAlertResponse(message);
                break;

            case PriceConstants.ResponseType.Data.ResponseAlertTrigger:
                this._processAlertTriggerResponse(message);
                break;

            case PriceConstants.ResponseType.Data.ResponseSubMarket:
                this._processSubMarketResponse(message);
                break;

            case PriceConstants.ResponseType.Data.ResponseXStream:
                this._processXStreamResponse(message);
                break;

            case PriceConstants.ResponseType.Data.ResponseFSBulk:
                this._processFSBulkResponse(message);
                break;

            case PriceConstants.ResponseType.Data.ResponseChangePassword:
                this._processChangePassword(message);
                break;

            case PriceConstants.ResponseType.Pulse:
                break;

            default:
                utils.logger.logWarning('Unsupported message type : ' + type);
                break;
        }
    },

    _processXStreamResponse: function (message) {
        var stockObj = sharedService.getService('price').stockDS.getStock(message.exg, message.sym, message.inst);

        if (stockObj !== null) {
            stockObj.setData(message);
        }
    },

    _processFSBulkResponse: function (message) {
        var stockObj = sharedService.getService('price').stockDS.getStock(message.exg, message.sym, message.inst);

        if (stockObj !== null) {
            stockObj.setData(message);
        }
    },

    _processStockResponse: function (message) {
        var stockObj = sharedService.getService('price').stockDS.getStock(message.exg, message.sym, message.inst, undefined, message.symStat);

        if (stockObj !== null) {
            stockObj.setData(message);
        }
    },

    _processIndexResponse: function (message) {
        var indexObj = sharedService.getService('price').stockDS.getStock(message.exg, message.sym, utils.AssetTypes.Indices);

        if (indexObj !== null) {
            indexObj.setData(message);
        }
    },

    _processExchangeResponse: function (message) {
        var exchangeObj = sharedService.getService('price').exchangeDS.getExchange(message.exg);

        if (exchangeObj !== null) {
            exchangeObj.setData(message);
        }
    },

    _processSubMarketResponse: function (message) {
        var subMarketObj = sharedService.getService('price').subMarketDS.getSubMarket(message.exg, message.sym);

        if (subMarketObj !== null) {
            subMarketObj.setData(message);
        }
    },

    _processMarketDepth: function (message, type) {
        var depthByPriceObj = sharedService.getService('price').marketDepthDS.getDepthItem(message.exg, message.sym, type);

        if (depthByPriceObj !== null) {
            depthByPriceObj.setData(message.D, type);
        }
    },

    _processOHLCResponse: function (message) {
        var ohlcSeries = sharedService.getService('price').ohlcDS.getOHLCSeries(message.exg, message.sym, ChartConstants.ChartCategory.Intraday);

        // Load exchange object for obtaining the timezone
        var exgObj = sharedService.getService('price').exchangeDS.getExchange(message.exg);

        var pt = utils.formatters.convertToUTCTimestamp(parseInt(message.dt, 10) * PriceConstants.UnixTimestampByMinutes * PriceConstants.UnixTimestampByMilliSeconds);
        var date = utils.formatters.convertToUTCDate(pt, exgObj.tzo);

        ohlcSeries.setData({
            dt: date,
            open: message.open,
            high: message.high,
            low: message.low,
            close: message.cls,
            volume: message.vol,
            turnover: message.tOvr
        }, true);
    },

    _processTOPVOHLCResponse: function (message) {
        var ohlcSeries = sharedService.getService('price').theoreticalChartDS.getOHLCSeries(message.exg, message.sym, ChartConstants.ChartCategory.Intraday);

        // Load exchange object for obtaining the timezone
        var exgObj = sharedService.getService('price').exchangeDS.getExchange(message.exg);

        var pt = utils.formatters.convertToUTCTimestamp(parseInt(message.dt, 10) * PriceConstants.UnixTimestampByMinutes * PriceConstants.UnixTimestampByMilliSeconds);
        var date = utils.formatters.convertToUTCDate(pt, exgObj.tzo);

        ohlcSeries.setData({
            dt: date,
            open: message.open,
            high: message.high,
            low: message.low,
            close: message.cls,
            volume: message.vol,
            turnover: message.tOvr
        }, true);
    },

    _processTimeAndSalesResponse: function (message) {
        var timeAndSalesInstance = sharedService.getService('price').timeAndSalesDS;
        var exchange = message.exg;
        var symbol = message.sym;
        var seq = message.seq;
        var tradeObj = timeAndSalesInstance.getNewTrade(exchange, symbol, seq);
        var prevTradeObj = timeAndSalesInstance.getLastTrade(exchange, symbol);

        if (tradeObj) {
            if (prevTradeObj) {
                message.trp = message.trp || prevTradeObj.trp;
                message.trq = message.trq || prevTradeObj.trq;
                message.splits = message.splits || prevTradeObj.splits;
                message.trdType = message.trdType || prevTradeObj.trdType;
                message.tts = message.tts || prevTradeObj.tts;
                message.nChg = message.nChg || prevTradeObj.nChg;
                message.pctChg = message.pctChg || prevTradeObj.pctChg;
                message.buyCode = message.buyCode || prevTradeObj.buyCode;
                message.selCode = message.selCode || prevTradeObj.selCode;
            }

            tradeObj.setData(message);

            if (prevTradeObj) {
                tradeObj.setTradeTick(prevTradeObj.trp);
            }

            timeAndSalesInstance.setLastTrade(exchange, symbol, tradeObj);
        }
    },

    _processNewsAnnouncementResponse: function (message, type) {
        var annObj = sharedService.getService('price').announcementDS.createAnnouncement(message.id, type, message.sym, message.exg);

        if (annObj !== null) {
            annObj.setData(message);
            annObj.set('type', type);
            sharedService.getService('price').announcementDS.addToOtherCollections(annObj, type);
        }

        if (type === PriceConstants.ResponseType.Data.ResponseAnnouncement) {
            sharedService.getService('price').stockDS.setAnnouncement(annObj);
        }
    },

    _processTopStockResponse: function (message) {
        sharedService.getService('price').topStockDS.createTopStocks(message.exg, message.tt, message.D, message.mkt);
    },

    _processAuthResponse: function (message, authCallbacks, onSocketReady) {
        var priceAuthResponse = utils.jsonHelper.convertToJson(message);

        Ember.appGlobal.logger.priceAuthResponse = priceAuthResponse;
        utils.logger.logTrace('Price auth response : ' + priceAuthResponse);

        var authSuccess = false;
        var priceService = sharedService.getService('price');
        var isLoggedIn = priceService.isAuthenticated();

        Ember.appGlobal.logger.preAuthPriceUser = utils.jsonHelper.convertToJson(priceService.get('userDS'));

        if (message.AUTHSTAT) {
            utils.logger.logTrace('Price user authenticated successfully.');
            utils.logger.logInfo('User authenticated successfully.');

            authSuccess = true;

            var savedPriceUserData = priceService.userDS;
            Ember.appGlobal.priceUser.delayedExchanges = savedPriceUserData ? savedPriceUserData.delayedExchg : [];

            var messageObj = this._setUserExchanges(message);
            messageObj = this._setWindowTypes(messageObj);

            priceService.userDS.setData(messageObj, true);
            priceService.userDS.save();

            Ember.appGlobal.logger.postAuthPriceUser = utils.jsonHelper.convertToJson(priceService.get('userDS'));
        } else {
            utils.logger.logInfo('User authentication failed.' + message.AUTHMSG);
            utils.logger.logTrace('Pirce user authentication failed.' + message.AUTHMSG);
        }

        if (Ember.$.isFunction(onSocketReady)) {
            onSocketReady(authSuccess);
        }

        if (authSuccess) {
            if (Ember.$.isFunction(authCallbacks.successFn)) {
                authCallbacks.successFn();
            }

            if (Ember.$.isFunction(authCallbacks.postSuccessFn)) {
                authCallbacks.postSuccessFn();
            }
        } else {
            var authMsg = message.AUTHMSG;

            if (isLoggedIn) {
                // Logout from the application with error message set in login page
                utils.webStorage.addString(utils.webStorage.getKey(utils.Constants.CacheKeys.LoginErrorMsg), authMsg, utils.Constants.StorageType.Session);
                utils.applicationSessionHandler.logout(authMsg);
            } else if (Ember.$.isFunction(authCallbacks.errorFn)) {
                // Simply set error message in login page
                authCallbacks.errorFn(authMsg);
            }
        }
    },

    _setUserExchanges: function (message) {
        // Sample: TDWL,0,1|ADSM,0,1|DFM,1,1|NSDQ,0,0
        var authType = PriceConstants.ResponseType.Authentication;
        var configExchanges = (appConfig.responseConfig && appConfig.responseConfig[authType]) ? appConfig.responseConfig[authType].UE : '';
        var userExchange = utils.validators.isAvailable(configExchanges) ? configExchanges : message.UE;

        var userExchanges = [];
        var userDelayedExchanges = [];
        var nonDefaultExchanges = [];

        if (userExchange) {
            var tempArray;
            var userExgArray = userExchange.split(utils.Constants.StringConst.Pipe);

            Ember.$.each(userExgArray, function (index, val) { // TDWL,0,1
                tempArray = val.split(utils.Constants.StringConst.Comma);

                // Checking non-existence indices in an array is safe as they return undefined
                var exchange = tempArray[0];
                var delayedFlag = tempArray[1];
                var defaultFlag = tempArray[2];

                if (utils.validators.isAvailable(exchange)) {
                    // Exchange is delayed only if marked as an delayed exchange
                    // If flag is not set, consider exchange as real time
                    if (delayedFlag === utils.Constants.Yes) {
                        userDelayedExchanges[userDelayedExchanges.length] = exchange;
                    }

                    // Exchange is non-default only if marked as non-default exchange
                    // If flag is not set, consider as a default exchange
                    if (defaultFlag === utils.Constants.No) {
                        nonDefaultExchanges[nonDefaultExchanges.length] = exchange;
                    } else {
                        // Only default exchanges are available in user exchange array
                        // Non default exchanges are kept in a separate property
                        userExchanges[userExchanges.length] = exchange;
                    }
                }
            });
        }

        message.UE = userExchanges;
        message.DE = userDelayedExchanges;
        message.NDE = nonDefaultExchanges;

        return message;
    },

    _setWindowTypes: function (message) {
        var windowTypes = message.WT;
        var userTypesMap = {};

        if (windowTypes) {
            var typesByExg = windowTypes.split('|');

            if (typesByExg.length > 0) {
                Ember.$.each(typesByExg, function (index, typeString) {
                    if (typeString) {
                        var typeArray = typeString.split(',');

                        if (typeArray.length > 1) {
                            var exg = typeArray.splice(0, 1);
                            userTypesMap[exg[0]] = typeArray;
                        }
                    }
                });

                message.WT = this._processCustomWindowTypes(userTypesMap);
            }
        }

        return message;
    },

    _processCustomWindowTypes: function (userTypesMap) {
        Ember.$.each(userTypesMap, function (exchange, windowTypes) {
            var customTypesByExg = sharedService.getService('price').settings.configs.customWindowTypes[exchange];

            if (customTypesByExg) {
                windowTypes.removeItems(customTypesByExg.exclude);
                userTypesMap[exchange] = windowTypes.union(customTypesByExg.include);
            }
        });

        return userTypesMap;
    },

    _processFullMarketEndResponse: function (message) {
        sharedService.getService('price').onFullMarketSnapshotReceived(message.exg);
    },

    _processChangePassword: function (message) {
        var callbackFn = sharedService.getService('price').changePasswordCallback;
        var rejectedReason = message.chgPwdMsg ? message.chgPwdMsg : 'passwordChangeFail';
        var currentLangObj = languageDataStore.getLanguageObj().lang;

        if (currentLangObj) {
            rejectedReason = currentLangObj.messages[rejectedReason];
        }

        if (callbackFn && Ember.$.isFunction(callbackFn)) {
            callbackFn(message.AUTHSTAT, rejectedReason);
        }
    },

    _processAlertResponse: function (message) {
        if (message.rcpttype !== 'unsubscribe') {
            var alertObj = sharedService.getService('price').alertDS.getAlert(message.TOK, message.exg);

            if (alertObj !== null) {
                alertObj.setData({
                    status: message.stat,
                    exp: message.EXP,
                    fr: message.FR,
                    cr: message.cr,
                    flt: message.FLT,
                    sym: message.sym
                });
            }
        } else {
            this._processAlertUnSubscribeResponse(message);
        }

        sharedService.getService('price').alertDS.alertUpdateRecieved();
    },

    _processAlertTriggerResponse: function (message) {
        var alertObj = sharedService.getService('price').alertDS.getAlert(message.TOK, message.exg, message.sym);

        if (alertObj !== null) {
            alertObj.setData({
                status: message.stat,
                fr: message.FR,
                cr: message.cr,
                ltr: message.ltr,
                trv: message.trv,
                flt: message.FLT
            });
        }

        sharedService.getService('price').notifyAlertTrigger(alertObj);
        sharedService.getService('price').alertDS.alertUpdateRecieved();
    },

    _processAlertUnSubscribeResponse: function (message) {
        sharedService.getService('price').alertDS.removeAlertFromCollections(message.TOK);
    }
});
