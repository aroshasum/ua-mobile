import Ember from 'ember';
import BaseController from '../base-controller';
import sharedService from '../../models/shared/shared-service';
import environmentConfig from '../../config/environment';
import utils from '../../utils/utils';
import appConfig from '../../config/app-config';

export default BaseController.extend({
    priceService: sharedService.getService('price'),
    tradeService: sharedService.getService('trade'),
    debugInfo: '',
    isMobile: appConfig.customisation.isMobile,

    onLoadWidget: function () {
        var debugInfo = {
            dateTime: new Date(),
            appVer: environmentConfig.APP.version,
            appUrl: window.location.href,
            tradeUrl: this.tradeService.webSocketManager.getSocketConnection('oms').getConnectionPath(),
            priceUrl: this.priceService.webSocketManager.getSocketConnection('qs').getConnectionPath(),
            tUser: this.tradeService.userDS.get('usrId'),
            tAlias: this.tradeService.userDS.get('lgnAls'),
            mubNo: this.tradeService.userDS.get('mubNo'),
            cusName: this.tradeService.userDS.get('cusNme'),
            pToken: this.tradeService.userDS.get('prcUsr'),
            pUser: this.priceService.userDS.get('username'),
            tAuthReq: Ember.appGlobal.logger.tradeAuthRequest,
            tAuthResp: Ember.appGlobal.logger.tradeAuthResponse,
            pAuthReq: Ember.appGlobal.logger.priceAuthRequest,
            pAuthResp: Ember.appGlobal.logger.priceAuthResponse,
            defExg: this.priceService.userDS.get('userExchg').join(','),
            delExg: this.priceService.userDS.get('delayedExchg').join(','),
            nonDefExg: this.priceService.userDS.get('nonDefExg').join(','),
            allExg: this.priceService.userDS.get('allExg').join(','),
            preUser: Ember.appGlobal.logger.preAuthPriceUser,
            postUser: Ember.appGlobal.logger.postAuthPriceUser
        };

        this.set('debugInfo', debugInfo);

        var debugTrace = utils.jsonHelper.convertToJson(debugInfo);
        debugTrace = appConfig.loggerConfig.isEncryptDebugLog ? utils.crypto.encryptText(debugTrace) : debugTrace;

        var debugStack = utils.jsonHelper.convertToJson(Ember.appGlobal.logger.stackTrace);
        debugStack = appConfig.loggerConfig.isEncryptDebugLog ? utils.crypto.encryptText(debugStack) : debugStack;

        this.set('debugTrace', debugTrace);
        this.set('debugStack', debugStack);
    },

    actions: {
        onCopyLog: function () {
            var textArea = document.getElementById('viewLogTextArea');

            textArea.value = document.getElementById('logDiv').innerText;
            textArea.select();

            document.execCommand('copy');
        },

        onCloseLog: function () {
            var modal = sharedService.getService('sharedUI').getService('modalPopupId');

            modal.set('modalPopupStyle', '');
            modal.send('disableOverlay');
            modal.send('closeModalPopup');
        }
    }
});
