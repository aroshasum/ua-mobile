import Ember from 'ember';
import utils from '../utils/utils';

export default Ember.Component.extend({
    layoutName: 'range-slider',

    afterRender: function () {
        var that = this;

        Ember.$('#' + this.get('id')).ionRangeSlider({
            type: 'double',
            min: this.get('minVal'),
            max: this.get('maxVal'),
            from: this.get('fromVal'),
            to: this.get('toVal'),
            block: true,
            step: 0.001,
            keyboard: true,
            /*eslint-disable */
            force_edges: true,
            prettify_enabled: true, // ion-slider library property
            /*eslint-enable */
            prettify: function (num) {
                return utils.formatters.divideNumber(num, 2);
            },
            onChange: function (data) {
                that.onSliderChange(data);
            }
        });

        var sliderInstance = Ember.$('#' + this.get('id')).data('ionRangeSlider');
        this.set('slider', sliderInstance);
    }.on('didInsertElement'),

    onSliderUpdate: function () {
        var slider = this.get('slider');

        slider.update({
            type: 'double',
            min: this.get('minVal'),
            max: this.get('maxVal'),
            from: this.get('fromVal'),
            to: this.get('toVal'),
            block: this.get('minVal') === this.get('maxVal'),
            step: 0.001,
            keyboard: true,
            /*eslint-disable */
            force_edges: true,
            prettify_enabled: true, // ion-slider library property
            /*eslint-enable */
            prettify: function (num) {
                return utils.formatters.divideNumber(num, 2);
            }
        });
    }.observes('minVal', 'maxVal', 'isReset'),

    onSliderChange: function (data) {
        this.set('minVal', data.min);
        this.set('maxVal', data.max);
        this.set('fromVal', data.from);
        this.set('toVal', data.to);
    }
});