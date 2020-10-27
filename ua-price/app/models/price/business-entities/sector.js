import Ember from 'ember';

export default Ember.Object.extend({
    sec: '',              // Sector Code
    des: '',              // Description

    setData: function (sectorMessage) {
        var that = this;

        Ember.$.each(sectorMessage, function (key, value) {
            that.set(key, value);
        });
    }
});