import Ember from 'ember';
import sharedService from '../../../../models/shared/shared-service';
import PriceConstant from '../../../../models/price/price-constants';
import AnnouncementBase from './announcement-base';
import appEvents from '../../../../app-events';
import appConfig from '../../../../config/app-config';

export default AnnouncementBase.extend({
    priceService: sharedService.getService('price'),

    onLoadWidget: function () {
        var filterType = this.get('type') || -1;

        this.set('theFilter', filterType);
        this.setTitle();
        this.set('popupId', this.get('wkey'));
        this.set('isMobile', appConfig.customisation.isMobile);

        appEvents.subscribeSymbolChanged(this.get('wkey'), this, this.get('selectedLink'));
        this._super();
    },

    onLanguageChanged: function () {
        this.setTitle();
        this._super();
    },

    onPrepareData: function () {
        var exchange = this.get('exg');
        var symbol = this.get('sym');

        this.set('content', this.priceService.announcementDS.getAnnCollectionBySymbol(exchange, symbol));
        this.set('symbolObj', this.priceService.stockDS.getStock(this.get('exg'), this.get('sym')));
        this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.show, ['sym:', symbol, '~', exchange].join(''));
    },

    onAfterRender: function () {
        this.generateScrollBar(this.get('wkey'), 4000);
    },

    onAddSubscription: function () {
        var that = this;
        var exchange = this.get('exg');
        var symbol = this.get('sym');

        Ember.run.next(this, function () {
            that.priceService.sendAnnouncementSearchRequest({
                exchange: exchange,
                symbol: symbol,
                pageSize: PriceConstant.AnnouncementSearchPageSize
            }, that.priceService.announcementDS.getAnnCollectionBySymbol(exchange, symbol));

            that.priceService.sendNewsSearchRequest({
                exchange: exchange,
                symbol: symbol,
                pageSize: PriceConstant.NewsSearchPageSize
            }, that.priceService.announcementDS.getAnnCollectionBySymbol(exchange, symbol));
        });
    },

    onClearData: function () {
        this.priceService.announcementDS.removeAnnCollectionBySymbol(this.get('exg'), this.get('sym'));
    },

    onUnloadWidget: function () {
        this._super();
        appEvents.unSubscribeSymbolChanged(this.get('wkey'), this.get('selectedLink'));
    },

    actions: {
        setLink: function (option) {
            this.setWidgetLink(option);
        }
    }
});