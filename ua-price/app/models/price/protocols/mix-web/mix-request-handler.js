import Ember from 'ember';
import WebConnection from '../../../shared/communication-adapters/web-http-connection';
import ResponseHandler from './mix-response-handler';
import RequestGenerator from './mix-request-generator';
import sharedService from '../../../shared/shared-service';
import ChartConstants from '../../../chart/chart-constants';
import utils from '../../../../utils/utils';

export default (function () {
    var loadExchangeMetadata = function (exchange, language, successFn, errorFn) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateExchangeMetadataUrl(exchange, language),

            onSuccess: function (dataObj) {
                ResponseHandler.processExchangeMetadataResponse(dataObj, language, exchange);

                if (Ember.$.isFunction(successFn)) {
                    successFn();
                }
            },

            onError: function () {
                var priceService = sharedService.getService('price');

                if (exchange === sharedService.userSettings.price.defaultExchange) {
                    priceService.set('isDefaultMetaRequestFail', true);
                }

                if (Ember.$.isFunction(errorFn)) {
                    errorFn();
                }

                priceService.onPriceMetaReady(false); // Pass false when price meta fail
                // TODO: Handle error on exchange data loading
            }
        });
    };

    var loadSymbolValidationData = function (exchange, symbol, instrumentType) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateSymbolValidationUrl(exchange, symbol, instrumentType),
            onSuccess: ResponseHandler.processSymbolValidationResponse,

            onError: function () {
                // TODO: Handle error on symbol validation data loading
            }
        });
    };

    var loadSymbolValidationBulkData = function (symbolObjArray) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateSymbolValidationBulkUrl(symbolObjArray),
            onSuccess: ResponseHandler.processSymbolValidationResponse,

            onError: function () {
                // TODO: Handle error on symbols validation data loading
            }
        });
    };

    var loadSymbolSearchData = function (searchKey, language, pageSize, notifyFn, params, searchNumber) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateSymbolSearchUrl(searchKey, language, pageSize, params),

            onSuccess: function (dataObj) {
                ResponseHandler.processSymbolSearchResponse(dataObj, searchKey, notifyFn, searchNumber);
            },

            onError: function () {
                // TODO: Handle error on symbol search data loading
            }
        });
    };

    //
    // Chart specific requests
    //
    var loadIntradayData = function (exchange, symbol, numberOfDays, chartType, reqSuccessFn, reqFailureFn) {
        utils.logger.logTrace('Load Intraday Data is triggered from Mix request handler');

        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateIntradayDataUrl(exchange, symbol, numberOfDays, chartType),

            onSuccess: function (dataObj) {
                ResponseHandler.processChartResponse(dataObj, ChartConstants.ChartCategory.Intraday, reqSuccessFn, reqFailureFn);
            },

            onError: function () {
                // TODO: Handle error on chart data loading
            }
        });
    };

    var loadChartData = function (exchange, symbol, chartCategory, begin, chartType, reqSuccessFn, reqFailureFn) {
        utils.logger.logTrace('Load Chart Data is triggered from Mix request handler');

        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateChartDataUrl(exchange, symbol, chartCategory, begin, chartType),

            onSuccess: function (dataObj) {
                ResponseHandler.processChartResponse(dataObj, chartCategory, reqSuccessFn, reqFailureFn);
            },

            onError: function () {
                // TODO: Handle error on chart data loading
            }
        });
    };

    //
    // News & announcement specific requests
    //
    var loadAnnouncementBody = function (annID, reqSuccessFn, reqFailureFn, language) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateAnnouncementBodyUrl(annID, language),

            onSuccess: function (dataObj) {
                ResponseHandler.processAnnouncementBodyResponse(dataObj, reqSuccessFn, reqFailureFn);
            },

            onError: function () {
                if (Ember.$.isFunction(reqFailureFn)) {
                    reqFailureFn();
                }
            }
        });
    };

    var loadAnnouncementSearchData = function (params, annCollection) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateAnnouncementSearchUrl(params),

            onSuccess: function (dataObj) {
                ResponseHandler.processAnnouncementSearchResponse(dataObj, annCollection, params.reqSuccessFn, params.reqFailureFn);
            },

            onError: function () {
                // TODO: Handle error on data loading
            }
        });
    };

    var loadNewsBody = function (newsID, reqSuccessFn, reqFailureFn, language) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateNewsBodyUrl(newsID, language),

            onSuccess: function (dataObj) {
                ResponseHandler.processNewsBodyResponse(dataObj, reqSuccessFn, reqFailureFn);
            },

            onError: function () {
                if (Ember.$.isFunction(reqFailureFn)) {
                    reqFailureFn();
                }
            }
        });
    };

    var loadNewsSearchData = function (params, newsCollection) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateNewsSearchUrl(params),

            onSuccess: function (dataObj) {
                ResponseHandler.processNewsSearchResponse(dataObj, newsCollection, params.reqSuccessFn, params.reqFailureFn);
            },

            onError: function () {
                // TODO: Handle error on data loading
            }
        });
    };

    //
    // Company Profile specific requests
    //
    var loadCompanyProfileData = function (exchange, symbol, language, postSuccess, Error) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateCompanyProfileUrl(exchange, symbol),

            onSuccess: function (dataObj) {
                ResponseHandler.processCompanyProfileResponse(dataObj, exchange, symbol, language);

                if (Ember.$.isFunction(postSuccess)) {
                    postSuccess();
                }
            },

            onError: function () {
                // TODO: Handle error on symbol data loading
                if (Ember.$.isFunction(Error)) {
                    Error();
                }
            }
        });
    };

    // Gms summary specific profile
    var loadGmsSummary = function () {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateGmsSummaryUrl(),

            onSuccess: function (dataObj) {
                ResponseHandler.processGmsSummaryResponse(dataObj);
            },

            onError: function () {
                // TODO: Handle error on symbol data loading
                if (Ember.$.isFunction(Error)) {
                    Error();
                }
            }
        });
    };

    // System Meta Data specific Request
    var loadSystemMetaData = function () {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateSystemMetaDataUrl(),

            onSuccess: function (dataObj) {
                ResponseHandler.processSystemMetaDataResponse(dataObj);
            },

            onError: function () {
                // TODO: Handle error on symbol data loading
                if (Ember.$.isFunction(Error)) {
                    Error();
                }
            }
        });
    };

    //
    // Alert Specific Requests
    //
    var loadAlertHistory = function () {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateAlertHistoryUrl(),

            onSuccess: function (dataObj) {
                ResponseHandler.processAlertHistoryResponse(dataObj);
            },

            onError: function () {
                if (Ember.$.isFunction(Error)) {
                    Error();
                }
            }
        });
    };

    var loadFairValueHistoricalPriceData = function (exg, sym, date, fvCallbackFn) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateFairValueHistoricalPriceUrl(exg, sym, date),

            onSuccess: function (dataObj) {
                ResponseHandler.processFairValueHistoricalPriceResponse(dataObj);
                fvCallbackFn();
            },

            onError: function (error) {
                ResponseHandler.onError('Fair Value Data Request Error - ' + error);
            }
        });
    };

    var loadFairValueReport = function (docId, showReportFn) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateFairValueReportUrl(docId),

            onSuccess: function (dataObj) {
                var reportGuId = ResponseHandler.processFairValueReportResponse(dataObj);

                showReportFn(reportGuId);
            },

            onError: function (error) {
                ResponseHandler.onError('Fair Value Report Request Error - ' + error);
            }
        });
    };

    var downloadFairValueReport = function (reportGuId) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateFairValueReportLinkUrl(reportGuId),

            onSuccess: function () {
                utils.logger.logDebug('Download pdf response received');
            },

            onError: function (e) {
                ResponseHandler.onError('Fair Value Report Download Error - ' + e);
            }
        });
    };

    var sendTimeAndSalesBackLogRequest = function (exchange, symbol, endSequence, pgs) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateTimeAndSalesBacklogUrl(exchange, symbol, endSequence, pgs),
            onSuccess: ResponseHandler.processTimeAndSalesBacklogResponse,

            onError: function () {
                // TODO: Handle error on symbol validation data loading
            }
        });
    };

    var sendCalenderEventsRequest = function (exg, callbackFn) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateCalenderEventsUrl(),
            onSuccess: function (dataObj) {
                ResponseHandler.processCalenderEventsResponse(dataObj, callbackFn);
                callbackFn();
            },

            onError: function () {
                // TODO: Handle error on Calender Events validation data loading
            }
        });
    };

    var sendYoutubeEventsRequest = function (nextPageUrl, callbackFn) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateYoutubeUrl(nextPageUrl),
            onSuccess: function (dataObj) {
                ResponseHandler.processYoutubeEventsResponse(dataObj, callbackFn);
            },

            onError: function () {
                // TODO: Handle error on Youtube validation data loading
            }
        });
    };

    var sendInstagramEventsRequest = function () {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateInstagramUrl(),
            async: true,
            contentType: 'text/plain; charset=us-ascii',
            headers: {},
            dataType: 'text',
            onSuccess: function (dataObj) {
                ResponseHandler.processInstagramEventsResponse(dataObj);
            },

            onError: function () {
                // TODO: Handle error on Instagram validation data loading
            }
        });
    };

    var sendFacebookEventsRequest = function (nextPageUrl, callbackFn) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateFacebookUrl(nextPageUrl),
            onSuccess: function (dataObj) {
                ResponseHandler.processFacebookEventsResponse(dataObj, nextPageUrl, callbackFn);
            },
            onError: function () {
                // TODO: Handle error on Facebook validation data loading
            }
        });
    };

    var sendDownloadStatementRequest = function (requestObj) {
        window.open(RequestGenerator.generateDownloadStatementUrl(requestObj));
    };

    var sendPressReleaseRequest = function () {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generatePressReleaseUrl(),
            onSuccess: function (dataObj) {
                ResponseHandler.processPressReleaseResponse(dataObj);
            },

            onError: function () {
                // TODO: Handle error on Press Releases validation data loading
            }
        });
    };

    var sendExchangeSummaryRequest = function (exchanges, language) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateExchangeSummaryUrl(exchanges, language),

            onSuccess: function (dataObj) {
                ResponseHandler.processExchangeSummaryResponse(dataObj, language);
            },

            onError: function () {
                // TODO: Handle error on data loading
            }
        });
    };

    var sendCorporateActionRequest = function (exchange, symbol, callbackFn, startDate) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateCorporateActionUrl(exchange, symbol, startDate),

            onSuccess: function (dataObj) {
                var corporateActionArray = ResponseHandler.processCorporateActionResponse(dataObj);
                callbackFn(corporateActionArray);
            },

            onError: function () {
                // TODO: Handle error on data loading
            }
        });
    };

    var loadTOPVIntradayData = function (exchange, symbol, reqSuccessFn, reqFailureFn) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateTOPVIntradayDataUrl(exchange, symbol),

            onSuccess: function (dataObj) {
                ResponseHandler.processTOPVChartResponse(dataObj, ChartConstants.ChartCategory.Intraday, reqSuccessFn, reqFailureFn);
            },

            onError: function () {
                // TODO: Handle error on chart data loading
            }
        });
    };

    var loadTOPVChartData = function (exchange, symbol, chartCategory, begin, reqSuccessFn, reqFailureFn) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateTOPVChartDataUrl(exchange, symbol, chartCategory, begin),

            onSuccess: function (dataObj) {
                ResponseHandler.processTOPVChartResponse(dataObj, chartCategory, reqSuccessFn, reqFailureFn);
            },

            onError: function (error) {
                ResponseHandler.onError('loadTOPVChartData - ' + error);
            }
        });
    };

    var sendVolumeWatcherRequest = function (exchanges) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateVolumeWatcherURL(exchanges),

            onSuccess: function (dataObj) {
                ResponseHandler.processVolumeWatcherResponse(dataObj);
            },

            onError: function (error) {
                ResponseHandler.onError('sendVolumeWatcherRequest - ' + error);
            }
        });
    };

    var sendOptionChainRequest = function (params, callbackFn) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateOptionChainURL(params),

            onSuccess: function (dataObj) {
                if (params.optListType === 0) {
                    ResponseHandler.processOptionChainResponse(dataObj, params.exg, params.sym, callbackFn);
                } else {
                    var responseTag = params.optType === 0 ? 'OL' : 'WOL';
                    ResponseHandler.processOptionListResponse(dataObj, params.exg, params.sym, callbackFn, responseTag);
                }
            },

            onError: function (error) {
                ResponseHandler.onError('sendOptionChainRequest - ' + error);
            }
        });
    };

    var loadExchangeSymbolData = function (exchange, language) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateExchangeSymbolDataUrl(exchange),

            onSuccess: function (dataObj) {
                ResponseHandler.processExchangeSymbolResponse(dataObj, exchange, language);
            },

            onError: function () {
                // TODO: Handle error on symbol data loading
            }
        });
    };

    var sendProductSubscriptionRequest = function (productId, encryptedToken) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateProductSubscriptionUrl(productId, encryptedToken),

            onSuccess: function () {
                // Response is not needed to be processed
            },

            onError: function () {
                // Response is not needed to be processed
            }
        });
    };

    var sendLoginIndexPanelRequest = function (callBackFunc) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateLoginIndexPanelUrl(),
            onSuccess: function (dataObj) {
                ResponseHandler.processLoginIndexPanelResponse(dataObj, callBackFunc);
            },

            onError: function () {
                // TODO: Handle error on Login Index Panel
            }
        });
    };

    // Financial Data Request
    var loadFinancialData = function (exchange, symbol, language, secondSymAdded, primarySymbol, secondarySymbol, periodType, callbackFn) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateFinancialUrl(exchange, symbol, language, periodType),

            onSuccess: function (dataObj) {
                ResponseHandler.processFinancialResponse(dataObj, exchange, symbol, secondSymAdded, primarySymbol, secondarySymbol, periodType, callbackFn);
            },

            onError: function () {
                if (Ember.$.isFunction(Error)) {
                    Error();
                }
            }
        });
    };

    // Historical Closing Price Data
    var loadClosingPriceData = function (exchange, symbol, language, startDate, endDate, callbackFn) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateClosingPriceUrl(exchange, symbol, language, startDate, endDate),

            onSuccess: function (dataObj) {
                ResponseHandler.processClosingPriceResponse(dataObj, callbackFn);
            },

            onError: function () {
                if (Ember.$.isFunction(Error)) {
                    Error();
                }
            }
        });
    };

    // Book Shelf Data
    var loadBookShelfData = function (exchange) {

        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateBookShelfUrl(exchange),

            onSuccess: function (dataObj) {
                ResponseHandler.processBookShelfResponse(dataObj);
            },

            onError: function () {
                if (Ember.$.isFunction(Error)) {
                    Error();
                }
            }
        });
    };

    // New User Registration Data
    var sendUserRegistrationRequest = function (username, password, email) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateUserRegistrationUrl(username, password, email),

            onSuccess: function (dataObj) {
                ResponseHandler.processUserRegistrationResponse(dataObj);
            },

            onError: function () {
                // Response is not needed to be processed
            }
        });
    };

    // Investment ID Request
    var loadInvestmentId = function (exchange, uname, callbackFn) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateInvestmentIdUrl(uname),

            onSuccess: function (dataObj) {
                ResponseHandler.processInvestmentIdResponse(dataObj, exchange, callbackFn);
            },

            onError: function () {
                if (Ember.$.isFunction(Error)) {
                    Error();
                }
            }
        });
    };

    // Investor Portfolio Request
    var loadInvestorPortfolioData = function (investId, callbackFn) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateInvestorPortfolioUrl(investId),

            onSuccess: function (dataObj) {
                ResponseHandler.processInvestorPortfolioResponse(dataObj, investId, callbackFn);
            },

            onError: function () {
                if (Ember.$.isFunction(Error)) {
                    Error();
                }
            }
        });
    };

    // AppStore Version Request
    var loadAppStoreVersion = function (callbackFn) {
        WebConnection.sendAjaxRequest({
            url: 'version.json',

            onSuccess: function (dataObj) {
                if (Ember.$.isFunction(callbackFn)) {
                    callbackFn(dataObj);
                }
            },

            onError: function (error) {
                if (Ember.$.isFunction(callbackFn)) {
                    callbackFn(error);
                }
            }
        });
    };

    var uploadFile = function (file, callbackFn) {
        var formData = new FormData();
        formData.append('filename', file);

        WebConnection.sendAjaxRequest({
            url: sharedService.getService('price').settings.urlTypes.upload,
            type: 'POST',
            enctype: 'multipart/form-data',
            contentType: false,
            processData: false,
            dataType: false,
            headers: false,
            data: formData,

            onSuccess: function (dataObj) {
                if (Ember.$.isFunction(callbackFn)) {
                    callbackFn(dataObj);
                }
            },

            onError: function (error) {
                if (Ember.$.isFunction(callbackFn)) {
                    callbackFn(error);
                }
            }
        });
    };

    // CDV and YTDP Request
    var loadCDVAndYTDPRequest = function (exchange, callbackFn) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateCDVAndYTDPUrl(exchange),

            onSuccess: function (dataObj) {
                ResponseHandler.processCDVAndYTDPUrlResponse(dataObj, callbackFn);
            },

            onError: function () {
                if (Ember.$.isFunction(Error)) {
                    Error();
                }
            }
        });
    };

    // Beta
    var loadBetaRequest = function (exchange, symbol, instrumentType, callbackFn) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateBetaUrl(exchange, symbol, instrumentType),

            onSuccess: function (dataObj) {
                ResponseHandler.processBetaResponse(dataObj, callbackFn);
            },

            onError: function () {
                if (Ember.$.isFunction(Error)) {
                    Error();
                }
            }
        });
    };

    var loadFundamentalScoreData = function (exchange, callbackFn) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateFundamentalScoreURL(exchange),

            onSuccess: function (dataObj) {
                ResponseHandler.processFundamentalScoreResponse(dataObj);

                if (Ember.$.isFunction(callbackFn)) {
                    callbackFn();
                }
            },

            onError: function (error) {
                ResponseHandler.onError('sendFundamentalScoreRequest - ' + error);
            }
        });
    };

    var loadTechnicalScoreData = function (exchange, symbol, chartCategory, begin, reqSuccessFn, reqFailureFn) {
        WebConnection.sendAjaxRequest({
            url: RequestGenerator.generateTechnicalScoreUrl(exchange, symbol, chartCategory, begin),

            onSuccess: function (dataObj) {
                ResponseHandler.processTechnicalScoreResponse(dataObj, chartCategory, reqSuccessFn, reqFailureFn);
            },

            onError: function () {
                if (Ember.$.isFunction(Error)) {
                    Error();
                }
            }
        });
    };

    return {
        loadExchangeMetadata: loadExchangeMetadata,
        loadSymbolValidationData: loadSymbolValidationData,
        loadSymbolValidationBulkData: loadSymbolValidationBulkData,
        loadSymbolSearchData: loadSymbolSearchData,
        loadIntradayData: loadIntradayData,
        loadChartData: loadChartData,
        loadAnnouncementBody: loadAnnouncementBody,
        loadNewsBody: loadNewsBody,
        loadAnnouncementSearchData: loadAnnouncementSearchData,
        loadNewsSearchData: loadNewsSearchData,
        loadCompanyProfileData: loadCompanyProfileData,
        loadGmsSummary: loadGmsSummary,
        loadSystemMetaData: loadSystemMetaData,
        loadAlertHistory: loadAlertHistory,
        loadFairValueHistoricalPriceData: loadFairValueHistoricalPriceData,
        loadFairValueReport: loadFairValueReport,
        downloadFairValueReport: downloadFairValueReport,
        sendTimeAndSalesBackLogRequest: sendTimeAndSalesBackLogRequest,
        sendCalenderEventsRequest: sendCalenderEventsRequest,
        sendYoutubeEventsRequest: sendYoutubeEventsRequest,
        sendInstagramEventsRequest: sendInstagramEventsRequest,
        sendFacebookEventsRequest: sendFacebookEventsRequest,
        sendDownloadStatementRequest: sendDownloadStatementRequest,
        sendPressReleaseRequest: sendPressReleaseRequest,
        sendExchangeSummaryRequest: sendExchangeSummaryRequest,
        sendCorporateActionRequest: sendCorporateActionRequest,
        loadTOPVChartData: loadTOPVChartData,
        loadTOPVIntradayData: loadTOPVIntradayData,
        sendVolumeWatcherRequest: sendVolumeWatcherRequest,
        sendOptionChainRequest: sendOptionChainRequest,
        loadExchangeSymbolData: loadExchangeSymbolData,
        sendProductSubscriptionRequest: sendProductSubscriptionRequest,
        sendLoginIndexPanelRequest: sendLoginIndexPanelRequest,
        loadClosingPriceData: loadClosingPriceData,
        loadBookShelfData: loadBookShelfData,
        loadFinancialData: loadFinancialData,
        sendUserRegistrationRequest: sendUserRegistrationRequest,
        loadInvestmentId: loadInvestmentId,
        loadAppStoreVersion: loadAppStoreVersion,
        loadInvestorPortfolioData: loadInvestorPortfolioData,
        uploadFile: uploadFile,
        loadCDVAndYTDPRequest: loadCDVAndYTDPRequest,
        loadBetaRequest: loadBetaRequest,
        loadFundamentalScoreData: loadFundamentalScoreData,
        loadTechnicalScoreData: loadTechnicalScoreData
    };
})();
