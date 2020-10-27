import Ember from 'ember';
import utils from '../utils/utils';
import appConfig from '../config/app-config';

export default Ember.TextField.extend({
    isTablet: appConfig.customisation.isTablet,

    focusIn: function () {
        var that = this;

        // TODO [Anushka] Check the usage of below functionality of multiple input fields across devices
        if (this.isTablet && Ember.isIos) {
            var value = this.get('value');
            var valueLength = value ? isNaN(value) ? value.length : value.toString().length : 1;

            this.set('isElementFocused', true);

            Ember.run.later(function () {
                that.scrollToView();

                try {
                    that.element.selectionStart = 0;  // This is to select text when focus in IOS.

                    if (valueLength) {
                        that.element.selectionEnd = valueLength;  // This is set only if there is a valueLength.
                    }
                } catch (e) {
                    utils.logger.logError(e);
                }
            }, 500);
        } else {
            this._pushLayout();
        }

        this._super();
        this.$().select();
    },

    scrollToView: function () {
        if (!this.isTablet) {
            var elementName = 'div[name=' + this.get('elementName') + ']';

            if (!this.get('isScrollDisabled') && this.get('isElementFocused') && elementName && Ember.$(elementName).get(0)) {
                Ember.$(elementName).get(0).scrollIntoView();
            }
        }
    },

    _pushLayout: function () {
        if (this.isTablet && Ember.isAndroid) {
            var elementPosition;
            var inputElement = Ember.$('#' + this.get('id'));
            var windowHeight = window.innerHeight;

            if (windowHeight && inputElement && inputElement.offset()) {
                var elementTopHeight = inputElement.offset().top;
                elementPosition = (elementTopHeight / windowHeight) * 100;
            }

            if (elementPosition && elementPosition > 42) {
                Ember.$('body').addClass('push-up-layout');
            }
        }
    },

    _pullLayout: function () {
        if (this.isTablet) {
            Ember.$('body').removeClass('push-up-layout');
        }
    },

    focusOut: function () {
        this._super();
        this._pullLayout();
        this.sendAction('onFocusOut');
    },

    keyPress: function () {
        this._super();
        this.sendAction('onKeyPress');
    },

    keyDown: function (event) {
        this._super();
        this.sendAction('onKeyDown', event);
    },

    keyUp: function (event) {
        this._super(event);
        this.sendAction('onKeyUp', event);
    }
});