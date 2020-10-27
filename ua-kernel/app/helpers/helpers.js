import Ember from 'ember';
import utils from '../utils/utils';
import appConfig from '../config/app-config';
import TableComponent from '../components/table/table-component';
import BootstrapDropdownSelect from '../components/bootstrap-dropdown-select';
import BootstrapIconDropdown from '../components/bootstrap-icon-dropdown';
import LinkDropdown from '../components/link-dropdown';
import WidgetHeader from '../components/widget-header';
import languageDataStore from '../models/shared/language/language-data-store';
import sharedService from '../models/shared/shared-service';

/* *
 * Divide numbers to factors of thousands. Ex: million, billion etc.
 * @param value Number to format
 * @param decimalPlaces Number of decimal places
 * @returns {string} Number divided and suffix added
 */
Ember.Handlebars.helper('divideNumber', function (value, decimalPlaces) {
    var noOfDecimals = !isNaN(decimalPlaces) ? decimalPlaces : sharedService.userSettings.displayFormat.decimalPlaces;
    var val = (value === 0 || isNaN(value)) ? 0.0 : value;

    var formatted = val || val === 0 ? utils.formatters.divideNumber(val, noOfDecimals) : '';

    return new Ember.Handlebars.SafeString(formatted);
});

/* *
 * Multiply numbers by a factor.
 * @param value Number to format
 * @param factor Multiplication factor
 * @param decimalPlaces Number of decimal places
 * @returns {string} Number multiplied and format to given decimal places
 */
Ember.Handlebars.helper('multiplyNumber', function (value, factor, decimalPlaces) {
    var noOfDecimals = !isNaN(decimalPlaces) ? decimalPlaces : sharedService.userSettings.displayFormat.decimalPlaces;
    var val = (value === 0 || isNaN(value)) ? 0.0 : value;

    var formatted = val || val === 0 ? utils.formatters.multiplyNumber(val, factor, noOfDecimals) : '';

    return new Ember.Handlebars.SafeString(formatted);
});

/* *
 * Multiply numbers by a factor and percentage sign.
 * @param value Number to format
 * @param factor Multiplication factor
 * @param decimalPlaces Number of decimal places
 * @returns {string} Number multiplied and format to given decimal places
 */
Ember.Handlebars.helper('multiplyNumberPercentage', function (value, factor, decimalPlaces) {
    var noOfDecimals = !isNaN(decimalPlaces) ? decimalPlaces : sharedService.userSettings.displayFormat.decimalPlaces;
    var val = (value === 0 || isNaN(value)) ? 0.0 : value;

    var formatted = val || val === 0 ? utils.formatters.multiplyNumberPercentage(val, factor, noOfDecimals) : '';

    return new Ember.Handlebars.SafeString(formatted);
});

/* *
 * Format number to given decimal places and separate each 3 digits by commas
 * @param value Number to format
 * @param decimalPlaces Number of decimal places
 * @returns {*} Number formatted to given decimal places and commas added
 */
Ember.Handlebars.helper('formatNumber', function (value, decimalPlaces) {
    var noOfDecimals = !isNaN(decimalPlaces) ? decimalPlaces : sharedService.userSettings.displayFormat.decimalPlaces;
    var val = (value === 0 || isNaN(value)) ? 0.0 : value;

    var formatted = utils.formatters.formatNumber(val, noOfDecimals);

    return new Ember.Handlebars.SafeString(formatted);
});

/* *
 * Format number to given decimal places and separate each 3 digits by commas and add percentage symbol (%)
 * @param value Number to format
 * @param decimalPlaces Number of decimal places
 * @returns {*} Number formatted to given decimal places and commas and percentage symbol (%) added
 */
Ember.Handlebars.helper('formatNumberPercentage', function (value, decimalPlaces) {
    var noOfDecimals = !isNaN(decimalPlaces) ? decimalPlaces : sharedService.userSettings.displayFormat.decimalPlaces;
    var val = (value === 0 || isNaN(value)) ? 0.0 : value;

    var formatted = utils.formatters.formatNumberPercentage(val, noOfDecimals);

    return new Ember.Handlebars.SafeString(formatted);
});

