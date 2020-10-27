import Ember from 'ember';
import TableController from '../../../../controllers/shared/table-controller';
import sharedService from '../../../../models/shared/shared-service';
import priceWidgetConfig from '../../../../config/price-widget-config';
import AppEvents from '../../../../app-events';

// Cell Views
import HeaderCell from '../../../../views/table/dual-cells/header-cell';
import Cell from '../../../../views/table/cell';
import DualChangeCell from '../../../../views/table/dual-cells/dual-change-cell';
import DualTextCell from '../../../../views/table/dual-cells/dual-text-cell';
import UpDownCell from '../../../../views/table/up-down-cell';
import TableRow from '../../../../views/table/table-row';

export default TableController.extend({
    textFilter: null,
    priceService: sharedService.getService('price'),
    exchange: sharedService.getService('price').exchangeDS.getExchange(sharedService.userSettings.price.currentExchange),
    columnDeclarations: [],
    wkey: 'right-wl',    // TODO [arosha] remove this when 'wkey' is implemented to right panel

    onLoadWidget: function () {
        this.setCellViewsScopeToGlobal();
        this.set('columnDeclarations', priceWidgetConfig.watchList.quoteColumns);

        // TODO [AROSHA] Move this Scroll enable method to global.
        Ember.run.later(function () {
            Ember.$('.nano').nanoScroller();
        }, 200);
    },

    onPrepareData: function () {
        var exchange = this.get('exchange').exg;
        this.priceService.addFullMarketIndexRequest(exchange);
        this.loadContent();
    },

    onClearData: function () {
        var exchange = this.get('exchange').exg;
        this.priceService.removeFullMarketIndexRequest(exchange);
        this.set('content', Ember.A());
        this.set('masterContent', Ember.A());
    },

    onUnloadWidget: function () {
        this.set('columnDeclarations', []);
    },

    onLanguageChanged: function () {
        this.set('columnDeclarations', []);
        this.onLoadWidget();
    },

    loadContent: function () {
        var exchange = this.get('exchange').exg;
        var stocksOfExg = this.priceService.stockDS.get('indexMapByExg');

        this.set('content', stocksOfExg[exchange]);
        this.set('masterContent', stocksOfExg[exchange]);
    },

    checkFilterMatch: function checkFilterMatch(stock, textFilter) {
        var field;
        var isMatchedTextFilter = !textFilter;  // If a argument is false, that means that filter is not applied

        if (!isMatchedTextFilter) {
            for (field in stock) {
                if (stock.hasOwnProperty(field) && (field === 'dSym' || field === 'sym' || field === 'sDes' || field === 'lDes') && stock[field] && stock[field].toString().slice(0, textFilter.length).toLowerCase() === textFilter.toLowerCase()) {
                    isMatchedTextFilter = true;
                }
            }
        }

        return isMatchedTextFilter;
    },

    filterStocks: (function () {
        var filteredStocks = this.get('masterContent').filter((function (that) {    //eslint-disable-line
            return function (stock) {
                var textFilter = that.utils.validators.isAvailable(that.get('textFilter')) ? that.get('textFilter') : false;  // If any filter is false, that means that filter is not applied

                if (textFilter) {
                    return that.checkFilterMatch(stock, textFilter);
                } else {
                    return true;
                }

            };
        })(this));

        this.set('content', filteredStocks);
    }).observes('textFilter', 'masterContent.@each'),

    setCellViewsScopeToGlobal: function () {
        Ember.HeaderCell = HeaderCell;
        Ember.Cell = Cell;
        Ember.DualChangeCell = DualChangeCell;
        Ember.DualTextCell = DualTextCell;
        Ember.UpDownCell = UpDownCell;
        Ember.TableRow = TableRow;
    },

    cellViewsForColumns: {
        dualText: 'Ember.DualTextCell',
        upDown: 'Ember.UpDownCell',
        dualChange: 'Ember.DualChangeCell'
    },

    actions: {
        setLink: function (option) {
            this.set('selectedLink', option.code);
        },

        triggerSymbolChange: function (selectedRow) {
            var rowData = selectedRow.getProperties('exg', 'sym', 'inst');

            if (rowData) {
                AppEvents.onSymbolChanged(rowData.sym, rowData.exg, rowData.inst, this.get('selectedLink'));
                this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.rowClick, ['sym:', rowData.sym, '~', rowData.exg].join(''));

                // Limit filter event trigger only while searching and clicking a row
                if (this.get('textFilter') && this.get('textFilter') !== '') {
                    this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.search, ['filter:', this.get('textFilter')].join(''));
                }
            }
        }
    }
});
