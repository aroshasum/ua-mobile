/* global Mousetrap */

import Ember from 'ember';
import CustomWatchlistDialog from '../../../../components/custom-watchlist-dialog';
import ColumnContextMenu from '../../../../components/column-context-menu';
import sharedService from '../../../../models/shared/shared-service';
import priceWidgetConfig from '../../../../config/price-widget-config';
import appConfig from '../../../../config/app-config';
import moreMarketsDropdown from '../../../../components/more-markets-dropdown';
import subMarketsDropdown from '../../../../components/sub-markets-dropdown';
import QuoteWatchList from './quote-watch-list';
import priceConstants from '../../../../models/price/price-constants';
import appEvents from '../../../../app-events';

// Cell Views
import ClassicHeaderCell from '../../../../views/table/classic-header-cell';
import ButtonCell from '../../../../views/table/button-cell';
import ButtonMenuCell from '../../../../views/table/button-menu-cell';
import ClassicCell from '../../../../views/table/classic-cell';
import ClassicTextCell from '../../../../views/table/classic-text-cell';
import ClassicProgressCell from '../../../../views/table/classic-progress-cell';
import ChangeCell from '../../../../views/table/change-cell';
import DotCell from '../../../../views/table/dual-cells/dot-cell';
import DualArrowCell from '../../../../views/table/dual-cells/dual-arrow-cell';
import DualCell from '../../../../views/table/dual-cells/dual-cell';
import TextIconCell from '../../../../views/table/dual-cells/text-icon-cell';
import ProgressCell from '../../../../views/table/dual-cells/progress-cell';
import ResponsiveHandler from '../../../../helpers/responsive-handler';
import TableArrayProxy from './table-array-proxy';

