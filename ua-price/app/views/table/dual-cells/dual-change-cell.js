import Ember from 'ember';
import DualCell from './dual-cell';

export default DualCell.extend({
    templateName: 'table/views/dual_change-cell',

    formattedSecondValue: Ember.computed(function () {      // Override formattedSecondValue to add different format
        return this.addPercentageFormat(this.get('cellContent') ? this.get('cellContent').secondValue : undefined, 2);
    }).property('cellContent'),

    styleFirstValue: Ember.computed(function () {
        return this.getPositiveNegativeStyle(this.get('firstValue'), this.get('column.positiveStyle'), this.get('column.negativeStyle'), this.get('column.zeroStyle'));
    }).property('firstValue'),

    styleSecondValue: Ember.computed(function () {
        return this.getPositiveNegativeStyle(this.get('secondValue'), 'up-fore-color', 'down-fore-color');
    }).property('secondValue')
});

