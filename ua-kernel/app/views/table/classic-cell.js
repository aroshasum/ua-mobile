import Cell from './cell';
import fieldMetaConfig from '../../config/field-meta-config';
import sharedService from '../../models/shared/shared-service';

export default Cell.extend({
    templateName: 'table/views/classic-cell',

    formattedFirstValue: function () {
        var isDefaultValueCheck = this.get('column') ? this.get('column').isDefaultValueCheck : false;
        var isFieldConfigAvailable = this.get('column') ? this.get('column').isFieldConfigAvailable : false;
        var firstValue = this.get('cellContent') ? this.get('cellContent').firstValue : undefined;
        var configDecimalPlaces = '';

        if (isDefaultValueCheck) {
            var defaultValue = this.get('column') ? this.get('column').defaultValue : undefined;

            if (firstValue === defaultValue) {
                return sharedService.userSettings.displayFormat.noValue;
            }
        }

        if (isFieldConfigAvailable) {
            var multiFactors = fieldMetaConfig.multiFactors;
            var exchange = this.get('row.exg') ? this.get('row.exg') : sharedService.userSettings.price.defaultExchange;

            if (exchange && multiFactors) {
                var exchangeFieldMeta = multiFactors[exchange];

                if (exchangeFieldMeta && exchangeFieldMeta.decimalPlaces) {
                    configDecimalPlaces = exchangeFieldMeta.decimalPlaces;
                }
            }
        }

        return this.addFormat(firstValue, false, this.get('controller') && !isNaN(this.get('controller.decimalPlaces')) ? this.get('controller.decimalPlaces') : configDecimalPlaces ? configDecimalPlaces : sharedService.userSettings.displayFormat.decimalPlaces);
    }.property('cellContent')
});