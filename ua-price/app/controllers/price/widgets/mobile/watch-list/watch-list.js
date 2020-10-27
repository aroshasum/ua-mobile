import Ember from 'ember';
import BaseWatchList from '../../watch-list/base-watch-list';
import WatchlistMenuPopup from '../../../../../components/mobile/watchlist-menu-popup';
import ExpandedSymbolCell from '../../../../../views/table/dual-cells/expanded-symbol-cell';
import ExpandedLtpCell from '../../../../../views/table/dual-cells/expanded-ltp-cell';
import ExpandedChgCell from '../../../../../views/table/dual-cells/expanded-chg-cell';
import ContextMenuMobile from '../../../../../views/table/mobile/context-menu-cell';
import ExpandedHeaderCell from '../../../../../views/table/dual-cells/expanded-header-cell';
import MoreHeaderCell from '../../../../../views/table/more-header-cell';
import HeaderCell from '../../../../../views/table/dual-cells/header-cell';
import TableRow from '../../../../../views/table/table-row';
import layoutConfig from '../../../../../config/layout-config';
import priceWidgetConfig from '../../../../../config/price-widget-config';
import ControllerFactory from '../../../../../controllers/controller-factory';
import appConfig from '../../../../../config/app-config';
import subMarketsDropdown from '../../../../../components/sub-markets-dropdown';
import sharedService from '../../../../../models/shared/shared-service';
import utils from '../../../../../utils/utils';

