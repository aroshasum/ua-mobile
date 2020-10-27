import Ember from 'ember';
import sharedService from '../models/shared/shared-service';
import LanguageDataStore from '../models/shared/language/language-data-store';

export default Ember.Component.extend({
    layoutName: 'components/more-markets-dropdown',

    app: LanguageDataStore.getLanguageObj(),
    defaultExchangeForDropdown: '',
    exchanges: [],
    disableMoreMarkets: true,
    subscriptionKey: 'moreMarketsDropdown',
    isAddAllOption: false,

    setExchanges: function () {
        this.set('priceService', sharedService.getService('price'));

        if (this.get('isShowOnlyDefault')) {
            this.set('valueKey', null);
        } else {
            this.set('valueKey', 'code');
        }

        this.priceService.subscribePriceExchangeSummaryMetaReady(this, [this.subscriptionKey, this.get('key')].join('-'));
        this._setExchangeDesc();
    }.on('init'),

    onPriceExchangeSummaryMetaReady: function () {
        this._setExchangeDesc();
    },

    _setExchangeDesc: function () {
        var that = this;
        var exchangeArray = [];
        var allLabel = this.get('app').lang.labels.all;
        var optionAll = {code: '', des: allLabel, displayDesc: allLabel, isShowAll: true};
        var exchangeCodes = this.priceService.userDS.get('userExchg');

        if (this.get('isAddAllOption')) {
            exchangeArray = [optionAll];
        }

        if (!this._isDestroying()) {
            if (this.get('isShowDefaultMarket')) {
                var exg = this.get('exg') ? this.get('exg') : sharedService.userState.globalArgs.exg;
                var defaultExg = this.priceService.exchangeDS.getExchange(exg);

                this.set('defaultExchangeForDropdown', {code: defaultExg.code, des: defaultExg.des, displayDesc: defaultExg.de});
            } else if (this.get('isAddAllOption')) {
                this.set('defaultExchangeForDropdown', optionAll);
            } else {
                this.set('defaultExchangeForDropdown', {code: '', displayDesc: this.get('app').lang.labels.moreMarkets});
            }
        }

        Ember.$.each(exchangeCodes, function (key, item) {
            if (item) {
                var description = that.priceService.exchangeDS.getExchange(item);
                exchangeArray.pushObject({code: item, des: description.des, displayDesc: description.de});

                if (that.get('exchangeValue') && that.get('exchangeValue') === description) {
                    that.set('value', item);
                }
            }
        });

        if (exchangeArray && !this._isDestroying()) {
            this.set('exchanges', exchangeArray);
        }

        if (!this._isDestroying()) {
            this.set('disableMoreMarkets', this.get('isAddAllOption') ? false : exchangeArray.length <= 1);
        }
    },

    _isDestroying: function () {
        return this.get('isDestroyed') || this.get('isDestroying'); // TODO: [Bashitha] Move this implementation to a common place
    },

    actions: {
        setExchange: function (option) {
            this.sendAction('setExchange', option);
        }
    }
});