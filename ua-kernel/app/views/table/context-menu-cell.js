import ButtonCell from './button-cell';
import sharedService from '../../models/shared/shared-service';
import appConfig from '../../config/app-config';

export default ButtonCell.extend({
    templateName: 'table/views/context-menu-cell',
    customWLArray: sharedService.getService('price').watchListDS.getCustomWLArray(),

    isMultipleCustomWLAvailable: function () {
        return this.get('customWLArray').length > 1;
    }.property('customWLArray.length'),

    columnId: function () {
        return this.get('column.contentPath');
    }.property(),

    contextPath: function () {
        return this.get('controller').contextPath;
    }.property('controller.contextPath'),

    rowData: function () {
        return this.get('controller').rowData;
    }.property('controller.rowData'),

    isDeleteButtonEnabled: function () {
        return !this.get('controller').isDeleteButtonDisabled && this.get('controller').isCustomWLMode;
    }.property('controller.isCustomWLMode'),

    favouriteIconCss: function () {
        return this.get('controller').isAddedToCustomWatchList ? 'symbol-fore-color' : 'sidebar-nav-icon-color';
    }.property('controller.isAddedToCustomWatchList', 'controller.isContextPanel'),

    isTradingEnabled: function () {
        return appConfig.customisation.isTradingEnabled;
    }.property(),

    isTradingDisabledExg: function () {
        var tradeService = sharedService.getService('trade');
        return tradeService && !tradeService.userDS.isTradeEnabledExchange(this.get('rowData.exg'));
    }.property('rowData.exg'),

    actions: {
        deleteSymbol: function (stock) {
            this.get('controller').sendAction('deleteSymbol', stock);
        },

        editSymbol: function (stock) {
            this.get('controller').sendAction('editSymbol', stock);
        },

        addStocksToCustomWL: function (id) {
            var watchListId = id.id ? id.id : 0;
            var stock = this.get('rowValues.content');

            if (this.get('controller.isAddedToCustomWatchList') && !this.get('isMultipleCustomWLAvailable')) {
                this.get('controller').sendAction('deleteSymbol', this.get('rowValues'), watchListId);
            } else {
                this.get('controller').set('isAddedToCustomWatchList', true);
                sharedService.getService('price').watchListDS.addStocksToCustomWL(stock, watchListId);
            }
        },

        loadQuoteSummary: function (stock) {
            this.get('controller').sendAction('loadQuoteSummary', stock);
        },

        renderSubscribeWindow: function (stock) {
            this.get('controller').sendAction('renderSubscribeWindow', stock);
        }
    }
});