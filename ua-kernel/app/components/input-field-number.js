import Ember from 'ember';
import InputFieldText from './input-field-text';
import utils from '../utils/utils';
import appConfig from '../config/app-config';

export default InputFieldText.extend({
    decimalPlaces: 0,
    typedDecimal: 0,
    numValue: undefined,

    // If the mapped field has an initial value, this should be added to input display value
    onReady: function () {
        this._super();
        this._formatNumber(this.get('decimalPlaces'));

        if (appConfig.customisation.isMobile || (appConfig.customisation.isTablet && Ember.isIos)) {
            var that = this;
            var elementId = '#' + that.get('id');
            var inputElement = Ember.$(elementId);

            inputElement.bind('touchstart', function () {
                if (!inputElement.attr('disabled') && !inputElement.prop('disabled')) {
                    that.set('type', 'number');
                }
            });

            if (!Ember.isIos) {
                var scrollToView = this.scrollToView.bind(this);
                window.addEventListener('resize', scrollToView);
            }
        }
    }.on('didInsertElement'),

    resetValue: function () {
        this._formatNumber(this.get('decimalPlaces'));
    }.observes('numValue'),

    keyDown: function (event) {
        var keyCode = event.keyCode;
        var KeyCodeEnum = utils.Constants.KeyCodes;

        // TODO: [satheeq] Optimize this validation
        // Allow: backspace, delete, tab, escape, and enter
        if (keyCode === KeyCodeEnum.Backspace || keyCode === KeyCodeEnum.Delete || keyCode === KeyCodeEnum.Tab ||
            keyCode === KeyCodeEnum.Escape || keyCode === KeyCodeEnum.Enter ||
                // Allow: Ctrl+A
            (keyCode === KeyCodeEnum.A && event.ctrlKey === true) ||
                // Allow: home, end, left, right
            keyCode === KeyCodeEnum.Home || keyCode === KeyCodeEnum.End || keyCode === KeyCodeEnum.LeftArrow || keyCode === KeyCodeEnum.RightArrow ||
                // Allow '.' (110,190) while decimal places > 0
            (this._isPeriod(keyCode) && this.get('decimalPlaces') !== 0)) {
            // let it happen, don't do anything
            return;
        } else {
            // Ensure that it is a number and stop the key-press
            if (event.shiftKey || (keyCode < KeyCodeEnum.Num_0 || keyCode > KeyCodeEnum.Num_9) && (keyCode < KeyCodeEnum.Numpad_0 || keyCode > KeyCodeEnum.Numpad_9)) {
                event.preventDefault();
            }
        }
    },

    keyUp: function (event) {
        var keyCode = event.keyCode;

        if (navigator.userAgent.match(/Android/i)) {
            var inputValue = this.get('value');
            keyCode = keyCode || event.which;

            if (keyCode === 0 || keyCode === 229) {
                keyCode = inputValue.charCodeAt(inputValue.length - 1);
            }
        }

        if (!this._isPeriod(keyCode)) {
            var number;
            var value = this.get('value');
            var deci = this.get('decimalPlaces');

            if (utils.validators.isAvailable(value)) {
                if (!value.replace) {
                    value = value.toString();
                }

                value = value.replace(/,/g, '');

                var periodIndex = value.indexOf('.');
                deci = deci === -1 || periodIndex >= 0 ? deci : deci !== undefined ? 0 : undefined;

                if (deci === 0 || deci === undefined) {
                    number = parseInt(value, 10);
                } else if (deci === -1) {
                    number = value;
                } else {
                    number = parseFloat(value);
                    deci = value.substring(periodIndex, value.length).length - 1;
                }

                this.set('numValue', !isNaN(number) ? number : '');
                this.set('typedDecimal', deci);

                this._formatNumber(deci);
            } else {
                this.set('numValue', '');
            }
        }
    },

    focusIn: function () {
        var that = this;
        this.set('isElementFocused', true);

        if (appConfig.customisation.isMobile || appConfig.customisation.isTablet) {
            var value = this.get('value');
            var valueLength = value ? isNaN(value) ? value.length : value.toString().length : 1;

            this.set('value', this.get('numValue'));

            Ember.run.later(function () {
                if (Ember.isIos) {
                    that.scrollToView();

                    try {
                        that.element.selectionStart = 0;  // This is to select text when focus in IOS.

                        if (valueLength) {
                            that.element.selectionEnd = valueLength;  // This is set only if there is a valueLength.
                        }
                    } catch (e) {
                        utils.logger.logError(e);
                    }
                } else {
                    that.$().select();  // This is to select text when focus in Other OS.
                }
            }, 500);
        }

        this._super();
    },

    focusOut: function () {
        this._pullLayout();
        this.set('type', 'text');

        var decimalPlaces = this.get('decimalPlaces') > 0 ? this.get('decimalPlaces') : this.get('typedDecimal');

        this._formatNumber(decimalPlaces);
        this.set('isElementFocused', false);
    },

    _formatNumber: function (decimal) {
        var number = this.get('numValue');

        if (this.get('type') === 'text') {
            if (utils.validators.isAvailable(number)) {
                this.set('value', !this.isRemoveFormatting ? utils.formatters.formatNumber(number, decimal) : number);
            } else if (appConfig.customisation.isMobile) {
                // This is to reset value in Mobile
                if (!this.get('isClearDefault')) {
                    this.set('value', utils.formatters.formatNumber(0, decimal));
                }

                if (this.get('isSetEmpty')) {
                    this.set('value', '');
                }
            } else {
                // This is to reset value
                this.set('value', '');
            }
        }
    },

    clearDefaultNumber: function () {
        if (this.get('isClearDefault')) {
            this.set('value', '');
        }
    }.observes('isClearDefault'),

    _isPeriod: function (keyCode) {
        var keyCodes = utils.Constants.KeyCodes;
        var decimalPoint = keyCodes.DecimalPoint;

        if (appConfig.customisation.isMobile || appConfig.customisation.isTablet) {
            decimalPoint = keyCodes.DecimalPointMobile;
        }

        return (keyCode === decimalPoint || keyCode === keyCodes.Period);
    },

    _getCaretPosition: function () {
        if (document.selection && document.selection.createRange) {
            return document.selection.createRange();
        } else if (window.getSelection) {
            var sel = window.getSelection();

            if (sel.getRangeAt && sel.rangeCount) {
                return sel.getRangeAt(0);
            }
        }
    },

    _setCaretPosition: function (range) {
        if (range) {
            if (document.selection && range.select) {
                range.select();
            } else if (window.getSelection) {
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }
});