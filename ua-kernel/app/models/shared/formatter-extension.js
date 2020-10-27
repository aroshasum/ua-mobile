import Formatter from '../../utils/formatters';
import utils from '../../utils/utils';
import sharedService from '../../models/shared/shared-service';

export default (function () {
    var overwritePrototypes = function (priceService) {
        Formatter.formatToDateTime = function (dateTime, exg, format) {
            var exchange = exg ? priceService.exchangeDS.getExchange(exg) : undefined;
            var offset = exchange ? exchange.get('tzo') : 0;
            var adjustedDate = this.getAdjustedDateTime(dateTime, offset);

            return adjustedDate ? utils.moment(adjustedDate).format(format ? format : sharedService.userSettings.displayFormat.dateTimeFormat) : sharedService.userSettings.displayFormat.noValue;
        };

        Formatter.formatToDate = function (date, exg, format) {
            var exchange = exg ? priceService.exchangeDS.getExchange(exg) : undefined;
            var offset = exchange ? exchange.get('tzo') : 0;
            var adjustedDate = this.getAdjustedDateTime(date, offset);

            return adjustedDate ? utils.moment(adjustedDate).format(format ? format : sharedService.userSettings.displayFormat.dateFormat) : sharedService.userSettings.displayFormat.noValue;
        };

        Formatter.formatToDateMonth = function (date, exg) {
            var exchange = exg ? priceService.exchangeDS.getExchange(exg) : undefined;
            var offset = exchange ? exchange.get('tzo') : 0;
            var adjustedDate = this.getAdjustedDateTime(date, offset);

            return adjustedDate ? utils.moment(adjustedDate).format(sharedService.userSettings.displayFormat.dateMonthFormat) : sharedService.userSettings.displayFormat.noValue;
        };

        Formatter.formatToTime = function (time, exg) {
            var exchange = exg ? priceService.exchangeDS.getExchange(exg) : undefined;
            var offset = exchange ? exchange.get('tzo') : 0;
            var adjustedDate = this.getAdjustedDateTime(time, offset);

            return adjustedDate ? utils.moment(adjustedDate).format(sharedService.userSettings.displayFormat.timeFormat) : sharedService.userSettings.displayFormat.noValue;
        };

        Formatter.formatToDateTimeMinute = function (dateTimeMinute, exg, format) {
            var exchange = exg ? priceService.exchangeDS.getExchange(exg) : undefined;
            var offset = exchange ? exchange.get('tzo') : 0;
            var adjustedDate = this.getAdjustedDateTime(dateTimeMinute, offset);

            return adjustedDate ? utils.moment(adjustedDate).format(format ? format : sharedService.userSettings.displayFormat.dateTimeMinuteFormat) : sharedService.userSettings.displayFormat.noValue;
        };

        Formatter.formatToDayMonthTime = function (dayTime, exg, format) {
            var exchange = exg ? priceService.exchangeDS.getExchange(exg) : undefined;
            var offset = exchange ? exchange.get('tzo') : 0;
            var adjustedDate = this.getAdjustedDateTime(dayTime, offset);

            return adjustedDate ? utils.moment(adjustedDate).format(format ? format : sharedService.userSettings.displayFormat.dayMonthTimeFormat) : sharedService.userSettings.displayFormat.noValue;
        };
    };

    return {
        overwritePrototypes: overwritePrototypes
    };
})();