/* *
 * Format dateTime to display format
 * Display format will be taken from application configuration file
 * @param date Date String, Format: yyyyMMddHHmmss
 * @param offset Offset, Format: x.y (Ex: 2, 2.0, 5.5)
 */
Ember.Handlebars.helper('formatToDateTime', function (dateTime, exg) {
    var formatted = (dateTime && dateTime.length >= 8) ? utils.formatters.formatToDateTime(dateTime, exg) : sharedService.userSettings.displayFormat.noValue;

    return new Ember.Handlebars.SafeString(formatted);
});

/* *
 * Format date to display in month first format
 * Display format will be taken from application configuration file
 * @param date Date String, Format: yyyyMMdd
 * @param offset Offset, Format: x.y (Ex: 2, 2.0, 5.5)
 */
Ember.Handlebars.helper('formatToDateMonth', function (date, exg) {
    var formatted = (date && date.length >= 8) ? utils.formatters.formatToDateMonth(date, exg) : sharedService.userSettings.displayFormat.noValue;

    return new Ember.Handlebars.SafeString(formatted);
});

/* *
 * Format date to display format
 * Display format will be taken from application configuration file
 * @param date Date String, Format: yyyyMMdd
 * @param offset Offset, Format: x.y (Ex: 2, 2.0, 5.5)
 */
Ember.Handlebars.helper('formatToDate', function (date, exg) {
    var formatted = (date && date.length >= 8) ? utils.formatters.formatToDate(date, exg) : sharedService.userSettings.displayFormat.noValue;

    return new Ember.Handlebars.SafeString(formatted);
});

/* *
 * Format date string to display format
 * Display format will be taken from application configuration file
 * @param date Date String, Format: yyyyMM
 * returns string: Month<space>Year
 * @param offset Offset, Format: x.y (Ex: 2, 2.0, 5.5)
 */
Ember.Handlebars.helper('formatToMonth', function (date, exg) {
    //  Merge date('01') to date string
    var formatted = (date.length === 6) ? utils.formatters.formatToDate(date + '01', exg, sharedService.userSettings.displayFormat.monthFormat) : sharedService.userSettings.displayFormat.noValue;

    return new Ember.Handlebars.SafeString(formatted);
});

/* *
 * Format time to display format
 * Display format will be taken from application configuration file
 * @param time Time String, Format: HHmmss
 * @param offset Offset, Format: x.y (Ex: 2, 2.0, 5.5)
 */
Ember.Handlebars.helper('formatToTime', function (time, exg) {
    var formatted = (time && time.length >= 6) ? utils.formatters.formatToTime(time, exg) : '';

    return new Ember.Handlebars.SafeString(formatted);
});

/* *
 * Highlight Pattern matching text
 * @param text text to search
 * @param phrase text to match
 * returns string with the concatenated css & html
 */
Ember.Handlebars.helper('highlightMatchingText', function (text, phrase) {
    if (text) {
        var highlightedText = text.replace(new RegExp(phrase, 'gi'), function (str) {
            return '<span class="colour-2">' + str + '</span>';
        });

        return new Ember.Handlebars.SafeString(highlightedText);
    } else {
        return '';
    }
});

/* *
 * Set Language test
 * @param text label text
 * @param separator language separator (Eg: pipe)
 * returns language string
 */
Ember.Handlebars.helper('setLanguageText', function (text, separator) {
    var msgSeparator = typeof separator === 'string' ? separator : utils.Constants.StringConst.Pipe;

    if (text && text.includes(msgSeparator)) {
        var langDesMap = _getLangMessage(text, msgSeparator);
        return langDesMap[sharedService.userSettings.currentLanguage];
    } else if (text) {
        return text;
    } else {
        return sharedService.userSettings.displayFormat.noValue;
    }
});

