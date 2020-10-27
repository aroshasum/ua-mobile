import PriceConstants from '../../models/price/price-constants';

export default (function () {
    var formatDcfsValueStyle = function (dcfs) {
        var dcfsClass = '';
        var dcfsToolTip = '';

        switch (dcfs) {
            case PriceConstants.DcfsConstants.DcfsLessThanFifty:
                break;
            case PriceConstants.DcfsConstants.DcfsLessThanSeventyFive:
                dcfsClass = 'glyphicon glyphicon-flag yellow-fore-color font-l';
                dcfsToolTip = 'dcfcLessThanSeventyFiveTitle';
                break;
            case PriceConstants.DcfsConstants.DcfsLessThanHundred:
                dcfsClass = 'glyphicon glyphicon-flag orange-fore-color font-l';
                dcfsToolTip = 'dcfcLessThanHundredTitle';
                break;
            case PriceConstants.DcfsConstants.DcfsGreaterThanHundred:
                dcfsClass = 'glyphicon glyphicon-flag red-fore-color font-l';
                dcfsToolTip = 'dcfcGreaterThanHundredTitle';
                break;
            default:
                break;
        }

        return {
            dcfsClass: dcfsClass,
            dcfsToolTip: dcfsToolTip
        };
    };

    return {
        formatDcfsValueStyle: formatDcfsValueStyle
    };
})();
