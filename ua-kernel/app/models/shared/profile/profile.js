import Ember from 'ember';

export default Ember.Object.extend({
    // Below properties are pascal case according to profile service protocol.
    Id: '',
    Version: '',
    ProductId: '',
    Name: '',
    panels: '',
    Components: [],
    BillingCode: '',

    setData: function (profileData) {
        var that = this;

        Ember.$.each(profileData, function (key, value) {
            that.set(key, value);
        });
    }
});