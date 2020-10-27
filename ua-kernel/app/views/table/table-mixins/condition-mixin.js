import Ember from 'ember';

export default Ember.Mixin.create({
    isPositive: function (value) {
        return value && parseFloat(value) > 0;
    },

    isZero: function (value) {
        return value !== undefined && parseFloat(value) === 0;
    }
});

