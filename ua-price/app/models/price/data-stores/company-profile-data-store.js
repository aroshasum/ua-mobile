import Ember from 'ember';
import companyProfile from '../business-entities/company-profile';
import companyManagement from '../business-entities/company-management';
import companyOwners from '../business-entities/company-owners';
import companySubsidiaries from '../business-entities/company-subsidiaries';
import utils from '../../../utils/utils';

export default function (priceService) {
    var store = {};
    var flagsAndFns = {};

    var createCompanyManagement = function () {
        return companyManagement.create();
    };

    var createCompanyOwners = function () {
        return companyOwners.create();
    };

    var createCompanySubsidiaries = function () {
        return companySubsidiaries.create();
    };

    var getCompanyProfile = function (exchange, symbol, language, successFn, errorFn) {
        var key = _getKey(exchange, symbol, language);
        var companyProfFlagsAndFns = flagsAndFns[key];
        var companyProfObj;

        var postSuccess = function () {
            companyProfFlagsAndFns.dataAvailable = true;
            var successFns = companyProfFlagsAndFns.successFns;

            Ember.$.each(successFns, function (index, sFn) {
                if (Ember.$.isFunction(sFn)) {
                    sFn();
                }
            });
        };

        var error = function () {
            store[key] = undefined;
            var errorFns = companyProfFlagsAndFns.errorFns;

            Ember.$.each(errorFns, function (index, eFn) {
                if (Ember.$.isFunction(eFn)) {
                    eFn();
                }
            });

            flagsAndFns[key] = undefined;
        };

        var addFnsToArray = function () {
            companyProfFlagsAndFns.successFns[companyProfFlagsAndFns.successFns.length] = successFn;
            companyProfFlagsAndFns.errorFns[companyProfFlagsAndFns.successFns.length] = errorFn;
        };

        if (!companyProfFlagsAndFns) {
            companyProfObj = companyProfile.create({
                exg: exchange,
                sym: symbol,
                lan: language
            });

            companyProfFlagsAndFns = {
                dataAvailable: false,
                successFns: [],
                errorFns: []
            };

            store[key] = companyProfObj;
            flagsAndFns[key] = companyProfFlagsAndFns;

            addFnsToArray();
            priceService.sendCompanyProfileRequest(exchange, symbol, language, postSuccess, error);
        } else {

            if (companyProfFlagsAndFns.dataAvailable) {
                companyProfObj = store[key];

                if (Ember.$.isFunction(successFn)) {
                    successFn();
                }
            } else {
                addFnsToArray();
                companyProfObj = store[key];
            }
        }
        return companyProfObj;
    };

    var checkCompProfDataAvailability = function (exchange, symbol, language) {
        return store[_getKey(exchange, symbol, language)];
    };

    var getCompanyManagement = function (exchange, symbol, language) {
        return getCompanyProfile(exchange, symbol, language).get('compManagement');
    };

    var _getKey = function (exchange, symbol, language) {
        return [exchange, utils.Constants.StringConst.Tilde, symbol, utils.Constants.StringConst.Tilde, language].join('');
    };

    return {
        getCompanyProfile: getCompanyProfile,
        getCompanyManagement: getCompanyManagement,
        createCompanyManagement: createCompanyManagement,
        createCompanyOwners: createCompanyOwners,
        createCompanySubsidiaries: createCompanySubsidiaries,
        checkCompProfDataAvailability: checkCompProfDataAvailability
    };
}
