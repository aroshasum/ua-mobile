import Ember from 'ember';
import ModalPopup from './modal-popup';
import sharedService from '../models/shared/shared-service';
import languageDataStore from '../models/shared/language/language-data-store';
import appConfig from '../config/app-config';

export default ModalPopup.extend({
    layoutName: 'components/about-us-popup',
    title: '',
    address: '',
    longVersion: appConfig.longVersion,
    userSettings: sharedService.userSettings,

    app: languageDataStore.getLanguageObj(),

    expose: function () {
        var parentController = this.get('targetObject');
        var exposedName = this.get('id');
        parentController.set(exposedName, this);

        if (this.get('isRegistered')) {
            sharedService.getService('sharedUI').registerService('aboutUsPopup', this);
        }
    }.on('didInsertElement'),

    isPopupEnabled: function () {
        this.setContent();
        return this.get('isEnabled');
    }.property('isEnabled'),

    setContent: function () {
        var that = this;
        var itemArray = [];
        var configArray = appConfig.customisation.supportedContacts;

        if (configArray && configArray.length > 0) {
            Ember.$.each(configArray, function (key, item) {
                var contact = {};
                var lanKey = item.key;

                if (lanKey) {
                    contact.value = item.value;
                    contact.lanKey = that.get('app').lang.labels[lanKey] + ' : ';

                    if (item.type === 'T') {
                        contact.isTel = true;
                    } else if (item.type === 'E') {
                        contact.isEmail = true;
                    } else if (item.type === 'U') {
                        contact.isUrl = true;
                    }

                    itemArray[itemArray.length] = contact;
                }
            });
        }

        this.set('address', this.get('app').lang.labels.brokerageAddress);
        this.set('title', this.get('app').lang.labels.aboutUs);
        this.set('supportedContacts', itemArray);
        this.set('imgSrc', appConfig.customisation.imgSrc);
    },

    isArabic: function () {
        return this.userSettings.currentLanguage === 'AR';
    }.property('userSettings.currentLanguage'),

    actions: {
        onCancel: function () {
            this.send('closeModalPopup');
        },

        showModalPopup: function () {
            if (!this.get('isEnabled')) {
                this.set('isEnabled', true);
            }
        }
    }
});
