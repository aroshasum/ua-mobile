import Ember from 'ember';
import sharedService from '../../../models/shared/shared-service';
import priceConstants from '../../../models/price/price-constants';

export default Ember.Object.extend({
    sym: '',               // Symbol
    exg: '',               // Exchange
    token: '',             // Alert Token
    status: '',            // Alert Status
    ts: '',                // Time Stamp
    param: '',             // Alert Parameter
    crit: '',              // Alert Criteria
    val: '',               // Alert Value
    tval: '',              // Alert Trigger Value
    trv: '',               // Alert Triggered Value
    tts: '',               // Triggered Time Stamp
    exp: '',               // Expiry time period
    flt: '',               // Alert Filter
    dispProp1: '',         // Alert Symbol Display Property
    deci: '',              // Alert Symbol Decimal Places

    setSymbolInfo: function () {
        var stock = sharedService.getService('price').stockDS.getStock(this.get('exg'), this.get('sym'));
        this.set('dispProp1', stock.get('dispProp1'));
        this.set('deci', stock.get('deci'));
    }.observes('sym'),

    // Since param, crit, val are important for alert object, below assignments done in business entity
    setFilterComponents: function () {
        var filter = this.get('flt');
        var splitConstant = '#';

        if (filter) {
            var filterComponents = filter.split(splitConstant);

            if (filterComponents.length > 2) {
                var paramSplitConstant = '$';
                var parameter = filterComponents[0].split(paramSplitConstant)[1];

                this.set('param', priceConstants.AlertParamMap[parameter]);
                this.set('crit', filterComponents[1]);
                this.set('val', filterComponents[2]);
            }
        }
    }.observes('flt'),

    isEditEnabled: function () {
        return this.get('status') === priceConstants.AlertStatus.Active;     // Status from server comes as 'active'
    }.property('status'),

    setData: function (alertMessage) {
        var that = this;

        Ember.$.each(alertMessage, function (key, value) {
            that.set(key, value);
        });
    }
});
