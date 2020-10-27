import Ember from 'ember';

export default Ember.Object.extend({
    // Below properties are pascal case according to profile service protocol.
    Id: '',
    ComponentTypeId: '',
    Status: '',
    ProfileId: '',
    Version: '',
    Name: '',
    Type: '',
    Contents: '',
    PermissionList: [],

    setData: function (componentData) {
        var that = this;

        Ember.$.each(componentData, function (key, value) {
            that.set(key, value);
        });
    }
});