import Ember from 'ember';
import quoteWatchList from './watch-list/watch-list';
import appEvents from '../../../../app-events';
import sharedService from '../../../../models/shared/shared-service';

export default quoteWatchList.extend({
    indicesArray: Ember.A(),
    isIndexView: true,
    disableExpand: true,
    sortAscending: true,
    isTableControlPanelDisabled: true,

    priceService: sharedService.getService('price'),

    onLoadWidget: function () {
        this._super();

        var isDefaultExg = sharedService.getService('price').userDS.isPriceUserExchange(this.get('exg'));
        this.set('exg', isDefaultExg ? this.get('exg') : sharedService.userSettings.price.userDefaultExg);

        // this.set('exg', sharedService.userState.globalArgs.exg);
        appEvents.subscribeExchangeChanged(this.get('selectedLink'), this.get('wkey'), this);
    },

    onPrepareData: function () {
        var exg = this.get('exg');
        this.priceService.addFullMarketIndexRequest(exg);

        this.set('sortProperties', ['dSym']);
        this.set('indicesArray', this.priceService.stockDS.getIndexCollectionByExchange(exg));
        this.loadContent();
    },

    loadContent: function () {
        var indicesList = this.priceService.stockDS.getIndexCollectionByExchange(this.get('exg'));

        this.set('content', indicesList);
        this.set('masterContent', indicesList);
    },

    onClearData: function () {
        var exg = this.get('exg');
        this.priceService.removeFullMarketIndexRequest(exg);

        this.set('content', Ember.A());
        this.set('masterContent', Ember.A());
        this.set('indicesArray', Ember.A());
    },

    actions: {
        expandColumnAction: function () {
            this.set('isExpandedView', false);
        }
    }
});