var _getLangMessage = function (msg, separator) {
    var nativeMsg = utils.formatters.convertUnicodeToNativeString(msg);
    var desArray = nativeMsg.split(separator);
    var langDesMap = {};
    var supportedLangArray = appConfig.customisation.supportedLanguages;

    for (var i = 0; i < desArray.length; i++) {
        if (supportedLangArray[i]) {
            langDesMap[supportedLangArray[i].code] = desArray[i];
        }
    }

    return langDesMap;
};

Ember.Handlebars.registerBoundHelper('dataTextField', function (data, key, formatter, decimalPlaces) {
    var value = data.get(key);
    if (formatter === 'formatNumber') {
        return utils.formatters.formatNumber(value, 0);
    } else if (formatter === 'formatNumberPercentage') {
        return utils.formatters.formatNumberPercentage(value, 2);
    } else if (formatter === 'divideNumber') {
        return utils.formatters.divideNumber(value, 1);
    } else if (formatter === 'formatNumberWithDeci') {
        return utils.formatters.formatNumber(value, !isNaN(decimalPlaces) ? decimalPlaces : sharedService.userSettings.displayFormat.decimalPlaces);
    } else if (formatter === 'formatToDate') {
        return utils.formatters.formatToDate(value);
    }else {
        return value;
    }
});

Ember.Handlebars.helper('fontColor', function (data, key, fontColor) {

    if (data[key] < 0 && fontColor === 'redOrGreen') {
        return 'down-fore-color';
    } else if (data[key] > 0 && fontColor === 'redOrGreen') {
        return 'up-fore-color';
    } else if (data[key] === 0 && fontColor === 'redOrGreen') {
        return 'fore-color';
    }else {
        return fontColor;
    }
});

Ember.Handlebars.registerHelper('isOdd', function (options) {
    if ((options.data.view.contentIndex % 2) === 1) {
        return new Ember.Handlebars.SafeString(options.fn(this));
    }

    return new Ember.Handlebars.SafeString(options.inverse(this));
});

Ember.Handlebars.helper('isAvailableWidgets', function (inst) {
    return utils.AssetTypes.isEquity(inst) || utils.AssetTypes.isEtf(inst);
});

Ember.Handlebars.helper('formatLabel', function (label, value) {
    if (utils.validators.isAvailable(label) && utils.validators.isAvailable(value)) {
        var labelKey = [label, value].join('_');
        var labelValue = languageDataStore.getLanguageObj().lang.labels[labelKey];

        return labelValue ? labelValue : value;
    }

    return value;
});

Ember.Handlebars.helper('onResponsive', function (triggerState, responsive, key, level) {
    if (responsive) {
        return responsive.isResponsiveLevelReached(key, level);
    }

    return false;
});

Ember.Handlebars.helper('isEqual', function (selectedId, currentId, applyingCss) {
    if (selectedId === currentId) {
        return applyingCss;
    }
});

Ember.Handlebars.helper('getSubMarketName', function (exchange, subMkt, isNoValueAvailable) {
    var subMarketObj = sharedService.getService('price').subMarketDS.getSubMarket(exchange, subMkt);
    var subMarketName = subMarketObj.lDes;

    if (!subMarketName && isNoValueAvailable) {
        subMarketName = sharedService.userSettings.displayFormat.noValue;
    }

    return subMarketName;
});

Ember.Handlebars.helper('getValueKey', function (item, propertyName) {
    try {
        return item.get(propertyName);
    } catch (e) {
        return item[propertyName];
    }
});

Ember.Handlebars.helper('replaceCopyrightText', function () {
    return languageDataStore.getLanguageObj().lang.labels.copyright.replace('[CurrentYear]', new Date().getFullYear());
});

Ember.Handlebars.helper('table-component', TableComponent);
Ember.Handlebars.helper('bootstrap-dropdown-select', BootstrapDropdownSelect);
Ember.Handlebars.helper('bootstrap-icon-dropdown', BootstrapIconDropdown);
Ember.Handlebars.helper('widget-header', WidgetHeader);
Ember.Handlebars.helper('link-dropdown', LinkDropdown);