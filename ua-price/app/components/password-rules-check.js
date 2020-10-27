import Ember from 'ember';
import appConfig from '../config/app-config';
import languageDataStore from '../models/shared/language/language-data-store';
import utils from '../utils/utils';

export default Ember.Component.extend({
    app: languageDataStore.getLanguageObj(),

    isUNameRulesMatch: false,
    isPwdRulesMatch: false,

    passwordRules: appConfig.customisation.passwordRules,
    usernameRules: appConfig.customisation.usernameRules,

    passwordRulesCollection: [],
    userNameRulesCollection: [],

    initialize: function () {
        var passwordRulesCollection;
        var userNameRulesCollection;
        var langMsg = this.app.lang.messages;
        var passwordRules = this.passwordRules;
        var usernameRules = this.usernameRules;

        if (passwordRules) {
            passwordRulesCollection = [
                {ruleName: langMsg.passwordValidLength.replace('[length]', [this.passwordRules.minLength, this.passwordRules.maxLength].join('-')), isEnabled: passwordRules.checkLength},
                {ruleName: langMsg.passwordNumberRequired, isEnabled: passwordRules.checkContainNumber},
                {ruleName: langMsg.passwordStartCharacter, isEnabled: passwordRules.checkStartWithLetter},
                {ruleName: langMsg.passwordContainSimple, isEnabled: passwordRules.checkContainSmallLetter},
                {ruleName: langMsg.passwordContainCapital, isEnabled: passwordRules.checkContainCapitalLetter},
                {ruleName: langMsg.passwordContainIdentical, isEnabled: passwordRules.checkIdenticalCharacter},
                {ruleName: langMsg.passwordContainSpecial, isEnabled: passwordRules.checkSpecialCharacter},
                {ruleName: langMsg.passwordNotSame, isEnabled: passwordRules.checkUsernameMatch},
                {ruleName: langMsg.passwordOnlyAlphaNumeric, isEnabled: passwordRules.checkOnlyAlphaNumeric},
                {ruleName: langMsg.passwordNotStartWithNumber, isEnabled: passwordRules.checkNotStartWithNumber},
                {ruleName: langMsg.passwordContainLetter, isEnabled: passwordRules.checkContainLetter}
            ];

            this.set('passwordRulesCollection', passwordRulesCollection);
        }

        if (usernameRules) {
            userNameRulesCollection = [
                {ruleName: langMsg.userNameValidLength.replace('[length]', [this.usernameRules.minLength, this.usernameRules.maxLength].join('-')), isEnabled: usernameRules.checkLength},
                {ruleName: langMsg.userNameContainAplhaNumeric, isEnabled: usernameRules.checkEngAlphaNumeric},
                {ruleName: langMsg.userNameNotStartNum, isEnabled: usernameRules.checkStartWithLetter},
                {ruleName: langMsg.userNameContainIdentical, isEnabled: usernameRules.checkIdenticalCharacter}
            ];

            this.set('userNameRulesCollection', userNameRulesCollection);
        }

        this.set('isUNameRulesMatch', this.isOnlyPwdCheck);
        this.checkUserNamePasswordRules();
    }.on('init'),

    checkUserNamePasswordRules: function () {
        var userName = this.get('userName');
        var password = this.get('password');
        var isPasswordAvailable = utils.validators.isAvailable(password);
        var isUserNameAvailable = utils.validators.isAvailable(userName);

        if (isUserNameAvailable && this.usernameRules) {
            this.set('isUNameRulesMatch', this.validateUserName(userName));
        } else {
            this.userNameRulesCollection.forEach(function (ruleObj) {
                Ember.set(ruleObj, 'satisfiedIcon', '');
            });

            this.set('isPwdSubmitDisabled', true);
        }

        if (isPasswordAvailable) {
            this.set('isPwdRulesMatch', this.validatePassword(password, userName));
        } else {
            this.passwordRulesCollection.forEach(function (ruleObj) {
                Ember.set(ruleObj, 'satisfiedIcon', '');
            });

            this.set('isPwdSubmitDisabled', true);
        }

        this.checkPwdSubmitEnabled();
    },

    checkPwdSubmitEnabled: function () {
        var isPwdSubmitDisabled = (this.get('isOnlyPwdCheck') || utils.validators.isAvailable(this.get('userName'))) && utils.validators.isAvailable(this.get('password')) && utils.validators.isAvailable(this.get('retypePwd'));
        this.set('isPwdSubmitDisabled', !isPwdSubmitDisabled);
    },

    usernamePasswordDidChange: function () {
        Ember.run.debounce(this, this.checkUserNamePasswordRules, 100);
        Ember.run.debounce(this, this.checkPwdSubmitEnabled, 100);
    }.observes('userName', 'password', 'retypePwd'),

    validatePassword: function (pwd, userName) {
        var pwdLength = this.passwordRules.checkLength ? this.passwordLength(pwd, this.passwordRules.maxLength, this.passwordRules.minLength, this.passwordRulesCollection[0]) : true;
        var pwdContainNumber = this.passwordRules.checkContainNumber ? this.passwordContainNumber(pwd, this.passwordRulesCollection[1]) : true;
        var pwdStartWithLetter = this.passwordRules.checkStartWithLetter ? this.passwordStartWithLetter(pwd, this.passwordRulesCollection[2]) : true;
        var pwdContainSmallLetter = this.passwordRules.checkContainSmallLetter ? this.passwordContainSmallLetter(pwd, this.passwordRulesCollection[3]) : true;
        var pwdContainCapitalLetter = this.passwordRules.checkContainCapitalLetter ? this.passwordContainCapitalLetter(pwd, this.passwordRulesCollection[4]) : true;
        var pwdIdenticalChar = this.passwordRules.checkIdenticalCharacter ? this.passwordIdenticalCharacter(pwd, this.passwordRulesCollection[5]) : true;
        // var pwdConsecutiveChar = this.passwordRules.checkConsecutiveCharacter ? this.passwordConsecutiveCharacter(pwd, this.passwordRulesCollection[6]) : true;
        var pwdSpecialChar = this.passwordRules.checkSpecialCharacter ? this.passwordSpecialCharacter(pwd, this.passwordRulesCollection[6]) : true;
        var pwdUsernameMatch = this.passwordRules.checkUsernameMatch ? this.passwordUserNameMatch(pwd, userName, this.passwordRulesCollection[7]) : true;
        var pwdOnlyAlphaNumeric = this.passwordRules.checkOnlyAlphaNumeric ? this.passwordOnlyAlphanumeric(pwd, this.passwordRulesCollection[8]) : true;
        var pwdNotStartWithNumber = this.passwordRules.checkNotStartWithNumber ? this.passwordNotStartWithNumber(pwd, this.passwordRulesCollection[9]) : true;
        var pwdContainLetter = this.passwordRules.checkContainLetter ? this.passwordContainLetter(pwd, this.passwordRulesCollection[10]) : true;

        return pwdLength && pwdContainNumber && pwdStartWithLetter && pwdContainSmallLetter && pwdContainCapitalLetter &&
            pwdIdenticalChar && pwdSpecialChar && pwdUsernameMatch && pwdOnlyAlphaNumeric && pwdNotStartWithNumber && pwdContainLetter;
    },

    validateUserName: function (username) {
        var unLength = this.usernameRules.checkLength ? this.passwordLength(username, this.usernameRules.maxLength, this.usernameRules.minLength, this.userNameRulesCollection[0]) : true;
        var unAlphaNumVal = this.usernameRules.checkEngAlphaNumeric ? this.usernameEngAlphaNumVal(username, this.userNameRulesCollection[1]) : true;
        var unStartWithLetter = this.usernameRules.checkStartWithLetter ? this.passwordStartWithLetter(username, this.userNameRulesCollection[2]) : true;
        var unIdenticalChar = this.usernameRules.checkIdenticalCharacter ? this.passwordIdenticalCharacter(username, this.userNameRulesCollection[3]) : true;

        return unLength && unAlphaNumVal && unStartWithLetter && unIdenticalChar;
    },

    passwordLength: function (password, max, min, ruleObj) {
        if (!(password.length >= min && password.length <= max)) {
            Ember.set(ruleObj, 'satisfiedIcon', 'down-fore-color glyphicon glyphicon-remove');

            return false;
        }

        Ember.set(ruleObj, 'satisfiedIcon', 'up-fore-color glyphicon glyphicon-ok');

        return true;
    },

    passwordContainNumber: function (password, ruleObj) {
        if (!(/\d/.test(password))) {
            Ember.set(ruleObj, 'satisfiedIcon', 'down-fore-color glyphicon glyphicon-remove');

            return false;
        }

        Ember.set(ruleObj, 'satisfiedIcon', 'up-fore-color glyphicon glyphicon-ok');

        return true;
    },

    passwordContainLetter: function (password, ruleObj) {
        if (!(/[a-zA-Z]/.test(password))) {
            Ember.set(ruleObj, 'satisfiedIcon', 'down-fore-color glyphicon glyphicon-remove');

            return false;
        }

        Ember.set(ruleObj, 'satisfiedIcon', 'up-fore-color glyphicon glyphicon-ok');

        return true;
    },

    passwordStartWithLetter: function (password, ruleObj) {
        if (!(/^[a-zA-Z]+$/.test(password.substring(0, 1)))) {
            Ember.set(ruleObj, 'satisfiedIcon', 'down-fore-color glyphicon glyphicon-remove');

            return false;
        }

        Ember.set(ruleObj, 'satisfiedIcon', 'up-fore-color glyphicon glyphicon-ok');

        return true;
    },

    passwordNotStartWithNumber: function (password, ruleObj) {
        if ((/^[0-9]+$/.test(password.substring(0, 1)))) {
            Ember.set(ruleObj, 'satisfiedIcon', 'down-fore-color glyphicon glyphicon-remove');

            return false;
        }

        Ember.set(ruleObj, 'satisfiedIcon', 'up-fore-color glyphicon glyphicon-ok');

        return true;
    },

    passwordOnlyAlphanumeric: function (password, ruleObj) {
        if (!(/^[a-zA-Z0-9]+$/.test(password))) {
            Ember.set(ruleObj, 'satisfiedIcon', 'down-fore-color glyphicon glyphicon-remove');

            return false;
        }

        Ember.set(ruleObj, 'satisfiedIcon', 'up-fore-color glyphicon glyphicon-ok');

        return true;
    },

    passwordContainSmallLetter: function (password, ruleObj) {
        if (password.toUpperCase() !== password) {
            Ember.set(ruleObj, 'satisfiedIcon', 'up-fore-color glyphicon glyphicon-ok');

            return true;
        }

        Ember.set(ruleObj, 'satisfiedIcon', 'down-fore-color glyphicon glyphicon-remove');

        return false;
    },

    passwordContainCapitalLetter: function (password, ruleObj) {
        if (password.toLowerCase() !== password) {
            Ember.set(ruleObj, 'satisfiedIcon', 'up-fore-color glyphicon glyphicon-ok');

            return true;
        }

        Ember.set(ruleObj, 'satisfiedIcon', 'down-fore-color glyphicon glyphicon-remove');

        return false;
    },

    passwordIdenticalCharacter: function (password, ruleObj) {
        if (/([\w\\])\1{2}/.test(password)) {
            Ember.set(ruleObj, 'satisfiedIcon', 'down-fore-color glyphicon glyphicon-remove');

            return false;
        }

        Ember.set(ruleObj, 'satisfiedIcon', 'up-fore-color glyphicon glyphicon-ok');

        return true;
    },

    passwordSpecialCharacter: function (password, ruleObj) {
        if (/^[a-zA-Z0-9- ]*$/.test(password) === true) {
            Ember.set(ruleObj, 'satisfiedIcon', 'down-fore-color glyphicon glyphicon-remove');

            return false;
        }

        Ember.set(ruleObj, 'satisfiedIcon', 'up-fore-color glyphicon glyphicon-ok');

        return true;
    },

    passwordUserNameMatch: function (pwd, username, ruleObj) {
        if (pwd === username) {
            Ember.set(ruleObj, 'satisfiedIcon', 'down-fore-color glyphicon glyphicon-remove');

            return false;
        }

        Ember.set(ruleObj, 'satisfiedIcon', 'up-fore-color glyphicon glyphicon-ok');

        return true;
    },

    passwordConsecutiveCharacter: function (password, ruleObj) {
        var regex = /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)+/ig;

        if (regex.test(password)) {
            Ember.set(ruleObj, 'satisfiedIcon', 'down-fore-color glyphicon glyphicon-remove');

            return false;
        }

        Ember.set(ruleObj, 'satisfiedIcon', 'up-fore-color glyphicon glyphicon-ok');

        return true;
    },

    usernameEngAlphaNumVal: function (uName, ruleObj) {
        if (!(/^[a-zA-Z0-9- ]*$/.test(uName))) {
            Ember.set(ruleObj, 'satisfiedIcon', 'down-fore-color glyphicon glyphicon-remove');

            // this.set('message', 'User Name must contain only English aplha-numeric characters');
            return false;
        }

        Ember.set(ruleObj, 'satisfiedIcon', 'up-fore-color glyphicon glyphicon-ok');

        return true;
    }
});
