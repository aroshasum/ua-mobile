import Ember from 'ember';
import sharedService from '../models/shared/shared-service';

export default Ember.Component.extend({
    layoutName: 'components/input-password',
    pass: '',

    errorMessage: '',
    onSuccess: '',

    _validateLevel2Authentication: function () {
        var success = sharedService.getService('trade').authenticateLevel2(this.get('pass'));

        if (success) {
            this.set('errorMessage', '');
            this.sendAction('onSuccess');
            this.set('pass', '');
        } else {
            this.set('errorMessage', 'Invalid password');
        }
    },

    actions: {
        onSubmit: function () {
            this._validateLevel2Authentication();
        },

        onCancel: function () {
            this.sendAction('onCancel');
        }
    }
});
