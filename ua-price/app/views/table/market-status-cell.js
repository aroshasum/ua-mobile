import TableCell from 'ember-table/views/table-cell';
import styleMixin from './table-mixins/style-mixin';
import PriceConstants from '../../models/price/price-constants';

export default TableCell.extend(styleMixin, {
    templateName: 'table/views/market-status-cell',

    firstValue: function () {
        return this.get('cellContent') ? this.get('cellContent').firstValue : undefined;
    }.property('cellContent'),

    secondValue: function () {
        return this.get('cellContent') ? this.get('cellContent').secondValue : undefined;
    }.property('cellContent'),

    firstValueStyle: (function () {
        if (this.get('secondValue') === PriceConstants.MarketStatus.Close || this.get('secondValue') === PriceConstants.MarketStatus.PreClose) {
            return 'down-fore-color bold';
        } else {
            return 'up-fore-color bold';
        }
    }).property('cellContent')
});

