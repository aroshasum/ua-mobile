import Ember from 'ember';

export default Ember.Object.extend({
    subsiName: '',       // Name
    subsiSherPrs: '',    // Share parentage

    setData: function (companySubsidiariesData) {
        var that = this;

        Ember.$.each(companySubsidiariesData, function (key, value) {
            that.set(key, value);
        });
    }
});