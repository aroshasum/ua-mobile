import Ember from 'ember';
import utils from '../../../../../utils/utils';
import appEvents from '../../../../../app-events';
import sharedService from '../../../../../models/shared/shared-service';
import BaseComponent from '../../../../../components/base-component';
import LanguageDataStore from '../../../../../models/shared/language/language-data-store';

export default BaseComponent.extend({
    layoutName: 'trade/widgets/mobile/components/title-index-panel',
    index: '',
    priceService: sharedService.getService('price'),
    wkey: 'title-index-panel-mobile',
    selectedLink: 1,

    initialize: function () {
        this.set('appLayout', LanguageDataStore.getLanguageObj());
        appEvents.subscribeLanguageChanged(this, this.get('wkey'));
        appEvents.subscribeExchangeChanged(this.get('selectedLink'), this.get('wkey'), this);

        this.onPrepareData();
    }.on('init'),

    onPrepareData: function () {
        this.setExchangeData();
    },

    onAddSubscription: function () {
        sharedService.getService('price').addExchangeRequest(this.get('exchange').exg);
        sharedService.getService('price').addIndexRequest(this.get('exchange').exg, this.get('exchange').mainIdx);
    },

    setExchangeData: function () {
        var exgCode = this.get('exg') ? this.get('exg') : sharedService.userSettings.price.currentExchange;
        this.set('exchange', sharedService.getService('price').exchangeDS.getExchange(exgCode));

        var mainIndex = this.get('exchange').mainIdx;
        this.set('index', sharedService.getService('price').stockDS.getStock(exgCode, mainIndex ? mainIndex : sharedService.userSettings.price.defaultIndex, utils.AssetTypes.Indices));
        this.onAddSubscription();
    },

    languageChanged: function () {
        this.onPrepareData();
    },

    onWidgetKeysChange: function (args) {
        if (args) {
            var that = this;

            Ember.$.each(args, function (prop, val) {
                that.set(prop, val);
            });
        }

        this.onPrepareData();
    },

    indexContainerCSS: function () {
        return this.get('index.pctChg') >= 0 ? 'up-back-color' : 'down-back-color';
    }.property('index.pctChg')
});
