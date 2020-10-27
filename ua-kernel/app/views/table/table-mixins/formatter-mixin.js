import Ember from 'ember';
import sharedService from '../../../models/shared/shared-service';
import utils from '../../../utils/utils';

export default Ember.Mixin.create({
    addFormat: function addFormat(currentValue, isSecondValue, decimalPlaces) {
        var dataType = this.get('column.dataType');
        var value = currentValue;

        if ((value || value === 0) && dataType) {
            // TODO [AROSHA] Use common formatter for int/float formatting
            switch (dataType) {
                case 'int':
                    value = utils.formatters.formatNumber(value, 0);

                    break;

                case 'float':
                    var decimals = isSecondValue ? this.get('column.noOfSecValueDecimalPlaces') : this.get('column.noOfDecimalPlaces');

                    decimals = !isNaN(decimals) ? decimals : !isNaN(this.get('row.' + decimals)) ? this.get('row.' + decimals) : !isNaN(decimalPlaces) ? decimalPlaces : sharedService.userSettings.displayFormat.decimalPlaces;
                    value = utils.formatters.formatNumber(value, decimals);

                    break;

                case 'date':
                    if (value.length >= 8) { // Formatted first value as Date second value as Time
                        value = utils.formatters.formatToDate(value);
                    }

                    break;

                case 'time':
                    if (isSecondValue && value.length >= 8) {    // Date  // TODO [AROSHA] remove checker to already formatted time - dual cell
                        value = utils.formatters.formatToDate(value);
                    }

                    break;

                case 'dateTime':
                    if (value.length >= 14) {
                        value = utils.formatters.formatToDateTime(value);
                    }

                    break;
            }
        }

        return value;
    },

    addPercentageFormat: function (value, decimalPlaces) {
        return utils.formatters.formatNumberPercentage(value, !isNaN(decimalPlaces) ? decimalPlaces : sharedService.userSettings.displayFormat.decimalPlaces);
    },

    formattedFirstValue: Ember.computed(function () {
        return this.addFormat(this.get('cellContent') ? this.get('cellContent').firstValue : undefined, false, this.get('row') && !isNaN(this.get('row.deci')) ? this.get('row.deci') : sharedService.userSettings.displayFormat.decimalPlaces);
    }).property('cellContent'),

    formattedSecondValue: Ember.computed(function () {
        return this.addFormat(this.get('cellContent') ? this.get('cellContent').secondValue : undefined, true, this.get('row') && !isNaN(this.get('row.deci')) ? this.get('row.deci') : sharedService.userSettings.displayFormat.decimalPlaces);
    }).property('cellContent')
});

