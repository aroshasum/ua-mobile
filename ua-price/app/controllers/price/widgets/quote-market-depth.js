import Ember from 'ember';
import sharedService from '../../../models/shared/shared-service';
import BaseArrayController from '../../base-array-controller';
import PriceConstants from '../../../models/price/price-constants';
import appConfig from '../../../config/app-config';
import appEvents from '../../../app-events';

export default BaseArrayController.extend({
    dimensions: {
        w: 3,
        h: 33
    },
    symbolObj: {},
    bidRecordList: Ember.A(),
    offerRecordList: Ember.A(),
    isMarketDepthByPrice: true,
    title: null,
    isShowTitle: true,

    priceService: sharedService.getService('price'),

    isMobile: function () {
        return appConfig.customisation.isMobile;
    }.property(),

    isDelayedUser: function () {
        return this.priceService.userDS.isExchangeDelayed(this.get('exg'));
    }.property('exg'),

    isShowUpgrade: function () {
        return this.utils.validators.isAvailable(appConfig.subscriptionConfig.upgradeSubscriptionPath) && this.get('isDelayedUser');
    }.property('exg'),

    titleSymbol: function () {
        return this.get('isMobile') ? '' : this.get('symbolObj.dispProp1');
    }.property('symbolObj.dispProp1'),

    // Base overrides
    onLoadWidget: function () {
        var mode = this.get('mode');
        var isShowTitle = this.get('hideTitle') ? !this.get('hideTitle') : true;

        this.set('isShowTitle', isShowTitle);
        mode = mode ? mode : PriceConstants.MarketDepthType.DepthByPrice;
        this.set('isMarketDepthByPrice', (mode === PriceConstants.MarketDepthType.DepthByPrice));

        this.setTitle();
        appEvents.subscribeSymbolChanged(this.get('wkey'), this, this.get('selectedLink'));
    },

    onLanguageChanged: function () {
        this.setTitle();
    },

    onAfterRender: function () {
        this.generateScrollBar(this.get('wkey'), 2000);
    },

    onPrepareData: function () {
        var exchange = this.get('exg');
        var symbol = this.get('sym');
        var mode = this.get('mode') ? this.get('mode') : PriceConstants.MarketDepthType.DepthByPrice;
        var depthObj = {};

        if (symbol && exchange) {
            this.set('symbolObj', this.priceService.stockDS.getStock(exchange, symbol));
            depthObj = this.priceService.marketDepthDS.getDepthItem(exchange, symbol, mode);
        }

        this.set('bidRecordList', depthObj.bidRecords);
        this.set('offerRecordList', depthObj.offerRecords);
    },

    onAddSubscription: function () {
        var exchange = this.get('exg');
        var symbol = this.get('sym');

        if (symbol && exchange) {
            if (this.get('isMarketDepthByPrice')) {
                this.priceService.addMarketDepthByPriceRequest(exchange, symbol);
                this.utils.analyticsService.trackEvent([this.get('gaKey'), '-by-price'].join(''), this.utils.Constants.GAActions.show, ['sym:', this.get('sym'), '~', this.get('exg')].join(''));
            } else {
                this.priceService.addMarketDepthByOrderRequest(exchange, symbol);
                this.utils.analyticsService.trackEvent([this.get('gaKey'), '-by-order'].join(''), this.utils.Constants.GAActions.show, ['sym:', this.get('sym'), '~', this.get('exg')].join(''));
            }

            this.priceService.addSymbolRequest(exchange, symbol, this.get('inst'));
        }
    },

    onRemoveSubscription: function () {
        var exchange = this.get('exg') ? this.get('exg') : this.get('symbolObj').exg; // Initial implementation is to get it from this.get('symbolObj').exg only - temp comment
        var symbol = this.get('sym') ? this.get('sym') : this.get('symbolObj').sym;
        var insType = this.get('inst') ? this.get('inst') : this.get('symbolObj').inst;

        if (this.get('isMarketDepthByPrice')) {
            this.priceService.removeMarketDepthByPriceRequest(exchange, symbol);
        } else {
            this.priceService.removeMarketDepthByOrderRequest(exchange, symbol);
        }

        this.priceService.removeSymbolRequest(exchange, symbol, insType);
    },

    onUnloadWidget: function () {
        this.set('symbolObj', null);
        this.set('bidRecordList', Ember.A());
        this.set('offerRecordList', Ember.A());

        appEvents.unSubscribeSymbolChanged(this.get('wkey'), this.get('selectedLink'));
    },

    setTitle: function () {
        var mode = this.get('mode');
        var title = (mode === PriceConstants.MarketDepthType.DepthByPrice) ?
            this.get('app').lang.labels.depthByPrice : this.get('app').lang.labels.depthByOrder;

        this.set('title', title);
    },

    actions: {
        setLink: function (option) {
            this.setWidgetLink(option);
        }
    }
});
