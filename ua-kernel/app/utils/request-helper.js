import utils from './utils';
import Ember from 'ember';

export default (function () {
    var generateQueryString = function (urlPrefix, params, generalQueryParams, isEncodeDisable) {
        var url, queryArray = [];
        var queryParams = _mergeParam(params, generalQueryParams || {});

        for (var prop in queryParams) {
            if (queryParams.hasOwnProperty(prop)) {
                var encoded = isEncodeDisable ? queryParams[prop] : encodeURIComponent(queryParams[prop]);
                queryArray[queryArray.length] = [prop, encoded].join(utils.Constants.StringConst.Equal);
            }
        }

        url = queryArray.join(utils.Constants.StringConst.Ampersand);

        if (urlPrefix) {
            url = [urlPrefix, url].join(utils.Constants.StringConst.Question);
        }

        return url;
    };

    var getQueryParameters = function (url) {
        var parameters = {};

        if (url.indexOf(utils.Constants.StringConst.Question) > -1) {
            var queryString = url.split(utils.Constants.StringConst.Question)[1];
            var queryParams = queryString.split(utils.Constants.StringConst.Ampersand);

            if (queryParams && queryParams.length > 0) {
                Ember.$.each(queryParams, function (index, param) {
                    var keyVal = param.split(utils.Constants.StringConst.Equal);

                    if (keyVal && keyVal.length > 1) {
                        parameters[keyVal[0].toLowerCase()] = decodeURIComponent(keyVal[1]);
                    }
                });
            }
        }

        return parameters;
    };

    var _mergeParam = function (params, generalQueryParams) {
        if (params) {
            Ember.$.extend(generalQueryParams, params);
        }

        return generalQueryParams;
    };

    return {
        generateQueryString: generateQueryString,
        getQueryParameters: getQueryParameters
    };
})();