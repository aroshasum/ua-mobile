import Ember from 'ember';
import BaseArrayController from '../../base-array-controller';
import sharedService from '../../../models/shared/shared-service';
import panelField from '../../../models/price/business-entities/panel-field';
import PriceConstants from '../../../models/price/price-constants';
import appEvents from '../../../app-events';

export default BaseArrayController.extend({
    stock: null,
    priceService: sharedService.getService('price'),

    onLoadWidget: function () {
        appEvents.subscribeSymbolChanged(this.get('wkey'), this, this.get('selectedLink'));
    },

    onPrepareData: function () {
        this.set('stock', this.priceService.stockDS.getStock(this.get('exg'), this.get('sym'), this.get('inst')));
        this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.show, ['sym:', this.get('sym'), '~', this.get('exg')].join(''));
    },

    onAddSubscription: function () {
        this.priceService.addSymbolRequest(this.get('exg'), this.get('sym'), this.get('inst'));
    },

    onClearData: function () {
        this.set('stock', []);
    },

    onUnloadWidget: function () {
        appEvents.unSubscribeSymbolChanged(this.get('wkey'), this.get('selectedLink'));
    },

    onRemoveSubscription: function () {
        this.priceService.removeIndexRequest(this.get('exg'), this.get('sym'), this.get('inst'));
    },

    renderPanelFields: function (quoteConfig, panelFieldsRef) {
        try {
            var stockObj = this.get('stock');
            var assetType = stockObj.get('ast');
            // If quote configuration is unavailable for given asset type, configuration for default asset type will be loaded.
            var fields = quoteConfig[assetType] ? quoteConfig[assetType] : quoteConfig[this.utils.Constants.DefaultAssetType];
            var noOfDecimals;

            if (stockObj.get('deci')) {
                noOfDecimals = stockObj.get('deci');
            } else {
                noOfDecimals = sharedService.userSettings.displayFormat.decimalPlaces;
            }

            if (fields && panelFieldsRef) {
                Ember.$.each(fields, function (fieldId, field) {
                        var fieldObj = panelField.create({valueObj: stockObj, fieldObj: field, noOfDecimals: (typeof field.noOfDecimals === 'undefined') ? noOfDecimals : field.noOfDecimals});

                        if (field.isComponent) {
                            fieldObj.isComponent = true;

                            switch (field.comType) {
                                case PriceConstants.PriceComponent.DaysRange:
                                    fieldObj.isDaysRangeCom = true;
                                    break;

                                case PriceConstants.PriceComponent.FiftyTwoWeekHighLow:
                                    fieldObj.isFiftyTwoWeek = true;
                                    break;

                                case PriceConstants.PriceComponent.CashMap:
                                    fieldObj.isCashMap = true;
                                    break;
                            }
                        }
                        panelFieldsRef.pushObject(fieldObj);
                    }
                );
            }
        } catch (x) {
            this.utils.logger.logError('Error in rendering detail quote panel fields : ' + x);
        }
    }
});
