import Ember from 'ember';

export default (function () {

   /* *
    * Function to generate Excel with given HTML template
    * @param fileName : type String (Ex :- TestDoc..xls )
    * @param htmlContentStr : type String
    * @param hiddenHyperlink : element selector String (Ex :- '#elementId')
    */
    var generateExcel = function (fileName, htmlContentStr, hiddenHyperlink) {
        var excelDataStr = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
        excelDataStr = excelDataStr + '<head><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
        excelDataStr = excelDataStr + '<x:Name>Sheet</x:Name>';
        excelDataStr = excelDataStr + '<x:WorksheetOptions><x:Panes></x:Panes></x:WorksheetOptions></x:ExcelWorksheet>';
        excelDataStr = excelDataStr + '</x:ExcelWorksheets></x:ExcelWorkbook></xml></head><body>';
        excelDataStr = excelDataStr + '<table border=\'1px\'>';
        excelDataStr = excelDataStr + htmlContentStr;
        excelDataStr = excelDataStr + '</table></body></html>';

        var docDataType = 'data:application/vnd.ms-excel';
        var ua = window.navigator.userAgent;
        var msie = ua.indexOf('MSIE');

        if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
            if (window.navigator.msSaveBlob) {
                var blob = new Blob([excelDataStr], {
                    type: 'application/csv;charset=utf-8;'
                });
                navigator.msSaveBlob(blob, fileName);
            }
        } else {
            Ember.$(hiddenHyperlink).attr('href', docDataType + ', ' + encodeURIComponent(excelDataStr));
            Ember.$(hiddenHyperlink).attr('download', fileName);
            Ember.$(hiddenHyperlink).get(0).click();
        }
    };

    return {
        generateExcel: generateExcel
    };
})();