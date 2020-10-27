import QuoteTimeAndSales from './quote-time-and-sales';
import priceWidgetConfig from '../../../../config/price-widget-config';
import sharedService from '../../../../models/shared/shared-service';
import appEvents from '../../../../app-events';
import appConfig from '../../../../config/app-config';

export default QuoteTimeAndSales.extend({
    BacklogBatchSize: priceWidgetConfig.marketTimeAndSales.BacklogBatchSize,

    isFullMarket: true,
    defaultColumnIds: priceWidgetConfig.marketTimeAndSales.defaultColumnIds,
    defaultColumnMapping: priceWidgetConfig.marketTimeAndSales.defaultColumnMapping,
    isMobile: appConfig.customisation.isMobile,

    onLoadWidget: function () {
        this._super();
        this.setTitle();
        appEvents.subscribeExchangeChanged(this.get('selectedLink'), this.get('wkey'), this);

        // TODO: [satheeqh] Need to generalize this for mobile
        if (appConfig.customisation.isMobile && window && window.screen && window.screen.width <= this.LowResolutionWidth) {
            this.columnDeclarations = this.columnDeclarations.splice(0, this.columnDeclarations.length - 1);
        }
    },

    onPrepareData: function () {
        this.set('sym', undefined); // Symbol not required for market T&S
        this._super();
    },

    onRemoveSubscription: function () {
        sharedService.getService('price').removeMarketTimeAndSalesRequest(this.get('exg'));
    },

    setTitle: function () {
        var title = this.get('app').lang.labels.marketTimeAndSales;
        this.set('title', title);
    },

    actions: {
        clickRow: function (selectedRow) {
            if (appConfig.customisation.isMobile) {
                var rowData = selectedRow.getProperties('exg', 'sym', 'inst');
                var quoteMenuId = appConfig.widgetId ? appConfig.widgetId.quoteMenuId : '';
                var watchListMenuId = appConfig.widgetId ? appConfig.widgetId.watchListMenuId : '';
                var sharedUIService = sharedService.getService('sharedUI');

                if (quoteMenuId) {
                    if (appConfig.customisation.isCompactMenuEnabled) {
                        sharedUIService.navigateMenu(watchListMenuId, quoteMenuId);
                    } else {
                        sharedUIService.navigateMenu(quoteMenuId);
                    }
                }

                appEvents.onSymbolChanged(rowData.sym, rowData.exg, rowData.inst, this.get('selectedLink'));
            }
        }
    }
});