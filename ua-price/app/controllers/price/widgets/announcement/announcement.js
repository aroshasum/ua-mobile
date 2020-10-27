import Ember from 'ember';
import sharedService from '../../../../models/shared/shared-service';
import ExchangeAnnouncement from './exchange-announcement';
import appConfig from '../../../../config/app-config';
import PriceConstant from '../../../../models/price/price-constants';
import priceWidgetConfig from '../../../../config/price-widget-config';

export default ExchangeAnnouncement.extend({
    wkey: 'right-Ann-Popup',    // TODO [Eranga G] remove this when 'wkey' is implemented to right panel
    exg: sharedService.userSettings.price.currentExchange,   // TODO [Eranga G] remove this when 'exg' para is implemented to right panel
    showAnnTabs: true,
    isMobile: appConfig.customisation.isMobile,
    isTablet: appConfig.customisation.isTablet,
    subAnnList: Ember.A(),
    isAnnFilterEnabled: false,
    isLoading: false,
    defaultFilterIndex: 0,
    isShowWidgetHeader: false,

    tabCss: {
        tabContainer: 'pad-s-t',
        tabPanelContainer: 'layout-col pad-m-l',
        tabPanelClass: 'widget-tab-panel',
        tabItemClass: 'layout-inline widget-tab-item mgn-s-r',
        tabLinkClass: 'layout-inline font-size-initial',
        tabScroll: 'has-scrollbar'
    },

    onLoadWidget: function () {
        this._super();
        this.set('tabCss.tabContainer', this.isTablet ? '' : 'pad-s-t');
        this.set('isShowWidgetHeader', this.isTablet || this.isMobile);
    },

    onLanguageChanged: function (lang) {
        this._super(lang);

        if (this.get('isSubAnnTabsEnabled')) {
            this.loadfilterAnnDropDown();
        }
    },

    onPrepareData: function () {
        this._super();

        if (this.get('isSubAnnTabsEnabled')) {
            var app = this.get('app');

            this.loadfilterAnnDropDown();
            this.setTabCss();
            this.set('errorMessage', app.lang.messages.dataNotAvailable);
            this.loadTimer();
        }
    },

    loadTimer: function () {
        if (this.get('filteredContent').length === 0) {
            this.setRequestTimeout(1, 'filteredContent.length');
        }
    },

    setFilteredAnnDropDown: function () {
        if (this.get('selectedTab') === this.get('Tabs').Announcement && this.get('isSubAnnTabsEnabled') && this.get('showAnnTabs') || this.get('isShowAnnFilter')) {
            this.set('isAnnFilterEnabled', true);
        } else {
            this.set('isAnnFilterEnabled', false);
        }
    }.observes('selectedTab'),

    setTabCss: function () {
        if (this.isMobile) {
            var tabCss = {
                tabContainer: '',
                tabPanelContainer: 'layout-container pad-m-l full-width',
                tabPanelClass: 'full-width overflow-visible',
                tabItemClass: 'layout-col wdgttl-tab-item ellipsis h-middle overflow-visible fore-color',
                tabLinkClass: 'font-x-l',
                tabScroll: 'y-scroll'
            };

            this.set('tabCss', tabCss);
        }
    },

    loadfilterAnnDropDown: function () {
        var app = this.get('app');
        var dropDownItems = [];
        var defaultFilterIndex = this.get('defaultFilterIndex');

        if (priceWidgetConfig.newsAndDisclosures && priceWidgetConfig.newsAndDisclosures.announcementTabs) {
            dropDownItems = priceWidgetConfig.newsAndDisclosures.announcementTabs;

            Ember.$.each(dropDownItems, function (key, tab) {
                Ember.set(tab, 'displayName', app.lang.labels[tab.displayKey]);
            });

            this.set('currSubAnnItem', this.get('currSubAnnItem') ? this.get('currSubAnnItem') : dropDownItems[0].value);
            this.set('subAnnList', dropDownItems);
            this.set('defaultFilter', dropDownItems[defaultFilterIndex]);
        }
    },

    actions: {
        selectSubAnnItem: function (option) {
            var subAnnId = option.annValue;
            var theFilter = PriceConstant.ResponseType.Data.ResponseAnnouncement;
            var content = this.priceService.announcementDS.annStoreArray;

            this.set('theFilter', theFilter);
            this.set('content', content);
            this.set('currSubAnnType', subAnnId);
            this.cancelRequestTimeout(this.get('loadingTimeoutTimer'));
            this.setRequestTimeout(1, 'filteredContent.length');
        }
    }
});