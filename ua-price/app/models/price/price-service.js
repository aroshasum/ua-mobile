/* global Queue */
import Ember from 'ember';
import WebSocketManager from '../shared/communication-adapters/web-socket-manager';
import priceSocketRequestHandler from './protocols/web-socket/price-socket-request-handler'; // Singleton request generator object
import PriceSocketResponseHandler from './protocols/web-socket/price-socket-response-handler'; // Class blue-print
import mixRequestHandler from './protocols/mix-web/mix-request-handler';
import PriceConstants from './price-constants';
import ChartConstants from '../chart/chart-constants';
import priceSubscriptionManager from '../../models/price/price-subscription-manager';
import profileService from '../shared/profile/profile-service';
import priceMeta from './business-entities/price-meta';
import priceExchangeMeta from './business-entities/price-exchange-meta';
import priceSymbolMeta from './business-entities/price-symbol-meta';
import mixResponseHandler from './protocols/mix-web/mix-response-handler';
import appConfig from '../../config/app-config';
import priceUser from './business-entities/price-user';
import priceUserData from './business-entities/price-user-data';
import sharedService from '../shared/shared-service';
import appEvents from '../../app-events';
import utils from '../../utils/utils';
import priceDataStoreFactory from './data-stores/price-data-store-factory';
import languageDataStore from '../shared/language/language-data-store';

