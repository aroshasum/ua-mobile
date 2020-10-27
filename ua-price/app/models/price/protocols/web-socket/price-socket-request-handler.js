import Ember from 'ember';
import priceSubscriptionManager from './../../price-subscription-manager';
import sharedService from '../../../../models/shared/shared-service';
import utils from '../../../../utils/utils';
import appConfig from '../../../../config/app-config';

export default (function () {
    // Authentication related requests
    var generateRetailAuthRequest = function (authParams) {
        var reqElements = _generateAuthRequest();

        reqElements[reqElements.length] = '"UNM":"';
        reqElements[reqElements.length] = authParams.username;
        reqElements[reqElements.length] = '","PWD":"';
        reqElements[reqElements.length] = authParams.password;
        reqElements[reqElements.length] = '"}\n';

        var req = reqElements.join('');
        req = req.length + req;

        utils.logger.logInfo('Retail Auth Request : ' + req);

        return req;
    };

    var generateSsoAuthRequest = function (authParams) {
        var reqElements = _generateAuthRequest();

        reqElements[reqElements.length] = '"SSOTOK":"';
        reqElements[reqElements.length] = authParams.ssoToken;
        reqElements[reqElements.length] = '","SSOTYPE":"';
        reqElements[reqElements.length] = authParams.ssoType;
        reqElements[reqElements.length] = '"}\n';

        var req = reqElements.join('');
        req = req.length + req;

        Ember.appGlobal.logger.priceAuthRequest = req;
        utils.logger.logInfo('SSO Auth Request : ' + req);

        return req;
    };

    var generateReconnectionAuthRequest = function () {
        var req;
        var priceService = sharedService.getService('price');

        if (utils.validators.isAvailable(priceService.userDS.username)) {
            var reqElements = [
                '{"AUTHVER":"10","UNM":"', priceService.userDS.username,
                '","SID":"', priceService.userDS.sessionId,
                '","PDM":"', appConfig.customisation.productType,
                '","LAN":"', sharedService.userSettings.currentLanguage,
                '","METAVER":"', priceService.userDS.metaVersion,
                '"}\n'];

            req = reqElements.join('');
            req = req.length + req;
        }

        return req;
    };

    // 40 type requests
    var generateAddExchangeRequest = function (exchange, messagetype, language, subMarket) {
        var subStatus = priceSubscriptionManager.addSubscription(messagetype, exchange, language, subMarket);

        if (subStatus.retVal === 1) {
            var reqElements = ['{"40":"', messagetype, '","E":"', exchange];

            if (language !== undefined) {
                reqElements.push('","L":"', language);
            }

            if(subMarket !== undefined) {
                reqElements.push('","MKT":"', subMarket);
            }

            reqElements.push('"}\n');

            var req = reqElements.join('');
            req = req.length + req;

            subStatus.reqArray[subStatus.reqArray.length] = req;
        }

        return subStatus.reqArray;
    };

    var generateRemoveExchangeRequest = function (exchange, messagetype, language, subMarket) {
        var subStatus = priceSubscriptionManager.removeSubscription(messagetype, exchange, language, subMarket);

        if (subStatus.retVal === 0) {
            var reqElements = ['{"41":"', messagetype, '","E":"', exchange];

            if (language !== undefined) {
                reqElements.push('","L":"', language);
            }

            if(subMarket !== undefined) {
                reqElements.push('","MKT":"', subMarket);
            }

            reqElements.push('"}\n');
            var req = reqElements.join('');
            req = req.length + req;

            subStatus.reqArray[subStatus.reqArray.length] = req;
        }

        return subStatus.reqArray;
    };

    // 80 type requests
    var generateAddSymbolRequest = function (exchange, symbol, messagetype) {
        var subStatus = priceSubscriptionManager.addSubscription(messagetype, exchange, symbol);

        if (subStatus.retVal === 1) {
            var reqElements = ['{"80":"', messagetype, '","E":"', exchange, '","S":"', symbol, '"}\n'];
            var req = reqElements.join('');
            req = req.length + req;

            subStatus.reqArray[subStatus.reqArray.length] = req;
        }

        return subStatus.reqArray;
    };

    var generateRemoveSymbolRequest = function (exchange, symbol, messagetype) {
        var subStatus = priceSubscriptionManager.removeSubscription(messagetype, exchange, symbol);

        if (subStatus.retVal === 0) {
            var reqElements = ['{"81":"', messagetype, '","E":"', exchange, '","S":"', symbol, '"}\n'];
            var req = reqElements.join('');
            req = req.length + req;

            subStatus.reqArray[subStatus.reqArray.length] = req;
        }

        return subStatus.reqArray;
    };

    // 160 type requests
    var generateAddSymbolBulkRequest = function (exchange, symbolList, messagetype) {
        var subStatus = priceSubscriptionManager.addSubscription(messagetype, exchange, symbolList);

        if (subStatus.retVal === 1) {
            var reqElements = ['{"160":"', messagetype, '","E":"', exchange, '","S":"', symbolList, '"}\n'];
            var req = reqElements.join('');
            req = req.length + req;

            subStatus.reqArray[subStatus.reqArray.length] = req;
        }

        return subStatus.reqArray;
    };

    var generateRemoveSymbolBulkRequest = function (exchange, symbolList, messagetype) {
        var subStatus = priceSubscriptionManager.removeSubscription(messagetype, exchange, symbolList);

        if (subStatus.retVal === 0) {
            var reqElements = ['{"161":"', messagetype, '","E":"', exchange, '","S":"', symbolList, '"}\n'];
            var req = reqElements.join('');
            req = req.length + req;

            subStatus.reqArray[subStatus.reqArray.length] = req;
        }

        return subStatus.reqArray;
    };

    // TopStock
    var generateTopStockRequest = function (exchange, topStockType, subMarketCode, language) {
        var lan = language ? language : sharedService.userSettings.currentLanguage;

        var reqElements = ['{"40":"64","E":"', exchange, '","TT":"', topStockType, '","MKT":"', subMarketCode, '","L":"', lan, '"}\n'];
        var req = reqElements.join('');
        req = req.length + req;

        return [req];
    };

    // Change Password
    var generateChangePasswordRequest = function (authParams) {
        var priceService = sharedService.getService('price');

        var reqElements = ['{"CHANGEPWD":"61", "PEM":"1", "SID":"', priceService.userDS.sessionId,
            '","UNM":"', priceService.userDS.username,
            '","OLDPWD":"', authParams.oldPwd,
            '","NEWPWD":"', authParams.newPwd,
            '"}\n'];

        var req = reqElements.join('');
        req = req.length + req;

        return [req];
    };

    // Alert Placement
    var generateAlertPlaceRequest = function (exchange, symbol, instrumentType, alertFilter, token, messageType) {
        var alertToken = token ? token : Date.now();
        var expPeriod = 30;
        var frequency = 30;
        var tradeService = sharedService.getService('trade');
        var userName = tradeService && tradeService.userDS.unqPrcUsr ? tradeService.userDS.unqPrcUsr : sharedService.getService('price').userDS.username;

        var reqElements = ['{"225":"', messageType,
            '","E":"', exchange,
            '","S":"', symbol,
            '","TOK":"', alertToken,
            '","FLT":"', alertFilter,
            '","INS":"', instrumentType ? instrumentType : 0,
            '","FR":"', frequency,
            '","EXP":"', expPeriod,
            '","UNM":"', userName,
            '"}\n'];

        var req = reqElements.join('');
        req = req.length + req;

        return [req];
    };

    // Alert History
    var generateAlertHistoryRequest = function () {     // TODO [Arosha] Remove unnecessary symbol field after fixing it in Backend
        var tradeService = sharedService.getService('trade');
        var userName = tradeService && tradeService.userDS.unqPrcUsr ? tradeService.userDS.unqPrcUsr : sharedService.getService('price').userDS.username;

        var reqElements = ['{"225":"3", "UNM":"', userName,
            '","E":"', sharedService.userSettings.price.currentExchange,
            '","S":"', '1010',
            '"}\n'];

        var req = reqElements.join('');
        req = req.length + req;

        return [req];
    };

    // Alert History
    var generateAlertUnsubscribeRequest = function (exchange, symbol, instrumentType, token) {
        var tradeService = sharedService.getService('trade');
        var userName = tradeService && tradeService.userDS.unqPrcUsr ? tradeService.userDS.unqPrcUsr : sharedService.getService('price').userDS.username;

        var reqElements = ['{"225":"2", "UNM":"', userName,
            '","E":"', exchange,
            '","S":"', symbol,
            '","TOK":"', token,
            '","INS":"', instrumentType ? instrumentType : 0,
            '"}\n'];

        var req = reqElements.join('');
        req = req.length + req;

        return [req];
    };

    var generatePulseMessage = function (missedHeartbeats) {
        var req = ['{"0":', missedHeartbeats, '}\n'].join('');
        req = req.length + req;

        return [req];
    };

    var _generateAuthRequest = function () {
        var configMetaVersion = appConfig.customisation.metaVersion;
        var metaVersion = utils.validators.isAvailable(configMetaVersion) ? configMetaVersion : sharedService.getService('price').userDS.metaVersion;

        return [
            '{"AUTHVER":"10",',
            '"LOGINIP":"', '',
            '","CLVER":"', '1.0.0',
            '","PDM":"', appConfig.customisation.productType,
            '","LAN":"', sharedService.userSettings.currentLanguage,
            '","METAVER":"', metaVersion,
            '",'];
    };

    return {
        generateRetailAuthRequest: generateRetailAuthRequest,
        generateSsoAuthRequest: generateSsoAuthRequest,
        generateReconnectionAuthRequest: generateReconnectionAuthRequest,
        generateAddExchangeRequest: generateAddExchangeRequest,
        generateRemoveExchangeRequest: generateRemoveExchangeRequest,
        generateAddSymbolRequest: generateAddSymbolRequest,
        generateRemoveSymbolRequest: generateRemoveSymbolRequest,
        generateAddSymbolBulkRequest: generateAddSymbolBulkRequest,
        generateRemoveSymbolBulkRequest: generateRemoveSymbolBulkRequest,
        generateTopStockRequest: generateTopStockRequest,
        generateAlertPlaceRequest: generateAlertPlaceRequest,
        generateAlertHistoryRequest: generateAlertHistoryRequest,
        generateAlertUnsubscribeRequest: generateAlertUnsubscribeRequest,
        generateChangePasswordRequest: generateChangePasswordRequest,
        generatePulseMessage: generatePulseMessage
    };
})();
