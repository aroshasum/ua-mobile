import DualCell from './dual-cell';

export default DualCell.extend({
    templateName: 'table/views/progress-cell',
    previousValue: 0,

    calculateCash: (function () {
        var value;
        var cashIn = this.get('firstValue');
        var cashOut = this.get('secondValue');

        if (cashIn && cashOut && cashIn + cashOut) {
            value = cashIn / (cashIn + cashOut);
        }

        return isNaN(value) ? 0 : value * 100;
    }).property('cellContent'),

    showValue: (function () {
        return this.addPercentageFormat(this.get('calculateCash'), 2);
    }).property('cellContent'),

    contentUpdate: (function () {
        if (Math.abs(this.get('calculateCash') - this.get('previousValue')) > 2) {
            this.set('previousValue', this.get('calculateCash'));
        }
    }).observes('calculateCash'),

    styles: (function () {
        var progress = parseInt(this.get('previousValue'), 10);
        return 'width:' + progress + '%;';  // Used inline styles since width is dynamically and changed rapidly
    }).property('previousValue')
});

