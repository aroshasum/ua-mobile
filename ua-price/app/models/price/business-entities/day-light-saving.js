import Ember from 'ember';

export default Ember.Object.extend({
    tzId: '',
    sDate: '',
    eDate: '',
    dls: '',

    setData: function (dlsObj) {
        var that = this;

        Ember.$.each(dlsObj, function (key, value) {
            that.set(key, value);
        });
    }
});