export default BaseWatchList.extend({
    isOddEvenRowStyleDisabled: true,
    isExpandedView: false,
    isContextPanel: false,
    isDisplayFilter: false,
    isIndexView: false,
    isMobile: appConfig.customisation.isMobile,
    filterCss: 'hide-container',
    tabPanelCss: '',
    contextPath: 'price/widgets/mobile/watch-list/watch-list-context-panel',
    indicatorConfig: {isTodaysHighEnabled: true, isTodaysLowEnabled: true, isFiftyTwoHEnabled: true, isFiftyTwoLEnabled: true, isSymSuspendedEnabled: true, isSelectedEnabled: true},
    menuConfig: [],

    defaultMenu: [{id: 1, name: 'New Watchlist', langKey: 'newWatchList'},
        {id: 2, name: 'Rename Watchlist', langKey: 'renameWL'},
        {id: 3, name: 'Delete Watchlist', langKey: 'deleteWL'}],

    myFavoriteMenu: [{id: 1, name: 'New Watchlist', langKey: 'newWatchList'}],

    actionId: {newWL: 1, renameWL: 2, deleteWL: 3},

    // Custom WatchList parameters
    isCustomWLMode: false,
    myFavouritesIndex: 0,
    myFavouritesKey: 'favourites',
    customWatchListArray: Ember.A(),
    currentCustomWLId: null,
    currentCustomWLName: null,
    isAddedToCustomWatchList: false,
    partialControlPanel: 'table/views/partial/default-panel',

    // Column Parametrs
    columnDeclarations: Ember.A(),
    isRenderingEnabled: false,
    oneWayContent: Ember.computed.oneWay('arrangedContent'),

    // For the custom WL dropdown-tab
    isCurrentWLDropdown: false,
    customWLNewActive: '',
    favouritesActive: '',

    textFilter: '',
    isFavouriteTextDisabled: false,

    sharedUIService: sharedService.getService('sharedUI'),
    priceService: sharedService.getService('price'),
    priceUIService: sharedService.getService('priceUI'),

    isMoreMarketAvailable: true,
    isShowDetailedView: false,

    onLoadWidget: function () {
        this._super();

        var that = this;
        var lowResolutionWidth = 340;
        var subMktMap = this.get('subMktMap');
        var exg = this.get('exg');

        if (exg) {
            var isDefaultExg = sharedService.getService('price').userDS.isPriceUserExchange(exg);
            this.set('exg', isDefaultExg ? exg : sharedService.userSettings.price.userDefaultExg);

            var exgObj = this.priceService.exchangeDS.getExchange(exg);

            this.set('exchange', exgObj);
            this.set('marketTab', exgObj);
        } else {
            this._setDefaultExchange();
        }

        if (subMktMap && subMktMap[exg]) {
            this.set('currentSubMarketId', subMktMap[exg]);
        }

        if (this.get('sortProperties').length === 0) {
            this.set('sortProperties', ['trades']);
        } else {
            this.saveWidget({sortAsc: this.get('sortAscending'), sortCols: this.get('sortProperties')});
        }

        if (window.screen.width <= lowResolutionWidth) {
            this.set('isFavouriteTextDisabled', true);
        }

        this.addDocumentClickListener();
        this.setMenuConfig();
        sharedService.getService('price').watchListDS.initializeCustomWL();

        this.set('customWatchListArray', sharedService.getService('price').watchListDS.getCustomWLArray());
        this.set('columnDeclarations', this.get('isIndexView') ? priceWidgetConfig.indices.columns : priceWidgetConfig.watchList.quoteColumns);
        this.set('appLayout', layoutConfig);
        this.set('isMoreMarketAvailable', sharedService.getService('price').userDS.get('userExchg').length > 1);
        this.set('isDropdown', this.get('customWatchListArray.length') > 1);

        Ember.set(this.get('customWatchListArray')[this.myFavouritesIndex], 'name', this.get('app').lang.labels[this.myFavouritesKey]);

        Ember.run.next(this, function () {
            that.set('isRenderingEnabled', true);
        });
    },

    onPrepareData: function () {
        switch (this.get('watchListType')) {
            case sharedService.getService('price').watchListDS.watchListTypes.portfolio:
                this.loadPortfolio();
                break;

            case sharedService.getService('price').watchListDS.watchListTypes.customWL:
                this.onCustomWlSelect(this.get('myFavouritesIndex'));
                break;

            default:
                this._super();
                this.loadFullMarket();
                this.saveWidget({watchListType: sharedService.getService('price').watchListDS.watchListTypes.fullMarket});
                break;
        }
    },

    loadFullMarket: function () {
        var exgCode = this.get('exg');

        this.set('partialControlPanel', 'table/views/partial/default-panel');   // Switch to Default Panel
        this.set('isCustomWLMode', false);                                      // Clicking Market is the only way to exit Custom mode
        this.set('currentCustomWLName', null);

        if (this.get('currentCustomWLId') !== null) {
            this.set('customWLNewActive', null);
            this.set('favouritesActive', '');
        }

        this.set('currentCustomWLId', null);
        this.saveWidget({exg: exgCode});

        // No need to update global exchange value with local exchange, because watch list is not allowed to load for non default markets
        this.priceService.exchangeDS.getExchangeMetadata(exgCode);

        this._collapseWatchlistRow(this.get('previousRow'));
        this.setDefaultSort();
    },

    loadPortfolio: function () {
        var symArray = [];
        var holdingsArray = [];
        var tradeService = sharedService.getService('trade');
        var currentPortfolio = this.get('currentPortfolio');

        if (currentPortfolio.isShowAll) {
            holdingsArray = tradeService.holdingDS.getHoldingCollection();
        } else {
            holdingsArray = tradeService.holdingDS.getHoldingByAccount(currentPortfolio.tradingAccId);
        }

        Ember.$.each(holdingsArray, function (key, holding) {
            var priceService = sharedService.getService('price');
            var symbol = holding.symbol;
            var exchange = holding.exg;
            var stockFromStore = priceService.stockDS.getStock(exchange, symbol);

            priceService.addSymbolRequest(exchange, symbol);
            symArray.pushObject(stockFromStore);
        });

        this.set('content', symArray);
        this.set('masterContent', symArray);
        this.setDefaultSort();
    },

    onBindData: function () {
        var that = this;

        Ember.run.later(function () {
            var sortProperties = that.get('sortProperties');

            that.set('sortProperties', []);
            that.set('sortProperties', sortProperties);
        }, 100);
    },

    onLanguageChanged: function (language) {
        this._super(language);
        this.setMenuConfig();
        this.refreshTableComponent();

        Ember.set(this.get('customWatchListArray')[this.myFavouritesIndex], 'name', this.get('app').lang.labels[this.myFavouritesKey]);
    },

    setMenuConfig: function () {
        var that = this;
        var defaultMenu = this.get('defaultMenu');
        var myFavoriteMenu = this.get('myFavoriteMenu');

        Ember.$.each(defaultMenu, function (key, menu) {
            Ember.set(menu, 'name', that.get('app').lang.labels[menu.langKey]);
        });

        Ember.$.each(myFavoriteMenu, function (key, menu) {
            Ember.set(menu, 'name', that.get('app').lang.labels[menu.langKey]);
        });
    },

    loadCustomWL: function (id) {
        var customStockArray = this.get('customWatchListArray')[id].stkArray;

        if (customStockArray.length > 0 && customStockArray[0].sym) {       // Checks symbols are retrieved from local storage or DataStore
            var that = this;
            var subscribedArray = Ember.A();

            Ember.$.each(customStockArray, function (key, stockAdded) {
                var stockFromStore = that.priceService.stockDS.getStock(stockAdded.exg, stockAdded.sym);
                subscribedArray.pushObject(stockFromStore);
            });

            this.get('customWatchListArray')[id].stkArray = subscribedArray;
            customStockArray = this.get('customWatchListArray')[id].stkArray;       // TODO [arosha] set stkArray reference (for add delete stk) better way
        }

        this.set('menuConfig', []);

        if (id === this.get('myFavouritesIndex')) {
            this.set('menuConfig', this.get('myFavoriteMenu'));
        } else {
            this.set('menuConfig', this.get('defaultMenu'));
        }

        // Highlight watch-list header selected tab
        this.set('customWLNewActive', this.get('customWatchListArray')[id]);
        this.set('favouritesActive', 'active');
        this.set('partialControlPanel', 'table/views/partial/favourite-panel');
        this.set('isCustomWLMode', true);
        this.set('currentCustomWLId', id);
        this.set('currentCustomWLName', this.get('customWatchListArray')[id].name);
        this.set('exchange', undefined);

        // Set Content
        this.set('content', customStockArray);
        this.set('masterContent', customStockArray);
        this.set('sortProperties', []);     // No Sorting applied to custom WL

        this.saveWidget({watchListType: sharedService.getService('price').watchListDS.watchListTypes.customWL});
    },

    styleSettings: {
        expandedModeHeight: 105,
        collapsedModeHeight: 60,
        symbolColumnWidth: 145
    },

    switchRowMode: function () {
        var height = this.get('isExpandedView') ? this.get('styleSettings.expandedModeHeight') : this.get('styleSettings.collapsedModeHeight');
        this.set('rowHeight', height);
    }.observes('isExpandedView'),

    setCustomWLDropDownIndicator: function () {
        this.set('isDropdown', this.get('customWatchListArray.length') > 1);
    }.observes('customWatchListArray.length'),

    isActiveCustomDropdown: function () {
        return this.get('isDropdown') && this.get('isCustomWLMode');
    }.property('isDropdown', 'isCustomWLMode'),

    cellViewsForColumns: {
        expandedSymbolMobile: 'Ember.ExpandedSymbolCell',
        expandedLtpMobile: 'Ember.ExpandedLtpCell',
        expandedChgMobile: 'Ember.ExpandedChgCell',
        contextMenuMobile: 'Ember.ContextMenuMobile'
    },

    toggleDisplay: function () {
        if (this.get('isDisplayFilter')) {
            this.set('filterCss', 'full-width');
            this.set('tabPanelCss', 'visibility-hidden');
            Ember.$('#filterWatchlist')[0].focus();
        } else {
            this.set('filterCss', 'hide-container');
            this.set('tabPanelCss', '');
        }
    }.observes('isDisplayFilter'),

    setCellViewsScopeToGlobal: function () {
        Ember.ExpandedSymbolCell = ExpandedSymbolCell;
        Ember.ExpandedLtpCell = ExpandedLtpCell;
        Ember.ExpandedChgCell = ExpandedChgCell;
        Ember.ContextMenuMobile = ContextMenuMobile;
        Ember.ExpandedHeaderCell = ExpandedHeaderCell;
        Ember.HeaderCell = HeaderCell;
        Ember.MoreHeaderCell = MoreHeaderCell;
        Ember.TableRow = TableRow;
    },

    addDocumentClickListener: function () {
        this.clickEventHandler = this.onDocumentClick.bind(this);
        document.addEventListener('mousedown', this.clickEventHandler, true);
    },

    onDocumentClick: function (e) {
        var parentElement = this.getParentElement(e, '#tabPanelWatchlist');

        if (this.get('isDisplayFilter') && this.get('textFilter') === '' && parentElement && parentElement.length === 0) {
            this.set('isDisplayFilter', false);
        }
    },

    onCustomWlSelect: function (id) {
        this.loadCustomWL(id);
        this._collapseWatchlistRow(this.get('previousRow'));

        this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['onCustomWlSelect:', id].join(''));
    },

    checkSymbolAddedToCustomWatchList: function (symbol) {
        var customWatchListArray = this.get('customWatchListArray');
        var isAddedToCustomWatchList = false;

        for (var x = 0; x < customWatchListArray.length; x++) {
            var symArray = customWatchListArray[x].stkArray;

            for (var y = 0; y < symArray.length; y++) {
                if (symArray[y].sym === symbol) {
                    isAddedToCustomWatchList = true;
                    break;
                }
            }
        }

        this.set('isAddedToCustomWatchList', isAddedToCustomWatchList);
    },

    triggerSymbolChange: function (rowData) {
        var titleBar = sharedService.getService('sharedUI').getService('titleBar');

        if (rowData && titleBar && titleBar.onSymbolSelected) {
            titleBar.onSymbolSelected(true);
        }

        this._super(rowData);
    },

    openGlobalSearch: function () {
        var that = this;

        Ember.run.next(function () {
            var enableAddToWatchList = true;
            that.sharedUIService.getService('titleBar').toggleDisplay(undefined, enableAddToWatchList, that.get('currentCustomWLId'));
        });
    },

    swipeInnerTabs: function () {
        var that = this;
        that.priceUIService.changeSwipeView(that.priceUIService.isRightSwipe);

        if (this.get('isCustomWLMode')) {
            this.refreshWidget({exg: this.get('exg'), watchListType: this.priceService.watchListDS.watchListTypes.fullMarket});
            this.resetScroll();
        } else {
            this.onCustomWlSelect(this.get('myFavouritesIndex'));
        }

        Ember.run.later(function () {
            that.priceUIService.changeSwipeView(that.priceUIService.isRightSwipe, true);
        }, 1);
    }.observes('priceUIService.isInnerTabSwipe'),

    _setDefaultExchange: function () {
        var defExg = sharedService.getService('price').exchangeDS.getExchange(sharedService.userSettings.price.userDefaultExg);

        this.set('exchange', defExg);
        this.set('marketTab', defExg);
        this.set('exg', defExg.exg);
    },

    _collapseWatchlistRow: function (target, isContextPanelEnable) {
        var targetClicked = target;

        if (targetClicked) {
            if (!isContextPanelEnable) {
                this.set('isContextPanel', false);
            }

            if (targetClicked.style) {
                targetClicked.style.removeProperty('width');
            }

            var arrowIconArray = targetClicked.getElementsByClassName('icon-angle-left');

            if (arrowIconArray && arrowIconArray[0]) {
                arrowIconArray[0].className = 'glyphicon icon-angle-right font-5x-l';
            }
        }
    },

    detailedView: function () {
        this.toggleProperty('isExpandedView');
        this.toggleProperty('isRefreshed');
    }.observes('isShowDetailedView'),

    actions: {
        deleteSymbol: function (stock, watchlistId) {
            var that = this;
            var watchListId = watchlistId || watchlistId === 0 ? watchlistId : this.get('currentCustomWLId');
            var languageTexts = that.get('app').lang;

            utils.messageService.showMessage(languageTexts.messages.deleteConfirmation,
                utils.Constants.MessageTypes.Question,
                false,
                languageTexts.labels.confirm,

                [{type: utils.Constants.MessageBoxButtons.Ok,
                    btnAction: function () {
                        that.priceService.watchListDS.deleteSymbol(stock.content, watchListId);
                        that._collapseWatchlistRow(that.get('previousRow'));
                    }
                }, {type: utils.Constants.MessageBoxButtons.Cancel,
                    btnAction: function () {
                        that._collapseWatchlistRow(that.get('previousRow'));
                    }
                }
                ]
            );
        },

        onSelectOption: function (menu) {
            var actionId = this.get('actionId');

            switch (menu.id) {
                case actionId.newWL:
                    this.set('showPopup', true);
                    this.set('isAddNewWL', true);

                    break;

                case actionId.renameWL:
                    this.set('showPopup', true);
                    this.set('isRenameWL', true);

                    break;

                case actionId.deleteWL:
                    this.deleteWatchList();
                    break;
            }
        },

        displayFilter: function () {
            this.toggleProperty('isDisplayFilter');
        },

        openGlobalSearch: function () {
            this.openGlobalSearch();
        },

        expandColumnAction: function () {
            this.set('showPopup', true);
            this.set('isWatchlistMenu', true);
        },

        showOrderTicket: function (side) {
            var tradeService = sharedService.getService('trade');
            var isTradeEnabledExchange = tradeService && tradeService.userDS.isTradeEnabledExchange(this.get('exg'));

            if (appConfig.customisation.isTradingEnabled && isTradeEnabledExchange) {
                sharedService.getService('tradeUI').showOrderTicket(this.container, side, this.get('symInfo'));
            }
        },

        onCustomWlSelect: function (id) {
            var customWlId = isNaN(id) ? id.id : id;
            this.onCustomWlSelect(customWlId);
        },

        onSelectExchange: function (exchg) {
            sharedService.userState.globalArgs.exg = this.changeExchange(exchg);
        },

        clickRow: function (selectedRow) {
            var target = event.target ? event.target : event.srcElement;
            var rowData = selectedRow.getProperties('exg', 'sym', 'inst');

            if (target) {
                var cellId = target.attributes && target.attributes.getNamedItem('cell-id') && target.attributes.getNamedItem('cell-id').value ?
                    target.attributes.getNamedItem('cell-id').value : '';
                var targetArray = Ember.$(target).parents('[cell-id=contextMenu]');
                var targetButtonArray = Ember.$(target).parents('[cell-id=menuPanel]');
                var targetChgCell = Ember.$(target).parents('[cell-id=pctChg]');
                var targetAnnIcon = Ember.$(target).parents('#annIcon');

                if (cellId === 'menuPanel' || (targetButtonArray && targetButtonArray.length > 0)) {
                    if (rowData) {
                        this.set('symInfo', rowData);
                    }

                    return;
                }

                if (targetChgCell && targetChgCell.length > 0) {
                    if (!this.isIndexView && appConfig.customisation.isTradingEnabled) {
                        sharedService.getService('tradeUI').showOrderTicket(this.container, false, rowData);

                        return;
                    }
                }

                if (targetAnnIcon && targetAnnIcon.length > 0) {
                    var widgetController = ControllerFactory.createController(this.container, 'controller:price/widgets/announcement/symbol-announcement');
                    var viewName = 'price/widgets/announcement/components/announcement-news-popup';

                    widgetController.initializeWidget({wn: 'symbol-announcement'});
                    widgetController.set('selectedNewAnn', selectedRow.content.lAnn.id);
                    widgetController.set('isMobile', true);

                    sharedService.getService('priceUI').showChildView(viewName, widgetController, this.get('app.lang.labels.newsAnn'), 'newsPopup-' + this.get('wkey'));
                    return;
                }

                if (cellId !== 'contextMenu' && targetArray.length <= 0) {   // In case target is the top most element (closest() is not working for IE)
                    sharedService.userState.globalArgs.exg = rowData.exg; // In order to change exchange of WL when click symbols in multi markets
                    this.triggerSymbolChange(rowData);
                } else {
                    var width;

                    if (targetArray.length > 0) {
                        target = targetArray[0];
                    }

                    if (target.style.width === 100 + '%') {
                        this._collapseWatchlistRow(target);
                    } else {
                        width = 100 + '%';
                        target.getElementsByClassName('icon-angle-right')[0].className = 'glyphicon icon-angle-left font-5x-l';

                        this.checkSymbolAddedToCustomWatchList(rowData.sym);
                        this.set('isContextPanel', true);

                        if (this.get('previousRow') !== target) {
                            this._collapseWatchlistRow(this.get('previousRow'), true);
                        }
                    }

                    this.set('previousRow', target);
                    target.style.width = width;
                }
            }
        },

        closePopup: function () {
            if (this.get('isWatchlistMenu')) {
                this.saveWidget({sortAsc: this.get('sortAscending'), sortCols: this.get('sortProperties')});
            }

            this.set('showPopup', false);
            this.set('isRenameWL', false);
            this.set('isAddNewWL', false);
            this.set('isWatchlistMenu', false);
        }
    }
});

Ember.Handlebars.helper('sub-markets-dropdown', subMarketsDropdown);
Ember.Handlebars.helper('watchlist-menu-popup', WatchlistMenuPopup);
