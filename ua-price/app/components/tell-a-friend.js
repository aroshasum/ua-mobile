/* global html2canvas */

import Ember from 'ember';
import sharedService from '../models/shared/shared-service';
import LanguageDataStore from '../models/shared/language/language-data-store';

export default Ember.Component.extend({
    app: LanguageDataStore.getLanguageObj(),
    isSendEnabled: false,
    recipient1: '',
    recipient2: '',
    displayCss: '',

    sendEmail: function (image) {
        var recipientsArray = [];

        if (this.get('recipient1')) {
            recipientsArray.pushObject(this.get('recipient1'));
        }

        if (this.get('recipient2')) {
            recipientsArray.pushObject(this.get('recipient2'));
        }

        sharedService.getService('price').sendToEmail(image, recipientsArray.join(','));
    },

    _onLoadToCanvas: function () {
        var that = this;
        this.set('displayCss', 'display-none');

        html2canvas(document.body, {
            useCORS: true,
            allowTaint: true,

            onrendered: function (canvas) {
                that.sendEmail(canvas.toDataURL('image/png'));
                that.set('displayCss', '');
            }
        });
    },

    actions: {
        onLoadToCanvas: function () {
            this._onLoadToCanvas();
        },

        onEnableTellAFried: function () {
            this.set('isSendEnabled', true);
        }
    }
});