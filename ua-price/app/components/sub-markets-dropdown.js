import Ember from 'ember';
import sharedService from '../models/shared/shared-service';
import LanguageDataStore from '../models/shared/language/language-data-store';

export default Ember.Component.extend({
    layoutName: 'components/sub-markets-dropdown',

    app: LanguageDataStore.getLanguageObj(),
    exchange: {},
    exg: '',
    subMarkets: [],
    currentMarketId: '',
    isAddAllOption: false,
    allDescription: '',
    isLanguageChanged: false,

    isSubMarketsAvailable: function () {
        return this.get('subMarkets.length') >= 1;
    }.property('subMarkets.length'),

    isDisableSubMarkets: function () {
        return this.get('subMarkets.length') <= 1;
    }.property('subMarkets.length'),

    didInsertElement: function () {
        sharedService.getService('price').subscribePriceExchangeSummaryMetaReady(this, ['sub-market', this.get('key')].join('-'));
        this.setSubMarkets();
    },

    onChangingLanguage: function () {
        Ember.run.once(this, this._loadSubMarkets);
    }.observes('isLanguageChanged'),

    willDestroyElement: function () {
        this.set('subMarkets', []);
        this.set('exchange', {});
        this.set('currentMarketId', '');

        this._super();
    },

    onPriceExchangeSummaryMetaReady: function () {
        this.setSubMarkets();
    },

    setSubMarkets: function () {
        Ember.run.once(this, this._loadSubMarkets);
    }.observes('exchange.subMarketArray.@each'),

    _loadSubMarkets: function () {
        var currentSubMkt = this.get('currentMarketId');
        var prevExg = this.get('exg');
        var currentExg = this.get('exchange.exg');
        var allDescription = this.get('allDescription');
        var optionAll = {marketId: '', lDes: allDescription ? allDescription : this.get('app').lang.labels.all, isShowAll: true};

        if (!this._isDestroying()) {
            if (!currentSubMkt || currentSubMkt === -1 || (prevExg !== '' && prevExg !== undefined && prevExg !== currentExg)) {
                this.set('currentMarketId', sharedService.getService('price').exchangeDS.getDefaultSubMarket(currentExg));
                this.set('exg', this.get('exchange.exg'));
            } else if (prevExg === '') {
                this.set('exg', this.get('exchange.exg'));
            }

            if (this.get('isAddAllOption')) {
                this.set('currentSubMarket', optionAll);
                this.set('currentMarketId', '');
                this.set('subMarkets', Ember.A([optionAll]));
            } else {
                this.set('subMarkets', Ember.A());
            }

            if (this.get('exchange.subMarketArray')) {
                this.subMarkets.pushObjects(this.get('exchange.subMarketArray'));
            }
        }
    },

    _isDestroying: function () {
        return this.get('isDestroyed') || this.get('isDestroying'); // TODO: [Bashitha] Move this implementation to a common place
    },

    actions: {
        setSubMarket: function (option) {
            this.sendAction('onSubMarketChanged', option.marketId);
        }
    }
});
