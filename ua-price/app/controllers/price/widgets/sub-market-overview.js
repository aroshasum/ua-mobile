import Ember from 'ember';
import TableController from '../../shared/table-controller';
import sharedService from '../../../models/shared/shared-service';
import appEvents from '../../../app-events';

export default TableController.extend({
    priceService: sharedService.getService('price'),
    subMarketArray: Ember.A(),
    wkey: 'sub-market-overview', // Will be used when open as Child View only
    selectedLink: 1,

    onLoadWidget: function () {
        appEvents.subscribeExchangeChanged(this.get('selectedLink'), this.get('wkey'), this);
        this.setErrorMessage();
        this.setRequestTimeout(4, 'subMarketArray.length');
    },

    onPrepareData: function () {
        this.set('exchange', this.priceService.exchangeDS.getExchange(this.get('exg')));
    },

    onAddSubscription: function () {
        this.priceService.addExchangeRequest(this.get('exg'));
    },

    onClearData: function () {
        this.set('subMarketArray', Ember.A());
        this.set('exchange', undefined);
    },

    onUnloadWidget: function () {
        appEvents.unSubscribeExchangeChanged(this.get('selectedLink'), this.get('wkey'), this);
    },

    onRemoveSubscription: function () {
        this.priceService.removeExchangeRequest(this.exg);
    },

    onCheckDataAvailability: function () {
        return this.get('subMarketArray').length !== 0;
    },

    _loadSubMarkets: function () {
        this.set('subMarketArray', Ember.A());

        if (this.get('exchange.subMarketArray')) {
            this.get('subMarketArray').pushObjects(this.get('exchange.subMarketArray'));
        }
    }.observes('exchange.subMarketArray')
});
