/* global Mousetrap */

import BaseController from '../base-controller';
import Ember from 'ember';

export default BaseController.extend({
    onLoadWidget: function () {
        var that = this;
        var popupId = 'popupId';

        Mousetrap.bind('esc', function () {
            if (Ember.$.isFunction(that.get('loginViewCallbackFn'))) {
                that.get('loginViewCallbackFn')();
            }
        }, popupId);
    },

    actions: {
        onBackToLogin: function () {
            Ember.$('div#contactUsContainer').removeClass('display-block');
            Ember.$('div#contactUsContainer').addClass('display-none');

            if (Ember.$.isFunction(this.get('loginViewCallbackFn'))) {
                this.get('loginViewCallbackFn')();
            }
        }
    }
});
