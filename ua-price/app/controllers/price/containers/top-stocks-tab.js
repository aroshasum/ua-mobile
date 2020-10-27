import Ember from 'ember';
import BaseWidgetContainer from '../../base-widget-container';
import responsiveHandler from '../../../helpers/responsive-handler';

export default BaseWidgetContainer.extend({
    topStocksRows: '',
    topStockRow: 'top-stock-row',

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

        if (responsiveArgs.responsiveLevel >= 1) {
            controller.set('topStocksRows', 'overflow-auto');
            controller.set('topStock', 'top-stock-row');
            controller.set('topStockRow', '');
        } else {
            controller.set('topStocksRows', '');
            controller.set('topStock', '');
            controller.set('topStockRow', 'top-stock-row');
        }
    }
});
