import Ember from 'ember';
import BaseModuleInitializer from '../../../models/shared/initializers/base-module-initializer';
import PriceUIService from '../../../controllers/price/price-ui-service';
import appEvents from '../../../app-events';
import languageDataStore from '../../../models/shared/language/language-data-store';
import sharedService from '../../../models/shared/shared-service';
import AnnouncementContextMenu from '../widgets/announcement/components/announcement-context-menu';
import AnnouncementNewsPopup from '../widgets/announcement/components/announcement-news-popup';
import TitlebarNewsAnnouncement from '../widgets/announcement/components/titlebar-news-announcement';
import GlobalSearch from '../../../components/global-search';

export default BaseModuleInitializer.extend({
    preInitialize: function () {
        var service = this.createService();

        sharedService.registerService(service.subscriptionKey, service);

        service.initialize(languageDataStore.getLanguageObj());
        appEvents.subscribeLayoutReady(service.subscriptionKey, service);
    },

    createService: function () {
         return PriceUIService.create();
    }
});

Ember.Handlebars.helper('announcement-context-menu', AnnouncementContextMenu);
Ember.Handlebars.helper('announcement-news-popup', AnnouncementNewsPopup);
Ember.Handlebars.helper('titlebar-news-announcement', TitlebarNewsAnnouncement);
Ember.Handlebars.helper('global-search', GlobalSearch);
