import PriceConstant from '../../../../models/price/price-constants';
import sharedService from '../../../../models/shared/shared-service';
import AnnouncementBase from './announcement-base';

export default AnnouncementBase.extend({
    // Widget Header Params
    hideSymbol: true,
    hideWidgetLink: true,
    isExgNewsReqSent: false,

    priceService: sharedService.getService('price'),

    onLoadWidget: function () {
        var filterType = this.get('type') || -1;
        var lang = this.get('lang') ? this.get('lang') : sharedService.userSettings.currentLanguage;

        this.priceService.subscribePriceMetaReady(this, this.get('wkey'));
        this.priceService.subscribeAuthSuccess(this, this.get('wkey'));

        this.set('lang', lang);
        this.set('theFilter', filterType);

        this.setTitle();

        this.set('popupId', this.get('wkey'));
        this._super();
    },

    onPriceMetaReady: function (isSuccess) {
        if (isSuccess && !this.get('isExgNewsReqSent') && this.priceService.isAuthenticated()) {
            this._sendExgNewsSubscription();
        }
    },

    onPrepareData: function () {
        if (this.get('type') === PriceConstant.ResponseType.Data.ResponseNews) {
            this.set('content', this.priceService.announcementDS.newsStoreArray);
        } else if (this.get('type') === PriceConstant.ResponseType.Data.ResponseAnnouncement) {
            this.set('content', this.priceService.announcementDS.annStoreArray);
        } else {
            this.set('content', this.priceService.announcementDS.annNewsStoreArray);
        }

        var exg = this.get('exg') ? this.get('exg') : sharedService.userSettings.price.currentExchange;
        var sym = this.get('sym');
        var symObj = this.utils.validators.isAvailable(sym) ? this.priceService.stockDS.getStock(exg, sym) : {};

        this.set('symbolObj', symObj);
        this.set('exchange', exg);
        this.set('isEnabledExgFilter', true);
    },

    onAfterRender: function () {
        this.generateScrollBar(undefined, 2000);
    },

    onAddSubscription: function () {
        if (this.priceService.isAuthenticated()) {
            this._sendExgAnnouncementSubscription();
            this._sendExgNewsSubscription();
        }
    },

    onAuthSuccess: function () {
        this._sendExgAnnouncementSubscription();
        this._sendExgNewsSubscription();
    },

    _sendExgAnnouncementSubscription: function () {
        this.priceService.addFullMarketAnnouncementRequest(this.get('exg') ? this.get('exg') : sharedService.userSettings.price.currentExchange, this.get('lang'));
    },

    _sendExgNewsSubscription: function () {
        if (this.priceService.isPriceMetadataReady()) {
            var newsProvider = this.priceService.exchangeDS.getExchange(this.get('exg') ? this.get('exg') : sharedService.userSettings.price.currentExchange).newsProv;
            this.priceService.addFullMarketNewsRequest(newsProvider, this.get('lang'));

            this.set('provider', newsProvider);
            this.set('isExgNewsReqSent', true);
        }
    },

    onRemoveSubscription: function () {
        var exchange = this.get('exg') ? this.get('exg') : sharedService.userSettings.price.currentExchange;
        var exgObj = this.priceService.exchangeDS.getExchange(exchange);

        if (exgObj) {
            this.priceService.removeFullMarketAnnouncementRequest(exchange, this.get('lang'));
            this.priceService.removeFullMarketNewsRequest(exgObj.newsProv, this.get('lang'));
        }
    },

    onLanguageChanged: function (lang) {
        this.setTitle();
        this._super(lang);
    },

    onUnloadWidget: function () {
        this._super();
        this.priceService.unSubscribePriceMetaReady(this.get('wkey'));
    }
});