export default QuoteWatchList.extend({
    // Filter parameters
    textFilter: undefined,
    assetFilter: undefined,
    todayFilter: undefined,
    hideSuspendedFilter: undefined,
    sectorFilter: undefined,
    isAnnColumnAdded: false,

    // Table Parameters
    minHeaderHeight: priceWidgetConfig.watchList.tableParams.MinHeaderHeight.standard,
    rowHeight: priceWidgetConfig.watchList.tableParams.RowHeight.standard,
    isClassicView: true,
    indicatorConfig: {isTodaysHighEnabled: true, isTodaysLowEnabled: true, isFiftyTwoHEnabled: true, isFiftyTwoLEnabled: true, isSymSuspendedEnabled: true, isSelectedEnabled: true},
    isFullScreenWL: false,
    numOfFixedColumns: priceWidgetConfig.watchList.tableParams.numOfFixedColumns,

    // Exchange Parameters
    defaultExchange: undefined, // Exchange shown in default tab
    selectedExchange: undefined,  // Selected by Markets Dropdown
    exchange: undefined,
    defaultAssetTypes: [],

    // Custom WatchList parameters
    isCustomWLMode: false,
    myFavouritesKey: 'myFavourites',
    widgetArgsKey: 'watch-list',
    myFavouritesIndex: 0,
    customWatchListArray: Ember.A([]),
    newCustomWLName: undefined,
    currentCustomWLId: undefined,
    currentCustomWLName: undefined,
    isRenameWLDisabled: true,
    isDeleteWLDisabled: true,
    addStockSearchKey: undefined,
    isDefault: true,
    partialControlPanel: 'table/views/partial/default-panel',

    // Pop up Widget Parameters
    clickedRowSymbol: undefined,
    clickedRowExchange: undefined,
    clickedRowExchangeCode: undefined,
    clickedRowInstrument: undefined,
    fullContextMenu: [],
    tradeContextMenu: [],  // Added to support trade additional fields
    addToWatchlistMenu: [],
    priceContextMenu: [],

    // Column Parametrs
    customWatchListColumnArray: Ember.A([]),
    watchlistSavedColumnIds: {},

    marketWatchListColumnIds: {
        classicIds: priceWidgetConfig.watchList.classicColumnIds,
        defaultIds: priceWidgetConfig.watchList.defaultColumnIds,
        classicAssetIds: priceWidgetConfig.watchList.classicAssetTypes,
        defaultAssetIds: priceWidgetConfig.watchList.assetTypes
    },

    // Sector Parameters
    sectorsArray: Ember.A(),
    defaultSectorForDropdown: '',
    isSectorStaticLabelEnabled: true,

    // Sub Market Parameters
    currentAssetType: undefined,
    assetTypes: Ember.A(),

    // No filters applied to watch-list initially
    isAllActive: false,
    oneWayContent: Ember.computed.oneWay('arrangedContent'),
    settings: undefined,

    // Widget Ids
    detailQuoteWidgetId: 0,
    timeAndSalesWidgetId: 1,
    depthByPriceWidgetId: 2,
    depthByOrderWidgetId: 3,
    chartWidgetId: 4,

    // Full Screen parameters
    previousParent: undefined,
    previousWatchListStyleAttribute: undefined,
    previousFullScreenContainerStyleAttribute: undefined,

    wlHeader: undefined,
    isRenderingEnabled: false,

    // For the assetType dropdown-tab
    isAssetTypeDropdown: false,
    assetTypNewActive: '',

    // For the custom WL dropdown-tab
    isCurrentWLDropdown: false,
    customWLNewActive: '',
    extendedComponentName: 'price/widgets/watch-list/components/watchlist-extended-header',
    viewId: undefined,

    currentSubMarketId: undefined,
    customArrayProxy: undefined,
    afterRenderCb: undefined,
    scrollSelector: '',

    priceService: sharedService.getService('price'),

    // Tablet configs
    showWidgetButtons: true,

    tableComponentId: function () {
        return 'table-' + this.get('wkey');
    }.property('wkey'),

    onLoadWidget: function () {
        this._super();
        this.priceService.subscribeAuthSuccess(this, this.get('wkey'));

        var that = this;
        var wkey = this.get('wkey');
        var columnState = sharedService.userState.getWidgetState(this.get('widgetArgsKey'));

        if (!this.get('customArrayProxy')) { // Custom array proxy to handle data binging
            this.set('customArrayProxy', TableArrayProxy.create());
            this._setDefaultExchange();
        }

        sharedService.getService('price').watchListDS.initializeCustomColumnArray(this.get('widgetArgsKey'));

        this.set('widgetContainerKey', 'watchListContainer-' + wkey);
        this.set('scrollSelector', '#table-' + wkey + ' .ember-table-scroll-container .antiscroll-inner');
        this.set('customWatchListArray', sharedService.getService('price').watchListDS.getCustomWLArray());
        this.set('customWatchListColumnArray', sharedService.getService('price').watchListDS.getCustomWatchListColumnArray());
        this.set('defaultSectorForDropdown', this.get('app').lang.labels.allSectors);
        this.set('nonRemovableColumnIds', priceWidgetConfig.watchList.nonRemovableColumnIds);

        if (columnState && columnState.marketWatchListColumnIds) {
            this.set('watchlistSavedColumnIds', columnState.marketWatchListColumnIds);
        }

        this.priceService.watchListDS.initializeCustomWL();
        this.setSavedColumnConfig();
        this.setTabletConfigs();
        this.loadMainContextItem();
        this.setTableViewParameters();
        this.setDefaultColumns();
        this.setDefaultColumnDeclarations();
        this.setDefaultSort();

        Ember.run.later(function () {
            that.set('isRenderingEnabled', true);
            that.setLangLayoutSettings(sharedService.userSettings.currentLanguage);
        }, 1);

        appEvents.subscribeLanguageChanged(this, this.get('wkey'));
        this.priceService.subscribePriceMetaReady(this, this.get('wkey'));

        Ember.set(this.get('customWatchListArray')[this.myFavouritesIndex], 'name', that.get('app').lang.labels[this.myFavouritesKey]);

        this.saveWidget({exg: this.get('exg')});
    },

    onPriceMetaReady: function (isSuccess) {
        var stockList = this.get('content');
        var stock = stockList && stockList.length > 0 ? stockList[0] : {};

        if (isSuccess && stock.sym) {
            appEvents.onSymbolChanged(stock.sym, stock.exg, stock.inst, this.get('selectedLink'));
        }
    },

    onAuthSuccess: function () {
        var exchange = this.get('exg');
        var allDefaultExg = this.priceService.userDS.get('userExchg');

        // If user does not have price subscription for widget exchange, refresh widget
        // This will be done after price authentication
        // Also watch list is not intended to load for non-default exchanges, which also handles here
        if (this.priceService.userDS.isNotSubscribedAsDefaultExchange(exchange)) {
            this.refreshWidget({exg: allDefaultExg[0]});
            this.utils.logger.logInfo('User does not have price exchange subscription for ' + exchange);
        }
    },

    onPrepareData: function () {
        var that = this;
        var exgCode = this.get('exg');

        if (this.get('isCustomWLMode')) {
            this._clearResponsive();
        }

        this.set('partialControlPanel', 'table/views/partial/default-panel');   // Switch to Default Panel
        this.set('isCustomWLMode', false);                                      // Clicking Market is the only way to exit Custom mode

        // Highlight the default selected tab
        var tabActive = this.set('isAllActive', true);
        this.setActiveAssetType(tabActive);

        if (exgCode === this.get('defaultExchange.exg')) { // Sets exchange of default tab
            this.set('isDefault', true);
        } else {
            this.priceService.exchangeDS.getExchangeMetadata(exgCode);
            this.set('selectedExchange', this.priceService.exchangeDS.getExchange(exgCode));
            this.set('isDefault', false);

            this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.select, ['exchangeTab:', exgCode].join(''));
        }

        this.set('exchange', this.get('isDefault') ? this.get('defaultExchange') : this.get('selectedExchange')); // Sets exchange of selected tab
        this.set('isSectorStaticLabelEnabled', true);

        this.setDefaultColumns();
        this.setDefaultSort();

        Ember.run.next(this, function () {
            that.initializeResponsive();
        });
    },

    onBindData: function () {
        if (!this.get('exg')) {
            this._setDefaultExchange();
        }

        this.addArrayObserver(this.customArrayProxy);
        this.setDefaultColumns();
        this.loadContent();
        this._setAssetTypes();
        this._setSectorArray(this.get('exg'));
        this.addObserver('masterContent.@each', this.filterStocks);
        this.addObserver('masterContent.@each.symStat', this.filterStocks);
        this.filterStocks();

        this.set('customArrayProxy.isContentReady', true);

        // To update exchange change during authentication.
        if (this.get('wlHeader') !== undefined) {
            this.get('wlHeader').onExchangeUpdate();
        }
    },

    onAddSubscription: function () {
        this._super();

        var exchangeCode = this.get('exchange').exg;
        this.priceService.addFullMarketIndexRequest(exchangeCode);
    },

    initializeResponsive: function () {
        var isCustomWLMode = this.get('isCustomWLMode');
        var widgetId = isCustomWLMode ? 'favoritePanel-' + this.get('wkey') : 'defaultPanel-' + this.get('wkey');

        this.set('responsive', ResponsiveHandler.create({controller: this, widgetId: widgetId, callback: this.onResponsive, enabledElementResize: true}));

        if (this.get('isCustomWLMode')) {
            this.responsive.addList('favorite-free', [
                {id: 'favorite-more-columns', width: 5}
            ]);
        } else {
            this.responsive.addList('watchList-middle', [
                {id: 'assetType-dropdown', width: 5},
                {id: 'announcement', width: 5},
                {id: 'moreColumns', width: 5}
            ]);
        }

        this.responsive.initialize();
    },

    onAfterRender: function () {
        if (Ember.$.isFunction(this.afterRenderCb)) {
            this.afterRenderCb();
        }

        if (this.get('extendedComponentName')) {
            var viewName = this.container.lookup('controller:' + this.get('extendedComponentName'));

            if (viewName) {
                viewName.set('targetController', this);
            }
        }
    },

    onRemoveSubscription: function () {
        this._super();

        var exchange = this.get('exchange').exg;
        this.priceService.removeFullMarketIndexRequest(exchange);
    },

    onClearData: function () {
        this._super();

        this.set('exg', undefined);
        this.set('isDefaultExchangeSelected', false);
        this.set('currentCustomWLName', undefined);
        this.set('currentAssetType', undefined);
        this.set('sectorFilter', undefined);   // When asset filter is on, sector filter is off
        this.set('defaultAssetTypes', []);
        this.set('currentSubMarketId', undefined);

        if (this.get('currentCustomWLId') !== undefined) {
            this.set('customWLNewActive', undefined);
        }

        this.set('assetFilter', undefined);
        this.set('currentCustomWLId', undefined);
    },

    onUnloadWidget: function () {
        this._super();

        this.set('textFilter', undefined);
        this.set('assetFilter', undefined);
        this.set('todayFilter', undefined);
        this.set('sectorFilter', undefined);
        this.set('assetTypes', Ember.A());

        if (this.get('currentCustomWLId') !== undefined) {
            this.set('customWLNewActive', undefined);
        }

        if (this.get('wlHeader') !== undefined) {
            this.get('wlHeader').onUnloadWlHeader();
        }

        this.set('wlHeader', undefined);
        this.set('currentCustomWLId', undefined);
        this.set('currentCustomWLName', undefined);
        this.set('currentAssetType', undefined);
        this.set('tradeContextMenu', Ember.A());
        this.set('currentSubMarketId', undefined);

        this.removeArrayObserver(this.customArrayProxy);

        this.get('customArrayProxy').onClearData();
        this._clearResponsive();

        this.priceService.unSubscribePriceMetaReady(this.get('wkey'));
    },

    onLanguageChanged: function () {
        var settings = this.get('settings');

        this._super();
        this._loadAssetTypes();
        this._setSectorArray(this.get('exg'));
        this.setDefaultColumns();
        this.setDefaultColumnDeclarations();
        this._setSettingsDesc(settings[0]);
        this.loadMainContextItem();

        this.set('defaultSectorForDropdown', this.get('app').lang.labels.allSectors);
        Ember.set(this.get('customWatchListArray')[this.myFavouritesIndex], 'name', this.get('app').lang.labels[this.myFavouritesKey]);

        this.toggleProperty('isCustomWLChanged');
        this.toggleProperty('isAssetTypeChanged');
        this.toggleProperty('isRefreshed');
    },

    onResponsive: function (responsiveArgs) {
        var controller = responsiveArgs.controller;

        if (responsiveArgs.responsiveLevel >= 1) {
            controller.set('isAssetTypeDropdown', true);

        } else {
            controller.set('isAssetTypeDropdown', false);
        }
    },

    onResizeWidget: function () {
        this.toggleProperty('isRefreshed');
    },

    loadCustomWL: function (id) {
        var that = this;
        var customStockArray = this.get('customWatchListArray')[id].stkArray;
        var subscribedArray = Ember.A();

        if (id === this.get('myFavouritesIndex')) {
            this.set('isRenameWLDisabled', true);
            this.set('isDeleteWLDisabled', true);
        } else {
            this.set('isRenameWLDisabled', false);
            this.set('isDeleteWLDisabled', false);
        }

        if (customStockArray && customStockArray.length > 0 && customStockArray[0].sym) {       // Checks symbols are retrieved from local storage or DataStore
            Ember.$.each(customStockArray, function (key, stockAdded) {
                var stockFromStore = sharedService.getService('price').stockDS.getStock(stockAdded.exg, stockAdded.sym);
                stockFromStore.set('isSelected', stockAdded.isSelected);
                subscribedArray.pushObject(stockFromStore);

                sharedService.getService('price').addSymbolRequest(stockFromStore.get('exg'), stockFromStore.get('sym'), stockFromStore.get('inst'));
            });

            this.get('customWatchListArray')[id].stkArray = subscribedArray;
        }

        // Highlight watch-list header selected tab
        this.set('customWLNewActive', this.get('customWatchListArray')[id]);
        this.setCustomColumns(id);
        this.set('partialControlPanel', 'table/views/partial/favourite-panel');
        this.set('isCustomWLMode', true);
        this.set('currentCustomWLId', id);
        this.set('currentCustomWLName', this.get('customWatchListArray')[id].name);

        // Disable filters
        this.set('assetFilter', undefined);
        this.set('currentAssetType', undefined);
        this.set('sectorFilter', undefined);
        this.set('textFilter', undefined);
        this.set('todayFilter', undefined);
        this.set('hideSuspendedFilter', undefined);

        // Set Content
        this.set('content', subscribedArray);
        this.set('masterContent', subscribedArray);
        this.set('sortProperties', []);     // No Sorting applied to custom WL

        Ember.run.next(this, function () {
            that.initializeResponsive();
        });
    },

    onCustomWlSelect: function (id) {
        this._clearResponsive();
        this.loadCustomWL(id);
        this.setDefaultSort();
        this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['onCustomWlSelect:', id].join(''));
    },

    _clearResponsive: function () {
        var responsive = this.get('responsive');

        if (responsive) {
            responsive.onClear();
            this.set('responsive', undefined);
        }
    },

    setLangLayoutSettings: function (language) {
        var that = this;
        var numOfFixedColumns, scrollPixels;

        if (this.get('isRenderingEnabled')) {
            if (language === 'AR') {
                numOfFixedColumns = 0;
                scrollPixels = priceWidgetConfig.watchList.tableParams.MaxTableWidth;
            } else {
                numOfFixedColumns = priceWidgetConfig.watchList.tableParams.numOfFixedColumns;
                scrollPixels = 0;
            }

            this.set('numOfFixedColumns', numOfFixedColumns);

            Ember.run.later(function () {
                that.set('scrollLeft', scrollPixels);
                Ember.$(that.get('scrollSelector')).scrollLeft(scrollPixels);
            }, 100);
        }
    },

    setTabletConfigs: function () {
        this.set('showWidgetButtons', !appConfig.customisation.isTablet);
        this.set('enableColumnReorder', !this.isTablet);
        this.set('columnsFillTable', !this.isTablet);
    }.on('init'),

    addRemoveAnnColumn: function () {
        try {
            var tableColumns = this.get('columns');
            var tableContent = Ember.$('.antiscroll-inner');    // Note that this is not available when loading
            var insertionIndex, removalIndex, addingScrollingLength, removalScrollingLength;

            if (sharedService.userSettings.currentLanguage === 'AR') {     // This is because AR array is handled manually
                insertionIndex = 0;
                removalIndex = 0;
                addingScrollingLength = 0;
                removalScrollingLength = priceWidgetConfig.watchList.tableParams.MaxTableWidth;
            } else {
                insertionIndex = tableColumns.length;
                removalIndex = tableColumns.length - 1;
                addingScrollingLength = priceWidgetConfig.watchList.tableParams.MaxTableWidth;
                removalScrollingLength = 0;
            }

            if (this.get('isAnnColumnAdded')) {
                var annColumnType = this.get('isClassicView') ? 'classicCell' : 'dualText';
                var annColumnHeaderType = this.get('isClassicView') ? 'Ember.ClassicHeaderCell' : 'Ember.HeaderCell';

                // TODO: [satheeqh] Columnd id should be handled in common place 'dataObj.'
                tableColumns.insertAt(insertionIndex, this.createColumn({
                    id: 'dataObj.ann',
                    width: 185,
                    headerName: 'announcement',
                    headerStyle: 'text-left-header',
                    headerCellView: annColumnHeaderType,
                    type: annColumnType,
                    sortKeyword: 'dataObj.ann',
                    dataType: 'string'
                }, this.get('app')));

                Ember.run.later(function () {   // Scroll right (full) after Anns column object is added
                    tableContent.scrollLeft(addingScrollingLength);
                    Ember.$('.antiscroll-wrap').antiscroll().data('antiscroll').rebuild();
                }, 200);
            } else {
                if (tableColumns[removalIndex].get('contentPath') === 'dataObj.ann') {
                    tableColumns.removeAt(removalIndex);  // Anns column is added as the last column.
                    tableContent.scrollLeft(removalScrollingLength);
                }
            }
        } catch (e) {
            // TODO [Arosha] Handle 'set on destroyed object' error
            this.utils.logger.logError('Error in announcement column not add/remove from watchlist: ' + e);
        }
    }.observes('isAnnColumnAdded'),

    setTableViewParameters: function () {
        var settings;

        if (this.get('isClassicView')) {
            this.set('minHeaderHeight', priceWidgetConfig.watchList.tableParams.MinHeaderHeight.classic);
            this.set('rowHeight', priceWidgetConfig.watchList.tableParams.RowHeight.classic);

            settings = {code: 'standardView'};
        } else {
            this.set('minHeaderHeight', priceWidgetConfig.watchList.tableParams.MinHeaderHeight.standard);
            this.set('rowHeight', priceWidgetConfig.watchList.tableParams.RowHeight.standard);

            settings = {code: 'classicView'};
        }

        this._setSettingsDesc(settings);
        this.setLangLayoutSettings(sharedService.userSettings.currentLanguage, this.get('isFullScreenWL'));
        this.onResizeWidget();
    }.observes('isClassicView'),

    _setSettingsDesc: function (settings) {
        settings.desc = this.get('app').lang.labels[settings.code];
        this.set('settings', [settings]);
    },

    setCellViewsScopeToGlobal: function () {
        this._super();

        Ember.ClassicHeaderCell = ClassicHeaderCell;
        Ember.ClassicCell = ClassicCell;
        Ember.ClassicTextCell = ClassicTextCell;
        Ember.ClassicProgressCell = ClassicProgressCell;
        Ember.ChangeCell = ChangeCell;
        Ember.ButtonCell = ButtonCell;
        Ember.ButtonMenuCell = ButtonMenuCell;
        Ember.DotCell = DotCell;
        Ember.DualArrowCell = DualArrowCell;
        Ember.DualCell = DualCell;
        Ember.TextIconCell = TextIconCell;
        Ember.ProgressCell = ProgressCell;
    },

    cellViewsForColumns: {
        button: 'Ember.ButtonCell',
        buttonMenu: 'Ember.ButtonMenuCell',
        classicProgressCell: 'Ember.ClassicProgressCell',
        classicCell: 'Ember.ClassicCell',
        classicTextCell: 'Ember.ClassicTextCell',
        changeCell: 'Ember.ChangeCell',
        upDown: 'Ember.UpDownCell',
        dual: 'Ember.DualCell',
        dualText: 'Ember.DualTextCell',
        textIconCell: 'Ember.TextIconCell',
        dualChange: 'Ember.DualChangeCell',
        progress: 'Ember.ProgressCell',
        dot: 'Ember.DotCell',
        dualArrow: 'Ember.DualArrowCell'
    },

    checkFilterMatch: function checkFilterMatch(stock, textFilter, assetFilter, todayFilter, sectorFilter, hideSuspendedFilter) {
        var field;
        var isMatchedTextFilter = !textFilter;  // If a argument is false, that means that filter is not applied
        var isMatchedAssetFilter = !(assetFilter || assetFilter === 0);
        var isMatchedTodayFilter = !todayFilter;
        var isMatchedSectorFilter = !sectorFilter;
        var isMatchedHideSuspendedFilter = !hideSuspendedFilter;

        if (!isMatchedTextFilter) {
            for (field in stock) {
                if (stock.hasOwnProperty(field) && (field === 'sym' || field === 'sDes' || field === 'lDes' || field === 'cid') && stock[field] && stock[field].toString().slice(0, textFilter.length).toLowerCase() === textFilter.toLowerCase()) {
                    isMatchedTextFilter = true;
                }
            }
        }

        if (!isMatchedAssetFilter) {
            if (appConfig.customisation.isGroupByAssetType) {
                var instArray = this.utils.AssetTypes.AssetToInstrumentMapping[assetFilter];
                isMatchedAssetFilter = instArray && instArray.indexOf(stock.get('inst')) > -1;
            } else {
                isMatchedAssetFilter = stock.get('inst') === assetFilter;
            }
        }

        if (!isMatchedTodayFilter) {
            isMatchedTodayFilter = stock.get('trades') > 0;
        }

        if (!isMatchedHideSuspendedFilter) {
            isMatchedHideSuspendedFilter = stock.get('symStat') !== priceConstants.SymbolStatus.Suspended;
        }

        if (!isMatchedSectorFilter) {
            isMatchedSectorFilter = stock.get('sec') === sectorFilter;
        }

        return isMatchedTextFilter && isMatchedAssetFilter && isMatchedTodayFilter && isMatchedSectorFilter && isMatchedHideSuspendedFilter;
    },

    filterStocks: (function () {
        Ember.run.once(this, this._filterStocks);
    }).observes('textFilter', 'assetFilter', 'todayFilter', 'sectorFilter', 'hideSuspendedFilter'),

    trackFiltersGA: function () {
        var textFilter = this.utils.validators.isAvailable(this.get('textFilter')) ? this.get('textFilter') : false;  // If any filter is false, that means that filter is not applied
        var assetFilter = this.get('assetFilter') ? this.get('assetFilter').inst : false;
        var todayFilter = this.get('todayFilter');
        var hideSuspendedFilter = this.get('hideSuspendedFilter');
        var sectorFilter = this.utils.validators.isAvailable(this.get('sectorFilter')) ? this.get('sectorFilter').sec : false;

        this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.filter, ['textFilter:', textFilter, '~', 'assetFilter:', assetFilter, '~', 'todayFilter:', todayFilter, '~', 'hideSuspendedFilter:', hideSuspendedFilter, '~', sectorFilter].join(''));
    },

    /* Fill More Columns window with columns selected accordingly */

    setDefaultColumnDeclarations: function () {
        var that = this;
        var labels = that.get('app').lang.labels;
        var columns = this.get('isClassicView') ? priceWidgetConfig.watchList.classicColumnMapping : priceWidgetConfig.watchList.defaultColumnMapping;
        var columnIds = this.get('isClassicView') ? priceWidgetConfig.watchList.classicMoreColumnIds : priceWidgetConfig.watchList.moreColumnIds;
        var columnArray = this.getColumnDefinitionsByMap(columns, columnIds);
        var currentColumnArray = this.get('columnDeclarations');
        var currentColumnMap = {};

        Ember.$.each(currentColumnArray, function (index, column) {
            currentColumnMap[column.id] = column;
        });

        Ember.$.each(columnArray, function (index, column) {
            var columnNameLabel = labels[column.name];
            var columnHeaderSecondName = column.headerSecondName;
            var name = columnNameLabel ? columnNameLabel : labels[column.headerName];

            if (columnHeaderSecondName) {
                name = [name, labels[columnHeaderSecondName]].join(' / ');
            }

            Ember.set(column, 'isSelectedColumn', currentColumnMap[column.id]);
            Ember.set(column, 'displayName', name);
        });

        this.set('defaultColumnDeclarations', columnArray);
    }.observes('isClassicView', 'isCustomWLMode'),

    setDefaultColumns: function () {
        var that = this;
        var assetType = this.get('currentAssetType');
        var customWLId = this.get('currentCustomWLId');

        if (customWLId || customWLId === 0) {
            this.setCustomColumns(customWLId);
        } else if (assetType) {
            this.setAssetTypeColumns(assetType);
        } else {
            var columns, columnIds;
            var watchListColumnIds = this.get('marketWatchListColumnIds');

            if (this.get('isClassicView')) {
                columnIds = watchListColumnIds.classicIds;

                if (!columnIds || columnIds.length === 0) {
                    columnIds = watchListColumnIds.classicIds = priceWidgetConfig.watchList.customClassicColumnIds;
                }

                columns = priceWidgetConfig.watchList.classicColumnMapping;
            } else {
                columnIds = watchListColumnIds.defaultIds;

                if (!columnIds || columnIds.length === 0) {
                    columnIds = watchListColumnIds.defaultIds = priceWidgetConfig.watchList.customDefaultColumnIds;
                }

                columns = priceWidgetConfig.watchList.defaultColumnMapping;
            }

            this.set('columnDeclarations', this.getColumnDefinitionsByMap(columns, columnIds));
        }

        if (this.get('isRenderingEnabled')) {
            Ember.run.next(this, function () {
                var antiScrollWrap = Ember.$('#' + that.get('widgetContainerKey') + ' .antiscroll-wrap');

                if (antiScrollWrap && antiScrollWrap.antiscroll().data('antiscroll')) {
                    antiScrollWrap.antiscroll().data('antiscroll').rebuild();
                }

                that.setLangLayoutSettings(sharedService.userSettings.currentLanguage);
            });
        }
    }.observes('isClassicView'),

    setAssetTypeColumns: function (assetType) {
        var marketColumns = this.get('marketWatchListColumnIds');
        var columnIds, columnList;

        if ((assetType || assetType === 0) && marketColumns.defaultAssetIds[assetType]) {
            columnIds = marketColumns.defaultAssetIds[assetType];
        } else {
            columnIds = marketColumns.defaultAssetIds[assetType] = marketColumns.defaultIds;
        }

        columnList = priceWidgetConfig.watchList.defaultColumnMapping;

        if (this.get('isClassicView')) {
            if ((assetType || assetType === 0) && marketColumns.classicAssetIds[assetType]) {
                columnIds = marketColumns.classicAssetIds[assetType];
            } else {
                columnIds = marketColumns.classicAssetIds[assetType] = marketColumns.classicIds;
            }

            columnList = priceWidgetConfig.watchList.classicColumnMapping;
        }

        this.set('columnDeclarations', this.getColumnDefinitionsByMap(columnList, columnIds));
        this.setLangLayoutSettings(sharedService.userSettings.currentLanguage);
    },

    /* Fill column Ids for custom columns in order to set current WL columns to particular custom WL*/

    setCustomColumns: function (id) {
        var customColumnIds, columns;
        var customWatchLists = this.get('customWatchListColumnArray');

        if (!customWatchLists[id]) {
            var customWatchListWithStocks = this.get('customWatchListArray')[id];
            customWatchLists[id] = {id: id, name: customWatchListWithStocks.name, classicColumnArray: Ember.A(), defaultColumnArray: Ember.A()};
        }

        if (this.get('isClassicView')) {
            customColumnIds = customWatchLists[id].classicColumnArray;

            if (!customColumnIds || customColumnIds.length === 0) {
                customColumnIds = customWatchLists[id].classicColumnArray = priceWidgetConfig.watchList.customClassicColumnIds;
            }

            columns = priceWidgetConfig.watchList.classicColumnMapping;
        } else {
            customColumnIds = customWatchLists[id].defaultColumnArray;

            if (!customColumnIds || customColumnIds.length === 0) {
                customColumnIds = customWatchLists[id].defaultColumnArray = priceWidgetConfig.watchList.customDefaultColumnIds;
            }

            columns = priceWidgetConfig.watchList.defaultColumnMapping;
        }

        this.set('columnDeclarations', this.getColumnDefinitionsByMap(columns, customColumnIds));

        this.setDefaultColumnDeclarations();
        this.setLangLayoutSettings(sharedService.userSettings.currentLanguage);
    },

    popUpWidget: function (id) {
        var sym = this.get('clickedRowSymbol');
        var exg = this.get('clickedRowExchange');
        var inst = this.get('clickedRowInstrument');

        // Close menu
        var modal = sharedService.getService('sharedUI').getService('modalPopupId');
        modal.send('closeModalPopup');

        if (id !== 5 && id !== 6) {
            sharedService.getService('priceUI').showPopupWidget({container: this.container, controllerString: 'view:symbol-popup-view'}, {tabId: id, sym: sym, exg: exg, inst: inst});
        } else if (appConfig.customisation.isTradingEnabled) { // Order ticket
            // Assumed as only Buy and Sell supported
            var side = id === 5 ? '1' : '2';
            var controllerString, routeString, viewName;
            controllerString = 'controller:trade/widgets/order-ticket/order-ticket-portrait';
            routeString = 'trade/widgets/order-ticket/order-ticket-portrait';
            viewName = 'view:widget-popup-view';

            var sharedUIService = sharedService.getService('sharedUI');
            sharedUIService.showPopupWidget({container: this.container, controllerString: controllerString, routeString: routeString, viewName: viewName}, {tabId: side, sym: sym, exg: exg, inst: inst});
        }
    },

    deleteSymbol: function () {
        var symbol = this.get('clickedRowSymbol');
        var exchange = this.get('clickedRowExchange');

        this.priceService.watchListDS.deleteSymbol({sym: symbol, exg: exchange}, this.get('currentCustomWLId'));
    },

    toggleFullScreen: function () {
        var that = this;

        this._super('watchListContainer-' + this.get('wkey'), this.get('wkey'));
        this.onResizeWidget();

        Ember.run.later(function () {       // Horizontal scroll position of H.scroll bar calculated in javascript (antiscroll.js), so no css.
            var innerScroll = Ember.$('.antiscroll-inner');

            if (that.get('isHorizontalScrollAvailable') && sharedService.userSettings.currentLanguage === 'AR') {
                innerScroll.scrollLeft(priceWidgetConfig.watchList.tableParams.MaxTableWidth);
            } else {
                innerScroll.scrollLeft(0);
            }

            innerScroll.scrollTop(10);     // [TODO] Arosha fix black screen when scrolling  issue of maximize V in a alternative way
            innerScroll.scrollTop(0);
        }, 200);
    }.observes('isFullScreenWL'),

    setActiveAssetType: function (tab) {
        var assetTypes = this.get('defaultAssetTypes');

        if (tab) {
            if (assetTypes && assetTypes.length > 0) {
                this.set('assetTypNewActive', assetTypes[0]);
            }
        } else {
            this.set('assetTypNewActive', undefined);
        }
    },

    loadMainContextItem: function () {
        this.set('addToWatchlistMenu', [{id: 9, path: 'components/add-to-watchlist-item', name: 'Add to Watchlist', isExtended: 'true'}]);

        var callbackFunc = this.deleteSymbol;
        this.set('deleteSymbolMenu', [{view: {key: 'delete', name: this.get('app').lang.labels.removeSym, iconClass: 'icon-remove', shortcut: 'Alt + D'}, config: {callbackFunc: callbackFunc}, args: {tabId: 7}}]);
    },

    _setWatchListColumnsIds: function (changedColumnIds) {
        var marketColumnIds = this.get('marketWatchListColumnIds');
        var marketSavedColumnIds = this.get('watchlistSavedColumnIds');
        var customColumnIds = this.get('customWatchListColumnArray');
        var isClassicMode = this.get('isClassicView');
        var customWLId = this.get('currentCustomWLId');
        var assetTypeId = this.get('currentAssetType');

        if (customWLId || customWLId === 0) {
            var columnArray = isClassicMode ? 'classicColumnArray' : 'defaultColumnArray';

            customColumnIds[customWLId][columnArray] = changedColumnIds;

            this.saveWidget({customWatchListColumnArray: customColumnIds}, true); // Send second parameter as true for save globally
            this.setCustomColumns(customWLId);
        } else if (assetTypeId || assetTypeId === 0) {
            var columnAssetIds = isClassicMode ? 'classicAssetIds' : 'defaultAssetIds';

            if (!marketSavedColumnIds[columnAssetIds]) {
                marketSavedColumnIds[columnAssetIds] = {};
            }

            marketColumnIds[columnAssetIds][assetTypeId] = changedColumnIds;
            marketSavedColumnIds[columnAssetIds][assetTypeId] = changedColumnIds;

            this.saveWidget({marketWatchListColumnIds: marketSavedColumnIds}, true); // Send second parameter as true for save globally
            this.setAssetTypeColumns(assetTypeId);
        } else {
            var columnIds = isClassicMode ? 'classicIds' : 'defaultIds';

            marketColumnIds[columnIds] = changedColumnIds;
            marketSavedColumnIds[columnIds] = changedColumnIds;

            this.saveWidget({marketWatchListColumnIds: marketSavedColumnIds}, true); // Send second parameter as true for save globally
            this.setDefaultColumns();
        }
    },

    changeTableColumns: function () {
        var marketColumnIds = this.get('marketWatchListColumnIds');

        // Check menu is a default column or not
        if (marketColumnIds.classicIds.indexOf('menu') === -1) {
            this.set('nonRemovableColumnIds', ['sym']);
        }

        var changedColumnIds = this.getChangedColumnIds();

        this._setWatchListColumnsIds(changedColumnIds);
        this.closePopup();
        this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.select, ['newColumnsAfterChange:', changedColumnIds.join('')].join(''));
    },

    reOrderTableColumns: function (columns) {
        var classicColumnMap = priceWidgetConfig.watchList.classicColumnMapping;
        var defaultColumnMap = priceWidgetConfig.watchList.defaultColumnMapping;
        var isClassicMode = this.get('isClassicView');

        var reOrderedColumnIds = isClassicMode ? this.getReOrderedColoumnIds(columns, classicColumnMap) : this.getReOrderedColoumnIds(columns, defaultColumnMap);
        this._setWatchListColumnsIds(reOrderedColumnIds);
    },

    _bindKeyboardShortcuts: function () {
        var that = this;
        var wkey = this.get('wkey');

        var detailsQuoteConfig = {
            service: 'priceUI',
            controllerString: 'view:symbol-popup-view'
        };

        var orderTicketConfig = {
            service: 'sharedUI',
            controllerString: 'controller:trade/widgets/order-ticket/order-ticket-portrait',
            routeString: 'trade/widgets/order-ticket/order-ticket-portrait',
            viewName: 'view:widget-popup-view'
        };

        Mousetrap.bind('delete', function () { // Delete symbol on custom watch list
            if (that.get('isCustomWLMode')) {
                that.deleteSymbol();
                return false;
            }
        }, wkey);

        Mousetrap.bind('enter', function () {
            var view = Ember.View.views[that.get('viewId')];
            var rowData;

            if (view) {
                var dataObj = view.get('row.content.dataObj');

                if (dataObj) {
                    rowData = dataObj.getProperties('exg', 'sym', 'inst');

                    if (rowData) {
                        that.set('clickedRowSymbol', rowData.sym);
                        that.set('clickedRowExchange', rowData.exg);
                        that.set('clickedRowInstrument', rowData.inst);
                    }
                }
            }

            that.popUpWidget(0);
        }, wkey);

        Mousetrap.bind('arrowdown', function () {
            that._navigateUpDown(that.navigation.down);
        }, wkey);

        Mousetrap.bind('arrowup', function () {
            that._navigateUpDown(that.navigation.up);
        }, wkey);

        Mousetrap.bind('alt+d', function () {
            // Show Detail Quote
            that._showPopupWidget(0, 'alt+d', detailsQuoteConfig);

            return false;
        }, wkey);

        Mousetrap.bind('alt+t', function () {
            // Show Time and Sales
            that._showPopupWidget(1, 'alt+t', detailsQuoteConfig);

            return false;
        }, wkey);

        Mousetrap.bind('alt+p', function () {
            // Show Depth by Price
            detailsQuoteConfig.windowTypes = [priceConstants.WindowType.MarketDepthByPrice, priceConstants.WindowType.MarketDepthByPriceAdvanced];
            detailsQuoteConfig.isAvailableWindowType = true;

            that._showPopupWidget(2, 'alt+p', detailsQuoteConfig);
            return false;
        }, wkey);

        Mousetrap.bind('alt+o', function () {
            // Show Depth by Order
            detailsQuoteConfig.windowTypes = [priceConstants.WindowType.MarketDepthByOrder, priceConstants.WindowType.MarketDepthByOrderAdvanced];
            detailsQuoteConfig.isAvailableWindowType = true;

            that._showPopupWidget(3, 'alt+o', detailsQuoteConfig);
            return false;
        }, wkey);

        Mousetrap.bind('alt+c', function () {
            // Show Chart
            that._showPopupWidget(4, 'alt+c', detailsQuoteConfig);

            return false;
        }, wkey);

        Mousetrap.bind('alt+a', function () {
            // Show Alerts
            that._showPopupWidget(5, 'alt+a', detailsQuoteConfig);

            return false;
        }, wkey);

        if (appConfig.customisation.isTradingEnabled) {
            Mousetrap.bind('alt+b', function () {
                // Show Buy Order ticket
                that._showPopupWidget('1', 'alt+b', orderTicketConfig);

                return false;
            }, wkey);

            Mousetrap.bind('alt+s', function () {
                // Show Buy Order ticket
                that._showPopupWidget('2', 'alt+s', orderTicketConfig);

                return false;
            }, wkey);
        }
    },

    _showPopupWidget: function (tabId, shortcut, args) {
        var that = this;
        var view = Ember.View.views[that.get('viewId')];

        if (view) {
            var dataObj = view.get('row.content.dataObj');

            if (dataObj) {
                var rowData = dataObj.getProperties('exg', 'sym', 'inst');

                if (rowData) {
                    if (!args.isAvailableWindowType || that.priceService.userDS.isWindowTypeAvailable(args.windowTypes, rowData.exg)) {
                        sharedService.getService(args.service).showPopupWidget({container: that.container, controllerString: args.controllerString, routeString: args.routeString, viewName: args.viewName}, {tabId: tabId, sym: rowData.sym, exg: rowData.exg, inst: rowData.inst});
                    }

                    that.utils.analyticsService.trackEvent(that.get('gaKey'), 'keyboard-shortcut', ['shortcut:', shortcut, ',',
                        'popup:', tabId, ',', 'sym:', that.get('selectedSymbol.sym'), '~', that.get('selectedSymbol.exg')].join(''));
                }
            }
        }
    },

    _setAssetTypes: function () {
        var assetTypes = sharedService.getService('price').stockDS.getAssetTypeCollectionByExchange(this.get('exg') ? this.get('exg') : this.get('defaultExchange.exg'));

        if (assetTypes && ((assetTypes.length === 0) || (assetTypes.length > 0 && assetTypes[0].inst !== undefined))) {
            assetTypes.insertAt(0, {inst: undefined, desc: 'all'});
        }

        this.set('defaultAssetTypes', assetTypes);
        this._loadAssetTypes();
    },

    _loadAssetTypes: function () {
        var that = this;
        var assetTypes = this.get('defaultAssetTypes');

        Ember.$.each(assetTypes, function (key, market) {
            Ember.set(market, 'displayDesc', that.get('app').lang.labels[market.desc] ? that.get('app').lang.labels[market.desc] : that.get('app').lang.labels.unknown);

            // Set the default tab highlighted
            if (market.inst === undefined) {
                that.set('assetTypNewActive', market);
            }
        });
    }.observes('defaultAssetTypes.@each'),

    _filterStocks: function () {
        var textFilter = this.utils.validators.isAvailable(this.get('textFilter')) ? this.get('textFilter') : false;  // If any filter is false, that means that filter is not applied
        var assetFilter = this.get('assetFilter') ? this.get('assetFilter').inst : false;
        var todayFilter = this.get('todayFilter');
        var hideSuspendedFilter = this.get('hideSuspendedFilter');
        var sectorFilter = this.utils.validators.isAvailable(this.get('sectorFilter')) ? this.get('sectorFilter').sec : false;

        var symbolTypeGroup = appConfig.customisation.isGroupByAssetType ? this.utils.AssetTypes.IndexAssetType : this.utils.AssetTypes.Indices;
        var dataCollection = assetFilter === symbolTypeGroup ? this.priceService.stockDS.getIndexCollectionByExchange(this.get('exchange.exg')) : this.get('masterContent');

        if (!this.get('isCustomWLMode') && (textFilter || assetFilter || todayFilter || hideSuspendedFilter || sectorFilter || assetFilter === 0)) {
            var filteredStocks = dataCollection.filter((function (that) {    //eslint-disable-line
                return function (stock) {
                    return that.checkFilterMatch(stock, textFilter, assetFilter, todayFilter, sectorFilter, hideSuspendedFilter);
                };
            })(this));

            this.set('content', filteredStocks);        // Need to capture filter removing event to avoid 'set' without filters
            this.trackFiltersGA();
        } else {
            this.set('content', this.get('masterContent'));
        }
    },

    _generateFullContextMenu: function () {
        this.menuComponent.customWatchListArray = this.customWatchListArray;

        if (this.menuComponent.fullContextMenu.length === 1) {
            if (this.get('isCustomWLMode')) {
                if (appConfig.customisation.isTradingEnabled) {
                    this.menuComponent.fullContextMenu.insertAt(0, this.menuComponent.tradeContextMenu);
                    this.menuComponent.fullContextMenu.pushObject(this.deleteSymbolMenu);
                } else {
                    this.menuComponent.fullContextMenu.pushObject(this.deleteSymbolMenu);
                }
            } else {
                if (appConfig.customisation.isTradingEnabled) {
                    this.menuComponent.fullContextMenu.insertAt(0, this.menuComponent.tradeContextMenu);
                    this.menuComponent.fullContextMenu.insertAt(1, this.addToWatchlistMenu);
                    this.menuComponent.fullContextMenu.insertAt(3, this.priceContextMenu);
                } else {
                    this.menuComponent.fullContextMenu.insertAt(0, this.addToWatchlistMenu);
                    this.menuComponent.fullContextMenu.insertAt(2, this.priceContextMenu);
                }
            }
        }
    },

    _navigateUpDown: function (navDirection) {
        var mainDiv, childTop, currentTop, beforeLastDiv, lastRowTop, previousLastRow, lastRow, noOfRows;

        var currentIndex = 0;
        var isSelected = false;
        var minNextTopIndex = 0;
        var innerScroll = this.getAntiScroller();
        var rowHeight = this.get('rowHeight');
        var tableIdDiv = Ember.$('#table-' + this.get('wkey'));

        if (tableIdDiv.length !== 0) {
            mainDiv = tableIdDiv.children().closest('div').get('1').children[0].children[0].children[0];
        }

        var rightDivSet = mainDiv.children[1];
        var leftDivSet = mainDiv.children[0];
        var tableHeight = mainDiv.clientHeight;
        var lastDivTop = navDirection * tableHeight;

        // Get current selected row if any
        for (var i = 0; i < rightDivSet.childElementCount; i++) {
            childTop = parseInt(rightDivSet.children[i].style.top, 10);

            if (navDirection === this.navigation.down) {
                if (childTop > lastDivTop) {
                    lastDivTop = childTop;
                }
            } else {
                if (childTop < lastDivTop) {
                    lastDivTop = childTop;
                }
            }

            if (rightDivSet.children[i].classList.contains('ember-table-hover-new')) {
                currentTop = childTop;
                currentIndex = i;
                isSelected = true;
            }
        }

        // Select first row if none of rows are selected
        if (!isSelected) {
            this._setFirstElement(rightDivSet);
            this._setFirstElement(leftDivSet);
            this.set('viewId', rightDivSet.children[0].id);
            return false;
        }

        if (navDirection === this.navigation.down) {
            lastRow = tableHeight - 2 * rowHeight; // Scroll down when it reaches last fully rendered row
            lastRowTop = tableHeight - 2 * rowHeight; // Set top of scrolling point
        } else {
            noOfRows = rightDivSet.childElementCount - 2; // Scroll up when it reaches first fully rendered row
            lastRowTop = tableHeight - noOfRows * rowHeight; // Set top of scrolling point
        }

        // If it reaches the bottom,it scrolls to the top of the watch-list
        if (navDirection === this.navigation.down && currentTop === lastRow) {
            innerScroll.scrollTop = 0;
            return false;
        }

        if (navDirection === this.navigation.up && currentTop === 0) {
            innerScroll.scrollTop = lastRowTop;
            return false;
        }

        // Remove selected css class if any
        if (isSelected) {
            rightDivSet.children[currentIndex].classList.remove('ember-table-hover-new');
            leftDivSet.children[currentIndex].classList.remove('ember-table-hover-new');
            minNextTopIndex = currentIndex - 1;
        }

        var minNextTop = (navDirection === this.navigation.up) ? lastDivTop : tableHeight;

        // Search for the row element which has minimum scroll Top after current scrollTop
        for (var j = 0; j < rightDivSet.childElementCount; j++) {
            childTop = parseInt(rightDivSet.children[j].style.top, 10);

            if (navDirection === this.navigation.down) {
                if (childTop > currentTop && childTop < minNextTop) {
                    minNextTop = childTop;
                    minNextTopIndex = j;
                }
            } else {
                if (childTop < currentTop && childTop > minNextTop) {
                    minNextTop = childTop;
                    minNextTopIndex = j;
                }
            }
        }

        // Apply selected css class to next element
        this._setNextElement(rightDivSet.children[minNextTopIndex]);
        this._setNextElement(leftDivSet.children[minNextTopIndex]);

        // Update viewId of currently selected row
        if (leftDivSet.children[minNextTopIndex]) {
            this.set('viewId', leftDivSet.children[minNextTopIndex].id);
        }

        // Get previous row of last row in current list
        if (navDirection === this.navigation.down) {
            beforeLastDiv = lastDivTop - 2 * rowHeight; // Get last fully rendered row
            previousLastRow = lastRowTop - 2 * rowHeight; // Get top value of last fully rendered row
        } else {
            beforeLastDiv = lastDivTop + rowHeight;
        }

        // Check whether selected item has reached to before last row and previous row of bottom of watchlist
        if (navDirection === this.navigation.down && currentTop === beforeLastDiv && currentTop !== previousLastRow) {
            innerScroll.scrollTop = currentTop;
            return false;
        }

        if (navDirection === this.navigation.up && currentTop === beforeLastDiv) {
            innerScroll.scrollTop = currentTop - noOfRows * rowHeight;
            return false;
        }

        return false;
    },

    _setFirstElement: function (divElement) {
        var element = divElement.children[0];
        element.className += ' ember-table-hover-new';

    },

    _setNextElement: function (divElement) {
        if (divElement) {
            divElement.className += ' ember-table-hover-new';
        }
    },

    _setDefaultExchange: function () {
        // Need to reset to default exchange when restoring from cache
        var defExg = sharedService.getService('price').exchangeDS.getExchange(sharedService.userSettings.price.userDefaultExg);

        this.set('defaultExchange', defExg);
        this.set('exchange', defExg);
        this.set('isDefaultExchangeSelected', true);
    },

    _setSectorArray: function (exgCode) {
        var sectorList = this.priceService.sectorDS.getSectorCollectionByExchange(exgCode ? exgCode : this.get('defaultExchange.exg'));
        var allSectorDes = this.get('app').lang.labels.allSectors;

        if (sectorList && ((sectorList.length === 0) || (sectorList.length > 0 && sectorList[0].sec !== undefined))) {
            sectorList.insertAt(0, {sec: undefined, des: allSectorDes});
        } else if (sectorList.length > 0 && sectorList[0].sec === undefined) {
            sectorList[0].des = allSectorDes;
        }

        this.set('isSectorStaticLabelEnabled', true);
        this.set('sectorsArray', sectorList);
    },

    showSearchPopup: function () {
        var modal = this.get('watchListSymbolSearch');
        modal.send('showModalPopup');
    },

    searchKeyDidChange: function () {
        var searchKey = this.get('addStockSearchKey');

        if (searchKey && searchKey.length) {
            Ember.run.debounce(this, this.showSearchPopup, 300);
        }
    }.observes('addStockSearchKey'),

    setSavedColumnConfig: function () {
        var defaultColumns = this.get('marketWatchListColumnIds');
        var savedColumns = this.get('watchlistSavedColumnIds');
        var assetColumns = {};

        if (savedColumns.defaultAssetIds) {
            assetColumns.defaultAssetIds = Ember.$.extend(defaultColumns.defaultAssetIds, savedColumns.defaultAssetIds);
        }

        if (savedColumns.classicAssetIds) {
            assetColumns.classicAssetIds = Ember.$.extend(defaultColumns.classicAssetIds, savedColumns.classicAssetIds);
        }

        var mergedDefaultClassicColumns = Ember.$.extend(defaultColumns, savedColumns);
        var mergedColumns = Ember.$.extend(mergedDefaultClassicColumns, assetColumns);

        this.set('marketWatchListColumnIds', mergedColumns);
    },

    actions: {
        onTabSelectionChanged: function (option) {
            if (option && option.inst === 7) { // Only indices are taken from indexDS, not from StockDS
                this.loadContent(this.priceService.stockDS.get('indexMapByExg'));
            } else if (option && option.isNoSubMarket) { // Load full StockDS to none sub-market asserts
                this.set('isNoSubMarket', true);
                this.loadContent();
            } else if (this.get('currentAssetType') === 7 || this.get('isNoSubMarket')) { // Load StockDS back from previous index load or Load StockDS according to sub-market
                this.set('isNoSubMarket', false);
                this.loadContent();
            }

            // Filters
            this.set('assetFilter', option);
            this.set('currentAssetType', option ? option.inst : undefined);
            this.set('sectorFilter', undefined);   // When asset filter is on, sector filter is off

            // Set columns for new Asset Type
            this.setAssetTypeColumns(option ? option.inst : undefined);
            this.setDefaultColumnDeclarations();
            this.setDefaultSort();
        },

        setSector: function (option) {
            this.set('isSectorStaticLabelEnabled', false);

            if (this.get('currentAssetType') === 7) {        // Load StockDS back from previous index load
                this.loadContent();
            }

            // Removing the highlight css of the previous tab
            this.setActiveAssetType();

            // Filters
            this.set('sectorFilter', option);
            this.set('assetFilter', undefined);   // When sector filter is on, asset filter is off
            this.set('currentAssetType', undefined);

            // Reset columns for sector
            this.setDefaultColumns();
            this.setDefaultColumnDeclarations();
        },

        setTableSettings: function () {
            this.toggleProperty('isClassicView');
            var newValue = this.get('isClassicView');
            this.saveWidget({isClassicView: newValue});
            this.setDefaultSort();
            this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.select, ['isClassicView:', newValue].join(''));
        },

        addStocksFromCustomWL: function (stock) {
            var modal = this.get('watchListSymbolSearch');
            var currentWatchlistId = this.get('currentCustomWLId');

            this.priceService.watchListDS.addStocksToCustomWL({sym: stock.sym, exg: stock.exg}, currentWatchlistId);
            this.loadCustomWL(currentWatchlistId);
            this.set('addStockSearchKey', '');

            if (modal) {
                modal.send('closeModalPopup');
            }

            this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.select, ['addStocksToCustomWL:', stock ? stock.sym : ''].join(''));
        },

        deleteWatchList: function () {
            this.deleteWatchList();
        },

        onCustomWlSelect: function (id) {
            this.onCustomWlSelect(id);
        },

        showSearchPopup: function () {
            this.showSearchPopup();
        },

        closeSearchPopup: function () {
            var modal = this.get('watchListSymbolSearch');
            modal.send('closeModalPopup');
        },

        popUpWidgetButtonMenu: function () {
            var stock = {sym: this.get('clickedRowSymbol'), exg: this.get('clickedRowExchange'), inst: this.get('clickedRowInstrument')};

            this._initializeMenuComponents();
            this.menuComponent.initialize(this.get('wkey'), stock);

            var viewName = 'components/symbol-click-menu-popup';
            var modal = sharedService.getService('sharedUI').getService('modalPopupId');

            this.menuComponent.showPopup(this.menuComponent, viewName, modal);
        },

        clickRow: function (selectedRow, event) {
            var rowData = selectedRow.getProperties('dataObj.exg', 'dataObj.sym', 'dataObj.inst');
            var selectedLink = this.get('selectedLink');

            rowData = {
                exg: rowData['dataObj.exg'],
                sym: rowData['dataObj.sym'],
                inst: rowData['dataObj.inst']
            };

            if (event && event.button !== 2) {
                var target = event.target ? event.target : event.srcElement;
                var isTradeEnabled = appConfig.customisation.isTradingEnabled;

                if (target && isTradeEnabled && selectedLink) {
                    var priceUIService = sharedService.getService('priceUI');
                    var cellId = target.attributes && target.attributes.getNamedItem('cell-id') && target.attributes.getNamedItem('cell-id').value ?
                        target.attributes.getNamedItem('cell-id').value : '';

                    if (cellId === 'dataObj.bap' || cellId === 'dataObj.baq') {   // In case target is the top most element (closest() is not working for IE)
                        priceUIService.onBidOfferChanged(false, selectedLink);
                    } else if (cellId === 'dataObj.bbp' || cellId === 'dataObj.bbq') {
                        priceUIService.onBidOfferChanged(true, selectedLink);
                    } else {
                        if (Ember.$(target).parents('[cell-id="dataObj.bbp"]').length > 0 || Ember.$(target).parents('[cell-id="dataObj.bbq"]').length > 0) {
                            priceUIService.onBidOfferChanged(true, selectedLink);
                        } else if (Ember.$(target).parents('[cell-id="dataObj.bap"]').length > 0 || Ember.$(target).parents('[cell-id="dataObj.baq"]').length > 0) {
                            priceUIService.onBidOfferChanged(false, selectedLink);
                        }
                    }
                }
            }

            this._super(rowData, event);

            if (rowData && rowData.sym) {
                this.set('clickedRowSymbol', rowData.sym);
                this.set('clickedRowExchange', rowData.exg);
                var ex = this.priceService.exchangeDS.getExchange(rowData.exg);
                this.set('clickedRowExchangeCode', ex.de);
                this.set('clickedRowInstrument', rowData.inst);
            }
        },

        doubleClickRow: function (selectedRow, event) {
            var rowSymbol, rowInst;
            var widgetId = 0;        // Detailed Quote is shown by double click - Default
            var target = event.target ? event.target : event.srcElement;
            var rowData = selectedRow.getProperties('dataObj.exg', 'dataObj.sym', 'dataObj.inst');

            rowData = {
                exg: rowData['dataObj.exg'],
                sym: rowData['dataObj.sym'],
                inst: rowData['dataObj.inst']
            };

            if (rowData) {
                rowSymbol = rowData.sym;
                rowInst = rowData.inst;
                this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.rowDoubleClick, ['sym:', rowSymbol, '~', 'inst:', rowInst].join(''));
            }

            if (rowInst === this.utils.AssetTypes.Equity || rowInst === this.utils.AssetTypes.Etf) {
                if (target) {
                    var isTradeEnabled = appConfig.customisation.isTradingEnabled;
                    var cellId = target.attributes && target.attributes.getNamedItem('cell-id') && target.attributes.getNamedItem('cell-id').value ?
                        target.attributes.getNamedItem('cell-id').value : '';

                    if (cellId) {   // In case target is the top most element (closest() is not working for IE)
                        switch (cellId) {
                            case 'dataObj.ltp':
                                widgetId = 1;
                                break;

                            case 'dataObj.bap':
                            case 'dataObj.baq':
                                widgetId = isTradeEnabled ? 5 : 2;
                                break;

                            case 'dataObj.bbp':
                            case 'dataObj.bbq':
                                widgetId = isTradeEnabled ? 6 : 2;
                                break;

                            default:
                                widgetId = 0;
                                break;
                        }
                    } else {
                        if (Ember.$(target).parents('[cell-id="dataObj.bbp"]').length > 0 || Ember.$(target).parents('[cell-id="dataObj.bbq"]').length > 0) {
                            widgetId = isTradeEnabled ? 6 : 2;
                        } else if (Ember.$(target).parents('[cell-id="dataObj.bap"]').length > 0 || Ember.$(target).parents('[cell-id="dataObj.baq"]').length > 0) {
                            widgetId = isTradeEnabled ? 5 : 2;
                        } else if (Ember.$(target).parents('[cell-id="dataObj.ltp"]').length > 0) {
                            widgetId = 1;
                        }
                    }
                }
            }

            this.popUpWidget(widgetId);
        },

        fullScreenToggle: function () {
            this.toggleProperty('isFullScreenWL');
            this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.select, ['isFullScreenWL:', this.get('isFullScreenWL')].join(''));
        },

        sort: function sort(column) {
            if (!column.get('isSortSupported')) {
                return;
            }

            if (this.get('sortColumn') !== column) {
                this.get('columns').setEach('isSorted', false);
                column.set('isSorted', true);
                this.set('sortColumn', column);
                this.set('sortProperties', [column.get('sortKey')]);
                this.set('isSortApplied', true);
            } else if (this.get('sortColumn') === column) {
                // Handle disabling sorts
                if (this.get('sortAscending') === true) {
                    this.set('sortColumn', undefined);
                    this.set('sortAscending', false);
                    column.set('isSorted', false);
                    this.set('isSortApplied', false);
                    this.set('sortProperties', []);
                } else {
                    this.set('sortProperties', [column.get('sortKey')]);
                    this.toggleProperty('sortAscending');
                }
            }

            this.saveWidget({sortAsc: this.get('sortAscending'), sortCols: this.get('sortProperties')});
            this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.select, ['sortedColumn:', this.get('sortProperties').join('')].join(''));
        },

        setCurrentCustomWLName: function () {
            var customWatchLists = this.get('customWatchListArray');
            var currentCustomWLId = this.get('currentCustomWLId');
            var watchList = customWatchLists[currentCustomWLId];

            this.set('currentCustomWLName', watchList.name);
        }
    }
});

// Watchlist specific helpers registration
Ember.Handlebars.helper('custom-watchlist-dialog', CustomWatchlistDialog);
Ember.Handlebars.helper('column-context-menu', ColumnContextMenu);
Ember.Handlebars.helper('more-markets-dropdown', moreMarketsDropdown);
Ember.Handlebars.helper('sub-markets-dropdown', subMarketsDropdown);
