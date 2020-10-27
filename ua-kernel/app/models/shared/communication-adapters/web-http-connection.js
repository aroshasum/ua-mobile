/* global Queue */
import Ember from 'ember';
import PriceConstants from '../../price/price-constants';
import utils from '../../../utils/utils';

export default (function () {
    var isWebReqAllowed = false;
    var pendingRequestQueue = new Queue();

    var sendAjaxRequest = function (param) {
        if (isWebReqAllowed) {
            sendRequest(param);
        } else {
            pendingRequestQueue.enqueue(param);
        }
    };

    var setRequestPermission = function (status) {
        isWebReqAllowed = status;
    };

    var sendPendingRequest = function () {
        while (pendingRequestQueue.getLength() > 0) {
            sendRequest(pendingRequestQueue.dequeue());
        }
    };

    var sendRequest = function (param) {
        try {
            var req = {
                type: param.type ? param.type : 'GET',
                dataType: param.dataType !== undefined ? param.dataType : 'json',
                contentType: param.contentType !== undefined ? param.contentType : 'application/json; charset=utf-8',
                url: param.url,
                headers: param.headers !== undefined ? param.headers : {'X-App-Token': new Date().getTime()},

                success: function (e) {
                    if (Ember.$.isFunction(param.onSuccess)) {
                        param.onSuccess(e);
                    }
                },

                error: function (e) {
                    if (Ember.$.isFunction(param.onError)) {
                        param.onError(e);
                    }
                },

                timeout: param.timeout ? param.timeout : PriceConstants.TimeIntervals.AjaxRequestTimeout
            };

            if (param.async) {
                req.async = param.async;
            }

            if (param.cache) {
                req.cache = param.cache;
            }

            if (param.data) {
                req.data = param.data;
            }

            if (param.enctype !== undefined) {
                req.enctype = param.enctype;
            }

            if (param.processData !== undefined) {
                req.processData = param.processData;
            }

            Ember.$.ajax(req);
        } catch (e) {
            utils.logger.logError('Error in send ajax request : ' + param.url);

            if (Ember.$.isFunction(param.onError)) {
                param.onError({});
            }
        }
    };

    return {
        sendAjaxRequest: sendAjaxRequest,
        sendPendingRequest: sendPendingRequest,
        setRequestPermission: setRequestPermission
    };
})();
