import Ember from 'ember';
import ModalPopup from './modal-popup';
import appConfig from '../config/app-config';
import sharedService from '../models/shared/shared-service';
import languageDataStore from '../models/shared/language/language-data-store';

export default ModalPopup.extend ({
    layoutName: 'components/session-timeout',
    isCancelEnabled: true,
    currentSessionTime: '',
    sessionTimeout: '',
    minMaxTimeoutRange: '2 - 120 ',
    defaultSessionTime: appConfig.customisation.applicationIdleCheckConfig.defaultIdleTime,
    app: languageDataStore.getLanguageObj(),

    /* *
     * Temporarily overwriting this method to register  this component to sharedService.
     */
    expose: function () {
        var parentController = this.get('targetObject');
        var exposedName = this.get('id');

        parentController.set(exposedName, this);

        if (this.get('isRegistered')) {
            sharedService.getService('sharedUI').registerService('sessionTimeoutPopup', this);
        }

        this.getSessionTimeoutValue();
        this.set('minMaxRangeLabel', this.get('minMaxTimeoutRange') + this.get('app').lang.labels.minutes);
    }.on('didInsertElement'),

    getSessionTimeoutValue: function () {
        var timeValue = sharedService.userSettings.get('sessionTimeout');
        var sessionTime = timeValue ? timeValue : this.get('defaultSessionTime');

        this.set('defaultSessionTime', sessionTime);
        this.set('currentSessionTime', [sessionTime, this.get('app').lang.labels.minutes].join(' '));
    },

    isPopupEnabled: function () {
        if (!appConfig.customisation.isMobile) {
            this.set('popupCss', this.get('isEnabledTransactionPw') ? 'change-tx-password' : 'change-login-password');
        }

        return this.get('isEnabled');
    }.property('isEnabled'),

    _changeSessionTimeout: function () {
        var that = this;
        var app = this.get('app');
        var newValue = this.get('newSession');

        // TODO: [Chathuranga] Update this with OMS request validation
        if (newValue >= 2 && newValue <= 120) {
            sharedService.userSettings.set('sessionTimeout', newValue);
            sharedService.userSettings.save();

            this.set('message', app.lang.labels.done);

            Ember.run.later(function () {
                that.send('closeModalPopup');
            }, 1000);

        } else {
            this.set('message', app.lang.messages.sessionTimeoutErrorValidation);
        }
    },

    actions: {
        onSave: function () {
            this._changeSessionTimeout();
        },

        onCancel: function () {
            this.set('newSession', '');

            this.send('closeModalPopup');
        },

        showModalPopup: function () {
            if (!this.get('isEnabled')) {
                this.set('isEnabled', true);
                this.set('newSession', '');
                this.set('message', '');
            }
        }
    }
});