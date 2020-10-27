import Ember from 'ember';

export default Ember.Mixin.create({
    conditionPrice: '',
    conditionExpDate: '',

    isConPriceDisabled: false,
    isConditionDisabled: false,
    isConExpDateDisabled: false,

    verifyOrder: function () {
        var errorsAndWarnings = this._super();
        var orderParams = this.get('orderParams');
        var conditionPrice = orderParams.conditionDisplayPrice;

        if (!conditionPrice || isNaN(conditionPrice) || conditionPrice <= 0) {
            errorsAndWarnings.errors.push(this.get('app').lang.messages.conditionPriceNotEmpty);
        }

        return errorsAndWarnings;
    }
});
