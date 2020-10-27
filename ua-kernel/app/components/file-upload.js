import Ember from 'ember';
import sharedService from '../models/shared/shared-service';
import languageDataStore from '../models/shared/language/language-data-store';

export default Ember.Component.extend({
    layoutName: 'components/file-upload',

    massage: '',
    isLoading: false,
    priceService: sharedService.getService('price'),
    app: languageDataStore.getLanguageObj(),

    callBackFunction: function (data) {
        let msg = '';

        if (data.stat === 1) {
            msg = this.app.lang.messages.uploadSuccess;
        } else {
            msg = this.app.lang.messages.uploadError;
        }

        this.set('massage', msg);
        this.set('isLoading', false);
    },

    actions: {
        upload: function () {
            let file = Ember.$('#fileUpload')[0].files[0];

            this.priceService.sendFileUploadRequest(file, this.callBackFunction.bind(this));
            this.set('isLoading', true);
        },

        onChange: function () {
            document.getElementById('fileName').innerHTML = Ember.$('#fileUpload')[0].files[0].name;
        }
    }
});