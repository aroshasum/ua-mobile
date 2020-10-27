import Ember from 'ember';
import DualCell from '../dual-cells/dual-cell';

export default DualCell.extend({
    templateName: 'table/views/alert/alert-symbol-cell',

    firstValue: Ember.computed(function () {
        return this.get('row') && this.get('row.dispProp1') ? this.get('row.dispProp1') : this.get('row.sym');
    }).property('row.sym'),

    styleFirstValue: Ember.computed(function () {
        return this.get('column.firstValueStyle') ? this.get('column.firstValueStyle') : '';
    }).property('firstValue'),

    secondValue: Ember.computed(function () {
        return (this.get('row') && this.get('row.sDes')) ? this.get('row.sDes') : undefined;
    }).property('row.sym', 'row.symbolInfo.sDes'),

    styleSecondValue: Ember.computed(function () {
        return this.get('column.secondValueStyle') ? this.get('column.secondValueStyle') : '';
    }).property('secondValue')
});