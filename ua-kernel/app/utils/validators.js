import Constants from '../utils/constants';

export default (function () {
    /* *
     * Checks whether string is undefined, null or empty
     * @param value String to validate
     * @returns {boolean} True if string is not undefined, not null and not empty, false otherwise
     */
    var isAvailable = function (value) {
        var valid = false;

        if (value !== undefined && value !== null) {
            if (value.trim) {
                valid = value.trim() !== Constants.StringConst.Empty;
            } else {
                valid = true;
            }
        }

        return valid;
    };

    /* *
     * Checks whether string represents a valid email address
     * @param value String to validate
     * @returns {boolean} True if string is a valid email address, false otherwise
     */
    var isEmail = function (value) {
        var valid = false;
        var pattern = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

        if (value.match(pattern)) {
            valid = true;
        }

        return valid;
    };

    return {
        isAvailable: isAvailable,
        isEmail: isEmail
    };
})();
