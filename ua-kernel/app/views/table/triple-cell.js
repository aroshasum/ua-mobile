import Ember from 'ember';
import TableCell from 'ember-table/views/table-cell';
import blinkMixin from './table-mixins/blink-mixin';
import conditionMixin from './table-mixins/condition-mixin';
import formatterMixin from './table-mixins/formatter-mixin';
import utils from '../../utils/utils';
import styleMixin from './table-mixins/style-mixin';
import sharedService from '../../models/shared/shared-service';
import languageDataStore from '../../models/shared/language/language-data-store';

export default TableCell.extend(blinkMixin, conditionMixin, formatterMixin, styleMixin, {
    templateName: 'table/views/triple-cell',

    initializeCell: function () {
        this.set('app', languageDataStore.getLanguageObj());
    }.on('didInsertElement'),

    firstValue: function () {
        return this.get('cellContent') ? this.get('cellContent').firstValue : undefined;
    }.property('cellContent'),

    columnId: function () {
        return this.get('column.contentPath');
    }.property(),

    secondValue: function () {
        return this.get('cellContent') ? this.get('cellContent').secondValue : undefined;
    }.property('cellContent'),

    formattedThirdValue: Ember.computed(function () {
        var thirdValue = this.get('cellContent') ? this.get('cellContent').thirdValue : undefined;
        var date = utils.formatters.convertStringToDate(thirdValue);
        var displayDate = utils.formatters.convertToDisplayTimeFormat(date, 'DD-MM-YYYY');

        return displayDate;
    }).property('cellContent'),

    styleThirdValue: Ember.computed(function () {
        return this.get('column.thirdValueStyle') ? this.get('column.thirdValueStyle') : '';
    }).property('formattedThirdValue'),

    _getFormattedValue: function (value) {
        var decimalPlaces = this.get('column.noOfDecimalPlaces');
        return utils.formatters.formatNumber(value, decimalPlaces || decimalPlaces === 0 ? decimalPlaces : sharedService.userSettings.displayFormat.decimalPlaces);
    }
});

