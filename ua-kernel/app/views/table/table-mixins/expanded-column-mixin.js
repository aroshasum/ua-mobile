import Ember from 'ember';

export default Ember.Mixin.create({
    isExpandedView: function () {
        return this.get('controller').isExpandedView;
    }.property('controller.isExpandedView'),

    setColumnWidth: function () {
        if (this.get('column.expandedWidthRatio') && this.get('column.defaultWidthRatio')) {
            var isExpandedEnabled = this.get('controller').isExpandedView;
            var fullWidth = Ember.$(window).width();
            var contentWidth = fullWidth - fullWidth * 3 / 40; // Content area is 3/40 less than full width
            var newWidth = isExpandedEnabled ? contentWidth * this.get('column.expandedWidthRatio') : contentWidth * this.get('column.defaultWidthRatio');

            this.get('column').set('width', newWidth);
        }
    }.observes('controller.isExpandedView')
});