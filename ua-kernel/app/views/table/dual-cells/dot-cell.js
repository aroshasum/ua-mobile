import DualCell from './dual-cell';

export default DualCell.extend({
    templateName: 'table/views/dot-cell',

    position: (function () {
        if (this.get('cellContent')) {
            var values = this.get('cellContent');
            var lowValue = values.firstValue;
            var highValue = values.secondValue;
            var currentValue = values.thirdValue;
            var position = 0;

            if (highValue - lowValue !== 0) {
                position = parseInt((currentValue - lowValue) / (highValue - lowValue) * 100, 10);
            }

            if (position > 0 && position <= 100) {
                return position;
            } else {
                return 0;
            }
        } else {
            return 0;
        }
    }).property('cellContent'),

    progressDotStyle: (function () {
        var position = this.get('position');
        var colorChangePosition = 50;      // percentage width of progress dot. local variable

        if (position < colorChangePosition) {
            return 'dot-style-low';
        } else if (position === colorChangePosition || position > colorChangePosition) {
            return 'dot-style-high';
        }
    }).property('position'),

    styles: (function () {
        return 'width:' + this.get('position') + '%;';  // Used inline styles since width is dynamically and changed rapidly
    }).property('position')
});
