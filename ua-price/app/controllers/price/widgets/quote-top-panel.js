import Ember from 'ember';
import QuoteIntradayPerformance from '../../../controllers/price/widgets/quote-intraday-performance';
import ControllerFactory from '../../../controllers/controller-factory';

export default QuoteIntradayPerformance.extend({
    adjustedPanelFields: Ember.A(),

    onAfterRender: function () {
        this._renderQuoteSummary();
    },

    _renderQuoteSummary: function () {
        var controllerString = 'controller:price/widgets/quote-summery';
        var routeString = 'price/widgets/quote-summery';
        var route = this.container.lookup('route:application');
        var widgetController = ControllerFactory.createController(this.container, controllerString);

        widgetController.set('sym', this.get('sym'));
        widgetController.set('exg', this.get('exg'));
        widgetController.set('inst', this.get('inst'));
        widgetController.set('isShowTitle', false);
        widgetController.set('wkey', 'quote-top-panel' + this.get('wkey'));
        widgetController.set('addBorder', '');
        widgetController.set('selectedLink', this.get('selectedLink'));

        widgetController.initializeWidget({wn: controllerString});

        route.render(routeString, {
            into: 'price/widgets/quote-top-panel',
            outlet: 'quoteSummary',
            controller: widgetController
        });

        this.set('quoteSummaryWidget', widgetController);
    },

    renderPanelFields: function () {
        this._super();

        var panelFields = this.get('panelFields');
        var noOfColumns = 5;
        var adjustedPanelFieldList = [];

        var numOfRows = Math.ceil((panelFields.length / noOfColumns));
        var emptyCols = numOfRows - (panelFields.length % numOfRows);
        var maxColumnIndex = 0;
        var rowIndex = 0;

        Ember.$.each(panelFields, function (key, field) {
            if (key >= maxColumnIndex) {
                maxColumnIndex = maxColumnIndex + noOfColumns;
                rowIndex = (maxColumnIndex / noOfColumns) - 1;
            }

            var colIndex = key - maxColumnIndex + noOfColumns;

            if (!adjustedPanelFieldList[colIndex]) {
                adjustedPanelFieldList[colIndex] = [];
            }

            adjustedPanelFieldList[colIndex][rowIndex] = field;
        });

        var firstRow = adjustedPanelFieldList[0];   // This contains max no of elements

        for (var rowNo = 0; rowNo < emptyCols; rowNo++) {
            adjustedPanelFieldList[noOfColumns - rowNo - 1][firstRow.length - 1] = {caption: 'empty row', formattedValue: '', captionStyle: 'visibility-hidden'};
        }

        this.set('adjustedPanelFields', adjustedPanelFieldList);
    }
});