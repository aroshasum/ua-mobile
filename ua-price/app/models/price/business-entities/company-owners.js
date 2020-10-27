import Ember from 'ember';

export default Ember.Object.extend({
    ownerName: '',      // Owners Name
    sherPrs: '',        // Share parentage
    ownerDesig: '',     // Owner Designation

    setData: function (companyOwnersData) {
        var that = this;

        Ember.$.each(companyOwnersData, function (key, value) {
            that.set(key, value);
        });
    }
});