import DualCell from './dual-cells/dual-cell';

export default DualCell.extend({
    templateName: 'table/views/up-down-cell',

    isActive: (function () {  // TODO [AROSHA] Consider this at hds to enable disable arrows
        return this.isPositive(this.get('cellContent') ? this.get('cellContent').firstValue : undefined);
    }).property('cellContent'),

    changedValue: function () {
        return this.get('cellContent') ? this.get('cellContent').thirdValue : undefined;
    }.property('cellContent'),

    isIncreased: (function () {
        return this.isPositive(this.get('changedValue'));
    }).property('changedValue'),

    isSame: (function () {
        return this.isZero(this.get('changedValue'));
    }).property('changedValue')
});
