import Ember from 'ember';

export default Ember.Mixin.create({
    previousCellValue: -1,
    currentBoundValue: null,

    clearStyles: Ember.computed(function () {
        var that = this;

        try {
            if (this.get('cellContent') && this.get('cellContent').firstValue !== undefined) {
                Ember.run.later(function () {
                    if (!(that.get('isDestroyed') || that.get('isDestroying'))) {
                        that.set('currentBoundValue', -1);
                    }
                }, 1000);
            }
        } catch (e) {
            return null;
        }

        return null;
    }).property('cellContent'),

    valueWillChange: (function () {
        this.set('previousCellValue', this.get('cellContent') ? this.get('cellContent').firstValue : undefined);
    }).observesBefore('cellContent'),

    blinkStyle: Ember.computed(function () {
        var preVal, currentVal, cellStyle;
        preVal = this.get('previousCellValue');
        currentVal = this.get('cellContent') ? this.get('cellContent').firstValue : undefined;

        if (typeof preVal === 'string') {
            // Since updating only Numeric values, parse to float makes comparison perfect
            preVal = parseFloat(preVal);
        }

        if (typeof currentVal === 'string') {
            currentVal = parseFloat(currentVal);
        }

        if (this.get('column.isBlink') && preVal !== undefined && currentVal !== undefined && currentVal !== -1 && preVal !== -1) {
            if (this.get('currentBoundValue') === -1) {
                cellStyle = '';
            } else if (preVal > currentVal) {
                cellStyle = this.get('column.blinkDownStyle') ? this.get('column.blinkDownStyle') : 'blink-classic-down';
            } else if (preVal < currentVal) {
                cellStyle = this.get('column.blinkUpStyle') ? this.get('column.blinkUpStyle') : 'blink-classic-up';
            }
        }

        this.set('currentBoundValue', 0);

        return cellStyle;
    }).property('cellContent', 'currentBoundValue')
});

