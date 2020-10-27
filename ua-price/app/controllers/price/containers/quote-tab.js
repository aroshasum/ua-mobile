import Ember from 'ember';
import BaseWidgetContainer from '../../base-widget-container';
import responsiveHandler from '../../../helpers/responsive-handler';

export default BaseWidgetContainer.extend({
    quoteRowOne: 'quote-row-2',
    quoteRowTwo: 'quote-row-3',
    quoteRows: '',
    quoteWidget: '',

    onAfterRender: function () {
        this.initializeResponsive();
    },

    initializeResponsive: function () {
        this.set('responsive', responsiveHandler.create({controller: this, widgetId: 'appTitle', callback: this.onResponsive}));
        this.responsive.addList('appTitle', [{id: 'appTitle', width: 991}]);

        this.responsive.initialize();
    },

    onResponsive: function (responsiveArgs) {
        var controller = responsiveArgs.controller;

        Ember.run.later(function () {
            controller.setResponsive(responsiveArgs);
        }, 1);
    },

    setResponsive: function (responsiveArgs) {
        var controller = responsiveArgs.controller;

        if (responsiveArgs.responsiveLevel === 1) {
            controller.set('disableQuoteWL', true);
            controller.set('quoteRows', 'rows-scroll');
            controller.set('quoteRowOne', '');
            controller.set('quoteRowTwo', '');
            controller.set('quoteWidget', 'quote-row-2-responsive');
        } else {
            controller.set('disableQuoteWL', false);
            controller.set('quoteRows', '');
            controller.set('quoteRowOne', 'quote-row-2');
            controller.set('quoteRowTwo', 'quote-row-3');
            controller.set('quoteWidget', '');
        }
    }
});