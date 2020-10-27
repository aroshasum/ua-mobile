import Ember from 'ember';
import BaseController from '../../base-controller';
import responsiveHandler from '../../../helpers/responsive-handler';

export default BaseController.extend({

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
            controller.set('marketRows', 'rows-scroll');
        } else {
            controller.set('marketRows', '');
        }
    }
});