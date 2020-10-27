import Ember from 'ember';

export default Ember.Object.extend({
    name: '',       // Name
    desig: '',      // Designation
    date: '',       // Date
    sortOrder: '',  // Sort Order

    setData: function (companyManagmentData) {
        var that = this;

        Ember.$.each(companyManagmentData, function (key, value) {
            that.set(key, value);
        });
    }
});