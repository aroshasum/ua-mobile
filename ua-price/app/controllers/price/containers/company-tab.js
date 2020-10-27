import Ember from 'ember';
import BaseWidgetContainer from '../../base-widget-container';
import responsiveHandler from '../../../helpers/responsive-handler';

export default BaseWidgetContainer.extend({
    onAfterRender: function () {
        Ember.$('.nano').nanoScroller();
        this.initializeResponsive();
    },

    initializeResponsive: function () {
        this.set('responsive', responsiveHandler.create({controller: this, widgetId: 'companyProfile', callback: this.onResponsive}));
        this.responsive.addList('company-profile', [
            {id: 'company-profile', width: 880}
        ]);

        this.responsive.initialize();
    },

    onResponsive: function () {
        Ember.run.later(function () {
            Ember.$('.nano').nanoScroller();
        }, 1);
    }
});