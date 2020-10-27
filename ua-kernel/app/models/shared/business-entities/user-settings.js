import Ember from 'ember';
import PersistentObject from '../../../models/shared/business-entities/persistent-object';
import utils from '../../../utils/utils';

export default PersistentObject.extend({
    cacheKey: 'userSettings',
    isEncrypt: true,
    favoriteExgMaxCount: 5,

    // Current session related params
    currentLanguage: '',
    currentTheme: '',

    currentSubMarket: -1,
    currentLoginStatus: 1,
    username: '',
    password: '',
    ssoToken: '',
    previousLoggedIn: '0',
    rememberMe: '0',
    favoriteExgs: undefined,
    currentBrokerage: '',
    tickerSpeed: '',
    biometricAuthArgs: {},

    getFavoriteExgs: function () {
        var favoriteExgs = [];
        var favoriteExgsHitCounts = [];
        var maxArry = [];
        var favoriteExgMaxCount = this.get('favoriteExgMaxCount');
        var favExgObj = this.get('favoriteExgs');

        var _addToMaxArr = function (maxCount) {
            Ember.$.each(favExgObj, function (exg, hitCount) {
                if (hitCount === maxCount && maxArry.indexOf(exg) === -1) {
                    maxArry[maxArry.length] = exg;
                }
            });
        };

        Ember.$.each(favExgObj, function (exg, hitCount) {
            favoriteExgs[favoriteExgs.length] = exg;
            favoriteExgsHitCounts[favoriteExgs.length] = hitCount;
        });

        if (favoriteExgs.length > favoriteExgMaxCount) {
            favoriteExgsHitCounts.sort(function (a, b) {
                return b - a;
            });

            for (var i = 0; i < favoriteExgMaxCount; i++) {
                _addToMaxArr(favoriteExgsHitCounts[i]);
            }
        } else {
            maxArry = favoriteExgs;
        }

        return maxArry;
    },

    addToFavoriteExgs: function (exchange) {
        var favExgObj = this.get('favoriteExgs');
        var isExgAvailable = false;

        Ember.$.each(favExgObj, function (exg, hitCount) {
            if (exchange === exg) {
                favExgObj[exg] = hitCount + 1;
                isExgAvailable = true;
            }
        });

        if (!isExgAvailable) {
            favExgObj[exchange] = 1;
        }

        this.set('favoriteExgs', favExgObj);
    },

    save: function () {
        this._super(utils.Constants.StorageType.Local);
    },

    load: function () {
        return this._super(utils.Constants.StorageType.Local);
    },

    clearLoginToken: function () {
        this.set('verToken', ''); // Clear last logged-in token to disable smart login at auth fail
        this.save();
    }
}).create();
