import Ember from 'ember';
import DualCell from './dual-cell';

export default DualCell.extend({
    templateName: 'table/views/dual_change-cell',

    formattedFirstValue: Ember.computed(function () {      // Override formattedSecondValue to add different format.
        return this.addPercentageFormat(this.get('cellContent') ? this.get('cellContent').firstValue : undefined);
    }).property('cellContent'),

    styleFirstValue: Ember.computed(function () {
        return this.getPositiveNegativeStyle(this.get('firstValue'));
    }).property('firstValue'),

    styleSecondValue: Ember.computed(function () {
        return this.getPositiveNegativeStyle(this.get('secondValue'), 'up-fore-color', 'down-fore-color', 'fore-color');
    }).property('secondValue')
});
