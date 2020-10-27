import Ember from 'ember';
import sharedService from '../models/shared/shared-service';

export default Ember.Component.extend({
    layoutName: 'components/right-panel-collapse',
    isCollapseShow: false,
    classNames: ['full-height'],

    initializeCollapse: function () {
        var layoutConfig = sharedService.getService('sharedUI').getService('appLayoutConfig');
        this.set('tabArray', layoutConfig.layout.rightPanel.content);
        this.set('collapseOverlay', Ember.$('#collapseOverlay'));

        var resizeEventHandler = this.onResize.bind(this);
        window.addEventListener('resize', resizeEventHandler);
    }.on('didInsertElement'),

    onResize: function () {
        if (this.get('isCollapseShow')) {
            this.closeCollapse();
        }
    },

    closeCollapse: function () {
        var rightPanelCollapse = Ember.$('#collapseContent');
        var rightPanel = Ember.$('#rightPanelWidget');
        var rightPanelContainer = Ember.$('#rightPanelContainer');

        var innerScroll = Ember.$('.antiscroll-inner');
        innerScroll.scrollTop(0);

        rightPanel.appendTo(rightPanelContainer);

        rightPanelCollapse.css({'display': 'none'});
        rightPanel.removeClass('position-show');
        rightPanel.addClass('position-hide');

        this.collapseOverlay.css({'display': 'none'});
        this.set('isCollapseShow', false);
    },

    actions: {
        clickTab: function (tab) {
            this.tabContent = tab;

            var rightPanelCollapse = Ember.$('#collapseContent');
            var rightPanel = Ember.$('#rightPanelWidget');

            rightPanelCollapse.css({'display': 'block'});
            this.collapseOverlay.css({'display': 'block'});

            rightPanel.removeClass('position-hide');
            rightPanel.addClass('position-show');
            rightPanel.appendTo(rightPanelCollapse);

            this.set('isCollapseShow', true);

            sharedService.getService('sharedUI').getService('rightPanel').renderRightPanelView(tab, {isUserClick: true});
        },

        closeCollapse: function () {
            this.closeCollapse();
        }
    }
});