import Ember from 'ember';
import sharedService from '../models/shared/shared-service';
import utils from '../utils/utils';
import appConfig from '../config/app-config';

export default (function () {
    var NumberScale = {
        Thousand: 'K',
        Million: 'M',
        Billion: 'B',
        Trillion: 'T'
    };

    /* *
     * Convert time stamp in milliseconds to UTC
     * @param milliSeconds Timestamp in milliseconds
     * @returns {number} Time stamp in milliseconds converted to UTC
     */
    var convertToUTCTimestamp = function (milliSeconds) {
        var date = new Date(milliSeconds);

        return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
            date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds());
    };

    /* *
     * Convert time stamp in milliseconds to UTC Date (GMT 0)
     * @param milliSeconds Timestamp in milliseconds
     * @param offset Offset, Format: x.y (Ex: 2, 2.0, 5.5)
     * @returns {Date} Javascript Date Object converted to UTC
     */
    var convertToUTCDate = function (milliSeconds, offset) {
        var date = new Date(milliSeconds);
        var gmtDate = new Date(date.valueOf() + (date.getTimezoneOffset() * 60000));

        if (offset) {
            return adjustToTimezone(gmtDate, offset);
        } else {
            return gmtDate;
        }
    };

    /* *
     * Convert unicode string to native string
     * @param unicodeString Unicode string
     * @returns {*} Converted native string
     */
    var convertUnicodeToNativeString = function (unicodeString) {
        if (unicodeString) {
            return unicodeString.replace(/\\u[\dABCDEFabcdef][\dABCDEFabcdef][\dABCDEFabcdef][\dABCDEFabcdef]/g,
                function (match) {
                    return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
                });
        }

        return unicodeString;
    };

    /* *
     * Convert date and / or time to Javascript Date object
     * @param dateTimeString Date and / or time string, Format: yyyyMMdd / yyyyMMdd HHmmss / yyyyMMddHHmmss / HHmmss
     * @returns {*} Converted Javascript Date object if valid date and / or time string, undefined otherwise
     */
    var convertStringToDate = function (dateTimeString) {
        var date;

        if (utils.validators.isAvailable(dateTimeString)) {
            var dateTimeParts = dateTimeString.trim().split(utils.Constants.StringConst.Space);

            if (dateTimeParts.length > 0) {
                var isWithTime;
                var year, month, day, hour, minutes, seconds;
                var dateOrTimePart = dateTimeParts[0];

                if (dateOrTimePart.length === 8) {
                    isWithTime = false;

                    year = dateOrTimePart.substring(0, 4);
                    month = parseInt(dateOrTimePart.substring(4, 6), 10) - 1; // Javascript month is zero (0) based
                    day = dateOrTimePart.substring(6, 8);
                } else if (dateOrTimePart.length === 6) {
                    var dateNow = new Date();
                    isWithTime = true;

                    hour = dateOrTimePart.substring(0, 2);
                    minutes = dateOrTimePart.substring(2, 4);
                    seconds = dateOrTimePart.substring(4, 6);

                    year = dateNow.getFullYear();
                    month = dateNow.getMonth();
                    day = dateNow.getDay();
                } else if (dateOrTimePart.length === 14) {
                    isWithTime = true;
                    year = dateOrTimePart.substring(0, 4);
                    month = parseInt(dateOrTimePart.substring(4, 6), 10) - 1; // Javascript month is zero (0) based
                    day = dateOrTimePart.substring(6, 8);

                    hour = dateOrTimePart.substring(8, 10);
                    minutes = dateOrTimePart.substring(10, 12);
                    seconds = dateOrTimePart.substring(12, 14);
                }

                if (dateTimeParts.length > 1) {
                    var timePart = dateTimeParts[1];
                    date = new Date(year, month, day, timePart.substring(0, 2), timePart.substring(2, 4), timePart.substring(4, 6));
                } else {
                    if (isWithTime) {
                        date = new Date(year, month, day, hour, minutes, seconds);
                    } else {
                        date = new Date(year, month, day);
                    }
                }
            }
        }

        return date;
    };

    /* *
     * Format date to display format
     * Display format will be taken from application configuration file
     * @param date object
     */
    var convertToDisplayTimeFormat = function (datetime, format) {
        var dateTimeFormat = format ? format : sharedService.userSettings.displayFormat.timeFormat;

        return datetime ? utils.moment(datetime).format(dateTimeFormat) : sharedService.userSettings.displayFormat.noValue;
    };

    /* *
     * Format date to display format
     * Display format will be taken from application configuration file
     * @param date Date String, Format: yyyyMMdd
     * @param exg Required time zone exchange
     */
    var formatToDate = function () {
        // This function should be implemented by application in order use
    };

    /* *
     * Format time to display format
     * Display format will be taken from application configuration file
     * @param time Time String, Format: HHmmss
     * @param exg Required time zone exchange
     */
    var formatToTime = function () {
        // This function should be implemented by application in order use
    };

    /* *
     * Format date time to display format
     * Display format will be taken from application configuration file
     * @param dateTime Date time String, Format: yyyyMMdd HHmmss
     * @param exg Required time zone exchange
     */
    var formatToDateTime = function () {
        // This function should be implemented by application in order use
    };

    var formatToDateTimeMinute = function () {

    };

    /* *
     * Format date time to display format
     * Display format will be taken from application configuration file
     * @param dateTime Date time String, Format: ddMM HHmmss
     * @param exg Required time zone exchange
     */
    var formatToDayMonthTime = function () {
        // This function should be implemented by application in order use
    };

    /* *
     * Format javascript date to display format
     * Display format will be taken from application configuration file
     * @param dateTime javascript date object
     */
    var formatDateToDisplayDate = function (date, resetTime, dateSeperator, timeSeperator, dateTimeSeperator) {
        var dSeperator = dateSeperator ? dateSeperator : '';
        var tSeperator = timeSeperator ? timeSeperator : '';
        var dTSeperator = dateTimeSeperator ? dateTimeSeperator : '';

        var editedDate = convertToTwoDigits([date.getFullYear(), date.getMonth() + 1, date.getDate()]).join(dSeperator);
        var editedTime = resetTime ? '000000' : convertToTwoDigits([date.getHours(), date.getMinutes(), date.getSeconds()]).join(tSeperator);

        return date ? [editedDate, editedTime].join(dTSeperator) : sharedService.userSettings.displayFormat.noValue;
    };

    /* *
     * Format number to given decimal places and separate each 3 digits by commas
     * @param value Number to format
     * @param decimalPlaces Number of decimal places
     * @returns {*} Number formatted to given decimal places and commas added
     */
    var formatNumber = function (value, decimalPlaces) {
        if (!isNaN(value) && Ember.$.trim(value) !== '') {
            if (decimalPlaces >= 0) {
                return _formatNumberToDisplay(value, decimalPlaces);
            } else {
                return value;
            }
        } else {
            return sharedService.userSettings.displayFormat.noValue;
        }
    };

    /* *
     * Format number to given decimal places and separate each 3 digits by commas and add percentage symbol (%)
     * @param value Number to format
     * @param decimalPlaces Number of decimal places
     * @returns {*} Number formatted to given decimal places and commas and percentage symbol (%) added
     */
    var formatNumberPercentage = function (value, decimalPlaces) {
        if (!isNaN(value) && Ember.$.trim(value) !== '') {
            return formatNumber(value, decimalPlaces) + '%';
        } else {
            return sharedService.userSettings.displayFormat.noValue;
        }
    };

    /* *
     * Divide numbers to factors of thousands. Ex: million, billion etc.
     * @param value Number to format
     * @param decimalPlaces Number of decimal places
     * @returns {string} Number divided and suffix added
     */
    var divideNumber = function (value, decimalPlaces) {
        var val = value;
        var valAbs = Math.abs(value);
        var defaultNoOfDecimals = 2;    // This is used for client side calc to show M, B etc.
        var noOfDecimals = decimalPlaces !== undefined ? decimalPlaces : sharedService.userSettings.displayFormat.decimalPlaces;

        if (!isNaN(val) && Ember.$.trim(val) !== '') {
            var suffix = '';

            if (valAbs >= Math.pow(10, 12)) {            // Trillion
                val = val / Math.pow(10, 12);
                suffix = NumberScale.Trillion;
            } else if (valAbs >= Math.pow(10, 9)) {      // Billion
                val = val / Math.pow(10, 9);
                suffix = NumberScale.Billion;
            } else if (valAbs >= Math.pow(10, 6)) {      // Million
                val = val / Math.pow(10, 6);
                suffix = NumberScale.Million;
            } else if (valAbs >= Math.pow(10, 3)) {      // Thousand
                val = val / Math.pow(10, 3);
                suffix = NumberScale.Thousand;
            }

            return parseFloat(val).toFixed(noOfDecimals >= 0 ? noOfDecimals : defaultNoOfDecimals) + ' ' + (suffix ? suffix : '');
        } else {
            return sharedService.userSettings.displayFormat.noValue;
        }
    };

    /* *
     * Multiply number by the given factor
     * @param value Number to format
     * @param factor Multiplication factor
     * @param decimalPlaces Number of decimal places
     * @returns {string} Number multiplied and format to given decimal places
     */
    var multiplyNumber = function (value, factor, decimalPlaces) {
        var noOfDecimals = decimalPlaces !== undefined ? decimalPlaces : sharedService.userSettings.displayFormat.decimalPlaces;
        var multiFactor = factor !== undefined ? factor : 1;
        var val = value !== undefined ? value : 0.0;

        return (val * multiFactor).toFixed(noOfDecimals);
    };

    /* *
     * Multiply number by the given factor and add percentage sign
     * @param value Number to format
     * @param factor Multiplication factor
     * @param decimalPlaces Number of decimal places
     * @returns {string} Number multiplied and format to given decimal places
     */
    var multiplyNumberPercentage = function (value, factor, decimalPlaces) {
        return multiplyNumber(value, factor, decimalPlaces) + '%';
    };

    /* *
     * Adjust date / time object to timezone
     * @param date Javascript Date object
     * @param offset Offset, Format: x.y (Ex: 2, 2.0, 5.5)
     * @returns {*} Timezone adjusted Date object
     */
    var adjustToTimezone = function (date, offset) {
        if (date && offset) {
            date.setTime(date.getTime() + (offset * 3600000)); // 60 * 60 * 1000
        }

        return date;
    };

    var getAdjustedDateTime = function (dateTime, offset) {
        var timeOffset = offset ? offset : 0;
        var dateObj = convertStringToDate(dateTime);

        return adjustToTimezone(dateObj, timeOffset);
    };

    var convertDateObj = function (date) {
        return convertDateFields(date.getFullYear(), date.getMonth(), date.getDate());
    };

    var convertDateFields = function (year, month, day) {
        var date = convertToTwoDigits([month + 1, day]);
        return {year: year, month: date[0], day: date[1]};
    };

    var _formatNumberToDisplay = function (value, decimalPlaces) {
        var noOfDecimals = decimalPlaces;
        var roundedNum = _roundNumber(value, noOfDecimals);
        var wholeNum = (roundedNum.split('.')[0]).toString();
        var wholeNumWithoutMinus;

        if (wholeNum.charAt(0) === '-') {
            wholeNumWithoutMinus = wholeNum.substring(1, wholeNum.length);
        } else {
            wholeNumWithoutMinus = wholeNum;
        }

        var formWholeNum = '';
        var thousandSeperator = appConfig.customisation.thousandSeperator;  // Empty string is not accepted for thousand seperator

        for (var i = wholeNumWithoutMinus.length; i > 0; i -= 3) {
            formWholeNum = thousandSeperator + wholeNumWithoutMinus.substring(i - 3, i) + formWholeNum;
        }

        var formNum = formWholeNum.substring(1, formWholeNum.length);

        if ((roundedNum.toString().split('.')).length > 1) {
            formNum = formNum + '.' + roundedNum.toString().split('.')[1];
        } else {
            if (noOfDecimals > 0) {
                formNum += '.';

                while (noOfDecimals > 0) {
                    formNum += '0';
                    noOfDecimals--;
                }
            }
        }

        if (wholeNum.charAt(0) === '-') {
            formNum = '-' + formNum;
        }

        if (formNum === 'NaN' || formNum.indexOf('NaN') >= 0) {
            formNum = sharedService.userSettings.displayFormat.noValue;
        }

        return formNum;
    };

    var _roundNumber = function (value, decimalPlaces) {
        var num = parseFloat(Ember.$.trim(value));
        var result = _toFixed((Math.round(num * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces)));

        var numParts = result.split('.');
        if (numParts.length > 1) {
            var floatNum = numParts[1];

            if (floatNum.length < decimalPlaces) {
                for (var i = 0; i < (decimalPlaces - floatNum.length); i++) {
                    result += '0';
                }
            }
        }

        return result;
    };

    var _toFixed = function (x) {
        var e;
        var value = x;

        if (Math.abs(value) < 1.0) {
            e = parseInt(value.toString().split('e-')[1], 10);

            if (e) {
                value *= Math.pow(10, e - 1);
                value = '0.' + (new Array(e)).join('0') + value.toString().substring(2); // NOSONAR
            }
        } else {
            e = parseInt(value.toString().split('+')[1], 10);

            if (e > 20) {
                e -= 20;
                value /= Math.pow(10, e);
                value += (new Array(e + 1)).join('0'); // NOSONAR
            }
        }

        return value.toString();
    };

    // TODO: [Bashitha] This is a temporary fix to format single digit numbers to 2 digit numbers
    var convertToTwoDigits = function (valArray) {
        return valArray.map(function (val) {
            return val < 10 ? '0' + val : val;
        });
    };

    //
    // Chart specific conversions
    //

    var generateChartBeginDateString = function (chartCategory) {
        if (utils.chartConstants.ChartCategory.Intraday.ID === chartCategory.ID) {
            return generateIntradayBeginDateString(utils.chartConstants.ChartCategory.Intraday.DefaultDataRequestDuration);
        } else {
            return generateHistoryBeginDateString(utils.chartConstants.ChartCategory.History.DefaultDataRequestDuration, 0); // 0 months
        }
    };

    var generateChartEndDateString = function (chartCategory) {
        if (utils.chartConstants.ChartCategory.Intraday.ID === chartCategory.ID) {
            return generateIntradayEndDateString();
        } else {
            return generateHistoryEndDateString();
        }
    };

    var generateIntradayBeginDateString = function (days) {
        var date = new Date();

        if (days === utils.chartConstants.ChartDefaultDataPeriod.Month) {
            date.setMonth(date.getMonth() - 1);
        } else {
            date.setDate(date.getDate() - days);
        }

        return convertDateToString(date);
    };

    var generateIntradayEndDateString = function () {
        var date = new Date();

        return convertDateToString(date);
    };

    var generateHistoryBeginDateString = function (years, months) {
        var date = new Date();

        date.setYear(date.getFullYear() - years);
        date.setMonth(date.getMonth() - months);
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);
        return convertDateToString(date);
    };

    var generateHistoryEndDateString = function () {
        var date = new Date();
        date.setHours(0);
        date.setMinutes(0);
        date.setSeconds(0);

        return convertDateToString(date);
    };

    /* *
     * Format date to mix date format
     * @param date JavaScript Date Obj
     * @return date string, Format yyyyMMddHHmmss
     */
    var convertDateToString = function (date) {
        if (!date) {
            return undefined;
        }

        return date.getFullYear() +
            _fillDateString(date.getMonth() + 1) +
            _fillDateString(date.getDate()) +
            _fillDateString(date.getHours()) +
            _fillDateString(date.getMinutes()) +
            _fillDateString(date.getSeconds());
    };

    var _fillDateString = function (value) {
        return (value < 10 ? '0' : '') + value;
    };

    /* *
     * Get decimal places
     */
    var getDecimalPlaces = function (value) {
        var decimalPlaces = 0;

        if (value) {
            if (Math.floor(value) === value) {
                return decimalPlaces;
            }

            var valueArray = value.toString().split('.');

            if (valueArray.length > 1) {
                decimalPlaces = valueArray[1].length;
            }
        }

        return decimalPlaces;
    };

    var convertBase64toHEX = function (base64) {
        var row = atob(base64);
        var hexArray = [];

        for (var index = 0; index < row.length; index++) {
            var hexText = row.charCodeAt(index).toString(16);
            hexArray[hexArray.length] = (hexText.length === 2 ? hexText : '0' + hexText);
        }

        return hexArray.join('');
    };

    /* *
     * Format date to transfer format
     * @param date JavaScript Date Obj
     * @return date string, Format yyyyMMdd
     */
    var convertToTransferFormat = function (date) {
        return date ? convertToDisplayTimeFormat(date, 'YYYYMMDD') : '';
    };

    return {
        convertToUTCTimestamp: convertToUTCTimestamp,
        convertStringToDate: convertStringToDate,
        convertDateToString: convertDateToString,
        convertToDisplayTimeFormat: convertToDisplayTimeFormat,
        getAdjustedDateTime: getAdjustedDateTime,
        convertUnicodeToNativeString: convertUnicodeToNativeString,
        adjustToTimezone: adjustToTimezone,
        formatToDate: formatToDate,
        formatToTime: formatToTime,
        formatToDateTime: formatToDateTime,
        formatNumber: formatNumber,
        formatToDateTimeMinute: formatToDateTimeMinute,
        formatToDayMonthTime: formatToDayMonthTime,
        formatNumberPercentage: formatNumberPercentage,
        divideNumber: divideNumber,
        multiplyNumber: multiplyNumber,
        multiplyNumberPercentage: multiplyNumberPercentage,
        convertToUTCDate: convertToUTCDate,
        formatDateToDisplayDate: formatDateToDisplayDate,
        generateChartBeginDateString: generateChartBeginDateString,
        generateChartEndDateString: generateChartEndDateString,
        generateIntradayBeginDateString: generateIntradayBeginDateString,
        generateIntradayEndDateString: generateIntradayEndDateString,
        generateHistoryBeginDateString: generateHistoryBeginDateString,
        generateHistoryEndDateString: generateHistoryEndDateString,
        getDecimalPlaces: getDecimalPlaces,
        convertDateObj: convertDateObj,
        convertDateFields: convertDateFields,
        convertBase64toHEX: convertBase64toHEX,
        convertToTransferFormat: convertToTransferFormat,
        convertToTwoDigits: convertToTwoDigits
    };
})();
