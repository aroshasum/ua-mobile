import Ember from 'ember';
import BaseArrayController from '../../base-array-controller';
import priceWidgetConfig from '../../../config/price-widget-config';
import sharedService from '../../../models/shared/shared-service';
import appConfig from '../../../config/app-config';

export default BaseArrayController.extend({
    isFullScreenWL: false,
    comp: undefined,
    isTablet: appConfig.customisation.isTablet,

    dimensions: {
        w: 3,
        h: 17
    },

    indexArrowCssUp: 'glyphicon glyphicon-triangle-top up-fore-color',
    indexArrowCssDown: 'glyphicon glyphicon-triangle-bottom down-fore-color',
    priceService: sharedService.getService('price'),
    gmsContent: sharedService.getService('price').stockDS.get('commoditiesCollection'),

    onAddSubscription: function () {
        var gms = this.get('gms');
        this.updateCommodities(gms ? gms : priceWidgetConfig.gms);
        this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.show, ['exg:', this.get('exg')].join(''));
    },

    updateCommodities: function (gms) {
        var symArray = [];
        var that = this;

        Ember.$.each(gms, function (key, gmsObj) {
            symArray[symArray.length] = gmsObj;

            that.priceService.stockDS.getCommodity(gmsObj.exg, gmsObj.sym);
            that.priceService.addSymbolRequest(gmsObj.exg, gmsObj.sym, gmsObj.inst);
        });

        this.priceService.sendSymbolValidationBulkRequest(symArray);
    },

    onRemoveSubscription: function () {
        var gms = this.get('gms') ? this.get('gms') : priceWidgetConfig.gms;
        var that = this;

        Ember.$.each(gms, function (prop, gmsObj) {
            that.priceService.removeSymbolRequest(gmsObj.exg, gmsObj.sym);
        });
    },

    setArrow: function () {
        var sortedArray = this.get('gmsContent');

        Ember.$.each(sortedArray, function (index, item) {
            item.set('isNegative', item.pctChg < 0);
        });
    }.observes('gmsContent.@each.pctChg'),

    toggleFullScreen: function () {
        if (this.get('isFullScreenWL')) {
            var viewName = 'price/widgets/gms-container';
            var comp = this.container.lookupFactory('controller:price/widgets/gms-container').create({widgetContainer: this.widgetContainer});
            var route = this.container.lookup('route:application');
            comp.initializeWidget({wn: viewName.split('/').pop()});

            route.render(viewName, {
                into: 'price/widgets/commodities-overview',
                outlet: 'gmsOutlet',
                controller: comp
            });

            this.set('comp', comp);
        } else {
            var cntr = this.get('comp');

            if (cntr) {
                cntr.closeWidget();
            }
        }

        this._super('gms-' + this.get('wkey'));
    }.observes('isFullScreenWL'),

    onAfterRender: function () {
        var widgetId = '#' + 'table-' + this.get('wkey');
        this.initializeEventListner(widgetId, 'onWidgetClick');
    },

    onWidgetClick: function (event) {
        var tableRow = this.getParentElement(event, 'div.layout-row');
        var rowId = tableRow.attr('id');
        var selectedRow;

        if (rowId) {
            selectedRow = this.gmsContent[rowId];
            var stock = selectedRow.getProperties('exg', 'sym', 'inst');

            sharedService.getService('sharedUI').invokeRightClick(stock, this.get('wkey'), event, this.menuComponent);
        }
    },

    onLanguageChanged: function () {
        var gms = this.get('gms');
        this.updateCommodities(gms ? gms : priceWidgetConfig.gms);
    },

    actions: {
        fullScreenToggle: function () {
            this.toggleProperty('isFullScreenWL');
            this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.select, ['isFullScreenWL:', this.get('isFullScreenWL')].join(''));
        },

        doubleClickRow: function (symbol) {
            if (symbol) {
                sharedService.getService('priceUI').showPopupWidget({container: this.container, controllerString: 'view:symbol-popup-view'}, {tabId: 0, sym: symbol.sym, exg: symbol.exg, inst: symbol.inst});
            }
        }
    }
});
