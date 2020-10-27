import Ember from 'ember';
import TableController from '../../../../controllers/shared/table-controller';
import sharedService from '../../../../models/shared/shared-service';
import priceWidgetConfig from '../../../../config/price-widget-config';

// Cell Views
import Cell from '../../../../views/table/cell';
import ClassicHeaderCell from '../../../../views/table/classic-header-cell';
import ClassicCell from '../../../../views/table/classic-cell';
import ClassicProgressCell from '../../../../views/table/classic-progress-cell';
import ChangeCell from '../../../../views/table/change-cell';
import UpDownCell from '../../../../views/table/up-down-cell';
import DualTextCell from '../../../../views/table/dual-cells/dual-text-cell';

export default TableController.extend({
    exchange: sharedService.getService('price').exchangeDS.getExchange(sharedService.userSettings.price.currentExchange),
    rowHeight: priceWidgetConfig.watchList.tableParams.MinHeaderHeight.classic,
    headerHeight: priceWidgetConfig.watchList.tableParams.RowHeight.classic,

    onLoadWidget: function () {
        this.setDefaultColumns();
        this.setCellViewsScopeToGlobal();
    },

    onPrepareData: function () {
        this.loadContent();
    },

    onClearData: function () {
        this.set('content', Ember.A());
    },

    onUnloadWidget: function () {
        this.set('columnDeclarations', []);
    },

    loadContent: function () {
        var exchange = this.get('exchange').exg;
        var store = sharedService.getService('price').stockDS.get('indexMapByExg');
        this.set('content', store[exchange]);
    },

    setDefaultColumns: function () {
        this.set('columnDeclarations', this.columnDefinitionsByMap(priceWidgetConfig.watchList.classicColumnMapping, priceWidgetConfig.watchList.indexTableColumnIds));
    },

    setCellViewsScopeToGlobal: function () {
        Ember.ClassicHeaderCell = ClassicHeaderCell;
        Ember.Cell = Cell;
        Ember.ClassicCell = ClassicCell;
        Ember.ClassicProgressCell = ClassicProgressCell;
        Ember.ChangeCell = ChangeCell;
        Ember.UpDownCell = UpDownCell;
        Ember.DualTextCell = DualTextCell;
    },

    cellViewsForColumns: {
        classicCell: 'Ember.ClassicCell',
        classicProgressCell: 'Ember.ClassicProgressCell',
        changeCell: 'Ember.ChangeCell',
        upDown: 'Ember.UpDownCell',
        dualText: 'Ember.DualTextCell'
    }
});