export default Ember.Object.extend({
    subscriptionKey: 'price',
    symbolMultiSubscriptionMap: {},
    pendingFullMktSubscriptions: {},
    settings: {},

    // Generate single web socket manager instance specific to price service
    webSocketManager: undefined,
    connectionStatus: false,

    // API for accessing the data stores
    announcementDS: undefined,
    marketDepthDS: undefined,
    exchangeDS: undefined,
    ohlcDS: undefined,
    stockDS: undefined,
    gmsDS: undefined,
    systemMetaDS: undefined,
    alertDS: undefined,
    topStockDS: undefined,
    companyProfileDS: undefined,
    timeAndSalesDS: undefined,
    socialMediaDS: undefined,
    searchDS: undefined,
    sectorDS: undefined,
    subMarketDS: undefined,
    watchListDS: undefined,
    optionStockDS: undefined,
    fairValueDS: undefined,
    corporateActionDS: undefined,
    theoreticalChartDS: undefined,
    theoreticalStockDS: undefined,
    financialDS: undefined,
    portfolioDS: undefined,
    bookShelfDS: undefined,
    registrationDS: undefined,
    investorsDS: undefined,
    technicalScoreDS: undefined,

    userDS: priceUser,
    priceMeta: priceMeta,
    priceExchangeMeta: priceExchangeMeta,
    priceSymbolMeta: priceSymbolMeta,
    priceUserData: priceUserData,
    authSuccessSubscription: {},
    fullMarketSubscription: {},
    priceMetaReadySubscription: {},
    priceExchangeSummaryMetaReadySubscription: {},
    connectionStatusSubscription: {},
    MarketStatus: PriceConstants.MarketStatus,

    isPriceMetaReady: false,
    isExchangeSummaryMetaReady: false,
    isDefaultMetaRequestFail: false,
    isAuthSuccess: false,
    mixReqQueue: new Queue(),
    socketReqQueue: new Queue(),
    isAuthResponse: false,
    changePasswordCallback: {},

    init: function () {
        this._super();
        this.webSocketManager = new WebSocketManager(priceSocketRequestHandler, PriceSocketResponseHandler, this, priceSubscriptionManager);
        this.subscribeAuthSuccess(this, this.get('subscriptionKey'));

        appEvents.subscribeLanguageChanged(this, this.get('subscriptionKey'));
        this.set('app', languageDataStore.getLanguageObj());
    },

    isMoreMarketsAvailable: function () {
        return this.get('userDS').get('userExchg').length > 1;
    },

    isPriceMetadataReady: function () {
        return this.get('isPriceMetaReady');
    },

    isAuthenticated: function () {
        return this.get('isAuthSuccess');
    },

    isExchangeSummaryMetadataReady: function () {
        return this.get('isExchangeSummaryMetaReady');
    },

    createDataStores: function () {
        this.set('announcementDS', priceDataStoreFactory.createAnnouncementDataStore(this));
        this.set('marketDepthDS', priceDataStoreFactory.createMarketDepthDataStore(this));
        this.set('exchangeDS', priceDataStoreFactory.createExchangeDataStore(this));
        this.set('ohlcDS', priceDataStoreFactory.createOHLCDataStore(this));
        this.set('stockDS', priceDataStoreFactory.createStockDataStore(this));
        this.set('alertDS', priceDataStoreFactory.createAlertDataStore(this));
        this.set('gmsDS', priceDataStoreFactory.createGMSDataStore(this));
        this.set('systemMetaDS', priceDataStoreFactory.createSystemMetaDataStore(this));
        this.set('topStockDS', priceDataStoreFactory.createTopStockDataStore(this));
        this.set('companyProfileDS', priceDataStoreFactory.createCompanyProfileDataStore(this));
        this.set('timeAndSalesDS', priceDataStoreFactory.createTimeAndSalesDataStore(this));
        this.set('searchDS', priceDataStoreFactory.createSearchDataStore(this));
        this.set('sectorDS', priceDataStoreFactory.createSectorDataStore(this));
        this.set('subMarketDS', priceDataStoreFactory.createSubMarketDataStore(this));
        this.set('watchListDS', priceDataStoreFactory.createWatchListDataStore(this));
        this.set('fairValueDS', priceDataStoreFactory.createFairValueDataStore(this));
        this.set('corporateActionDS', priceDataStoreFactory.createCorporateActionDataStore(this));
        this.set('theoreticalChartDS', priceDataStoreFactory.createTheoreticalChartDataStore(this));
        this.set('theoreticalStockDS', priceDataStoreFactory.createTheoreticalStockDataStore(this));
        this.set('optionStockDS', priceDataStoreFactory.createOptionStockDataStore(this));
        this.set('optionPeriodDS', priceDataStoreFactory.createOptionPeriodDataStore(this));
    },

    subscribeAuthSuccess: function (subscriber, key) {
        this.get('authSuccessSubscription')[key] = subscriber;
    },

    subscribePriceMetaReady: function (subscriber, key) {
        if (utils.validators.isAvailable(key)) {
            this.get('priceMetaReadySubscription')[key] = subscriber;
        }
    },

    unSubscribePriceMetaReady: function (key) {
        if (utils.validators.isAvailable(key)) {
            this.get('priceMetaReadySubscription')[key] = undefined;
        }
    },

    subscribePriceExchangeSummaryMetaReady: function (subscriber, key) {
        if (utils.validators.isAvailable(key)) {
            this.get('priceExchangeSummaryMetaReadySubscription')[key] = subscriber;
        }
    },

    onAuthSuccess: function () {
        var that = this;
        this.set('isAuthSuccess', true);

        profileService.getUserProfile();
        this.sendExchangeSummaryRequest();

        // Update metadata with delayed indicator
        mixResponseHandler.processDelayedPriceMeta();

        // Request for user exchange metadata
        this.exchangeDS.requestAllExchangeMetadata();
        // Initialize symbol validation timer to periodically validate for symbols
        this.stockDS.initializeSymbolValidation();

        // TODO: [Bashitha] Handle sub market wise full market subscription after QS implementation
        Ember.$.each(this.symbolMultiSubscriptionMap, function (exchange, requestSent) {
            if (requestSent) {
                Ember.run.later(function () {
                    that.onFullMarketSnapshotReceived(exchange);
                }, 30000);
            }
        });

        if (this.isPriceMetadataReady()) {
            this._sendQueuedMixSocketRequest();
        }

        Ember.run.later(function () {
            that.sendSystemMetaDataRequest();
        }, 2000);
    },

    onPriceExchangeSummaryMetaReady: function () {
        this.set('isExchangeSummaryMetaReady', true);

        Ember.$.each(this.get('priceExchangeSummaryMetaReadySubscription'), function (key, subscriber) {
            if (subscriber && Ember.$.isFunction(subscriber.onPriceExchangeSummaryMetaReady)) {
                subscriber.onPriceExchangeSummaryMetaReady();
            }
        });
    },

    subscribeFullMarketReceived: function (key, subscriber) {
        if (utils.validators.isAvailable(key)) {
            this.get('fullMarketSubscription')[key] = subscriber;
        }
    },

    unSubscribeFullMarketReceived: function (key) {
        if (utils.validators.isAvailable(key)) {
            this.get('fullMarketSubscription')[key] = undefined;
        }
    },

    onFullMarketSnapshotReceived: function (exchange) {
        Ember.$.each(this.get('fullMarketSubscription'), function (key, subscriber) {
            if (subscriber && Ember.$.isFunction(subscriber.onFullMarketSnapshotReceived)) {
                subscriber.onFullMarketSnapshotReceived(exchange);
            }
        });
    },

    subscribeConnectionStatusChanged: function (key, subscriber) {
        if (utils.validators.isAvailable(key)) {
            this.get('connectionStatusSubscription')[key] = subscriber;
        }
    },

    unSubscribeConnectionStatusChanged: function (key) {
        if (utils.validators.isAvailable(key)) {
            this.get('connectionStatusSubscription')[key] = undefined;
        }
    },

    onPriceConnectionStatusChanged: function (stat) {
        Ember.$.each(this.get('connectionStatusSubscription'), function (key, subscriber) {
            if (subscriber && Ember.$.isFunction(subscriber.onPriceConnectionStatusChanged)) {
                subscriber.onPriceConnectionStatusChanged(stat);
            }
        });
    },

    /* *
     * Authenticate with username and password
     * @param authParams An object with following properties set
     *                      username    : Username. Mandatory.
     *                      password    : Password. Mandatory.
     *                      loginIP     : Machine IP
     *                      appVersion  : Application version
     *                      lan         : Current Language. Mandatory.
     *                      metaVer     : Auth meta version (taken from the cache). Default 0. Mandatory.
     *                      authSuccess : Auth success function. Mandatory.
     *                      authFailed  : Auth failure function. Mandatory.
     */
    authenticateWithUsernameAndPassword: function (authParams) {
        try {
            authParams.authSuccess = this._modifyAuthSuccess(authParams);
            authParams.authFailed = this._modifyAuthFailed(authParams);

            utils.logger.logTrace('Authenticating price retail user...');

            var req = priceSocketRequestHandler.generateRetailAuthRequest(authParams);
            this.webSocketManager.sendAuth(req, PriceConstants.SocketConnectionType.QuoteServer, authParams);
        } catch (e) {
            var errorMsg = 'Error in price retail authenticating... ' + e.message;

            utils.logger.logTrace(errorMsg);
            utils.logger.logError(errorMsg);
        }

        this._checkAuthResponse(authParams);
    },

    authenticateWithSsoToken: function (authParams) {
        try {
            authParams.authSuccess = this._modifyAuthSuccess(authParams);
            authParams.authFailed = this._modifyAuthFailed(authParams);

            utils.logger.logTrace('Authenticating price sso user...');

            var req = priceSocketRequestHandler.generateSsoAuthRequest(authParams);
            this.webSocketManager.sendAuth(req, PriceConstants.SocketConnectionType.QuoteServer, authParams);
        } catch (e) {
            var errorMsg = 'Error in price sso authenticating... ' + e.message;

            utils.logger.logTrace(errorMsg);
            utils.logger.logError(errorMsg);
        }

        this._checkAuthResponse(authParams);
    },

    _modifyAuthSuccess: function (authParams) {
        var that = this;
        var origAuthSuccess = authParams.authSuccess;

        return function () {
            that._updateUserExchange(origAuthSuccess);
        };
    },

    _modifyAuthFailed: function (authParams) {
        var origAuthFailed = authParams.authFailed;
        var that = this;

        return function (response) {
            if (Ember.$.isFunction(origAuthFailed)) {
                that.set('isAuthResponse', true);
                origAuthFailed(response);
            }
        };
    },

    _checkAuthResponse: function (authParams) {
        var that = this;

        Ember.run.later(function () {
            if (!that.get('isAuthResponse')) {
                var authTimeoutMessage = that.get('app').lang.messages.authTimedOut;
                var origAuthFailed = authParams.authFailed;

                sharedService.userSettings.clearLoginToken();

                if (Ember.$.isFunction(origAuthFailed)) {
                    origAuthFailed(authTimeoutMessage);
                }
            }
        }, PriceConstants.TimeIntervals.AuthenticationTimeout);
    },

    setConnectionStatus: function (stat) {
        this.set('connectionStatus', stat);
        this.onPriceConnectionStatusChanged(stat);
    },

    isConnected: function () {
        return this.webSocketManager.isConnected(PriceConstants.SocketConnectionType.QuoteServer);
    },

    // API for handling market data and meta data

    /* *
     * Subscribe and Un-subscribe from exchange updates
     * @param exchange Exchange code string
     */
    addExchangeRequest: function (exchange) {
        if (utils.validators.isAvailable(exchange)) {
            var req = priceSocketRequestHandler.generateAddExchangeRequest(exchange, PriceConstants.RequestType.Data.RequestExchange);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    removeExchangeRequest: function (exchange) {
        if (utils.validators.isAvailable(exchange)) {
            var req = priceSocketRequestHandler.generateRemoveExchangeRequest(exchange, PriceConstants.RequestType.Data.RequestExchange);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    /* *
     * Subscribe and Un-subscribe from symbol updates
     * @param exchange Exchange Code string
     * @param symbol Symbol Code string
     * @param insType Instrument type String
     */
    addSymbolRequest: function (exchange, symbol, insType) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            var req = priceSocketRequestHandler.generateAddSymbolRequest(exchange, this._updateSymbolCode(symbol, insType), this._getStockMessageType(insType));
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    removeSymbolRequest: function (exchange, symbol, insType) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            var req = priceSocketRequestHandler.generateRemoveSymbolRequest(exchange, this._updateSymbolCode(symbol, insType), this._getStockMessageType(insType));
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    /* *
     * Subscribe and Un-subscribe from index updates
     * @param exchange Exchange Code string
     * @param symbol Index Code string
     */
    addIndexRequest: function (exchange, symbol) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            var req = priceSocketRequestHandler.generateAddSymbolRequest(exchange, symbol, PriceConstants.RequestType.Data.RequestIndex);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    removeIndexRequest: function (exchange, symbol) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            var req = priceSocketRequestHandler.generateRemoveSymbolRequest(exchange, symbol, PriceConstants.RequestType.Data.RequestIndex);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    /* *
     * Subscribe and Un-subscribe from full market symbol updates
     * @param exchange Exchange Code string
     * @param subMarketId sub marketId string
     */
    addFullMarketSymbolRequest: function (exchange, subMarketId) {
        var exchangeObj = this.exchangeDS.getExchange(exchange);

        if (exchangeObj.get('subMarketArray')) {
            this._addFullMarketSymbolRequest(exchange, subMarketId);
        } else {
            this.pendingFullMktSubscriptions[exchange] = true;

            if (this.isPriceMetadataReady()) {
                this._addFullMarketSymbolRequest(exchange, subMarketId);
            } else {
                this.socketReqQueue.enqueue({
                    callbackFn: this._addFullMarketSymbolRequest,
                    args: [exchange, subMarketId] // Queue arguments as an array
                });
            }
        }
    },

    _addFullMarketSymbolRequest: function (exchange, subMarketId) {
        var symbolList;
        var that = this;
        var subMarket = subMarketId ? subMarketId : this.exchangeDS.getDefaultSubMarket(exchange);
        var allowedSubMktsByExchange;

        if (appConfig.customisation.allowedSubMarkets) {
            allowedSubMktsByExchange = appConfig.customisation.allowedSubMarkets[exchange];
        }

        if (subMarket === -1) {
            symbolList = this.stockDS.getSymbolCollectionByExchange(exchange);
        } else {
            symbolList = this.stockDS.getStockCollectionBySubMarket(exchange, subMarket);
        }

        if (symbolList.length > 500) {
            this.symbolMultiSubscriptionMap[exchange] = true;

            Ember.$.each(symbolList, function (key, symbol) {
                that.addSymbolRequest(exchange, symbol.sym, symbol.inst);
            });

            this.pendingFullMktSubscriptions[exchange] = false;
        } else if (symbolList.length > 0 && utils.validators.isAvailable(exchange)) {
            this.symbolMultiSubscriptionMap[exchange] = false;

            if (allowedSubMktsByExchange && allowedSubMktsByExchange.length > 0) {
                if (subMarketId && allowedSubMktsByExchange.contains(subMarketId)) {
                    this._sendAddFullMarketSymbolRequest(exchange, subMarketId);
                } else if (!subMarketId) {
                    Ember.$.each(allowedSubMktsByExchange, function (key, subMktId) {
                        that._sendAddFullMarketSymbolRequest(exchange, subMktId);
                    });
                }
            } else if (subMarketId) {
                this._sendAddFullMarketSymbolRequest(exchange, subMarketId);
            } else {
                this._sendAddFullMarketSymbolRequest(exchange);
            }

            this.pendingFullMktSubscriptions[exchange] = false;
        } else {
            this.pendingFullMktSubscriptions[exchange] = true;
        }
    },

    removeFullMarketSymbolRequest: function (exchange, subMarketId) {
        if (utils.validators.isAvailable(exchange) && !this.symbolMultiSubscriptionMap[exchange]) {
            var allowedSubMktsByExchange;
            var that = this;

            if (appConfig.customisation.allowedSubMarkets) {
                allowedSubMktsByExchange = appConfig.customisation.allowedSubMarkets[exchange];
            }

            if (allowedSubMktsByExchange && allowedSubMktsByExchange.length > 0) {
                if (subMarketId && allowedSubMktsByExchange.contains(subMarketId)) {
                    this._sendRemoveFullMarketSymbolRequest(exchange, subMarketId);
                } else if (!subMarketId) {
                    Ember.$.each(allowedSubMktsByExchange, function (key, subMktId) {
                        that._sendRemoveFullMarketSymbolRequest(exchange, subMktId);
                    });
                }
            } else if (subMarketId) {
                this._sendRemoveFullMarketSymbolRequest(exchange, subMarketId);
            } else {
                this._sendRemoveFullMarketSymbolRequest(exchange);
            }
        }
    },

    /* *
     * Subscribe and Un-subscribe from full market index updates
     * @param exchange Exchange Code string
     */
    addFullMarketIndexRequest: function (exchange) {
        if (utils.validators.isAvailable(exchange)) {
            var req = priceSocketRequestHandler.generateAddExchangeRequest(exchange, PriceConstants.RequestType.Data.RequestIndex);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    removeFullMarketIndexRequest: function (exchange) {
        if (utils.validators.isAvailable(exchange)) {
            var req = priceSocketRequestHandler.generateRemoveExchangeRequest(exchange, PriceConstants.RequestType.Data.RequestIndex);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    /* *
     * Subscribe and Un-subscribe from custom list of symbols
     * @param exchange Exchange Code string
     * @param symbolList Symbol List array
     * @param insType Instrument type
     */
    addSymbolListRequest: function (exchange, symbolList, insType) {
        var req = priceSocketRequestHandler.generateAddSymbolBulkRequest(exchange, this._updateSymbolCodeArray(symbolList, insType).join('~'), this._getStockMessageType(insType));
        this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
    },

    removeSymbolListRequest: function (exchange, symbolList, insType) {
        var req = priceSocketRequestHandler.generateRemoveSymbolBulkRequest(exchange, this._updateSymbolCodeArray(symbolList, insType).join('~'), this._getStockMessageType(insType));
        this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
    },

    /* *
     * Subscribe and Un-subscribe from market depth by price updates
     * @param exchange Exchange code string
     * @param symbol Symbol code string
     */
    addMarketDepthByPriceRequest: function (exchange, symbol) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            if (this.isAuthenticated()) {
                this._sendMarketDepthByPriceRequest(exchange, symbol);
            } else {
                this.socketReqQueue.enqueue({
                    callbackFn: this._sendMarketDepthByPriceRequest,
                    args: [exchange, symbol] // Queue arguments as an array
                });
            }
        }
    },

    removeMarketDepthByPriceRequest: function (exchange, symbol) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            var req = priceSocketRequestHandler.generateRemoveSymbolRequest(exchange, symbol, PriceConstants.RequestType.Data.RequestMarketDepthByPrice);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    /* *
     * Subscribe and Un-subscribe from market depth by order updates
     * @param exchange Exchange code string
     * @param symbol Symbol code string
     */
    addMarketDepthByOrderRequest: function (exchange, symbol) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            if (this.isAuthenticated()) {
                this._sendMarketDepthByOrderRequest(exchange, symbol);
            } else {
                this.socketReqQueue.enqueue({
                    callbackFn: this._sendMarketDepthByOrderRequest,
                    args: [exchange, symbol] // Queue arguments as an array
                });
            }
        }
    },

    removeMarketDepthByOrderRequest: function (exchange, symbol) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            var req = priceSocketRequestHandler.generateRemoveSymbolRequest(exchange, symbol, PriceConstants.RequestType.Data.RequestMarketDepthByOrder);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    /* *
     * Subscribe and Un-subscribe from Intraday chart (OHLC) updates
     * @param exchange Exchange code string
     * @param symbol Symbol code string
     */
    addIntradayChartRequest: function (exchange, symbol) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            if (this.isPriceMetadataReady()) {
                this._sendIntraDayChartRequest(exchange, symbol);
            } else {
                this.socketReqQueue.enqueue({
                    callbackFn: this._sendIntraDayChartRequest,
                    args: [exchange, symbol] // Queue arguments as an array
                });
            }
        }
    },

    removeIntradayChartRequest: function (exchange, symbol) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            var req = priceSocketRequestHandler.generateRemoveSymbolRequest(exchange, symbol, PriceConstants.RequestType.Data.RequestOHLC);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    /* *
     * Subscribe and Un-subscribe from Intraday chart (TOPV) updates
     * @param exchange Exchange code string
     * @param symbol Symbol code string
     */
    addTOPVIntradayChartRequest: function (exchange, symbol) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            if (this.isPriceMetadataReady()) {
                this._sendTOPVIntraDayChartRequest(exchange, symbol);
            } else {
                this.socketReqQueue.enqueue({
                    callbackFn: this._sendTOPVIntraDayChartRequest,
                    args: [exchange, symbol] // Queue arguments as an array
                });
            }
        }
    },

    removeTOPVIntradayChartRequest: function (exchange, symbol) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            var req = priceSocketRequestHandler.generateRemoveSymbolRequest(exchange, symbol, PriceConstants.RequestType.Data.RequestTOPVOHLC);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    /* *
     * Subscribe and Un-subscribe from Announcements updates
     * @param exchange Exchange code string
     * @param language Language code string
     */
    addFullMarketAnnouncementRequest: function (exchange, language) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(language)) {
            var req = priceSocketRequestHandler.generateAddExchangeRequest(exchange, PriceConstants.RequestType.Data.RequestAnnouncement, language);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    removeFullMarketAnnouncementRequest: function (exchange, language) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(language)) {
            var req = priceSocketRequestHandler.generateRemoveExchangeRequest(exchange, PriceConstants.RequestType.Data.RequestAnnouncement, language);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    /* *
     * Subscribe and Un-subscribe from News updates
     * @param newsProvider News provider string
     * @param language Language code string
     */
    addFullMarketNewsRequest: function (newsProvider, language) {
        if (utils.validators.isAvailable(newsProvider) && utils.validators.isAvailable(language) &&
            this.userDS.isWindowTypeAvailable([PriceConstants.WindowType.News], 'SYS')) {
            var req = priceSocketRequestHandler.generateAddExchangeRequest(newsProvider, PriceConstants.RequestType.Data.RequestNews, language);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    removeFullMarketNewsRequest: function (newsProvider, language) {
        if (utils.validators.isAvailable(newsProvider) && utils.validators.isAvailable(language)) {
            var req = priceSocketRequestHandler.generateRemoveExchangeRequest(newsProvider, PriceConstants.RequestType.Data.RequestNews, language);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    /* *
     * Subscribe and Un-subscribe from time and sales updates
     * @param exchange Exchange code string
     * @param symbol Symbol code string
     */
    addTimeAndSalesRequest: function (exchange, symbol, isShowBuyerSeller) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            if (this.isAuthenticated() && this.isPriceMetadataReady()) {
                this._sendTimeAndSalesRequest(exchange, symbol, isShowBuyerSeller);
            } else {
                this.socketReqQueue.enqueue({
                    callbackFn: this._sendTimeAndSalesRequest,
                    args: [exchange, symbol, isShowBuyerSeller] // Queue arguments as an array
                });
            }
        }
    },

    addCalenderEventRequest: function (exchange, callbackFn) {
        if (utils.validators.isAvailable(exchange)) {
            if (this.isAuthenticated() && this.isPriceMetadataReady()) {
                this. _sendCalenderEventMixRequest(exchange, callbackFn);
            } else {
                this.socketReqQueue.enqueue({
                    callbackFn: this. _sendCalenderEventMixRequest,
                    args: [exchange] // Queue arguments as an array
                });
            }
        }
    },

    addYoutubeEventRequest: function (exchange, nextPageUrl, callbackFn) {
        if (utils.validators.isAvailable(exchange)) {
            if (this.isAuthenticated() && this.isPriceMetadataReady()) {
                this. _sendYoutubeEventMixRequest(nextPageUrl, callbackFn);
            } else {
                this.socketReqQueue.enqueue({
                    callbackFn: this. _sendInstagramEventMixRequest,
                    args: [exchange] // Queue arguments as an array
                });
            }
        }
    },

    addInstagramEventRequest: function (exchange) {
        if (utils.validators.isAvailable(exchange)) {
            if (this.isAuthenticated() && this.isPriceMetadataReady()) {
                this. _sendInstagramEventMixRequest();
            } else {
                this.socketReqQueue.enqueue({
                    callbackFn: this. _sendInstagramEventMixRequest,
                    args: [exchange] // Queue arguments as an array
                });
            }
        }
    },

    addFacebookEventRequest: function (exchange, nextPageUrl, callbackFn) {
        if (utils.validators.isAvailable(exchange)) {
            if (this.isAuthenticated() && this.isPriceMetadataReady()) {
                this. _sendFacebookEventMixRequest(nextPageUrl, callbackFn);
            } else {
                this.socketReqQueue.enqueue({
                    callbackFn: this. _sendFacebookEventMixRequest,
                    args: [exchange] // Queue arguments as an array
                });
            }
        }
    },

    addDownloadStatementRequest: function (requestObj) {
        if (this.isAuthenticated() && this.isPriceMetadataReady()) {
            this. _sendDownloadStatementMixRequest(requestObj);
        }
    },

    addPressReleaseRequest: function (exchange) {
        if (utils.validators.isAvailable(exchange)) {
            if (this.isAuthenticated() && this.isPriceMetadataReady()) {
                this. _sendPressReleaseMixRequest();
            } else {
                this.socketReqQueue.enqueue({
                    callbackFn: this. _sendPressReleaseMixRequest,
                    args: [exchange] // Queue arguments as an array
                });
            }
        }
    },

    removeTimeAndSalesRequest: function (exchange, symbol, isShowBuyerSeller) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            var reqType = isShowBuyerSeller ? PriceConstants.RequestType.Data.RequestTimeAndSalesDetail : PriceConstants.RequestType.Data.RequestTimeAndSales;
            var req = priceSocketRequestHandler.generateRemoveSymbolRequest(exchange, symbol, reqType);

            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    /* *
     * Subscribe and Un-subscribe from market time and sales updates
     * @param exchange Exchange code string
     */
    addMarketTimeAndSalesRequest: function (exchange) {
        if (utils.validators.isAvailable(exchange)) {
            if (this.isAuthenticated() && this.isPriceMetadataReady()) {
                this._sendMarketTimeAndSalesRequest(exchange);
            } else {
                this.socketReqQueue.enqueue({
                    callbackFn: this._sendMarketTimeAndSalesRequest,
                    args: [exchange] // Queue arguments as an array
                });
            }
        }
    },

    removeMarketTimeAndSalesRequest: function (exchange) {
        if (utils.validators.isAvailable(exchange)) {
            var req = priceSocketRequestHandler.generateRemoveExchangeRequest(exchange, PriceConstants.RequestType.Data.RequestTimeAndSales);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    /* *
     * Placing an Alert
     * @param exchange Exchange code string
     * @param symbol symbol code string
     * @param instrumentType instrument Type string
     * @param alertFilter alert Filter string
     * @param token alert token string
     * @param isEdit alert edit mode string
     */
    sendAlertPlaceRequest: function (exchange, symbol, instrumentType, alertFilter, token, isEdit) {
        var messageType = isEdit ? PriceConstants.RequestType.Data.RequestAlertUpdate : PriceConstants.RequestType.Data.RequestAlertPlace;
        var req = priceSocketRequestHandler.generateAlertPlaceRequest(exchange, symbol, instrumentType, alertFilter, token, messageType);

        this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
    },

    /* *
     * Alert History for client - WS
     *
     */
    sendAlertHistoryRequest: function () {
        var req = priceSocketRequestHandler.generateAlertHistoryRequest();
        this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
    },

    /* *
     * Alert UnSubscribe
     *
     * @param exchange Exchange code string
     * @param symbol symbol code string
     * @param instrumentType instrument Type string
     * @param token alert token string
     * */
    sendAlertUnsubscribeRequest: function (exchange, symbol, instrumentType, token) {
        var req = priceSocketRequestHandler.generateAlertUnsubscribeRequest(exchange, symbol, instrumentType, token);
        this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
    },

    /* *
     * Query top stock data
     * @param exchange Exchange code string
     * @param topStockType Top stock type string
     * @param subMarketCode Sub market code string
     * @param language Language code string
     */
    sendTopStocksRequest: function (exchange, topStockType, subMarketCode, language) {
        var req = priceSocketRequestHandler.generateTopStockRequest(exchange, topStockType, subMarketCode, language);
        this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
    },

    changePassword: function (reqObj, callbackFn) {
        var oldPwd = utils.crypto.encryptText(reqObj.oldPwd);
        reqObj.oldPwd = [';', utils.formatters.convertBase64toHEX(oldPwd)].join('');

        var newPwd = utils.crypto.encryptText(reqObj.newPwd);
        reqObj.newPwd = [';', utils.formatters.convertBase64toHEX(newPwd)].join('');

        var req = priceSocketRequestHandler.generateChangePasswordRequest(reqObj);

        this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        this.set('changePasswordCallback', callbackFn);
    },

    // MIX Requests

    // TODO: [Amila] Check the usages, and re-factor below mix requests
    // Symbol Validation Request to Receive Meta Data for a symbol
    sendSymbolValidationRequest: function (exchange, symbol) {
        mixRequestHandler.loadSymbolValidationData(exchange, symbol);
    },

    // Symbol Validation Request to Receive Meta Data for Symbol List
    sendSymbolValidationBulkRequest: function (symbolObjArray) {
        mixRequestHandler.loadSymbolValidationBulkData(symbolObjArray);
    },

    sendSymbolSearchRequest: function (searchKey, language, pageSize, notifyFn, params, searchNumber) {
        mixRequestHandler.loadSymbolSearchData(searchKey, language, pageSize, notifyFn, params, searchNumber);
    },

    // Company Profile
    sendCompanyProfileRequest: function (exchange, symbol, language, postSuccess, Error) {
        mixRequestHandler.loadCompanyProfileData(exchange, symbol, language, postSuccess, Error);
    },

    // Gms Summary
    sendGmsSummaryRequest: function () {
        if (this.isPriceMetadataReady()) {
            mixRequestHandler.loadGmsSummary();
        } else {
            this.mixReqQueue.enqueue({
                callbackFn: mixRequestHandler.loadGmsSummary
            });
        }
    },

    // System Meta Data
    sendSystemMetaDataRequest: function () {
        mixRequestHandler.loadSystemMetaData();
    },

    // Financials and Ratios Data request(RT=131)
    sendFinancialRatioDataRequest: function (exchange, symbol, language, secondSymAdded, primarySymbol, secondarySymbol, periodType, callbackFn) {
        mixRequestHandler.loadFinancialData(exchange, symbol, language, secondSymAdded, primarySymbol, secondarySymbol, periodType, callbackFn);
    },

    // Historical Closing Price Data
    sendClosingPriceRequest: function (exchange, symbol, language, startDate, endDate, callbackFn) {
        mixRequestHandler.loadClosingPriceData(exchange, symbol, language, startDate, endDate, callbackFn);
    },

    // Bookshelf Data
    sendBookShelfRequest: function (exchange) {
        mixRequestHandler.loadBookShelfData(exchange);
    },

    // New User Registration Data
    sendUserRegistrationRequest: function (username, password, email) {
        mixRequestHandler.sendUserRegistrationRequest(username, password, email);
    },

    // Investment ID
    sendInvestmentIdRequest: function (exchange, uname, callbackFn) {
        mixRequestHandler.loadInvestmentId(exchange, uname, callbackFn);
    },

    // Investor Portfolio Data
    sendInvestorPortfolioRequest: function (investId, callbackFn) {
        mixRequestHandler.loadInvestorPortfolioData(investId, callbackFn);
    },

    // Alert History
    sendAlertHistoryMetaRequest: function () {
        mixRequestHandler.loadAlertHistory();
    },

    // App Store Versions
    sendAppStoreVersionRequest: function (callbackFn) {
        mixRequestHandler.loadAppStoreVersion(callbackFn);
    },

    // Fundamental Score Data request(RT=131)
    sendFundamentalScoreRequest: function (exchange, callbackFn) {
        mixRequestHandler.loadFundamentalScoreData(exchange, callbackFn);
    },

    // Content Requests
    // RT = 306 (Composite Request)
    loadExchangeMetadata: function (exchanges, successFn, errorFn) {
        var that = this;

        Ember.$.each(exchanges, function (index, exg) {
            var metaSuccessFn = function () {
                if (that.pendingFullMktSubscriptions[exg]) {
                    that.addFullMarketSymbolRequest(exg);
                }

                if (Ember.$.isFunction(successFn)) {
                    successFn();
                }
            };

            mixRequestHandler.loadExchangeMetadata(exg, sharedService.userSettings.currentLanguage, metaSuccessFn, errorFn);
        });
    },

    processPriceMeta: function (language) {
        var priceMetaObj = priceMeta.get('metaData');

        Ember.$.each(priceMetaObj, function (exg, exgObj) {
            mixResponseHandler.processExchangeMetadataResponse(exgObj, language, exg);
        });
    },

    processPriceExchangeMeta: function (language) {
        var priceExgMetaObj = priceExchangeMeta.get('exgMetaData');
        mixResponseHandler.processExchangeSummaryResponse(priceExgMetaObj, language);
    },

    processPriceSymbolMeta: function (language) {
        var symbolMetaObj = priceSymbolMeta.get('metaData');

        Ember.$.each(symbolMetaObj, function (exg, exgObj) {
            mixResponseHandler.processExchangeSymbolResponse(exgObj, exg, language);
        });
    },

    languageChanged: function (language) {
        Ember.run.next(this, this._languageChanged, language);
    },

    _languageChanged: function (language) {
        this.exchangeDS.populatePriceExchangeMeta(language);
        this.exchangeDS.populatePriceMeta(language);
        this.exchangeDS.populatePriceSymbolMeta(language);
        this.exchangeDS.requestAllExchangeMetadata();
    },

    loadExchangeSymbolData: function (exchanges) {
        Ember.$.each(exchanges, function (index, exg) {
            mixRequestHandler.loadExchangeSymbolData(exg, sharedService.userSettings.currentLanguage);
        });
    },

    downloadIntradayOHLCData: function (params) {
        var numberOfDays;
        utils.logger.logTrace('Download Intraday is triggered from chart data provider');

        if (this.isAuthenticated() && this.isPriceMetadataReady()) {
            utils.logger.logTrace('Price Service: Auth success and Meta data ready for sending request');

            if (params.chartDataLevel === ChartConstants.ChartDataLevel.IntradayCurrentDay || params.chartDataLevel === ChartConstants.ChartDataLevel.IntradayFiveDay) {
                numberOfDays = params.chartDataLevel === ChartConstants.ChartDataLevel.IntradayCurrentDay ?
                    ChartConstants.ChartDataLevel.IntradayCurrentDay : ChartConstants.ChartDataLevel.IntradayFiveDay;

                mixRequestHandler.loadIntradayData(params.exchange, params.symbol, numberOfDays, params.chartType, params.reqSuccessFn, params.reqFailureFn);
            } else {
                mixRequestHandler.loadChartData(params.exchange, params.symbol, ChartConstants.ChartCategory.Intraday, params.begin, params.chartType, params.reqSuccessFn, params.reqFailureFn);
            }
        } else {
            utils.logger.logTrace('Price Service: Auth or Meta data ready fail sending request is queued');

            if (params.chartDataLevel === ChartConstants.ChartDataLevel.IntradayCurrentDay || params.chartDataLevel === ChartConstants.ChartDataLevel.IntradayFiveDay) {
                numberOfDays = params.chartDataLevel === ChartConstants.ChartDataLevel.IntradayCurrentDay ?
                    ChartConstants.ChartDataLevel.IntradayCurrentDay : ChartConstants.ChartDataLevel.IntradayFiveDay;

                this.mixReqQueue.enqueue({
                    callbackFn: mixRequestHandler.loadIntradayData,
                    args: [params.exchange, params.symbol, numberOfDays, params.chartType, params.reqSuccessFn, params.reqFailureFn] // Queue arguments as an array
                });
            } else {
                this.mixReqQueue.enqueue({
                    callbackFn: mixRequestHandler.loadChartData,
                    args: [params.exchange, params.symbol, ChartConstants.ChartCategory.Intraday, params.begin, params.chartType, params.reqSuccessFn, params.reqFailureFn] // Queue arguments as an array
                });
            }
        }
    },

    downloadTOPVIntradayOHLCData: function (params) {
        var numberOfDays;

        if (this.isPriceMetadataReady()) {
            if (params.chartDataLevel === ChartConstants.ChartDataLevel.IntradayCurrentDay || params.chartDataLevel === ChartConstants.ChartDataLevel.IntradayFiveDay) {
                mixRequestHandler.loadTOPVIntradayData(params.exchange, params.symbol, params.reqSuccessFn, params.reqFailureFn);
            } else {
                mixRequestHandler.loadTOPVChartData(params.exchange, params.symbol, ChartConstants.ChartCategory.Intraday, params.begin, params.reqSuccessFn, params.reqFailureFn);
            }
        } else {
            if (params.chartDataLevel === ChartConstants.ChartDataLevel.IntradayCurrentDay || params.chartDataLevel === ChartConstants.ChartDataLevel.IntradayFiveDay) {
                numberOfDays = params.chartDataLevel === ChartConstants.ChartDataLevel.IntradayCurrentDay ?
                    ChartConstants.ChartDataLevel.IntradayCurrentDay : ChartConstants.ChartDataLevel.IntradayFiveDay;

                this.mixReqQueue.enqueue({
                    callbackFn: mixRequestHandler.loadTOPVIntradayData,
                    args: [params.exchange, params.symbol, numberOfDays, params.reqSuccessFn, params.reqFailureFn] // Queue arguments as an array
                });
            } else {
                this.mixReqQueue.enqueue({
                    callbackFn: mixRequestHandler.loadTOPVChartData,
                    args: [params.exchange, params.symbol, ChartConstants.ChartCategory.Intraday, params.begin, params.reqSuccessFn, params.reqFailureFn] // Queue arguments as an array
                });
            }
        }
    },

    downloadHistoryOHLCData: function (params) {
        mixRequestHandler.loadChartData(
            params.exchange,
            params.symbol,
            ChartConstants.ChartCategory.History,
            params.begin,
            params.chartType,
            params.reqSuccessFn,
            params.reqFailureFn
        );
    },

    downloadTOPVHistoryData: function (params) {
        mixRequestHandler.loadTOPVChartData(
            params.exchange,
            params.symbol,
            ChartConstants.ChartCategory.History,
            params.begin,
            params.reqSuccessFn,
            params.reqFailureFn
        );
    },

    sendNewsAnnBodyRequest: function (params) {
        if (params.type === PriceConstants.ResponseType.Data.ResponseAnnouncement) {
            mixRequestHandler.loadAnnouncementBody(params.id, params.reqSuccessFn, params.reqFailureFn, params.lan);
        } else {
            mixRequestHandler.loadNewsBody(params.id, params.reqSuccessFn, params.reqFailureFn, params.lan);
        }
    },

    sendAnnouncementSearchRequest: function (params, announcementCollection) {
        mixRequestHandler.loadAnnouncementSearchData(params, announcementCollection);
    },

    sendNewsSearchRequest: function (params, newsCollection) {
        if (this.userDS.isWindowTypeAvailable([PriceConstants.WindowType.News], 'SYS')) {
            mixRequestHandler.loadNewsSearchData(params, newsCollection);
        }
    },

    sendTimeAndSalesBacklogRequest: function (exchange, symbol, endSequence, pgs) {
        if (utils.validators.isAvailable(exchange)) {
            if (this.isAuthenticated() && this.isPriceMetadataReady()) {
                this._sendTimeAndSalesMixRequest(exchange, symbol, endSequence, pgs);
            } else {
                this.mixReqQueue.enqueue({
                    callbackFn: this._sendTimeAndSalesMixRequest,
                    args: [exchange, symbol, endSequence, pgs] // Queue arguments as an array
                });
            }
        }
    },

    sendExchangeSummaryRequest: function () {
        var userExg = this.userDS.get('userExchg');

        Ember.$.each(appConfig.customisation.supportedLanguages, function (key, lang) {
            mixRequestHandler.sendExchangeSummaryRequest(userExg, lang.code);
        });
    },

    sendFairValueHistoricalPriceRequest: function (exg, sym, date, fvCallbackFn) {
        mixRequestHandler.loadFairValueHistoricalPriceData(exg, sym, date, fvCallbackFn);
    },

    sendFairValueReportRequest: function (docId, showReportFn) {
        mixRequestHandler.loadFairValueReport(docId, showReportFn);
    },

    sendFairValueReportDownloadRequest: function (reportGuId) {
        mixRequestHandler.downloadFairValueReport(reportGuId);
    },

    sendCorporateActionRequest: function (exchange, symbol, callbackFn, startDate) {
        mixRequestHandler.sendCorporateActionRequest(exchange, symbol, callbackFn, startDate);
    },

    sendVolumeWatcherRequest: function (exchange) {
        mixRequestHandler.sendVolumeWatcherRequest(exchange);
    },

    sendOptionChainRequest: function (params, callbackFn) {
        mixRequestHandler.sendOptionChainRequest(params, callbackFn);
    },

    sendProductSubscriptionRequest: function (productId, encryptedToken) {
        mixRequestHandler.sendProductSubscriptionRequest(productId, encryptedToken);
    },

    sendCDVAndYTDPRequest: function (exchange, callbackFn) {
        mixRequestHandler.loadCDVAndYTDPRequest(exchange, callbackFn);
    },

    sendBetaRequest: function (exchange, symbol, instrumentType, callbackFn) {
        mixRequestHandler.loadBetaRequest(exchange, symbol, instrumentType, callbackFn);
    },

    sendTechnicalScoreRequest: function (exchange, symbol, chartCategory, begin, callbackFn) {
        mixRequestHandler.loadTechnicalScoreData(exchange, symbol, chartCategory, begin, callbackFn);
    },

    sendToEmail: function (content, recipients) {
        if (appConfig.customisation.isEmbeddedMode) {
            if (window.opener) {
                window.opener.globals.sendEmail(content, recipients);
                utils.logger.logDebug('sendToEmail: success');
            } else {
                utils.logger.logDebug('sendToEmail: window.opener not available');
            }
        } else {
            window.open(content);
        }
    },

    notifyAlertTrigger: function (alert) {
        sharedService.getService('priceUI').notifyAlertTrigger(alert);
    },

    onPriceMetaReady: function (isSuccess) {
        if (isSuccess) {
            this.set('isPriceMetaReady', true);

            if (this.isAuthenticated()) {
                this._sendQueuedMixSocketRequest();
            }
        }

        this._sendPriceMetaReadySubscription(isSuccess);
    },

    addLoginIndexPanelRequest: function (callBackFunc) {
        this._addLoginIndexPanelRequest(callBackFunc);
    },

    /* *
     * Subscribe and Un-subscribe from xstream  updates
     * @param exchange Exchange Code string
     * @param symbol Index Code string
     */
    addXStreamRequest: function (exchange, symbol) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            var req = priceSocketRequestHandler.generateAddSymbolRequest(exchange, symbol, PriceConstants.RequestType.Data.RequestXStream);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    removeXStreamRequest: function (exchange, symbol) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            var req = priceSocketRequestHandler.generateRemoveSymbolRequest(exchange, symbol, PriceConstants.RequestType.Data.RequestXStream);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    addXStreamBulkRequest: function (exchange) {
        if (utils.validators.isAvailable(exchange)) {
            var req = priceSocketRequestHandler.generateAddExchangeRequest(exchange, PriceConstants.RequestType.Data.RequestXStream);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    removeXStreamBulkRequest: function (exchange) {
        if (utils.validators.isAvailable(exchange)) {
            var req = priceSocketRequestHandler.generateRemoveExchangeRequest(exchange, PriceConstants.RequestType.Data.RequestXStream);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    addFSBulkRequest: function (exchange) {
        if (utils.validators.isAvailable(exchange)) {
            var req = priceSocketRequestHandler.generateAddExchangeRequest(exchange, PriceConstants.RequestType.Data.RequestFSBulk);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    removeFSBulkRequest: function (exchange) {
        if (utils.validators.isAvailable(exchange)) {
            var req = priceSocketRequestHandler.generateRemoveExchangeRequest(exchange, PriceConstants.RequestType.Data.RequestFSBulk);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    addIntradayTechScoreRequest: function (exchange, symbol) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            if (this.isPriceMetadataReady()) {
                this._sendIntraDayTechScoreRequest(exchange, symbol);
            } else {
                this.socketReqQueue.enqueue({
                    callbackFn: this._sendIntraDayTechScoreRequest,
                    args: [exchange, symbol]
                });
            }
        }
    },

    removeIntradayTechScoreRequest: function (exchange, symbol) {
        if (utils.validators.isAvailable(exchange) && utils.validators.isAvailable(symbol)) {
            var req = priceSocketRequestHandler.generateRemoveSymbolRequest(exchange, symbol, PriceConstants.RequestType.Data.RequestTechnicalScore);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    /* *
     * Check whether user default exchange and current exchange available in authentication response
     * Update user exchanges according to subscription
     */
    _updateUserExchange: function (origAuthSuccessCb) {
        var that = this;
        var userExchgs = this.get('userDS.userExchg');

        if (userExchgs && userExchgs.length > 0) {
            var exg = userExchgs[0];

            if (userExchgs.contains(sharedService.userSettings.get('price.currentExchange'))) {
                this._exchangeMetaReady(origAuthSuccessCb, false);
            } else {
                this.exchangeDS.getExchangeMetadata(exg, true, function () {
                    that._exchangeMetaReady(origAuthSuccessCb, true);
                });

                if (!userExchgs.contains(sharedService.userSettings.get('price.userDefaultExg'))) {
                    sharedService.userSettings.set('price.userDefaultExg', exg);
                }

                utils.logger.logInfo('User current exchange updated to: ' + exg);
            }
        }
    },

    _exchangeMetaReady: function (origAuthSuccessCb, isRefreshWidgets) {
        var authSuccessSubscription = this.get('authSuccessSubscription');

        if (authSuccessSubscription) {
            Ember.$.each(authSuccessSubscription, function (id, subscriber) {
                if (subscriber && Ember.$.isFunction(subscriber.onAuthSuccess)) {
                    subscriber.onAuthSuccess();
                }
            });
        }

        if (isRefreshWidgets) {
            sharedService.getService('sharedUI').refreshPanelWidgets({exg: sharedService.userSettings.get('price.currentExchange')});
        }

        if (Ember.$.isFunction(origAuthSuccessCb)) {
            origAuthSuccessCb();
        }

        this.set('isAuthResponse', true);
    },

    _getStockMessageType: function (assetType) {
        var messageType;

        switch (assetType) {
            case utils.AssetTypes.Indices:
                messageType = PriceConstants.RequestType.Data.RequestIndex;
                break;

            case utils.AssetTypes.Option:
                messageType = PriceConstants.RequestType.Data.RequestOption;
                break;

            default:
                messageType = PriceConstants.RequestType.Data.RequestEquity;
                break;
        }

        return messageType;
    },

    _updateSymbolCodeArray: function (symbolCodeArray, assetType) {
        var that = this;

        Ember.$.each(symbolCodeArray, function (index, val) {
            symbolCodeArray[index] = that._updateSymbolCode(val, assetType);
        });

        return symbolCodeArray;
    },

    _updateSymbolCode: function (symbolCode, assetType) {
        return assetType === utils.AssetTypes.Option ? symbolCode.replaceAll('\\', '\\\\') : symbolCode;
    },

    _sendPriceMetaReadySubscription: function (isSuccess) {
        Ember.$.each(this.get('priceMetaReadySubscription'), function (key, subscriber) {
            if (subscriber && Ember.$.isFunction(subscriber.onPriceMetaReady)) {
                subscriber.onPriceMetaReady(isSuccess);
            }
        });
    },

    _sendQueuedMixSocketRequest: function () {
        while (this.mixReqQueue.getLength() > 0) {
            // Get queued request
            var mixReqObj = this.mixReqQueue.dequeue();

            // Call queued function
            // Pass-in queued arguments as an array, but use as properties inside callback function
            mixReqObj.callbackFn.apply(this, mixReqObj.args);
        }

        while (this.socketReqQueue.getLength() > 0) {
            // Get queued request
            var socketReqObj = this.socketReqQueue.dequeue();

            // Call queued function
            // Pass-in queued arguments as an array, but use as properties inside callback function
            socketReqObj.callbackFn.apply(this, socketReqObj.args);
        }
    },

    _sendMarketDepthByPriceRequest: function (exchange, symbol) {
        var mdpWindowTypes = [PriceConstants.WindowType.MarketDepthByPrice, PriceConstants.WindowType.MarketDepthByPriceAdvanced];

        if (!this.userDS.isExchangeDelayed(exchange) && this.userDS.isWindowTypeAvailable(mdpWindowTypes, exchange)) {
            var req = priceSocketRequestHandler.generateAddSymbolRequest(exchange, symbol, PriceConstants.RequestType.Data.RequestMarketDepthByPrice);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    _sendMarketDepthByOrderRequest: function (exchange, symbol) {
        var mdoWindowTypes = [PriceConstants.WindowType.MarketDepthByOrder, PriceConstants.WindowType.MarketDepthByOrderAdvanced];

        if (!this.userDS.isExchangeDelayed(exchange) && this.userDS.isWindowTypeAvailable(mdoWindowTypes, exchange)) {
            var req = priceSocketRequestHandler.generateAddSymbolRequest(exchange, symbol, PriceConstants.RequestType.Data.RequestMarketDepthByOrder);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    _sendTimeAndSalesRequest: function (exchange, symbol, isShowBuyerSeller) {
        if (!this.userDS.isExchangeDelayed(exchange)) {
            var reqType = isShowBuyerSeller ? PriceConstants.RequestType.Data.RequestTimeAndSalesDetail : PriceConstants.RequestType.Data.RequestTimeAndSales;
            var req = priceSocketRequestHandler.generateAddSymbolRequest(exchange, symbol, reqType);

            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    _sendMarketTimeAndSalesRequest: function (exchange) {
        if (!this.userDS.isExchangeDelayed(exchange)) {
            var req = priceSocketRequestHandler.generateAddExchangeRequest(exchange, PriceConstants.RequestType.Data.RequestTimeAndSales);
            this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
        }
    },

    _sendIntraDayChartRequest: function (exchange, symbol) {
        var req = priceSocketRequestHandler.generateAddSymbolRequest(exchange, symbol, PriceConstants.RequestType.Data.RequestOHLC);
        this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
    },

    _sendTOPVIntraDayChartRequest: function (exchange, symbol) {
        var req = priceSocketRequestHandler.generateAddSymbolRequest(exchange, symbol, PriceConstants.RequestType.Data.RequestTOPVOHLC);
        this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
    },

    _sendTimeAndSalesMixRequest: function (exchange, symbol, endSequence, pgs) {
        if (!this.userDS.isExchangeDelayed(exchange)) {
            mixRequestHandler.sendTimeAndSalesBackLogRequest(exchange, symbol, endSequence, pgs);
        }
    },

    _sendCalenderEventMixRequest: function (exchange, callbackFn) {
        mixRequestHandler.sendCalenderEventsRequest(exchange, callbackFn);
    },

    _sendYoutubeEventMixRequest: function (nextPageUrl, callbackFn) {
        mixRequestHandler.sendYoutubeEventsRequest(nextPageUrl, callbackFn);
    },

    _sendInstagramEventMixRequest: function () {
        mixRequestHandler.sendInstagramEventsRequest();
    },

    _sendFacebookEventMixRequest: function (nextPageUrl, callbackFn) {
        mixRequestHandler.sendFacebookEventsRequest(nextPageUrl, callbackFn);
    },

    _sendDownloadStatementMixRequest: function (requestObj) {
        mixRequestHandler.sendDownloadStatementRequest(requestObj);
    },

    _sendPressReleaseMixRequest: function () {
        mixRequestHandler.sendPressReleaseRequest();
    },

    _sendAddFullMarketSymbolRequest: function (exchange, subMarketId) {
        var req;

        if (subMarketId) {
            req = priceSocketRequestHandler.generateAddExchangeRequest(exchange, PriceConstants.RequestType.Data.RequestEquity, '', subMarketId);
        } else {
            req = priceSocketRequestHandler.generateAddExchangeRequest(exchange, PriceConstants.RequestType.Data.RequestEquity);
        }

        this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
    },

    _sendRemoveFullMarketSymbolRequest: function (exchange, subMarketId) {
        var req;

        if (subMarketId) {
            req = priceSocketRequestHandler.generateRemoveExchangeRequest(exchange, PriceConstants.RequestType.Data.RequestEquity, '', subMarketId);
        } else {
            req = priceSocketRequestHandler.generateRemoveExchangeRequest(exchange, PriceConstants.RequestType.Data.RequestEquity);
        }

        this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
    },

    _addLoginIndexPanelRequest: function (callBackFunc) {
        mixRequestHandler.sendLoginIndexPanelRequest(callBackFunc);
    },

    sendFileUploadRequest: function (data, callBackFunc) {
        mixRequestHandler.uploadFile(data, callBackFunc);
    },

    _sendIntraDayTechScoreRequest: function (exchange, symbol) {
        var req = priceSocketRequestHandler.generateAddSymbolRequest(exchange, symbol, PriceConstants.RequestType.Data.RequestTechnicalScore);
        this.webSocketManager.sendData(req, PriceConstants.SocketConnectionType.QuoteServer);
    }
});
