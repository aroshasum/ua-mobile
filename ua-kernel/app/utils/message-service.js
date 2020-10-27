import Ember from 'ember';

export default Ember.Object.extend({
    titleBar: null,

    showMessage: function (message, messageType, isTitle, title, buttons, listItems, closeButtonAction) {
        if (isTitle) {
            var titleBar = this.get('titleBar');

            if (titleBar) {
                titleBar.showMessage(message, messageType);
            }
        } else {
            var messageBox = Ember.View.views['message-box'];

            messageBox.send('showMessageBox', messageType, message, title, buttons, listItems, closeButtonAction);
        }
    },

    hideMessage: function () {
        var messageBox = Ember.View.views['message-box'];

        if (messageBox) {
            messageBox.send('closeMessageBox');
        }
    }
}).create();