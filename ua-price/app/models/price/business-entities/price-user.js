import Ember from 'ember';
import PersistentObject from '../../../models/shared/business-entities/persistent-object';
import utils from '../../../utils/utils';
import appConfig from '../../../config/app-config';

export default PersistentObject.extend({
    cacheKey: 'priceUser',
    isEncrypt: true,
    oneDayInMillis: 86400000, // 1000 * 60 * 60 * 24

    // Auth related params
    sessionId: '',
    authStatus: 0,
    userId: '',
    username: '',
    userExchg: Ember.A(), // Only default exchanges
    newsProviders: '',
    expiryDate: '',
    windowTypes: {},
    name: '',
    expiredExchg: '',
    inactiveExchg: '',
    metaVersion: '',
    delayedExchg: [], // Only delayed exchanges
    billingCode: 'ISI',
    nonDefExg: Ember.A(), // Only non-default exchanges
    isMultipleUserExchangesAvailable: false,

    expDate: function () {
        var expDateObj;
        var expDateString = this.get('expiryDate');

        if (utils.validators.isAvailable(expDateString)) {
            expDateObj = utils.formatters.convertStringToDate(expDateString);
        }

        return expDateObj;
    }.property('expiryDate'),

    allExg: function () {
        return this.get('userExchg').concat(this.get('nonDefExg'));
    }.property('userExchg', 'nonDefExg'),

    authResponseMapping: {
        'SID': 'sessionId',
        'AUTHSTAT': 'authStatus',
        'UID': 'userId',
        'UNM': 'username',
        'UE': 'userExchg',
        'NWSP': 'newsProviders',
        'EXPDATE': 'expiryDate',
        'WT': 'windowTypes',
        'NAME': 'name',
        'EXPEXG': 'expiredExchg',
        'INACEXG': 'inactiveExchg',
        'METAVER': 'metaVersion',
        'DE': 'delayedExchg',
        'NDE': 'nonDefExg'
    },

    isWindowTypeAvailable: function (windowTypes, exchange) {
        var isAvailable = false;
        var exgWindowTypes = this.windowTypes && this.windowTypes[exchange];

        if (exgWindowTypes) {
            Ember.$.each(windowTypes, function (index, windowType) {
                isAvailable = exgWindowTypes.indexOf(windowType) >= 0;

                if (isAvailable) {
                    return false;
                }
            });
        }

        return isAvailable;
    },

    isExchangeDelayed: function (exchangeCode) {
        return this.delayedExchg.indexOf(exchangeCode) >= 0;
    },

    isDelayedExchangesAvailable: function () {
        return this.delayedExchg.length > 0;
    },

    isRealtimeExchangesAvailable: function () {
        return this.delayedExchg.length !== this.userExchg.length;
    },

    willExpireRecently: function () {
        return (this.get('expDate') - new Date()) / this.oneDayInMillis <= appConfig.subscriptionConfig.daysBeforeExpiration;
    },

    isNonDefaultExchangesAvailable: function () {
        return this.nonDefExg.length > 0;
    },

    isOptionSymbolSearchEnabled: function () {
        var allExg = this.get('allExg');

        return allExg.indexOf('OPRA') > -1;
    }.property('allExg'),

    setMultipleUserExchangesAvailability: function () {
        this.set('isMultipleUserExchangesAvailable', this.get('userExchg').length > 1);
    }.observes('userExchg'),

    /* *
     * Checks whether user has subscription for given exchange as a default exchange (real time or delayed, but not non-default)
     * @param exchange Exchange code to check
     * @returns {boolean} True if user has price subscription for the exchange as a default exchange, false otherwise
     */
    isNotSubscribedAsDefaultExchange: function (exchange) {
        var allDefaultExg = this.get('userExchg');
        return allDefaultExg.length > 0 && allDefaultExg.indexOf(exchange) === -1;
    },

    /* *
     * Checks whether user has subscription for given exchange (real time, delayed or non-default)
     * @param exchange Exchange code to check
     * @returns {boolean} True if user has price subscription for the exchange, false otherwise
     */
    isExchangeSubscribed: function (exchange) {
        return this.get('allExg').indexOf(exchange) > -1;
    },

    setData: function (userParams, isAuthResponse) {
        if (isAuthResponse) {
            var that = this;

            Ember.$.each(userParams, function (key, value) {
                var prop = that.authResponseMapping[key];

                if (prop) {
                    that.set(prop, value);
                }
            });
        } else {
            this._super(userParams);
        }
    },

    save: function () {
        this._super(utils.Constants.StorageType.Local);
    },

    load: function () {
        return this._super(utils.Constants.StorageType.Local);
    },

    isLevelTwoDataAvailable: function (instrumentType) {
        var optionInstrumentType = 10; // TODO [Anushka] Implement advance method set to identify available data for a user
        return instrumentType !== optionInstrumentType;
    },

    isPriceUserExchange: function (exg) {
        var userExchanges = this.get('userExchg');
        return userExchanges.length > 0 && userExchanges.contains(exg);
    }
}).create();
