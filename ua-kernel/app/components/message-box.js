import Ember from 'ember';
import layout from '../templates/components/message-box';
import appConfig from '../config/app-config';
import utils from '../utils/utils';

// TODO: [SAHAN] Find a better way to get language.
import LanguageDataStore from '../models/shared/language/language-data-store';

export default Ember.Component.extend({
    enabled: false,
    messageBoxClass: '',
    buttons: [],
    layout: layout,

    onButtonClick: function (index) {
        this.set('enabled', false);
        var buttons = this.get('buttons');

        // Set 2 to buttonIndex if 0 coming as the index
        // 0 coming as the index = User touch out side the dialog in native device
        // buttonIndex = 2 (Relevant to dialog cancel action)
        var buttonIndex = index ? index : 2;

        if (buttonIndex > 0 && Ember.$.isFunction(buttons[buttonIndex - 1].btnAction)) {
            buttons[buttonIndex - 1].btnAction();       // Index of button is the 1 / 2 based
        }
    },

    actions: {
        showMessageBox: function (messageType, message, title, buttons, listItems, closeButtonAction) {
            if (!this.get('enabled')) {
                var languageObj = LanguageDataStore.getLanguageObj();
                var that = this;

                if (title) {
                    this.set('title', title);
                } else {
                    switch (messageType) {
                        case utils.Constants.MessageTypes.Error:
                            this.set('title', languageObj.lang.labels.error);
                            break;

                        case utils.Constants.MessageTypes.Warning:
                            this.set('title', languageObj.lang.labels.warning);
                            break;

                        case utils.Constants.MessageTypes.Info:
                            this.set('title', languageObj.lang.labels.information);
                            break;

                        case utils.Constants.MessageTypes.Question:
                            this.set('title', languageObj.lang.labels.question);
                            break;
                    }
                }

                var buttonsStringArray = []; // Used for native mobile messages

                if (buttons) {
                    this.set('buttons', []);

                    Ember.$.each(buttons, function (index, indexObject) {
                        var button = {
                            displayText: languageObj.lang.labels[indexObject.type],
                            btnAction: indexObject.btnAction
                        };

                        that.get('buttons').push(button);

                        if (navigator.isNativeDevice) {
                            buttonsStringArray.push(button.displayText);
                        }
                    });
                } else {
                    this.set('buttons', [{displayText: languageObj.lang.labels.ok}]);

                    if (navigator.isNativeDevice) {
                        buttonsStringArray.push(languageObj.lang.labels.ok);
                    }
                }

                this.set('messageBoxClass', 'message-box-icon-class-' + messageType);
                this.set('message', message);
                this.set('listItems', listItems);

                if (navigator.isNativeDevice && !appConfig.customisation.isTablet) {
                    var notificationTitle = this.get('title');
                    var clickEventHandler = this.onButtonClick.bind(this);

                    navigator.notification.confirm(
                        message,            // Message
                        clickEventHandler, // Callback to invoke with index of button pressed
                        notificationTitle,  // Title
                        buttonsStringArray  // ButtonLabels
                    );
                } else {
                    this.set('enabled', true);
                }

                if (closeButtonAction) {
                    this.set('closeButtonAction', closeButtonAction);
                }
            }
        },

        closeMessageBox: function () {
            var closeButtonAction = this.get('closeButtonAction');

            if (Ember.$.isFunction(closeButtonAction) && this.get('enabled')) {
                this.set('enabled', false);
                closeButtonAction();
            } else {
                this.set('enabled', false);
            }
        },

        onButtonClick: function (index) {
            this.onButtonClick(index + 1); // Button index is 1 / 2 based
        }
    }
});