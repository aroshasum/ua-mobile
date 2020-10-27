import InputFieldText from './input-field-text';
import utils from '../utils/utils';

export default InputFieldText.extend({
    isArField: false,

    keyDown: function (event) {
        var keyCode = event.keyCode;
        var KeyCodeEnum = utils.Constants.KeyCodes;

        // Allow: backspace, delete, tab, escape, and enter
        if (keyCode === KeyCodeEnum.Backspace || keyCode === KeyCodeEnum.Delete || keyCode === KeyCodeEnum.Tab ||
            keyCode === KeyCodeEnum.Escape || keyCode === KeyCodeEnum.Enter ||
                // Allow: Ctrl+A
            (keyCode === KeyCodeEnum.A && event.ctrlKey === true) ||
                // Allow: home, end, left, right
            keyCode === KeyCodeEnum.Home || keyCode === KeyCodeEnum.End || keyCode === KeyCodeEnum.LeftArrow || keyCode === KeyCodeEnum.RightArrow) {
            // let it happen, don't do anything
            return true;
        } else if (this.get('isArField')) {
            if (/[^\u0621-\u064A ]/g.test(event.key)) { // Allow Arabic characters only
                event.preventDefault();
            }
        } else if (/^[a-zA-Z]+$/.test(event.key)) {
            if (/[^A-Za-z ]/g.test(event.key)) { // Allow English characters only in English keyboard
                event.preventDefault();
            }
        } else if (/^[\u0621-\u064A]+$/.test(event.key)) {
            if (/[^\u0621-\u064A ]/g.test(event.key)) { // Allow Arabic characters only in Arabic keyboard
                event.preventDefault();
            }
        } else {
            // Ensure that it is a number and stop the key-press
            if ((keyCode >= KeyCodeEnum.Num_0 && keyCode <= KeyCodeEnum.Num_9) ||
                (keyCode >= KeyCodeEnum.NumPadCharStart && keyCode <= KeyCodeEnum.NumPadCharEnd) ||
                (keyCode >= KeyCodeEnum.SpecialCharStart_1 && keyCode <= KeyCodeEnum.SpecialCharEnd_1) ||
                (keyCode >= KeyCodeEnum.SpecialCharStart_2 && keyCode <= KeyCodeEnum.SpecialCharEnd_2)) {
                event.preventDefault();
            }
        }
    }
});
