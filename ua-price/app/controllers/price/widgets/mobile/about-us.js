import Ember from 'ember';
import BaseController from '../../../base-controller';
import appConfig from '../../../../config/app-config';
import sharedService from '../../../../models/shared/shared-service';

export default BaseController.extend({
    title: '',
    address: '',
    longVersion: appConfig.longVersion,

    onLoadWidget: function () {
        this.set('title', this.get('app').lang.labels.aboutUs);
    },

    onPrepareData: function () {
        var that = this;
        var itemArray = [];
        var configArray = appConfig.customisation.supportedContacts;

        if (configArray && configArray.length > 0) {
            Ember.$.each(configArray, function (key, item) {
                var contact = {};
                var lanKey = item.key;

                if (item.desc) {
                    contact.desc = that.get('app').lang.labels[item.desc];
                }

                if (lanKey) {
                    contact.value = item.value;
                    contact.lanKey = that.get('app').lang.labels[lanKey] + ' : ';

                    if (item.type === 'T') {
                        contact.isTel = true;
                    } else if (item.type === 'E') {
                        contact.isEmail = true;
                    }else if (item.type === 'U') {
                        contact.isUrl = true;
                    }

                    itemArray[itemArray.length] = contact;
                }
            });
        }

        this.set('address', this.get('app').lang.labels.brokerageAddress);
        this.set('supportedContacts', itemArray);
        this.set('imgSrc', appConfig.customisation.imgSrc);
    },

    onAfterRender: function () {
        this.bindAnnLinks();
    },

    bindAnnLinks: function () {
        var childViewLoadDelay = 800;

        Ember.run.later(function () {
            var bodyContainer = Ember.$('#aboutUsPopup');

            if (bodyContainer) {
                bodyContainer.on('click', 'a', function (event) {
                    var linkTarget = this.href;
                    event.preventDefault();

                    if (appConfig.customisation.isMobile && Ember.isIos) {
                        window.open(linkTarget, '_blank', 'location=yes,enableViewPortScale=yes');
                    } else {
                        window.open(linkTarget, '_system');
                    }
                });
            }
        }, childViewLoadDelay);
    },

    isArabic: function () {
        return sharedService.userSettings.currentLanguage === 'AR';
    }.property('sharedService.userSettings.currentLanguage'),

    actions: {
        onBackToLogin: function () {
            Ember.$('div#contactUsContainer').removeClass('display-block');
            Ember.$('div#contactUsContainer').addClass('display-none');

            if (Ember.$.isFunction(this.get('loginViewCallbackFn'))) {
                this.get('loginViewCallbackFn')();
                sharedService.getService('sharedUI').resetUserDetails();
            }
        }
    }
});