import Ember from 'ember';
import appEvents from '../../../../app-events';
import ExchangeAnnouncement from '../../widgets/announcement/exchange-announcement';

export default ExchangeAnnouncement.extend({
    topAnn: [],
    wkey: 'title-panel-ann-ticker',    // TODO [Arosha] Remove this when 'wkey' is implemented to Title Panel

    onLoadWidget: function () {
        this._super();
        appEvents.subscribeLanguageChanged(this, this.get('wkey'));
    },

    onPrepareData: function () {
        this._super();
        this._bindNewsAnnContent();
    },

    onUnloadWidget: function () {
        this._super();
        appEvents.unSubscribeLanguageChanged(this.get('wkey'));
    },

    onLanguageChanged: function (lang) {
        // TODO: [Anushka] Remove this immediately after refactoring
        this.priceService.announcementDS.store = {};
        this.priceService.announcementDS.annNewsStoreArray.clear();

        this._super(lang);
    },

    _bindNewsAnnContent: function () {
        Ember.run.once(this, this._getLatestNewsAnn);
    }.observes('sortedContent.length'),

    _getLatestNewsAnn: function () {
        this.set('topAnn', this.get('sortedContent').slice(0, 5));
    }
});
