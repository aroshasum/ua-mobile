/* global Draggabilly */
import Ember from 'ember';
import sharedService from '../../../../models/shared/shared-service';
import PriceConstant from '../../../../models/price/price-constants';
import BaseArrayController from '../../../base-array-controller';
import appConfig from '../../../../config/app-config';
import utils from '../../../../utils/utils';

export default BaseArrayController.extend({
    content: null,
    sortProperties: ['dt'],
    sortAscending: false,
    showAnnTabs: false,
    theFilter: -1,
    annObj: null,
    annBodyMsg: '',
    title: '',
    exchange: '',
    provider: '',
    currSubAnnType: 1,
    isSubAnnTabsEnabled: appConfig.customisation.isSubAnnTabsEnabled,
    isEnabledExgFilter: false,
    updateCssTimer: undefined,  // Timer for updating css for news and announcements
    unReadBoldHours: 2.5,   // If the difference between UTC and announcement or news' created time in hours is less than
                            // 2 hours show the time as 1 hour ago, etc. The momentJS is rounding off the difference
                            // to the nearest whole number. To avoid conflicts in displaying the 0.5 is added with 2.
    timeFormatLimit: 6.5,

    selectedTab: undefined,
    announcementTabs: [],
    isAnntabsChanged: false,
    selectedNewAnn: undefined,
    datePickerFormat: sharedService.userSettings.displayFormat.dateFormat.toLowerCase(),

    priceService: sharedService.getService('price'),

    isTablet: appConfig.customisation.isTablet,

    Tabs: {
        All: 1,
        Announcement: 2,
        News: 3,
        Search: 4
    },

    timeIndex: {
        start: 0,
        endTime: 5,
        endDateTime: 16
    },

    onLoadWidget: function () {
        this.set('isNewsEnabled', this.priceService.userDS.isWindowTypeAvailable([PriceConstant.WindowType.News], 'SYS'));
        this.set('lan', sharedService.userSettings.currentLanguage.toLowerCase());
        this._setTimeLocale();
        this.updateHoursTimer();
        this.setAnnTabs();
    },

    onAfterRender: function () {
        var that = this;

        Ember.run.later(function () {
            Ember.$('.nano').nanoScroller();
        }, 400);

        Ember.run.next(function () {
            that.bindAnnLinks();
        });
    },

    onLanguageChanged: function (lang) {
        this.set('lan', sharedService.userSettings.currentLanguage.toLowerCase());

        // Local time update
        this._setTimeLocale();
        this.updateDateTimeCSS();

        this.setErrorMessage();
        this.setAnnTabs();

        this.toggleProperty('isAnntabsChanged');
        this.refreshWidget({exg: this.get('exg'), lang: lang});
    },

    _setTimeLocale: function () {
        if (this.get('lan') === 'ar') {
            this.utils.moment.locale('ar-sa'); // set this instance to use Saudi Arabic
        } else {
            this.utils.moment.locale('en');
        }
    },

    onUnloadWidget: function () {
        this.priceService.announcementDS.cacheAnnouncementNews();
        Ember.run.cancel(this.get('updateCssTimer'));
    },

    onFilterChanged: function () {
        this.setTitle();
    }.observes('theFilter'),

    setTitle: function () {
        var title;
        var filterType = this.get('theFilter');
        var lanStore = this.get('app').lang.labels;

        if (filterType === PriceConstant.ResponseType.Data.ResponseAnnouncement) {
            title = lanStore.announcement;
        } else if (filterType === PriceConstant.ResponseType.Data.ResponseNews) {
            title = lanStore.newsTab;
        } else {
            title = lanStore.newsAnn;
        }

        this.set('title', title);
    },

    sortedContent: function () {
        return this.get('arrangedContent');
    }.property('arrangedContent'),

    checkFilterMatch: function (theObject, typeFilter) {
        var checkTypeFilter = typeFilter !== -1;
        var isMatchedTypeFilter = true;
        var isMatchedExgFilter = true;
        var isSubAnnFilter = true;

        if (checkTypeFilter && theObject.get('type')) {
            isMatchedTypeFilter = theObject.get('type') === typeFilter;
        }

        if (this.get('isEnabledExgFilter') && theObject.get('exg')) {
            isMatchedExgFilter = (theObject.get('type') === PriceConstant.ResponseType.Data.ResponseAnnouncement) ?
            theObject.get('exg') === this.get('exchange') : theObject.get('exg') === this.get('provider');
        }

        if (this.get('isSubAnnTabsEnabled') && this.get('showAnnTabs') && theObject.get('type') === PriceConstant.ResponseType.Data.ResponseAnnouncement) {
            isSubAnnFilter = this.filterSubAnnoucements(theObject);
        }

        return isMatchedTypeFilter && isMatchedExgFilter && isSubAnnFilter;
    },

    filterSubAnnoucements: function (item) {
        var subAnnFilter = true;
        var itemTag = -1;
        var itemTagArray = [];

        if (item.get('ref')) {
            itemTagArray = (item.get('ref')).split(utils.Constants.StringConst.Pipe);
            itemTag = parseInt(itemTagArray[itemTagArray.length - 1], 10);
        }

        if (itemTag !== this.get('currSubAnnType')) {
            subAnnFilter = false;
        }

        return subAnnFilter;
    },

    filteredContent: (function () {
        var recentAnnouncementLimit = sharedService.getService('price').settings.configs.announcementNews.recentAnnouncementNewsLimit;
        var sortedContent = this.get('sortedContent');

        if (sortedContent) {
            var filteredContent = sortedContent.filter((function (that) { //eslint-disable-line
                return function (theObject) {
                    if (that.get('theFilter') || that.get('exchange') || that.get('provider')) {
                        return that.checkFilterMatch(theObject, that.get('theFilter'), that.get('exchange'), that.get('provider'));
                    } else {
                        return true;
                    }
                };
            })(this));

            if (filteredContent && filteredContent.length > recentAnnouncementLimit) {
                filteredContent = filteredContent.slice(0, recentAnnouncementLimit);
            }

            return filteredContent;
        } else {
            return Ember.A();
        }
    }).property('theFilter', 'sortedContent.@each', 'exchange', 'provider', 'currSubAnnType'),

    updateDateTimeCSS: function () {
        var that = this;

        Ember.run.once(function () {
            Ember.$.each(that.get('filteredContent'), function (key, value) {
                that.updateReadHoursCSS(value);
                Ember.set(value, 'css', '');
            });

            that.set('annObj', that.get('filteredContent').objectAt(0));
        });
    },

    updateReadHoursCSS: function (value) {
        var defaultDateTimeMinuteFormat = 'YYYY-MM-DD HH:mm';
        var currentDateTime = this.utils.moment.utc().format(defaultDateTimeMinuteFormat);
        var currentDate = currentDateTime.split(' ')[0];
        var dateTime = value.get('dt');
        var annNewsDateTime = this.utils.formatters.formatToDateTimeMinute(dateTime, undefined, defaultDateTimeMinuteFormat);
        var isAnnNewsRead = value.get('isRead');

        var annNewsCurDiffTime = this.utils.moment(annNewsDateTime).from(currentDateTime);     // To show an hour ago, etc.
        var annNewsCurDiffTimeHours = this.utils.moment(currentDateTime).diff(annNewsDateTime, 'hours', true);
        var annNewsTime = annNewsDateTime.split(' ')[1];
        var annNewsDate = annNewsDateTime.split(' ')[0];

        var currentLanguage = sharedService.userSettings.currentLanguage.toLowerCase();
        this.set('lan', currentLanguage);

        if (currentLanguage === 'ar') {
            annNewsDateTime = this.utils.moment(annNewsDateTime).format('DD-MM-YYYY h:mm A');
        } else {
            annNewsDateTime = this.utils.moment(annNewsDateTime).format('DD-MMM-YYYY h:mm A');
        }

        var timeIndex = this.get('timeIndex');
        var annNewsHeadCss = '';

        // If the announcement or news is created today and time is lesser than 2 hours
        // display time only with bold font for unread items and normal font for read items
        // If the announcement or news is created today and time is greater than 2 hours
        // display time only with normal font
        // Otherwise display date and time with normal font
        if (annNewsCurDiffTimeHours < this.unReadBoldHours && currentDate === annNewsDate) {
            Ember.set(value, 'annNewsTimeCss', 'highlight-fore-color');
            Ember.set(value, 'dDTt', annNewsCurDiffTime);
        } else if (currentDate === annNewsDate) {
            Ember.set(value, 'annNewsTimeCss', 'highlight-fore-color');

            if (annNewsCurDiffTimeHours < this.timeFormatLimit) {
                Ember.set(value, 'dDTt', annNewsCurDiffTime);
            } else {
                Ember.set(value, 'dDTt', annNewsTime.substring(timeIndex.start, timeIndex.endTime));
            }
        } else {
            Ember.set(value, 'annNewsTimeCss', '');
            Ember.set(value, 'dDTt', annNewsDateTime);
        }

        if (!isAnnNewsRead && currentDate === annNewsDate) {
            annNewsHeadCss = 'bold';
        }

        Ember.set(value, 'annNewsHeadCss', annNewsHeadCss);
    },

    updateHoursTimer: function () {
        var that = this;
        this.updateDateTimeCSS();

        this.set('updateCssTimer', Ember.run.later(function () {
            that.updateHoursTimer();
        }, 300000));
    },

    updateContentCSS: (function () {
        this.updateDateTimeCSS();
    }).observes('filteredContent.@each.dDt'),

    getContentBody: function (annObj) {
        var that = this;

        if (!annObj.get('isBodyUpdated')) {
            that.annObj.set('bod', that.get('app').lang.messages.loading);

            this.priceService.sendNewsAnnBodyRequest({
                id: annObj.get('id'),
                type: annObj.get('type'),
                undefined,

                reqFailureFn: function () {
                    that.annObj.set('bod', that.get('app').lang.labels.dataNotAvailable);
                    that.annObj.set('isBodyUpdated', false);
                },

                lan: annObj.get('ln')
            });
        }
    },

    getAnnouncementNews: function (annId, type) {
        var annObj = this.priceService.announcementDS.getAnnouncement(annId, type);

        if (!annObj.get('isRead')) {
            annObj.set('isRead', true);
            this.priceService.announcementDS.set('isNewItemsAvailable', true);
        }

        Ember.set(this.get('annObj'), 'css', '');
        this.set('annObj', annObj);
        Ember.set(this.get('annObj'), 'css', 'watchlist-cell-back-green');
        this.updateReadHoursCSS(annObj);
    },

    _getNextPreviousItem: function (index) {
        var annNewsItem = this.get('filteredContent').objectAt(index);
        this.getAnnouncementNews(annNewsItem.id, annNewsItem.type);
        this.getContentBody(annNewsItem);
    },

    _showHideNextPrevious: function (nextPreIndex) {
        if (nextPreIndex === 0) {
            Ember.$('#annPrevious').addClass('visibility-hidden');
        } else if (nextPreIndex === this.get('filteredContent').length - 1) {
            Ember.$('#annNext').addClass('visibility-hidden');
        } else {
            Ember.$('#annPrevious').removeClass('visibility-hidden');
            Ember.$('#annNext').removeClass('visibility-hidden');
        }
    },

    _dragAnnNews: function () {
        Ember.run.schedule('afterRender', this, function () {
            // To hide Next or Previous button
            this._showHideNextPrevious(this.get('filteredContent').indexOf(this.get('annObj')));

            var elem = document.querySelector('.news-popup');

            new Draggabilly(elem, {       // eslint-disable-line
                handle: '#annNewsDrag',
                x: 100,
                y: 200
            });
            Ember.$('.an-resizable').resizable();
        });
    },

    setAnnTabs: function () {
        this.prepareTabs();
        var newActive = this.get('announcementTabs').findProperty('id', this.get('selectedTab'));

        if (newActive) {
            this.set('announcementTabsActive', newActive);
        } else {
            this.set('announcementTabsActive', {id: 1, displayDesc: this.get('app').lang.labels.all});
        }
    },

    prepareTabs: function () {
        var tabs = [
            {id: 1, displayDesc: this.get('app').lang.labels.all},
            {id: 2, displayDesc: this.get('app').lang.labels.announcement}
        ];

        if (this.get('isNewsEnabled') || this.get('showAnnTabs')) {
            tabs[tabs.length] = {id: 3, displayDesc: this.get('app').lang.labels.newsTab};
        }

        this.set('announcementTabs', tabs);
    },

    bindAnnLinks: function () {
        var childViewLoadDelay = 800;

        Ember.run.later(function () {
            var bodyContainer = Ember.$('.news-link');

            if (bodyContainer) {
                bodyContainer.on('click', 'a', function (event) {
                    var linkTarget = this.href;
                    var urlArray = linkTarget ? linkTarget.split(this.baseURI) : [];

                    if (urlArray.length > 1 && urlArray[1].indexOf('http') > -1) {
                        linkTarget = decodeURIComponent(urlArray[1]);
                    }

                    event.preventDefault();

                    if (appConfig.customisation.isMobile && Ember.isIos) {
                        window.open(linkTarget, '_blank', 'location=yes,enableViewPortScale=yes');
                    } else {
                        window.open(linkTarget, '_system');
                    }
                });
            }
        }, childViewLoadDelay);
    },

    onCheckDataAvailability: function () {
        var dataStock = this.get('filteredContent');

        return dataStock.length !== 0;
    },

    actions: {
        onTabSelected: function (tab) { // this is used in announcement Right-Panel actions when ann-tab is selected
            this.set('selectedTab', tab.id);

            var theFilter;
            var content;
            var tabName;

            if (tab.id === this.Tabs.All) {
                theFilter = -1;
                content = this.priceService.announcementDS.annNewsStoreArray;
                tabName = 'all';
            } else if (tab.id === this.Tabs.Announcement) {
                theFilter = PriceConstant.ResponseType.Data.ResponseAnnouncement;
                content = this.priceService.announcementDS.annStoreArray;
                tabName = 'announcements';
            } else if (tab.id === this.Tabs.News) {
                theFilter = PriceConstant.ResponseType.Data.ResponseNews;
                content = this.priceService.announcementDS.newsStoreArray;
                tabName = 'news';
            }

            this.set('theFilter', theFilter);
            this.set('content', content);
            this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['tab:', tabName].join(''));

            if (this.get('isSubAnnTabsEnabled') && this.get('filteredContent').length === 0) {
                this.cancelRequestTimeout(this.get('loadingTimeoutTimer'));
                this.setRequestTimeout(1, 'filteredContent.length');
            }
        },

        itemClicked: function (annId, type) {
            var that = this;
            var viewName = 'price/widgets/announcement/components/announcement-news-popup';

            if (appConfig.customisation.isMobile) {
                this.set('selectedNewAnn', annId);
                this.set('isMobile', true);

                sharedService.getService('priceUI').showChildView(viewName, this, this.get('app.lang.labels.newsAnn'), 'newsPopup-' + this.get('wkey'));
                that._showHideNextPrevious(this.get('filteredContent').indexOf(this.get('annObj')));
            } else {
                var event = Ember.appGlobal.events.mousedown ? Ember.appGlobal.events.mousedown : window.event;

                // Render announcement-news-popup.hbs component to application.hbs
                var modal = sharedService.getService('sharedUI').getService('modalPopupId');
                var announcementNewsPopup = that.container.lookupFactory('controller:price/widgets/announcement/components/announcement-news-popup').create();
                var elementDiv = event.target.parentElement;
                var isParentDiv = true;

                this.set('selectedNewAnn', annId);

                while (isParentDiv) {
                    if (elementDiv.id === this.get('wkey')) { // Get widget
                        elementDiv = elementDiv.id;
                        break;
                    } else {
                        elementDiv = elementDiv.parentElement;
                    }
                }

                var container = Ember.$('div#' + elementDiv);
                announcementNewsPopup.showPopup(that, viewName, modal, container);
                that._dragAnnNews();
            }

            that.bindAnnLinks();
            that.getAnnouncementNews(annId, type);
            that.getContentBody(this.get('annObj'));
            that.utils.analyticsService.trackEvent(this.get('gaKey'), that.utils.Constants.GAActions.rowClick, ['id:', annId, ',type:', (that.get('annObj').type === PriceConstant.ResponseType.Data.ResponseNews) ? 'News' : 'Announcement'].join(''));
        },

        closePopup: function () {
            var modal = sharedService.getService('sharedUI').getService('modalPopupId');
            modal.send('closeModalPopup');
        },

        loadNextPreItem: function (annObj, isPrevious) {
            var currentItemIndex = this.get('filteredContent').indexOf(annObj);
            var nextPreIndex = currentItemIndex + 1;

            if (isPrevious) {
                nextPreIndex = currentItemIndex - 1;
            }

            this._getNextPreviousItem(nextPreIndex);
            this._showHideNextPrevious(nextPreIndex);
        }
    }
});
