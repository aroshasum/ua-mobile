import Ember from 'ember';
import sharedService from '../../../../models/shared/shared-service';
import AnnouncementBase from './announcement-base';
import PriceConstant from '../../../../models/price/price-constants';
import appConfig from '../../../../config/app-config';
import utils from '../../../../utils/utils';
import responsiveHandler from '../../../../helpers/responsive-handler';

export default AnnouncementBase.extend({
    content: null,
    sortProperties: ['dt'],
    sortAscending: false,
    annObj: null,
    annBodyMsg: '',
    searchTitle: '',
    searchSymbol: '',
    startDate: '',
    endDate: '',
    toEndDate: '',

    isAdvancedSearch: false,
    disableSeparater: false,
    isEnabledAnnSearch: true,
    isEnabledNewsSearch: true,
    showExgFilter: true,
    showProviderFilter: false,
    lan: '',

    exchangeOption: Ember.A(),
    exchangeOptionForSearch: Ember.A(),
    selectedExgForAnnouncement: Ember.A(), // Selected exchanges for announcements

    providerSelection: undefined,
    providerOption: Ember.A(),
    providerOptionForSearch: Ember.A(),
    selectedExgForNews: Ember.A(), // Selected exchanges for news
    exgSelectionForNews: Ember.A(),
    exgSelectionForAnnouncement: {},

    // Filters
    symbolFilter: '',
    titleFilter: '',
    typeFilter: -1,

    // Tab settings
    tabAll: undefined,
    tabAnnouncement: undefined,
    tabNews: undefined,
    tabSearch: undefined,

    priceService: sharedService.getService('price'),

    onLoadWidget: function () {
        this._super();
        this.setErrorMessage();

        this.set('symbolSearchId', ['symbolSearch', this.get('wkey')].join('-'));

        var today = new Date();
        this.set('toEndDate', today);
    },

    onPrepareData: function () {
        this._loadSavedLayout();
        this._setExchangeArrays();

        if (this.get('isAdvancedSearch')) {
            this._bindSearchContent();
        } else {
            this._bindRealtimeContent();
            this._setFilterType();
        }
    },

    onAddSubscription: function () {
        this._sendSubscription();

        if (this.get('isAdvancedSearch')) {
            this._loadSearchContent();
        }
    },

    onClearData: function () {
        this.set('annObj', null);
        this.priceService.announcementDS.removeAnnouncementSearchCollection(this.get('wkey'));

        if (this.get('responsive')) {
            this.get('responsive').onClear();
        }
    },

    initializeResponsive: function () {
        if (this.get('isAdvancedSearch')) {
            this.set('responsive', responsiveHandler.create({
                controller: this,
                widgetId: 'newsAnnouncement-' + this.get('wkey'),
                callback: this.onResponsive
            }));

            this.responsive.addList('newsAnnouncement-free', [
                {id: 'newsCheckBox', width: 5},
                {id: 'announcementCheckBox', width: 5}
            ]);

            this.responsive.initialize();
        }
    },

    onResponsive: function (responsiveArgs) {
        var controller = responsiveArgs.controller;
        var container = Ember.$('#newsAnnouncement-' + controller.get('wkey'));

        // News Check
        var newsCheck = container.find('#newsCheck-' + controller.get('wkey'));
        var newsCheckRes = container.find('#newsCheckRes-' + controller.get('wkey'));
        var newsCheckContainer = container.find('#newsCheckContainer-' + controller.get('wkey'));

        // Announcement Check
        var announcementCheck = container.find('#announcementCheck-' + controller.get('wkey'));
        var announcementCheckRes = container.find('#announcementCheckRes-' + controller.get('wkey'));
        var announcementCheckContainer = container.find('#announcementCheckContainer-' + controller.get('wkey'));

        // Date Selection
        var dateSection = container.find('#dateSection-' + controller.get('wkey'));
        var dateSectionRes = container.find('#dateSectionRes-' + controller.get('wkey'));
        var dateSectionContainer = container.find('#dateSectionContainer-' + controller.get('wkey'));

        if (responsiveArgs.responsiveLevel >= 1) {
            controller.set('isNewsResponsive', true);
            newsCheck.appendTo(newsCheckRes);
        } else {
            controller.set('isNewsResponsive', false);
            newsCheck.appendTo(newsCheckContainer);
        }

        if (responsiveArgs.responsiveLevel >= 2) {
            announcementCheck.appendTo(announcementCheckRes);
            this.set('disableSeparater', true);
        } else {
            announcementCheck.appendTo(announcementCheckContainer);
            this.set('disableSeparater', false);
        }

        if (responsiveArgs.responsiveLevel >= 3) {
            dateSection.appendTo(dateSectionRes);
        } else {
            dateSection.appendTo(dateSectionContainer);
        }
    },

    onFilterChange: function () {
        this.set('annObj', this.get('filteredContent').objectAt(0));
    }.observes('typeFilter'),

    setContentBody: function () {
        if (this.get('annObj')) {
            this.getContentBody(this.get('annObj'));
        }
    }.observes('annObj.id'),

    filteredContent: (function () {
        if (this.get('sortedContent')) {
            return this.get('sortedContent').filter((function (that) {//eslint-disable-line
                return function (theObject) {
                    return that.checkFilterMatch(theObject, that.get('typeFilter'), that.get('symbolFilter'), that.get('titleFilter'));
                };
            })(this));
        } else {
            return Ember.A();
        }
    }).property('typeFilter', 'sortedContent.@each', 'symbolFilter', 'titleFilter', 'selectedExgForAnnouncement.@each', 'selectedExgForNews.@each'),

    isProviderSelectionDisabled: function () {
        return !this.get('isEnabledNewsSearch');
    }.property('isEnabledNewsSearch'),

    isExchangeSelectionDisabled: function () {
        return !this.get('isEnabledAnnSearch');
    }.property('isEnabledAnnSearch'),

    checkFilterMatch: function (theObject, typeFilter, symbolFilter, textFilter) {
        var checkSymbolFilter = this.utils.validators.isAvailable(symbolFilter) && !this.get('isAdvancedSearch') ? true : false;
        var checkTextFilter = this.utils.validators.isAvailable(textFilter) ? true : false;
        var checkTypeFilter = typeFilter !== -1;
        var isMatchedSymbolFilter = true;
        var isMatchedTextFilter = true;
        var isMatchedTypeFilter = true;
        var isMatchedExgFilter = true;

        if (checkSymbolFilter) {
            isMatchedSymbolFilter = (this.utils.validators.isAvailable(theObject.get('sym')) &&
            theObject.get('sym').isExist(symbolFilter));
        }

        if (checkTextFilter) {
            isMatchedTextFilter = (this.utils.validators.isAvailable(theObject.get('dHed')) &&
            theObject.get('dHed').isExist(textFilter));
        }

        if (checkTypeFilter) {
            isMatchedTypeFilter = theObject.get('type') === typeFilter;
        }

        if (!this.get('isAdvancedSearch')) {
            isMatchedExgFilter = (theObject.get('type') === PriceConstant.ResponseType.Data.ResponseAnnouncement) ?
            this.selectedExgForAnnouncement.indexOf(theObject.get('exg')) >= 0 : this.selectedExgForNews.indexOf(theObject.get('exg')) >= 0;
        }

        return isMatchedSymbolFilter && isMatchedTextFilter && isMatchedTypeFilter && isMatchedExgFilter;
    },

    onCheckDataAvailability: function () {
        var announcementArray = this.priceService.announcementDS.getAnnouncementSearchCollection(this.get('wkey'));

        return announcementArray.length !== 0;
    },

    _saveLayout: function () {
        var layout = {
            searchTitle: this.get('searchTitle'),
            searchSymbol: this.get('searchSymbol'),
            startDate: this.get('startDate'),
            endDate: this.get('endDate'),
            isEnabledAnnSearch: this.get('isEnabledAnnSearch'),
            isEnabledNewsSearch: this.get('isEnabledNewsSearch'),
            isAdvancedSearch: this.get('isAdvancedSearch'),
            exgSelectionForAnnouncement: this.get('exgSelectionForAnnouncement'),
            exgSelectionForNews: this.get('exgSelectionForNews'),
            selectedTab: this.get('selectedTab'),
            symbolFilter: this.get('symbolFilter'),
            titleFilter: this.get('titleFilter')
        };

        this.saveWidget({announcementLayout: layout});
    },

    _loadSavedLayout: function () {
        var layout = this.get('announcementLayout');

        if (layout) {
            this.set('searchTitle', layout.searchTitle);
            this.set('searchSymbol', layout.searchSymbol);
            this.set('startDate', this.utils.validators.isAvailable(layout.startDate) ? new Date(layout.startDate) : '');
            this.set('endDate', this.utils.validators.isAvailable(layout.endDate) ? new Date(layout.endDate) : '');
            this.set('isAdvancedSearch', layout.isAdvancedSearch || false);
            this.set('isEnabledAnnSearch', layout.isEnabledAnnSearch || true);
            this.set('isEnabledNewsSearch', layout.isEnabledNewsSearch || true);
            this.set('exgSelectionForAnnouncement', layout.exgSelectionForAnnouncement || {});
            this.set('exgSelectionForNews', layout.exgSelectionForNews || {});
            this.set('selectedTab', layout.selectedTab || this.Tabs.All);
            this.set('symbolFilter', layout.symbolFilter);
            this.set('titleFilter', layout.titleFilter);
        }
    },

    _setExchangeArrays: function () {
        var userExgList = this.priceService.userDS.get('userExchg');
        var delayedExg = this.priceService.userDS.get('delayedExchg');

        var that = this;
        var exchange, exgItem, isSelected;
        var exgArrNews = Ember.A();
        var exgArrOfNewsForSearch = Ember.A();
        var exgArrAnnouncement = Ember.A();
        var exgArrOfAnnForSearch = Ember.A();

        Ember.$.each(userExgList, function (key, value) {
            var isNewsProvAdded = false;
            var exgDisplayName = value;

            exchange = that.priceService.exchangeDS.getExchange(value);

            // Set announcement array
            exgItem = that.get('exgSelectionForAnnouncement')[exchange.exg];
            isSelected = that.utils.validators.isAvailable(exgItem) ? exgItem.isSelected : true; // TODO:[Eranga G] If exchange is default exchange set this as true or else false

            if (delayedExg.length > 0) {
                if (delayedExg.indexOf(value) > -1) {
                    exgDisplayName = [value, utils.Constants.Delayed].join(' ');
                }
            }

            exgArrAnnouncement.push({
                'displayName': exgDisplayName, 'val': exchange.exg, 'isSelected': isSelected, exg: value
            });

            exgArrOfAnnForSearch.push({
                'displayName': exgDisplayName, 'val': exchange.exg, 'isSelected': isSelected, exg: value
            });

            // Set news array
            exgItem = that.get('exgSelectionForNews')[exchange.exg];
            isSelected = that.utils.validators.isAvailable(exgItem) ? exgItem.isSelected : true; // TODO:[Eranga G] If exchange is default exchange set this as true or else false

            exgArrNews.forEach(function (item) {
                if (item.val === exchange.newsProv) {
                    isNewsProvAdded = true;
                }
            });

            if (exchange.newsProv && !isNewsProvAdded) {
                exgArrNews.push({
                    'displayName': exchange.newsProv, 'val': exchange.newsProv, 'isSelected': true, exg: value
                });

                exgArrOfNewsForSearch.push({
                    'displayName': exchange.newsProv, 'val': exchange.newsProv, 'isSelected': true, exg: value
                });
            }
        });

        this.set('exchangeOption', exgArrAnnouncement);
        this.set('exchangeOptionForSearch', exgArrOfAnnForSearch);
        this.set('providerOption', exgArrNews);
        this.set('providerOptionForSearch', exgArrOfNewsForSearch);
        this._setSelectedExchanges();
        this._setSelectedProviders();
    },

    _setSelectedExchanges: function () {
        var exgArrAnnouncement = this.get('exchangeOption');
        var selectedExchanges = Ember.A();
        var exgSelectionForAnnouncement = {};

        if (exgArrAnnouncement) {
            Ember.$.each(exgArrAnnouncement, function (key, obj) {
                    if (obj.isSelected) {
                        selectedExchanges.pushObject(obj.exg);
                    }

                    exgSelectionForAnnouncement[obj.exg] = {exg: obj.exg, isSelected: obj.isSelected};
                }
            );
        }

        this.set('exgSelectionForAnnouncement', exgSelectionForAnnouncement);
        this.set('selectedExgForAnnouncement', selectedExchanges);
    },

    _setSelectedProviders: function () {
        var exgArrNews = this.get('providerOption');
        var selectedExgForNews = Ember.A();
        var exgSelectionForNews = {};

        if (exgArrNews) {
            Ember.$.each(exgArrNews, function (key, obj) {
                    if (obj.isSelected) {
                        selectedExgForNews.pushObject(obj.val);
                    }

                    exgSelectionForNews[obj.exg] = {exg: obj.val, isSelected: obj.isSelected};
                }
            );
        }

        this.set('exgSelectionForNews', exgSelectionForNews);
        this.set('selectedExgForNews', selectedExgForNews);
    },

    _sendSubscription: function () {
        var exgArrAnnouncement = this.get('exchangeOption');
        var exchange;
        var that = this;

        if (exgArrAnnouncement) {
            Ember.$.each(exgArrAnnouncement, function (key, obj) {
                exchange = that.priceService.exchangeDS.getExchange(obj.exg);

                if (obj.isSelected) {
                    that.priceService.addFullMarketAnnouncementRequest(exchange.exg, sharedService.userSettings.currentLanguage);
                } else {
                    that.priceService.removeFullMarketAnnouncementRequest(exchange.exg, sharedService.userSettings.currentLanguage);
                }
            });
        }

        var exgArrNews = this.get('providerOption');

        if (exgArrNews) {
            Ember.$.each(exgArrNews, function (key, obj) {
                exchange = that.priceService.exchangeDS.getExchange(obj.exg);

                if (obj.isSelected) {
                    that.priceService.addFullMarketNewsRequest(exchange.newsProv, sharedService.userSettings.currentLanguage);
                } else {
                    that.priceService.removeFullMarketNewsRequest(exchange.exg, sharedService.userSettings.currentLanguage);
                }
            });
        }
    },

    _onChangeSearchContentType: function () {
        var isEnabledAnnSearch = this.get('isEnabledAnnSearch');
        var isEnabledNewsSearch = this.get('isEnabledNewsSearch');

        if (isEnabledAnnSearch && isEnabledNewsSearch) {
            this.set('typeFilter', -1);
        } else if (isEnabledAnnSearch) {
            this.set('typeFilter', PriceConstant.ResponseType.Data.ResponseAnnouncement);
        } else if (isEnabledNewsSearch) {
            this.set('typeFilter', PriceConstant.ResponseType.Data.ResponseNews);
        } else {
            this.set('typeFilter', -100);
        }
    }.observes('isEnabledAnnSearch', 'isEnabledNewsSearch'),

    _bindRealtimeContent: function () {
        if (this.get('selectedTab') === this.Tabs.News) {
            this.set('content', this.priceService.announcementDS.newsStoreArray);
        } else if (this.get('selectedTab') === this.Tabs.Announcement) {
            this.set('content', this.priceService.announcementDS.annStoreArray);
        } else {
            this.set('content', this.priceService.announcementDS.annNewsStoreArray);
        }
    },

    _bindSearchContent: function () {
        this.set('content', this.priceService.announcementDS.getAnnouncementSearchCollection(this.get('wkey')));
    },

    _getSelectedExchangeList: function (exgArr) {
        var selectedExgArr = [];

        if (exgArr) {
            Ember.$.each(exgArr, function (key, obj) {
                if (obj.isSelected) {
                    selectedExgArr.push(obj.exg);
                }
            });
        }

        return selectedExgArr.join(',');
    },

    _loadSearchContent: function () {
        var announcementArray = this.priceService.announcementDS.getAnnouncementSearchCollection(this.get('wkey'));
        var isNewsDataReceived = false;
        var isAnnouncementDataReceived = false;
        var that = this;

        announcementArray.clear();
        this._bindSearchContent();
        this.setRequestTimeout(4, 'content.length');

        var startDate = this.utils.validators.isAvailable(this.get('startDate')) ?
            this.utils.formatters.convertToDisplayTimeFormat(this.get('startDate'), PriceConstant.DateTimeFormat.ShortDate) : '';
        var endDate = this.utils.validators.isAvailable(this.get('endDate')) ?
            this.utils.formatters.convertToDisplayTimeFormat(this.get('endDate'), PriceConstant.DateTimeFormat.ShortDate) : '';

        this.priceService.sendAnnouncementSearchRequest({
            AllExchange: 1,
            symbol: this.get('searchSymbol'),
            searchKey: this.get('searchTitle'),
            pageSize: PriceConstant.AnnouncementSearchPageSize,
            exgList: this._getSelectedExchangeList(this.get('exchangeOptionForSearch')),
            startDate: startDate,
            endDate: endDate,

            reqSuccessFn: function () {
                isAnnouncementDataReceived = true;
                _setContentBody();
            }
        }, announcementArray);

        this.priceService.sendNewsSearchRequest({
            AllExchange: 1,
            symbol: this.get('searchSymbol'),
            searchKey: this.get('searchTitle'),
            pageSize: PriceConstant.NewsSearchPageSize,
            exgList: this._getSelectedExchangeList(this.get('providerOptionForSearch')),
            startDate: startDate,
            endDate: endDate,

            reqSuccessFn: function () {
                isNewsDataReceived = true;
                _setContentBody();
            }
        }, announcementArray);

        var _setContentBody = function () {
            if (isNewsDataReceived && isAnnouncementDataReceived) {
                that.set('annObj', that.get('filteredContent').objectAt(0));
            }
        };
    },

    _onTabChange: function (tabId) {
        var that = this;
        var annObj = this.get('annObj');

        this.set('selectedTab', tabId);

        if (annObj) {
            Ember.set(annObj, 'css', '');
        }

        if (tabId === this.Tabs.Search) {
            this.set('isAdvancedSearch', true);
            this._bindSearchContent();
            this._loadSearchContent();

            Ember.run.next(function () {
                that.initializeResponsive();
            });
        } else {
            this.set('isAdvancedSearch', false);
            this._bindRealtimeContent();
            this.hideDataErrorMessage();
            this.stopLoadingProgress();

            if (this.get('responsive')) {
                this.get('responsive').onClear();
            }
        }

        this._setFilterType();
        this._saveLayout();
    },

    _setFilterType: function () {
        var tabId = this.get('selectedTab');
        var filterType = -1;

        this.set('showExgFilter', true);

        if (this.get('isNewsEnabled')) {
            this.set('showProviderFilter', true);
        }

        if (tabId === this.Tabs.Announcement) {
            filterType = PriceConstant.ResponseType.Data.ResponseAnnouncement;
            this.set('showProviderFilter', false);
        } else if (tabId === this.Tabs.News) {
            filterType = PriceConstant.ResponseType.Data.ResponseNews;
            this.set('showExgFilter', false);
        }

        this.set('typeFilter', filterType);
    },

    _getAnnNews: function (annId, type) {
        this.getAnnouncementNews(annId, type);
    },

    prepareTabs: function () {
        var tabs = [
            {id: 1, displayDesc: this.get('app').lang.labels.all},
            {id: 2, displayDesc: this.get('app').lang.labels.announcement},
            {id: 4, displayDesc: this.get('app').lang.labels.search}];

        if (this.get('isNewsEnabled')) {
            tabs.splice(2, 0, {id: 3, displayDesc: this.get('app').lang.labels.newsTab});
        }

        this.set('announcementTabs', tabs);
    },

    searchKeyDidChange: function () {
        if (appConfig.customisation.isTablet) {
            var searchFieldId = this.get('searchFieldId');
            var searchField = Ember.$('#' + searchFieldId);

            if (searchField && searchField.is(':focus')) {
                var searchKey = this.get('searchSymbol');

                if (searchKey && searchKey.length >= appConfig.searchConfig.minCharLenForSymbol) {
                    Ember.run.debounce(this, this.showSearchPopup, 300);
                }
            }
        }
    }.observes('searchSymbol'),

    showSearchPopup: function () {
        var modal = this.get('annSymbolSearch');
        modal.send('showModalPopup');
    },

    actions: {
        onTabSelected: function (tab) {
            this._onTabChange(tab.id);
        },

        itemClicked: function (annId, type) {
            this._getAnnNews(annId, type);
            this.set('selectedNewAnn', annId);

            var element = Ember.$('#announcementListUpdateContainer');
            element.addClass('announcement-menu-update-animation');

            setTimeout(function () {
                element.removeClass('announcement-menu-update-animation');
            }, 300);

            this.generateScrollBar('announcementListUpdateContainer', 3000);
        },

        showSearchPopup: function () {
            this.showSearchPopup();
        },

        closeSearchPopup: function () {
            var modal = this.get('annSymbolSearch');
            modal.send('closeModalPopup');
        },

        onClickAdvancedSearch: function () {
            this._loadSearchContent();
            this._saveLayout();
        },

        onSymbolSelected: function (item) {
            this.set('searchSymbol', item.get('dispProp1'));
        },

        onExchangeSettingsChanged: function () {
            if (this.get('isAdvancedSearch')) {
                this._loadSearchContent();
            } else {
                this._setSelectedExchanges();
                this._sendSubscription();
            }

            this._saveLayout();
        },

        onProviderSettingsChanged: function () {
            this._setSelectedProviders();
            this._sendSubscription();
            this._saveLayout();
        }
    }
});