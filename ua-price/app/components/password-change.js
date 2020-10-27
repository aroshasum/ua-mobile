import ModalPopup from './modal-popup';
import appConfig from '../config/app-config';
import utils from '../utils/utils';
import sharedService from '../models/shared/shared-service';
import languageDataStore from '../models/shared/language/language-data-store';

export default ModalPopup.extend({
    layoutName: 'components/password-change',
    app: languageDataStore.getLanguageObj(),

    service: {},
    isEnabledTransactionPw: appConfig.customisation.isEnabledTransactionPwChange,
    isEnabledPwRules: appConfig.customisation.isEnabledPwRules,
    isCancelEnabled: true,
    forceChgPwAuthTyp: 2,

    ChangePwStatus: {
        Success: 1,
        Failed: 0,
        FailedLocked: 3
    },

    L2AuthType: {
        NoPassword: 1,
        PasswordOnce: 2,
        Password: 3
    },

    /* *
     * Temporarily overwriting this method to register  this component to sharedService.
     */
    expose: function () {
        var parentController = this.get('targetObject');
        var exposedName = this.get('id');
        parentController.set(exposedName, this);

        if (this.get('isRegistered')) {
            sharedService.getService('sharedUI').registerService('changePasswordPopup', this);
        }
    }.on('didInsertElement'),

    _onChangePasswordResponse: function (chgPwdSts, chgPwMsg) {
        if (chgPwdSts === this.ChangePwStatus.Success) {
            var app = this.get('app');

            this.send('closeModalPopup');
            this.set('message', '');

            utils.messageService.showMessage(app.lang.messages.passwordChange, utils.Constants.MessageTypes.Info, false, app.lang.labels.changePassword);

            if (this.get('isMobile')) {
                sharedService.getService('priceUI').closeChildView('components/password-change');
            }

            if (appConfig.customisation.isTradingEnabled && sharedService.getService('trade').userDS.authSts === sharedService.getService('trade').constants.AuthStatus.NotActivated) {
                utils.applicationSessionHandler.logout();
            }
        } else {
            this.set('message', chgPwMsg);
        }
    },

    isPopupEnabled: function () {
        if (!appConfig.customisation.isMobile) {
            this.set('popupCss', this.get('isEnabledTransactionPw') ? 'change-tx-password' : 'change-login-password');
        }

        return this.get('isEnabled') || appConfig.customisation.isMobile;
    }.property('isEnabled'),

    _changePassword: function () {
        var that = this;
        var reqObj = {};
        var app = this.get('app');

        var currentPwd = this.get('currentPassword');
        var newPwd = this.get('newPassword');
        var confirmPwd = this.get('confirmPassword');
        var currentTxPwd = this.get('currentTxPassword');
        var newTxPwd = this.get('newTxPassword');
        var confirmTxPwd = this.get('confirmTxPassword');

        var isLoginPwdChange = (utils.validators.isAvailable(currentPwd) && utils.validators.isAvailable(newPwd) && utils.validators.isAvailable(confirmPwd));
        var isTxPwdChange = (utils.validators.isAvailable(currentTxPwd) && utils.validators.isAvailable(newTxPwd) && utils.validators.isAvailable(confirmTxPwd));
        var isLoginPwdEntered = (utils.validators.isAvailable(currentPwd) || utils.validators.isAvailable(newPwd) || utils.validators.isAvailable(confirmPwd));
        var isTxPwdEntered = (utils.validators.isAvailable(currentTxPwd) || utils.validators.isAvailable(newTxPwd) || utils.validators.isAvailable(confirmTxPwd));
        var isMismatch = newPwd !== confirmPwd;

        this.set('message', '');
        this.set('crntPwdLblCss', '');
        this.set('newPwdLblCss', '');
        this.set('cfmPwdLblCss', '');
        this.set('txCrntPwdLblCss', '');
        this.set('txNewPwdLblCss', '');
        this.set('txCfmPwdLblCss', '');

        if (this.get('isEnabledTransactionPw') && isTxPwdChange) {
            var isTxPwdMismatch = newTxPwd !== confirmTxPwd;
        }

        if (!isLoginPwdChange && !isTxPwdChange) {
            if (isLoginPwdEntered || (!isTxPwdEntered && !isLoginPwdEntered)) {
                this._setMandatoryFieldsCss(currentPwd, 'crntPwdLblCss');
                this._setMandatoryFieldsCss(newPwd, 'newPwdLblCss');
                this._setMandatoryFieldsCss(confirmPwd, 'cfmPwdLblCss');
            }

            if (isTxPwdEntered || (!isTxPwdEntered && !isLoginPwdEntered)) {
                this._setMandatoryFieldsCss(currentTxPwd, 'txCrntPwdLblCss');
                this._setMandatoryFieldsCss(newTxPwd, 'txNewPwdLblCss');
                this._setMandatoryFieldsCss(confirmTxPwd, 'txCfmPwdLblCss');
            }

            this.set('message', app.lang.messages.mandatoryFields);
            return;
        } else {
            if (isMismatch && isTxPwdMismatch) {
                this.set('message', app.lang.messages.passwordMismatch + '<br>' + app.lang.messages.txPasswordMismatch);
                return;
            } else if (isMismatch) {
                this.set('message', app.lang.messages.passwordMismatch);
                return;
            } else if (isTxPwdMismatch) {
                this.set('message', app.lang.messages.txPasswordMismatch);
                return;
            }
        }

        if (isLoginPwdChange) {
            reqObj.username = this.get('username');
            reqObj.oldPwd = utils.crypto.generateHashedText(currentPwd);
            reqObj.newPwd = utils.crypto.generateHashedText(newPwd);
        }

        if (isTxPwdChange) {
            reqObj.oldTxPwd = utils.crypto.generateHashedText(currentTxPwd);
            reqObj.newTxPwd = utils.crypto.generateHashedText(newTxPwd);
        }

        if (!this.isEnabledPwRules || ((!this.isEnabledTransactionPw || !isTxPwdEntered || this.isTxPwdRulesMatch) && (!isLoginPwdEntered || this.isPwdRulesMatch))) {
            this.get('service').changePassword(reqObj, function (authSts, authMsg) {
                that._onChangePasswordResponse(authSts, authMsg);
            });

            this.set('message', app.lang.messages.pleaseWait);
        } else {
            this.set('message', app.lang.messages.didNotMeetPwRules);
        }

        this.set('currentPassword', '');
        this.set('newPassword', '');
        this.set('confirmPassword', '');

        if (this.get('isEnabledTransactionPw')) {
            this.set('currentTxPassword', '');
            this.set('newTxPassword', '');
            this.set('confirmTxPassword', '');
        }
    },

    _setMandatoryFieldsCss: function (value, lbl) {
        if (!utils.validators.isAvailable(value)) {
            this.set(lbl, 'down-fore-color');
        }
    },

    isMobile: function () {
        return appConfig.customisation.isMobile;
    }.property(),

    actions: {
        onSave: function () {
            this._changePassword();
        },

        onCancel: function () {
            this.set('currentPassword', '');
            this.set('newPassword', '');
            this.set('confirmPassword', '');

            if (this.get('isEnabledTransactionPw')) {
                this.set('currentTxPassword', '');
                this.set('newTxPassword', '');
                this.set('confirmTxPassword', '');
            }

            this.send('closeModalPopup');
        },

        showModalPopup: function (isCancelEnabled) {
            var service, userName;

            if (appConfig.customisation.isTradingEnabled) {
                service = sharedService.getService('trade');
                userName = service.userDS.lgnAls;
            } else {
                service = sharedService.getService('price');
                userName = service.userDS.username;
            }

            this.set('isCancelEnabled', isCancelEnabled);
            this.set('service', service);

            if (!this.get('isEnabled')) {
                this.set('isEnabled', true);
                this.set('message', '');
                this.set('crntPwdLblCss', '');
                this.set('newPwdLblCss', '');
                this.set('cfmPwdLblCss', '');
                this.set('txCrntPwdLblCss', '');
                this.set('txNewPwdLblCss', '');
                this.set('txCfmPwdLblCss', '');
                this.set('username', sharedService.userSettings.username ? sharedService.userSettings.username : userName);

                // TODO [Arosha] Enable below after testing transaction password logic
                // var l2AuthTyp = this.get('service').userDS.l2AuthTyp;
                //
                // if (l2AuthTyp === this.L2AuthType.PasswordOnce || l2AuthTyp === this.L2AuthType.Password) {
                //    this.set('isEnabledTransactionPw', true);
                // }
            }
        }
    }
});