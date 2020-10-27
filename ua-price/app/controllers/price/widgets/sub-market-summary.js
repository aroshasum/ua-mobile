import Ember from 'ember';
import SubMarketOverview from './sub-market-overview';
import priceWidgetConfig from '../../../config/price-widget-config';
import appEvents from '../../../app-events';

// Cell Views
import HeaderCell from '../../../views/table/dual-cells/header-cell';
import Cell from '../../../views/table/cell';
import ClassicCell from '../../../views/table/classic-cell';
import TableRow from '../../../views/table/table-row';
import DualCell from '../../../views/table/dual-cells/dual-cell';

export default SubMarketOverview.extend({
    defaultColumnIds: priceWidgetConfig.subMarketSummary.defaultColumnIds,
    rowHeight: priceWidgetConfig.subMarketSummary.tableParams.RowHeight,
    minHeaderHeight: priceWidgetConfig.subMarketSummary.tableParams.MinHeaderHeight,
    hideWidgetLink: true,
    isShowTitle: true,

    onLoadWidget: function () {
        this.setCellViewsScopeToGlobal();
        this.set('title', this.get('app').lang.labels.subMarket);
        this.set('isShowTitle', !this.get('hideTitle'));
        this.setTitle();
        this.set('defaultColumnMapping', priceWidgetConfig.subMarketSummary.defaultColumnMapping);
        appEvents.subscribeExchangeChanged(this.get('selectedLink'), this.get('wkey'), this);

        this.setDefaultColumns();
        this.setDefaultColumnDeclarations();
    },

    onPrepareData: function () {
        this._super();
        this.loadContent();
    },

    loadContent: function () {
        var subMarketArray = this.get('subMarketArray');

        this.set('content', subMarketArray);
        this.set('masterContent', subMarketArray);
    },

    onClearData: function () {
        this._super();

        this.set('content', Ember.A());
        this.set('masterContent', Ember.A());
    },

    cellViewsForColumns: {
        cell: 'Ember.Cell',
        classicCell: 'Ember.ClassicCell',
        dual: 'Ember.DualCell'
    },

    setCellViewsScopeToGlobal: function () {
        Ember.HeaderCell = HeaderCell;
        Ember.Cell = Cell;
        Ember.ClassicCell = ClassicCell;
        Ember.TableRow = TableRow;
        Ember.DualCell = DualCell;
    },

    onLanguageChanged: function () {
        this.setTitle();
        this.setDefaultColumns();
        this.setDefaultColumnDeclarations();
        this.toggleProperty('isRefreshed');
    },

    setTitle: function () {
        this.set('title', this.get('app').lang.labels.subMarket);
    },

    actions: {
        sort: function (column) {
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
        }
    }
});