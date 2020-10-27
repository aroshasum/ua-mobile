import Ember from 'ember';

export default Ember.Object.extend({
    optPrd: undefined,
    optExg: undefined,
    trdExg: undefined,
    optWeek: undefined,

    setData: function (message) {
        var that = this;

        Ember.$.each(message, function (key, value) {
            that.set(key, value);
        });
    }
});
