import Ember from 'ember';
import PriceConstants from '../../price-constants';
import sharedService from '../../../../models/shared/shared-service';
import ChartConstants from '../../../chart/chart-constants';
import utils from '../../../../utils/utils';
import appConfig from '../../../../config/app-config';

export default (function () {
    var generateExchangeMetadataUrl = function (exchange, language) {
        var metaObj = sharedService.getService('price').priceMeta.getExgMetaObj(exchange);
        var wlVer = metaObj.DAT.VRS.WL;
        var srcVer = metaObj.DAT.VRS.SRC;

        var queryParams = {
            RT: PriceConstants.MixRequest.ExchangeFullMeta.RT,
            SRC: exchange,
            MOD: PriceConstants.MetaVersionKeys.WatchList + ':' + ((wlVer) ? wlVer : '0') + ',' +
            PriceConstants.MetaVersionKeys.ExchangeDefinitions + ':' + ((srcVer) ? srcVer : '0'),
            L: language
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.price, queryParams, _getGeneralQueryParams());
    };

    var generateSymbolSearchUrl = function (searchKey, language, pageSize, params) {
        var queryParams = {
            RT: PriceConstants.MixRequest.SymbolSearch.RT,
            ST: PriceConstants.MixRequest.SymbolSearch.ST,
            PGI: '0',
            PGS: pageSize,
            IFLD: PriceConstants.MixRequest.SymbolSearch.IFLD,
            XFLD: PriceConstants.MixRequest.SymbolSearch.XFLD,
            SK: searchKey,
            AE: PriceConstants.MixRequestParameters.AllExchange,
            L: language
        };

        // Only option symbols should be available in option symbol search, else other symbols except options
        queryParams.UE = params.isOptionMode ? 'OPRA' : sharedService.getService('price').userDS.get('allExg').removeInClone('OPRA').join(utils.Constants.StringConst.Comma);

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.content, queryParams, _getGeneralQueryParams());
    };

    var generateSymbolValidationUrl = function (exchange, symbol, instrumentType) {
        var validationSymbol = _getValidationSymbol(exchange, symbol, instrumentType);

        var queryParams = {
            RT: PriceConstants.MixRequest.SymbolValidation.RT,
            E: exchange,
            S: validationSymbol,
            AE: PriceConstants.MixRequestParameters.AllExchange,
            AS: PriceConstants.MixRequestParameters.None
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.price, queryParams, _getGeneralQueryParams());
    };

    var generateSymbolValidationBulkUrl = function (symbolObjArray) {
        var symArray = [];

        Ember.$.each(symbolObjArray, function (index, valueObj) {
            symArray[symArray.length] = _getValidationSymbol(valueObj.exg, valueObj.sym, valueObj.inst);
        });

        var queryParams = {
            RT: PriceConstants.MixRequest.SymbolValidation.RT,
            S: symArray.join(utils.Constants.StringConst.Comma), // Symbol list
            AE: PriceConstants.MixRequestParameters.AllExchange,
            AS: PriceConstants.MixRequestParameters.None,
            UNC: '0'
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.price, queryParams, _getGeneralQueryParams());
    };

    //
    // News & announcement specific requests
    //
    var generateAnnouncementBodyUrl = function (annID, language) {
        var queryParams = {
            RT: PriceConstants.MixRequest.AnnouncementBody.RT,
            AI: annID, // Announcement Id
            L: language
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.price, queryParams, _getGeneralQueryParams());
    };

    var generateNewsBodyUrl = function (newsID, language) {
        var queryParams = {
            RT: PriceConstants.MixRequest.NewsBody.RT,
            NI: newsID, // News Id
            L: language
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.price, queryParams, _getGeneralQueryParams());
    };

    var generateAnnouncementSearchUrl = function (params) {
        var queryParams = {
            RT: PriceConstants.MixRequest.AnnouncementSearch.RT,
            AE: PriceConstants.MixRequestParameters.None,
            UNC: PriceConstants.MixRequestParameters.None,
            PGS: params.pageSize
        };

        if (params.AllExchange) {
            queryParams.AE = params.AllExchange;
        }

        if (params.exgList) {
            queryParams.UE = params.exgList;
        }

        if (params.exchange) {
            queryParams.E = params.exchange;
        }

        if (params.searchKey) {
            queryParams.SK = encodeURI(params.searchKey);
        }

        if (params.symbol) {
            queryParams.S = params.symbol;
        }

        if (params.startDate) {
            queryParams.SD = params.startDate;
        }

        if (params.endDate) {
            queryParams.ED = params.endDate;
        }

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.content, queryParams, _getGeneralQueryParams());
    };

    var generateNewsSearchUrl = function (params) {
        var queryParams = {
            RT: PriceConstants.MixRequest.NewsSearch.RT,
            AE: PriceConstants.MixRequestParameters.None,
            UNC: PriceConstants.MixRequestParameters.None,
            PGS: params.pageSize
        };

        if (params.AllExchange) {
            queryParams.AE = params.AllExchange;
        }

        if (params.exchange) {
            queryParams.E = params.exchange;
        }

        if (params.searchKey) {
            queryParams.SK = encodeURI(params.searchKey);
        }

        if (params.symbol) {
            queryParams.S = params.symbol;
        }

        if (params.provider) {
            queryParams.PRV = params.provider;
        }

        if (params.startDate) {
            queryParams.SD = params.startDate;
        }

        if (params.endDate) {
            queryParams.ED = params.endDate;
        }

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.content, queryParams, _getGeneralQueryParams());
    };

    //
    // Company Profile specific requests
    //
    var generateCompanyProfileUrl = function (exchange, symbol) {
        var symbolKey = _getValidationSymbol(exchange, symbol);
        var queryParams = {
            RT: PriceConstants.MixRequest.CompanyProfile.RT,
            S: symbolKey,
            CIT: PriceConstants.MixRequest.CompanyProfile.CIT,
            FC: '1',
            UNC: '0'
        };
        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.content, queryParams, _getGeneralQueryParams());
    };

    // Gms summary specific request
    var generateGmsSummaryUrl = function () {
        var queryParams = {
            RT: PriceConstants.MixRequest.SymbolMetaDetails.RT,
            MOD: 'GMS'
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.gms, queryParams, _getGeneralQueryParams());
    };

    // System Meta Data specific request
    var generateSystemMetaDataUrl = function () {
        var queryParams = {
            RT: PriceConstants.MixRequest.SymbolMetaDetails.RT
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.price, queryParams, _getGeneralQueryParams());
    };

    var generateTimeAndSalesBacklogUrl = function (exchange, symbol, endSequence, pgs) {
        var queryParams = {
            RT: PriceConstants.MixRequest.TimeAndSalesBacklog.RT,
            E: exchange,
            S: symbol ? symbol : '',
            AS: symbol === undefined ? PriceConstants.MixRequestParameters.AllSymbol : PriceConstants.MixRequestParameters.None,
            CT: PriceConstants.MixRequest.TimeAndSalesBacklog.ChartType.TickCount,
            SO: 'DESC',
            SC: PriceConstants.MixRequestParameters.None
        };

        if (pgs) {
            queryParams = Ember.$.extend(queryParams, {PGS: pgs});
        }

        if (appConfig.customisation.isShowBuyerSeller) {
            queryParams = Ember.$.extend(queryParams, {DT: 1});
            queryParams = Ember.$.extend(queryParams, {IFLD: PriceConstants.MixRequest.TimeAndSalesBacklog.IFLD});
        }

        if (endSequence) {
            queryParams = Ember.$.extend(queryParams, {ENDTSI: endSequence});
        }

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.content, queryParams, _getGeneralQueryParams());
    };

    var generateCalenderEventsUrl = function () {
        var queryParams = {
            RT: PriceConstants.MixRequest.CalenderEvents.RT,
            SNO: PriceConstants.MixRequest.CalenderEvents.SNO,
            ENO: PriceConstants.MixRequest.CalenderEvents.ENO
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.adx, queryParams);
    };

    var generatePressReleaseUrl = function () {
        var queryParams = {
            RT: PriceConstants.MixRequest.PressRelease.RT,
            SNO: PriceConstants.MixRequest.PressRelease.SNO,
            ENO: PriceConstants.MixRequest.PressRelease.ENO
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.adx, queryParams, _getGeneralQueryParams());
    };

    var generateYoutubeUrl = function (nextPageUrl) {
        if (nextPageUrl) {
            return 'https://www.googleapis.com/youtube/v3/search?pageToken=' + nextPageUrl + '&key=AIzaSyDBxywgpPXh6ajTPBPR9z8FfbwYmgituR0&channelId=UCTXDxQ1zAsRC1mX1zHzbEVw&part=snippet,id&order=date&maxResults=50';
        } else {
            return 'https://www.googleapis.com/youtube/v3/search?key=AIzaSyDBxywgpPXh6ajTPBPR9z8FfbwYmgituR0&channelId=UCTXDxQ1zAsRC1mX1zHzbEVw&part=snippet,id&order=date&maxResults=50';
        }
    };

    var generateInstagramUrl = function () {
        return 'https://api.instagram.com/v1/users/self/media/recent/?access_token=2074123657.1c9d06e.bf76112736ac4554a76f34dc21d186f3';
    };

    var generateFacebookUrl = function (nextPageUrl) {
        if (nextPageUrl) {
            return nextPageUrl;
        } else {
            return 'https://graph.facebook.com/v2.11/AbuDhabiSecuritiesExchange?fields=posts%7Bpicture%2Cmessage%2Cpermalink_url%2Ccreated_time%7D&access_token=1999959566697571|6gGd9wQVNSolZrwM2s-DC5vVrDw';
        }
    };

    var generateDownloadStatementUrl = function (queryParams) {
        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.fileServer, queryParams);
    };

    // Alert Specific Request
    var generateAlertHistoryUrl = function () {
        var queryParams = {
            RT: PriceConstants.MixRequest.AlertSummary.RT,
            TA: 0,
            AC: 'PRC',
            UID: sharedService.getService('price').userDS.username
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.content, queryParams, _getGeneralQueryParams());
    };

    //
    // Chart specific requests
    //
    var generateIntradayDataUrl = function (exchange, symbol, numberOfDays, chartType) {
        utils.logger.logTrace('Url generation of intraday chart request is triggered from Mix request generator');

        var queryParams = {
            RT: PriceConstants.MixRequest.Chart.RT,
            E: exchange,
            S: symbol,
            AE: PriceConstants.MixRequestParameters.AllExchange,
            CM: ChartConstants.ChartDataRequestMode.IntradayActiveStock,
            NOD: numberOfDays, // No of active days
            // CT: ChartConstants.ChartDataType.Ratio // Chart type
            CT: chartType
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.chart, queryParams, _getGeneralQueryParams());
    };

    var generateTOPVIntradayDataUrl = function (exchange, symbol) {
        var queryParams = {
            RT: PriceConstants.MixRequest.TOPVChart.RT,
            E: exchange,
            S: symbol,
            AE: PriceConstants.MixRequestParameters.AllExchange,
            CM: ChartConstants.ChartDataRequestMode.IntradayActiveStock,
            CT: ChartConstants.ChartDataType.Basic // Chart type
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.chartTopv, queryParams, _getGeneralQueryParams());
    };

    var generateChartDataUrl = function (exchange, symbol, charCategory, begin, chartType) {
        utils.logger.logTrace('Url generation of chart request is triggered from Mix request generator');

        // Todo [Ravindu] CT value needs to be change for get more data in history mode [5] - Corporate action and News
        var beginDate;
        if (charCategory.ID === ChartConstants.ChartCategory.History.ID && begin !== undefined) {
            beginDate = utils.formatters.generateHistoryBeginDateString(begin, 0);
        } else if (charCategory.ID === ChartConstants.ChartCategory.Intraday.ID && begin !== undefined) {
            beginDate = utils.formatters.generateIntradayBeginDateString(begin);
        } else {
            beginDate = utils.formatters.generateChartBeginDateString(charCategory);
        }

        var queryParams = {
            RT: PriceConstants.MixRequest.Chart.RT,
            E: exchange,
            S: symbol,
            AE: PriceConstants.MixRequestParameters.AllExchange,
            CM: (charCategory.ID === ChartConstants.ChartCategory.History.ID) ? ChartConstants.ChartDataRequestMode.HistoryData : ChartConstants.ChartDataRequestMode.IntradayActiveStock,
            // CT: ChartConstants.ChartDataType.Ratio, // Chart type
            CT: chartType,
            SD: beginDate,
            ED: utils.formatters.generateChartEndDateString(charCategory)
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.chart, queryParams, _getGeneralQueryParams());
    };

    var generateExchangeSummaryUrl = function (exchanges, language) {
        var queryParams = {
            RT: PriceConstants.MixRequest.ExchangeStockSubMktDetails.RT,
            SRC: exchanges.join(utils.Constants.StringConst.Comma),
            L: language
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.price, queryParams, _getGeneralQueryParams());
    };

    var generateCorporateActionUrl = function (exchange, symbol, startDate) {
        var queryParams = {
            RT: PriceConstants.MixRequest.CorporateAction.RT,
            ITK: '4:' + exchange + ',3:' + symbol,
            SF: 472,
            SCDT: 'CPAC',
            SO: 'DESC',
            FC: 1
        };

        if (startDate && utils.validators.isAvailable(startDate)) {
            queryParams.FDK = '472~3~' + startDate;
        }

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.content, queryParams, _getGeneralQueryParams());
    };

    var generateFairValueHistoricalPriceUrl = function (exg, sym, date) {
        var queryParams = {
            RT: PriceConstants.MixRequest.FairValue.RT,
            IFC: PriceConstants.MixRequestParameters.None,
            FC: '1',
            SCDT: 'FRVL',
            SO: 'DESC',
            SF: '2230',
            ITK: '4:' + exg + ',3:' + sym,
            FDK: '2230~3~' + date
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.content, queryParams, _getGeneralQueryParams());
    };

    var generateFairValueReportUrl = function (docId) {
        var queryParams = {
            RT: PriceConstants.MixRequest.FairValueReport.RT,
            SID: '40613373-EE21-11D9-E053-EEF011ACCABC', // Content is pointed to Saudi and since for report generation need to get the data from ldc
            UID: '156683',                               // so these particular session and user which are pointing to ldc is hard coded here.
            ITK: 'DOC_ID:' + docId,
            UNC: PriceConstants.MixRequestParameters.None,
            PGI: PriceConstants.MixRequestParameters.None,
            IFC: '1',
            FC: '1',
            PL: sharedService.userSettings.currentLanguage
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.report, queryParams, _getGeneralQueryParams());
    };

    var generateFairValueReportLinkUrl = function (reportGuId) {
        var queryParams = {
            RT: PriceConstants.MixRequest.FairValueReportLink.RT,
            ID: reportGuId,
            SID: '40613373-EE21-11D9-E053-EEF011ACCABC', // Content is pointed to Saudi and since for report generation need to get the data from ldc
            UID: '156683'                                // so these particular session and user which are pointing to ldc is hard coded here.
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.reportLink, queryParams, {});
    };

    var generateTOPVChartDataUrl = function (exchange, symbol, charCategory, begin) {
        var beginDate;

        if (charCategory.ID === ChartConstants.ChartCategory.History.ID) {
            beginDate = utils.formatters.generateHistoryBeginDateString(0, 1);
        } else if (charCategory.ID === ChartConstants.ChartCategory.Intraday.ID && begin !== undefined) {
            beginDate = utils.formatters.generateIntradayBeginDateString(begin);
        } else {
            beginDate = utils.formatters.generateChartBeginDateString(charCategory);
        }

        var queryParams = {
            RT: PriceConstants.MixRequest.TOPVChart.RT,
            E: exchange,
            S: symbol,
            AE: PriceConstants.MixRequestParameters.AllExchange,
            CM: ChartConstants.ChartDataRequestMode.IntradayActiveStock,
            CT: ChartConstants.ChartDataType.Basic,
            SD: beginDate,
            ED: utils.formatters.generateChartEndDateString(charCategory)
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.chartTopv, queryParams, _getGeneralQueryParams());
    };

    var generateVolumeWatcherURL = function (exchange) {
        var queryParams = {
            RT: PriceConstants.MixRequest.VolumeWatcher.RT,
            E: exchange,
            EC: PriceConstants.MixRequestParameters.None,
            AE: PriceConstants.MixRequestParameters.AllExchange
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.price, queryParams, _getGeneralQueryParams());
    };

    var generateOptionChainURL = function (params) {
        var queryParams = {
            RT: PriceConstants.MixRequest.OptionChain.RT,
            E: params.exg,
            S: params.sym,
            INS: params.inst,
            OPM: params.optPeriod,
            OPT: params.optListType,
            NMON: params.nearMon,
            IFLD: PriceConstants.MixRequest.OptionChain.IFLD,
            OT: params.optType,
            PGI: '0',
            PGS: '1000'
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.price, queryParams, _getGeneralQueryParams());
    };

    var generateExchangeSymbolDataUrl = function (exchange) {
        var metaObj = sharedService.getService('price').priceSymbolMeta.getExgMetaObj(exchange);

        var queryParams = {
            RT: PriceConstants.MixRequest.FullSymbolDescription.RT,
            SRC: exchange,
            AS: 1,
            VRS: metaObj.DAT.VRS[0]
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.price, queryParams, _getGeneralQueryParams());
    };

    var generateProductSubscriptionUrl = function (productId, encryptedToken) {
        var queryParams = {
            RT: PriceConstants.MixRequest.ProductSubscription.RT,
            UNM: encryptedToken,
            PRD: productId,
            APPID: 'MTBS'
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.prodSub, queryParams, _getGeneralQueryParams(), true);
    };

    var generateLoginIndexPanelUrl = function () {
        var symbolKey = _getValidationSymbol(sharedService.userSettings.price.currentExchange, sharedService.userSettings.price.currentIndex, utils.AssetTypes.Indices);

        var queryParams = {
            RT: PriceConstants.MixRequest.IndexPanel.RT,
            LI: PriceConstants.MixRequest.IndexPanel.LI,
            EC: PriceConstants.MixRequest.IndexPanel.EC,
            E: sharedService.userSettings.price.currentExchange,
            UE: sharedService.userSettings.price.currentExchange,
            SS: symbolKey,
            AS: PriceConstants.MixRequestParameters.None
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.price, queryParams);
    };

    var generateFinancialUrl = function (exchange, symbol, language, periodType) {
        var symbolKey = _getValidationSymbol(exchange, symbol);

        var queryParams = {
            RT: PriceConstants.MixRequest.FinancialRatios.RT,
            CFT: 'IS,CF,BS,FR,MR',
            S: symbolKey,
            L: language,
            DES: PriceConstants.MixRequest.FinancialRatios.DES,
            Q: periodType,
            ROW: PriceConstants.MixRequest.FinancialRatios.ROW,
            FC: PriceConstants.MixRequest.FinancialRatios.FC
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.content, queryParams, _getGeneralQueryParams());
    };

    // Closing Price request
    var generateClosingPriceUrl = function (exchange, symbol, language, startDate, endDate) {
        var priceService = sharedService.getService('price');

        var queryParams = {
            RT: PriceConstants.MixRequest.ClosingPrice.RT,
            SL: symbol,
            UID: priceService.userDS.userId,
            SID: priceService.userDS.sessionId,
            L: language,
            UNC: PriceConstants.MixRequestParameters.EnableUnicode,
            E: exchange,
            SO: 'ASC',
            SD: startDate,
            ED: endDate
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.content, queryParams, _getGeneralQueryParams());
    };

    // Book Shelf request
    var generateBookShelfUrl = function (exchange) {
        var queryParams = {
            RT: PriceConstants.MixRequest.BookShelf.RT,
            E: exchange,
            SNO: 1,
            ENO: 10
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.adx, queryParams, _getGeneralQueryParams());
    };

    // User Registration request
    var generateUserRegistrationUrl = function (username, password, email) {
        var queryParams = {
            RT: PriceConstants.MixRequest.UserCreation.RT,
            UID: username,
            PASS: password,
            EMAIL: email
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.adx, queryParams, _getGeneralQueryParams());
    };

    // Investor Profile Investment Id
    var generateInvestmentIdUrl = function (uname) {
        var queryParams = {
            RT: PriceConstants.MixRequest.InvestmentId.RT,
            UNM: uname
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.adx, queryParams);
    };

    // Investor Portfolio Investment Id
    var generateInvestorPortfolioUrl = function (investId) {
        var queryParams = {
            RT: PriceConstants.MixRequest.InvestorPortfolio.RT,
            INUM: investId
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.adx, queryParams);
    };

    // Current Daily Volume and YTDP
    var generateCDVAndYTDPUrl = function (exchange) {
        var priceService = sharedService.getService('price');

        var queryParams = {
            RT: PriceConstants.MixRequest.IndexPanel.RT,
            LI: PriceConstants.MixRequest.IndexPanel.LI,
            E: exchange,
            UE: exchange,
            AS: PriceConstants.MixRequestParameters.AllExchange,
            EC: PriceConstants.MixRequestParameters.None,
            UNC: PriceConstants.MixRequestParameters.None,
            IFLD: 'YTDP'
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.price, queryParams);
    };

    // Beta
    var generateBetaUrl = function (exchange, symbol, instrumentType) {
        var priceService = sharedService.getService('price');
        var symbolKey = _getValidationSymbol(exchange, symbol, instrumentType);

        var queryParams = {
            RT: PriceConstants.MixRequest.Beta.RT,
            E: exchange,
            UE: exchange,
            SS: symbolKey,
            EC: PriceConstants.MixRequestParameters.None
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.price, queryParams);
    };

    // Technical Score
    var generateTechnicalScoreUrl = function (exchange, symbol, charCategory, begin) {
        var beginDate;

        if (charCategory.ID === ChartConstants.ChartCategory.History.ID && begin) {
            beginDate = utils.formatters.generateHistoryBeginDateString(begin, 0);
        } else if (charCategory.ID === ChartConstants.ChartCategory.Intraday.ID && begin) {
            beginDate = utils.formatters.generateIntradayBeginDateString(begin);
        } else {
            beginDate = utils.formatters.generateChartBeginDateString(charCategory);
        }

        var queryParams = {
            RT: PriceConstants.MixRequest.TechnicalScore.RT,
            E: exchange,
            S: symbol,
            AE: PriceConstants.MixRequestParameters.AllExchange,
            SD: beginDate,
            ED: utils.formatters.generateChartEndDateString(charCategory)
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.price, queryParams, _getGeneralQueryParams());
    };

    //
    // private functions
    //
    var _getGeneralQueryParams = function () {
        var priceService = sharedService.getService('price');

        return {
            UID: priceService.userDS.userId,
            SID: priceService.userDS.sessionId,
            L: sharedService.userSettings.currentLanguage, // User current Language
            UNC: PriceConstants.MixRequestParameters.EnableUnicode,
            UE: sharedService.userSettings.price.currentExchange,
            H: PriceConstants.MixRequestParameters.EnableHeaderTag,
            M: PriceConstants.MixRequestParameters.EnableMetaTag
        };
    };

    var _getValidationSymbol = function (exchange, symbol, instrumentType) {
        if (utils.validators.isAvailable(instrumentType)) {
            return [exchange, instrumentType, symbol].join(utils.Constants.StringConst.Tilde);
        } else {
            return [exchange, symbol].join(utils.Constants.StringConst.Tilde);
        }
    };

    var generateFundamentalScoreURL = function (exchange) {
        var priceService = sharedService.getService('price');

        var queryParams = {
            RT: PriceConstants.MixRequest.TechnicalScore.RT,
            E: exchange,
            AS: PriceConstants.MixRequestParameters.AllSymbol,
            UID: priceService.userDS.userId,
            SID: priceService.userDS.sessionId,
            MOD: 'FS',
            NOD: 2 // No of active days
        };

        return utils.requestHelper.generateQueryString(sharedService.getService('price').settings.urlTypes.analysis, queryParams);
    };

    return {
        generateExchangeMetadataUrl: generateExchangeMetadataUrl,
        generateSymbolValidationUrl: generateSymbolValidationUrl,
        generateSymbolValidationBulkUrl: generateSymbolValidationBulkUrl,
        generateSymbolSearchUrl: generateSymbolSearchUrl,
        generateIntradayDataUrl: generateIntradayDataUrl,
        generateChartDataUrl: generateChartDataUrl,
        generateAnnouncementBodyUrl: generateAnnouncementBodyUrl,
        generateNewsBodyUrl: generateNewsBodyUrl,
        generateAnnouncementSearchUrl: generateAnnouncementSearchUrl,
        generateNewsSearchUrl: generateNewsSearchUrl,
        generateCompanyProfileUrl: generateCompanyProfileUrl,
        generateTimeAndSalesBacklogUrl: generateTimeAndSalesBacklogUrl,
        generateCalenderEventsUrl: generateCalenderEventsUrl,
        generatePressReleaseUrl: generatePressReleaseUrl,
        generateYoutubeUrl: generateYoutubeUrl,
        generateInstagramUrl: generateInstagramUrl,
        generateFacebookUrl: generateFacebookUrl,
        generateDownloadStatementUrl, generateDownloadStatementUrl,
        generateExchangeSummaryUrl: generateExchangeSummaryUrl,
        generateGmsSummaryUrl: generateGmsSummaryUrl,
        generateSystemMetaDataUrl: generateSystemMetaDataUrl,
        generateAlertHistoryUrl: generateAlertHistoryUrl,
        generateFairValueHistoricalPriceUrl: generateFairValueHistoricalPriceUrl,
        generateFairValueReportUrl: generateFairValueReportUrl,
        generateFairValueReportLinkUrl: generateFairValueReportLinkUrl,
        generateCorporateActionUrl: generateCorporateActionUrl,
        generateTOPVChartDataUrl: generateTOPVChartDataUrl,
        generateTOPVIntradayDataUrl: generateTOPVIntradayDataUrl,
        generateVolumeWatcherURL: generateVolumeWatcherURL,
        generateOptionChainURL: generateOptionChainURL,
        generateExchangeSymbolDataUrl: generateExchangeSymbolDataUrl,
        generateProductSubscriptionUrl: generateProductSubscriptionUrl,
        generateLoginIndexPanelUrl: generateLoginIndexPanelUrl,
        generateClosingPriceUrl: generateClosingPriceUrl,
        generateBookShelfUrl: generateBookShelfUrl,
        generateFinancialUrl: generateFinancialUrl,
        generateUserRegistrationUrl: generateUserRegistrationUrl,
        generateInvestmentIdUrl: generateInvestmentIdUrl,
        generateInvestorPortfolioUrl: generateInvestorPortfolioUrl,
        generateCDVAndYTDPUrl: generateCDVAndYTDPUrl,
        generateBetaUrl: generateBetaUrl,
        generateFundamentalScoreURL: generateFundamentalScoreURL,
        generateTechnicalScoreUrl: generateTechnicalScoreUrl
    };
})();
