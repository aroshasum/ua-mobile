/* global Mousetrap */
import Ember from 'ember';
import sharedService from '../models/shared/shared-service';
import PriceConstants from '../models/price/price-constants';
import appConfig from '../config/app-config';
import appEvents from '../app-events';
import utils from '../utils/utils';
import ControllerFactory from '../controllers/controller-factory';
import languageDataStore from '../models/shared/language/language-data-store';

export default Ember.Component.extend(Ember.SortableMixin, {
    layoutName: 'components/global-search',
    priceService: sharedService.getService('price'),
    app: languageDataStore.getLanguageObj(),

    // Parameters related to the symbol search
    content: sharedService.getService('price').searchDS.getSymbolSearchResults(),
    sortProperties: ['rank'],
    sortAscending: true,

    // Parameters related to the announcement search
    filteredContent: sharedService.getService('price').announcementDS.getContentSearchResult(),
    isEnabledAnnSearch: false,
    isEnabledNewsSearch: false,
    showAnnTabs: false,
    isInvokedBySearch: true,
    isAnnUnavailable: false,
    excludedInstruments: [],
    currentButton: 0,
    showSubMarket: sharedService.getService('price').settings.configs.symbolSearchConfigs.showSubMarket,

    // Parameters related to custom watchlist
    customWatchListArray: sharedService.getService('price').watchListDS.customWatchListArray,

    isTablet: appConfig.customisation.isTablet,

    didInsertElement: function () {
        Ember.appGlobal.activeWidget = this.get('wkey');

        if (this.get('isTablet')) {
            this.searchKeyDidChange();
        }
    }.on('didInsertElement'),

    bindMousetrap: function () {
        var that = this;
        var rowIndex, symbolCollection;
        var isWidget = false;
        var symbolSet = 0;
        var widgetId = 'global-search' + this.get('wkey');

        if (!appConfig.customisation.isMobile && !this.get('isTablet')) {     // Mousetrap is not applicable for Mobile
            Ember.run.later(function () {
                if (that && that.get('content')[symbolSet] && that.get('content')[symbolSet].get('contents')) {
                    Ember.$('div.search-row.full-width').first().addClass('search-row-hover');
                    symbolCollection = that.get('content')[symbolSet].get('contents').get('0');
                }
            }, 250);

            Mousetrap.bind('arrowdown', function () {
                // Ember.$('.search-title')[0].focus(); TODO [AROSHA] make scroll bar move with arrow
                var next = Ember.$('div.search-row.full-width.search-row-hover').removeClass('search-row-hover').next();
                that.currentButton = 0;

                if (next && next.length > 0) {
                    if (next[0].className === 'search-title bold font-l pad-s-b') {
                        next = Ember.$('h2.search-title.bold.font-l.pad-s-b').last().next();
                        symbolSet = 1;
                    }

                    if (next.attr('index')) {
                        next.addClass('search-row-hover');
                        next.click();
                        rowIndex = next.attr('index');
                    }
                } else {
                    symbolSet = 0;
                    var first = Ember.$('div.search-row.full-width').first();

                    if (first.attr('index')) {
                        rowIndex = first.attr('index');
                    }

                    Ember.$('div.search-row.full-width').first().addClass('search-row-hover');
                }

                symbolCollection = that.get('content')[symbolSet].get('contents').get(rowIndex);

                that._setSymbolCollection(widgetId);
            }, widgetId);

            Mousetrap.bind('arrowup', function () {
                var previous = Ember.$('div.search-row.full-width.search-row-hover').removeClass('search-row-hover').prev();
                that.currentButton = 0;

                if (previous && previous.length > 0) {
                    if (previous[0].className === 'search-title bold font-l pad-s-b') {
                        previous = Ember.$('h2.search-title.bold.font-l.pad-s-b').last().prev();
                        symbolSet = 0;
                    }

                    if (previous.attr('index')) {
                        previous.addClass('search-row-hover');
                        rowIndex = previous.attr('index');
                    }
                } else {
                    var next = Ember.$('div.search-row.full-width').first().addClass('search-row-hover');
                    rowIndex = next.attr('index');
                }

                symbolCollection = that.get('content')[symbolSet].get('contents').get(rowIndex);

                that._setSymbolCollection(widgetId);
            }, widgetId);

            Mousetrap.bind('enter', function () {
                if (that && !utils.validators.isAvailable(that.get('content')[0].isDataUnavailable) && !that.get('content')[0].isDataUnavailable) {
                    if (!symbolCollection.get('sym') && that.get('sortedSymbolContent.length') > 0 && that.get('sortedSymbolContent')[0].get('contents') &&
                        that.get('sortedSymbolContent')[0].get('contents')[0]) {
                        symbolCollection = that.get('sortedSymbolContent')[0].get('contents')[0];
                    }

                    that._selectSymbol(symbolCollection, isWidget);

                    Ember.appGlobal.activeWidget = that.get('wkey');

                    return false;
                }
            }, widgetId);

            Mousetrap.bind('tab', function () {
                if (that && !utils.validators.isAvailable(that.get('content')[0].isDataUnavailable) && !that.get('content')[0].isDataUnavailable) {
                    if (!symbolCollection.get('sym') && that.get('sortedSymbolContent.length') > 0 && that.get('sortedSymbolContent')[0].get('contents') &&
                        that.get('sortedSymbolContent')[0].get('contents')[0]) {
                        symbolCollection = that.get('sortedSymbolContent')[0].get('contents')[0];
                    }

                    that._selectSymbol(symbolCollection, isWidget);

                    Ember.appGlobal.activeWidget = that.get('wkey');

                    return false;
                }
            }, widgetId);

            Mousetrap.bind('esc', function () {
                that.sendAction('closePopup');
                that._unbindKeyboardShortcuts();
            }, widgetId);
        }
    },

    selectFirstRow: function () {
        this.bindMousetrap();
    }.observes('content.@each.contents.length'),

    isEnabledContentSearch: function () {
        return this.get('enableContentSettings') && (this.isEnabledAnnSearch || this.isEnabledNewsSearch);
    }.property('isEnabledAnnSearch', 'isEnabledNewsSearch'),

    sortedSymbolContent: function () {
        return this.get('arrangedContent');
    }.property('arrangedContent'),

    isMobile: function () {
        return appConfig.customisation.isMobile;
    }.property(),

    symbolSearchCellCss: function () {
        return this.get('isMobile') ? 'layout-container full-width' : 'layout-col';
    }.property(),

    symbolSearchContainerCss: function () {
        return this.get('isMobile') ? 'layout-col-24' : 'layout-col';
    }.property(),

    hasChangedContentSearchSettings: function () {
        this.getContentSearchResult();
    }.observes('isEnabledContentSearch'),

    showSearchResultContainer: function () {
        Ember.appGlobal.activeWidget = 'global-search' + this.get('wkey');
        return this.get('content').length > 0 && this.get('searchKey');
    }.property('content.@each'),

    getSearchResult: function () {
        this.getSymbolSearchResult();
        this.getContentSearchResult();
    },

    getSymbolSearchResult: function () {
        var searchKey = this.get('searchKey');
        var exclInst = this.get('excludedInstruments');

        if (searchKey) {
            this.get('content').clear();

            if (searchKey.length >= appConfig.searchConfig.minCharLenForSymbol) {
                this.priceService.searchDS.filterSymbolSearchResults(searchKey, sharedService.userSettings.currentLanguage, exclInst, {
                    isOptionMode: this.get('isOptionMode')
                });

                if (appConfig.customisation.isMobile) {
                    this.setAddToWatchListIconCss();
                }
            }
        }
    },

    getContentSearchResult: function () {
        var searchKey = this.get('searchKey');
        var that = this;
        this.get('filteredContent').clear();

        if (this.get('isEnabledContentSearch') && (searchKey.length >= appConfig.searchConfig.minCharLenForContent)) {
            this.priceService.announcementDS.filterContentSearchResults(
                searchKey,
                sharedService.userSettings.currentLanguage,
                this.isEnabledAnnSearch,
                this.isEnabledNewsSearch,

                function () {
                    that.onContentResultNotFound(that);
                }
            );
        }
    },

    onContentResultNotFound: function (that) {  //eslint-disable-line
        that.set('isAnnUnavailable', true);
    },

    onItemSelected: function (item, link) {
        var that = this;
        var stopNotify = this.get('stopGlobalNotification');

        this.priceService.searchDS.addRecentSearchedItem(item);

        if (!stopNotify) {
            var isTablet = this.get('isTablet');

            if (isTablet) {
                sharedService.getService('sharedUI').getService('mainPanel').onSymbolChanged(item.sym, item.exg, item.inst);
            }

            appEvents.onSymbolChanged(item.sym, item.exg, item.inst, isTablet ? 1 : link);
            appEvents.onExchangeChanged(isTablet ? 1 : link, item.exg);

            // Change Exchange of whole app - Mobile
            if (that.get('isMobile') && item.exg !== sharedService.userSettings.price.currentExchange) {
                that.priceService.exchangeDS.getExchangeMetadata(item.exg, true);
            }
        }

        utils.analyticsService.trackEvent(this.get('analyticsKey'), utils.Constants.GAActions.search, ['query:' + this.get('searchKey') + ',sym:', item.sym, '~', item.exg].join(''));
        this.sendAction('clickAction', item);
        this.sendAction('closePopup');
        this._unbindKeyboardShortcuts();
    },

    _onWidgetSelected: function (item, widgetId) {
        var symbolPopupView = ControllerFactory.createController(this.container, 'view:symbol-popup-view');

        utils.analyticsService.trackEvent(this.get('analyticsKey'), utils.Constants.GAActions.rowIconClick, ['popup:', widgetId, ',', 'sym:', item.sym, '~', item.exg].join(''));
        symbolPopupView.show(widgetId, item.sym, item.exg, item.inst);
        this.sendAction('closePopup');
        this._unbindKeyboardShortcuts();
    },

    searchKeyDidChange: function () {
        if (this.get('searchKey')) {
            Ember.set(this, 'searchKey', this.get('searchKey').toUpperCase());
        }

        // Every time a key is pressed, this event fires, and that event will start the filter in given time interval
        Ember.run.debounce(this, this.getSearchResult, PriceConstants.TimeIntervals.SearchAutoCompleteInterval);
    }.observes('searchKey'),

    initCustomWL: function () {
        this.priceService.watchListDS.initializeCustomWL();
    }.on('init'),

    setAddToWatchListIconCss: function () {
        var symbolIndex = 0;
        var content = this.get('content')[symbolIndex];
        var that = this;

        if (content && content.contents) {
            Ember.$.each(content.contents, function (key, symbol) {
                symbol.set('isAddedToCustomWatchList', that.priceService.watchListDS.isSymbolAvailableInCustomWL(symbol));
            });
        }
    },

    _unbindKeyboardShortcuts: function () {
        if (!appConfig.customisation.isMobile && !this.get('isTablet')) {
            Mousetrap.unbind('arrowdown');
            Mousetrap.unbind('arrowup');
            Mousetrap.unbind('enter');
            Mousetrap.unbind('tab');
            Mousetrap.unbind('esc');
        }
    },

    _setSymbolCollection: function (widgetKey) {
        Ember.$('div.search-row.full-width').find('a.cursor-pointer').removeClass('highlight-fore-color');
        Ember.appGlobal.activeWidget = widgetKey;
    },

    _selectSymbol: function (symbolCollection, isWidget) {
        if (symbolCollection && symbolCollection.get('sym')) {
            if (!isWidget) {
                this.onItemSelected(symbolCollection);
            } else {
                this._onWidgetSelected(symbolCollection, this.currentButton);
            }
        }
    },

    actions: {
        addStocksToCustomWL: function (content) {
            var myFavoriteCustomWL = 0;

            content.set('isAddedToCustomWatchList', true);
            this.priceService.watchListDS.addStocksToCustomWL(content, myFavoriteCustomWL);
        },

        searchClick: function () {
            this.getSearchResult();
        },

        onItemSelected: function (item, link) {
            this.onItemSelected(item, link);
        },

        onWidgetSelected: function (item, widgetId) {
            this._onWidgetSelected(item, widgetId);
        }
    }
});