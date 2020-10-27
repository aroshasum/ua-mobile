import Ember from 'ember';
import sharedService from '../models/shared/shared-service';
import languageDataStore from '../models/shared/language/language-data-store';
import appEvents from '../app-events';

export default Ember.Component.extend({
    priceService: sharedService.getService('price'),
    tradeService: sharedService.getService('trade'),
    priceConnectionStatusStyle: 'appttl-down-fore-color',
    tradeConnectionStatusStyle: 'appttl-down-fore-color',
    app: languageDataStore.getLanguageObj(),
    priceConnectionStatusTitle: '',
    tradeConnectionStatusTitle: '',
    priceMessageStyle: '',
    tradeMessageStyle: '',
    priceHintStyle: '',
    tradeHintStyle: '',
    subscriptionKey: 'connectionStatus',

    initializeConnectionStat: function () {
        appEvents.subscribeLanguageChanged(this, this.get('subscriptionKey'));
    }.on('init'),

    onPriceConnectionStatusStyleChanged: function () {
        if (this.get('priceService').connectionStatus) {
            this.set('priceConnectionStatusStyle', 'appttl-up-fore-color');
            this.set('priceConnectionStatusTitle', this.get('app').lang.messages.priceConnected);
            this.set('priceHintStyle', 'hint--success');
        } else {
            this.set('priceConnectionStatusStyle', 'appttl-down-fore-color');
            this.set('priceConnectionStatusTitle', this.get('app').lang.messages.priceDisconnected);
            this.set('priceHintStyle', 'hint--error');
        }
    }.observes('priceService.connectionStatus'),

    onTradeConnectionStatusStyleChanged: function () {
        if (this.get('tradeService').connectionStatus) {
            this.set('tradeConnectionStatusStyle', 'appttl-up-fore-color');
            this.set('tradeConnectionStatusTitle', this.get('app').lang.labels.tradeConnected);
            this.set('tradeHintStyle', 'hint--success');
        } else {
            this.set('tradeConnectionStatusStyle', 'appttl-down-fore-color');
            this.set('tradeConnectionStatusTitle', this.get('app').lang.labels.tradeDisconnected);
            this.set('tradeHintStyle', 'hint--error');
        }
    }.observes('tradeService.connectionStatus'),

    _setConnectionStatusTitle: function () {
        if (this.get('priceService').connectionStatus) {
            this.set('priceConnectionStatusTitle', this.get('app').lang.messages.priceConnected);
        } else {
            this.set('priceConnectionStatusTitle', this.get('app').lang.messages.priceDisconnected);
        }

        if (this.get('isTradingEnabled')) {
            if (this.get('tradeService').connectionStatus) {
                this.set('tradeConnectionStatusTitle', this.get('app').lang.labels.tradeConnected);
            } else {
                this.set('tradeConnectionStatusTitle', this.get('app').lang.labels.tradeDisconnected);
            }
        }
    },

    languageChanged: function () {
        this._setConnectionStatusTitle();
    }
});