import Ember from 'ember';
import sharedService from '../../../models/shared/shared-service';
import BaseArrayController from '../../base-array-controller';
import BootstrapDropdownSelect from '../../../components/bootstrap-dropdown-select';
import ControllerFactory from '../../controller-factory';
import appEvents from '../../../app-events';
import appConfig from '../../../config/app-config';
import priceWidgetConfig from '../../../config/price-widget-config';

export default BaseArrayController.extend({
    dimensions: {
        w: 3,
        h: 17
    },

    fieldList: Ember.A([]),

    // Sort fields of sector overview drop down
    SortByFieldsMappingTradedVolume: '1',
    SortByFieldsMappingTurnover: '2',
    SortByFieldsMappingChangePer: '3',
    SortByFieldsMappingChange: '4',
    SortByFieldsMappingNumberOfTrades: '5',

    // Options for sector overview drop down
    isDropdownAvailable: true,
    sortBySelectBox: [],
    defaultCriteria: {},

    selectedSortOrder: null,
    mainIndex: undefined,

    // Data collection related variables
    // Array controller content
    content: undefined,

    // Sort property of array controller
    sortProperties: ['vol'],

    // Collection sorting order
    sortAscending: false,
    maxNumberOfElementsToShow: 5,

    // CSS related variables
    indexArrowCssTop: 'glyphicon glyphicon-triangle-top up-fore-color',
    indexArrowCssBottom: 'glyphicon glyphicon-triangle-bottom down-fore-color',
    upColorCss: 'up-fore-color',
    downColorCss: 'down-fore-color',

    // Full Screen parameters
    previousParent: null,
    previousWatchListStyleAttribute: null,
    previousFullScreenContainerStyleAttribute: null,
    isFullScreenMode: false,
    watchListController: null,

    // Column widths
    descColumnWidth: '35%',
    sortedPropertyWidth: '30%',

    priceService: sharedService.getService('price'),
    isTablet: appConfig.customisation.isTablet,

    /* *
     * This will called by based controller
     */
    onLoadWidget: function () {
        this.setLanguageParameters();
        appEvents.subscribeExchangeChanged(-1, this.get('wkey'), this);

        var maxNumberOfElementsInTablet = 9;
        this.set('maxNumberOfElementsToShow', this.isTablet ? maxNumberOfElementsInTablet : this.maxNumberOfElementsToShow);
        this.set('isDropdownAvailable', !this.isTablet);
    },

    onPrepareData: function () {
        this.set('content', this.priceService.stockDS.getIndexCollectionByExchange(this.get('exg')));
        this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.show, ['exg:', this.get('exg')].join(''));
        this.bindData();
    },

    onAddSubscription: function () {
        // Sector Overview required full marker Sector indices and Main index Details
        this.priceService.addFullMarketIndexRequest(sharedService.userSettings.price.currentExchange);
    },

    onRemoveSubscription: function () {
        this.priceService.removeFullMarketIndexRequest(sharedService.userSettings.price.currentExchange);
    },

    bindData: function () {
        var that = this;
        var sectorOverviewConfig = priceWidgetConfig.sectorOverview;
        var fields = sectorOverviewConfig ? sectorOverviewConfig.fields : '';

        if (fields) {
            var fieldList = [];

            Ember.$.each(sectorOverviewConfig.fields, function (key, item) {
                fieldList[fieldList.length] = {name: that.get('app').lang.labels[item]};
            });

            this.set('fieldList', fieldList);
        }
    },

    sortOrderChanged: function () {
        var selectedSortOrder = this.get('selectedSortOrder.val');
        var sortProperties = ['vol'];
        var sortedPropertyWidth = '20%';
        var descColumnWidth = '40%';
        this.set('sortAscending', false);

        switch (selectedSortOrder) {
            case this.SortByFieldsMappingTurnover :
                sortProperties = ['tovr'];
                sortedPropertyWidth = '28%';
                descColumnWidth = '32%';
                this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['sortby:', 'turnover'].join(''));
                break;

            case this.SortByFieldsMappingChangePer :
                sortProperties = ['pctChg'];
                sortedPropertyWidth = '15%';
                descColumnWidth = '45%';
                this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['sortby:', '%chg'].join(''));
                break;

            case this.SortByFieldsMappingChange :
                sortProperties = ['chg'];
                sortedPropertyWidth = '15%';
                descColumnWidth = '45%';
                this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['sortby:', 'chg'].join(''));
                break;

            case this.SortByFieldsMappingNumberOfTrades :
                sortProperties = ['trades'];
                sortedPropertyWidth = '15%';
                descColumnWidth = '45%';
                this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['sortby:', 'trades'].join(''));
                break;

            default :   // For SortByFieldsMappingTradedVolume
                this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.viewChanged, ['sortby:', 'volume'].join(''));
                break;
        }

        this.set('sortProperties', sortProperties);
        this.set('sortedPropertyWidth', sortedPropertyWidth);
        this.set('descColumnWidth', descColumnWidth);
    }.observes('selectedSortOrder'),

    sortedContent: function () {
        // Get sorted array
        // Please check local variable (sortProperties) to understand sort by property
        var sortedArray = this.get('arrangedContent');
        var selectedSortOrder = this.get('selectedSortOrder.val', 'selectedSortOrder.des');
        var filteredArray = [];
        var mainIndicesCount = 0;
        var that = this;

        // Filter only five elements of the collection
        Ember.$.each(sortedArray, function (index, indexObject) {
            var sortedProperty = that.utils.formatters.formatNumber(indexObject.vol, 0);

            switch (selectedSortOrder) {
                case that.SortByFieldsMappingTradedVolume :
                    sortedProperty = indexObject.vol > 0 ? that.utils.formatters.formatNumber(indexObject.vol, 0) : 0;
                    break;

                case that.SortByFieldsMappingTurnover :
                    sortedProperty = indexObject.tovr > 0 ? that.utils.formatters.formatNumber(indexObject.tovr, 2) : 0;
                    break;

                case that.SortByFieldsMappingChangePer :
                    sortedProperty = that.utils.formatters.formatNumberPercentage(indexObject.pctChg, 2);
                    break;

                case that.SortByFieldsMappingChange :
                    sortedProperty = that.utils.formatters.formatNumber(indexObject.chg, 2);
                    break;

                case that.SortByFieldsMappingNumberOfTrades :
                    sortedProperty = indexObject.trades > 0 ? that.utils.formatters.formatNumber(indexObject.trades, 0) : 0;
                    break;
            }

            // Ignore main indices
            if (indexObject.isMainIdx) {
                mainIndicesCount++;
                return true;
            }

            // Break the loop if max number of elements reached
            if (index >= (that.get('maxNumberOfElementsToShow') + mainIndicesCount)) {
                return false;
            }

            filteredArray.push(indexObject);

            indexObject.set('sortedProperty', sortedProperty);
            indexObject.set('isNegative', indexObject.pctChg < 0);
        }); // End loop

        return filteredArray;
    }.property('arrangedContent.@each.chg'),

    setWidgetForScreenMode: function () {
        var viewName = 'price/widgets/watch-list/index-watch-list';
        var watchListController = this.get('watchListController') || ControllerFactory.createController(this.container, 'controller:' + viewName);

        if (this.get('isFullScreenMode')) {
            watchListController.initializeWidget();
            var route = this.container.lookup('route:application');

            route.render(viewName, {
                into: 'price/widgets/sector-overview',
                outlet: 'wlWidgetOutlet',
                controller: watchListController
            });

            this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.maximize);
        } else {
            watchListController.closeWidget();
            this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.restore);
        }
    },

    toggleFullScreenMode: function () {
        this.set('isFullScreenMode', !this.get('isFullScreenMode'));
        var fullScreenContainer = document.getElementById('fullScreenContainer');
        var sectorOverviewContainer = document.getElementById('sectorOverviewContainer');
        this.setWidgetForScreenMode();

        if (!this.get('previousParent')) {
            this.set('previousParent', sectorOverviewContainer.parentElement);
            this.set('previousWatchListStyleAttribute', sectorOverviewContainer.getAttribute('style'));
            this.set('previousFullScreenContainerStyleAttribute', fullScreenContainer.getAttribute('style'));
            fullScreenContainer.appendChild(sectorOverviewContainer);
            sectorOverviewContainer.setAttribute('style', 'position: absolute; left: 0; top: 0; bottom: 0; right: 0;');
            fullScreenContainer.setAttribute('style', 'z-index:300; position: absolute; top: 0; width: 100%; height: 100%');

            var body = document.body;
            var html = document.documentElement;
            var height = Math.max(body.scrollHeight, body.offsetHeight,
                html.clientHeight, html.scrollHeight, html.offsetHeight);
            sectorOverviewContainer.setAttribute('style', 'height:' + (height) + 'px');
        } else {
            this.get('previousParent').appendChild(sectorOverviewContainer);
            sectorOverviewContainer.setAttribute('style', this.get('previousWatchListStyleAttribute'));
            fullScreenContainer.setAttribute('style', this.get('previousFullScreenContainerStyleAttribute'));
            this.set('previousParent', null);
        }
    },

    onLanguageChanged: function () {
        this.setLanguageParameters();
        this.bindData();
    },

    setLanguageParameters: function () {
        var sortBySelectBox = [
            {name: this.get('app').lang.labels.volume, val: '1'},
            {name: this.get('app').lang.labels.turnover, val: '2'},
            {name: this.get('app').lang.labels.perChange, val: '3'},
            {name: this.get('app').lang.labels.change, val: '4'},
            {name: this.get('app').lang.labels.trades, val: '5'}
        ];

        this.set('sortBySelectBox', sortBySelectBox);

        var defaultSelected = sortBySelectBox[0];
        defaultSelected.selectedDesc = defaultSelected.name;
        this.set('defaultCriteria', defaultSelected);
    },

    actions: {
        toggleSectorOverview: function () {
            this.toggleFullScreenMode();
        },

        onSortChanged: function (item) {
            this.set('selectedSortOrder', item);
            this.sortOrderChanged();
        }
    }
});

Ember.Handlebars.helper('bootstrap-dropdown-select', BootstrapDropdownSelect);
