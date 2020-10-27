import TableRow from 'ember-table/views/table-row';
import appConfig from '../../config/app-config';
import priceWidgetConfig from '../../config/price-widget-config';

export default TableRow.extend({
    classNameBindings: [],

    setClassNameBindings: function () {
        var rowConfig;
        var wlFormatting = priceWidgetConfig.watchList.tableParams.isDisabledWlConditionalFormatting;
        var is52WkLow = 'row.is52WeekLow:watchlist-row-back-red';
        var is52WkHigh = 'row.is52WeekHigh:watchlist-row-back-green';
        var isTodaysLow = 'row.isTodaysLow:watchlist-row-back-red';
        var isTodaysHigh = 'row.isTodaysHigh:watchlist-row-back-green';

        if (wlFormatting) {
            is52WkLow = '';
            is52WkHigh = '';
            isTodaysLow = '';
            isTodaysHigh = '';
        }

        if (appConfig.customisation.isMobile) {
            rowConfig = ['row.isHovered:ember-table-hover', 'row.isSelected:ember-table-selected', 'row.rowStyle', 'isLastRow:ember-table-last-row',
                'row.isOddRow:panel-table-row-odd:panel-table-row-even', 'row.isEmptyRow:display-none'];
        } else {
            rowConfig = ['row.isHovered:ember-table-hover', 'row.isSelected:ember-table-selected', 'row.rowStyle', 'isLastRow:ember-table-last-row',
                'row.isOddRow:panel-table-row-odd:panel-table-row-even', is52WkLow, is52WkHigh, 'row.isSymSuspended:watchlist-row-strike', isTodaysLow,
                isTodaysHigh, 'row.isEmptyRow:display-none'];
        }

        this.set('classNameBindings', rowConfig);
    }.on('init')
});
