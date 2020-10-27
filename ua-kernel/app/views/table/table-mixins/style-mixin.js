import Ember from 'ember';

export default Ember.Mixin.create({
    positiveNegativeStyle: Ember.computed(function () {
        return this.getPositiveNegativeStyle();
    }).property('cellContent'),

    getPositiveNegativeStyle: function (currentValue, positiveStyle, negativeStyle, zeroStyle) {
        var value = currentValue ? currentValue : this.get('cellContent') ? this.get('cellContent').firstValue : undefined;
        return this.isPositive(value) ? (positiveStyle ? positiveStyle : 'up-fore-color') : (this.isZero(value) ? (zeroStyle ? zeroStyle : 'fade-fore-color') : (negativeStyle ? negativeStyle : 'down-fore-color'));
    },

    styles: Ember.computed(function () {
        var cellStyle = [];

        if (Ember.appGlobal.isSortingProgress) {
            return this.get('column.cellStyle') ? this.get('column.cellStyle') : this.get('column.firstValueStyle');
        }

        this.get('clearStyles');

        if (this.get('blinkStyle') && this.get('column.isBlink')) {
            cellStyle[cellStyle.length] = this.get('blinkStyle');
        }

        if (this.get('column.cellStyle')) {
            cellStyle[cellStyle.length] = this.get('column.cellStyle');
        }

        if (this.get('column.positiveNegativeChange')) {
            cellStyle[cellStyle.length] = this.get('positiveNegativeStyle');
        }

        return cellStyle.join(' ');
    }).property('cellContent', 'blinkStyle'),

    styleFirstValue: Ember.computed(function () {
        return this.get('column.firstValueStyle') && !this.get('blinkStyle') ? this.get('column.firstValueStyle') : '';
    }).property('cellContent', 'blinkStyle'),

    styleSecondValue: Ember.computed(function () {
        return this.get('column.secondValueStyle') ? this.get('column.secondValueStyle') : '';
    }).property('cellContent'),  // Second value is not required to blink so blinkStyle is not observed

    styleBackground: Ember.computed(function () {
        return this.get('column.backgroundStyle') ? this.get('column.backgroundStyle') : '';
    }).property()
});

