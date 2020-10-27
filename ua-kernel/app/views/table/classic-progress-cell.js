import Ember from 'ember';
import ProgressCell from './dual-cells/progress-cell';

export default ProgressCell.extend({
    templateName: 'table/views/classic-progress-cell',

    styleFirstValue: Ember.computed(function () {
        var value = this.get('calculateCash');
        return value >= 50 ? 'up-fore-color' : this.isZero(value) ? 'fade-fore-color' : 'down-fore-color';
    }).property('cellContent', 'blinkStyle')
});

