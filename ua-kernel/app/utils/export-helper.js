/* global html2pdf */

import Ember from 'ember';
import languageDataStore from '../models/shared/language/language-data-store';
import utils from '../utils/utils';
import appConfig from '../config/app-config';
import sharedService from '../models/shared/shared-service';

export default (function () {
    var _printHeaderColor = appConfig.customisation.printHeaderColor ? appConfig.customisation.printHeaderColor : 'rgb(200, 203, 199)';
    var _printHeaderTextColor = appConfig.customisation.printHeaderTextColor ? appConfig.customisation.printHeaderTextColor : 'rgb(58, 58, 58)';
    var _printTableFooterColor = appConfig.customisation.printTableFooterColor ? appConfig.customisation.printTableFooterColor : 'rgb(217, 219, 216)';

    var _printWindow = function (domWindow) {
        domWindow.document.close();  // necessary for IE >= 10
        domWindow.focus();           // necessary for IE >= 10
        domWindow.print();           // change window to winPrint
        domWindow.close();

        return domWindow;
    };

    var exportToPrint = function (column, data, title, headerContent, summaryContent, footerContent, documentName) {
        var docName = documentName ? documentName : title;
        var report = _generateReport(column, data, title, headerContent, summaryContent, footerContent, true);
        var domWindow = window.open('', docName, 'height=400,width=800');
        var body = report.body;
        var isChrome = Boolean(domWindow.chrome);

        domWindow.document.write('<html moznomarginboxes mozdisallowselectionprint><head>');
        domWindow.document.write('<style type="text/css"> @page {margin:0; } body {padding: 3%; }</style>');
        domWindow.document.write('</head><body>');
        domWindow.document.write(body.outerHTML);
        domWindow.document.title = docName;
        domWindow.document.write('</body></html>');

        if (isChrome) {
            Ember.run.later(function () { // wait until all resources loaded
                _printWindow(domWindow);
            }, 1100);
        } else {
            _printWindow(domWindow);
        }

        return true;
    };

    var exportToPrintDivContent = function (headerContent, content, docName) {
        var domWindow = window.open('', docName, 'height=400,width=800');
        var isChrome = Boolean(domWindow.chrome);

        domWindow.document.write('<html moznomarginboxes mozdisallowselectionprint><head>');
        domWindow.document.write(headerContent);
        domWindow.document.write('</head><body>');
        domWindow.document.write(content);
        domWindow.document.title = docName;
        domWindow.document.write('</body></html>');

        if (isChrome) {
            Ember.run.later(function () { // Wait until all resources loaded
                _printWindow(domWindow);
            }, 1100);
        } else {
            _printWindow(domWindow);
        }

        return true;
    };

    var exportToPrintContent = function (content, docName) {
        var domWindow = window.open('', docName, 'height=400,width=800');
        var isChrome = Boolean(domWindow.chrome);

        domWindow.document.write(content);

        if (isChrome) {
            Ember.run.later(function () { // wait until all resources loaded
                _printWindow(domWindow);
            }, 1100);
        } else {
            _printWindow(domWindow);
        }

        return true;
    };

    // TODO : [Champaka] Enable after PDF finalized.
    // var exportToPdf = function (column, data, wname, headerContent) {
    //    var report = _generateReport(column, data, wname, headerContent);
    //    var table = report.table;
    //    var header = document.createElement('table');
    //
    //    header.innerHTML = headerContent;
    //
    //    var doc = new jsPDF('l', 'pt', 'a4');
    //    var img = appConfig.customisation.logoBase64;
    //
    //    doc.addImage(img, 'PNG', 40, 40);
    //    doc.setFontSize(17);
    //    doc.text(wname, 40, 100);
    //
    //    var htable = doc.autoTableHtmlToJson(header);
    //    var btable = doc.autoTableHtmlToJson(table);
    //
    //    doc.autoTable(htable.columns, htable.data, {
    //        theme: 'plain',
    //        headerStyles: {fontStyle: 'normal'},
    //        margin: {top: 110}
    //    });
    //
    //    doc.autoTable(btable.columns, btable.data, {
    //        headerStyles: {fillColor: [225, 225, 225], textColor: [40, 40, 40]},
    //        margin: {top: 220}
    //    });
    //
    //    doc.save(wname + '.pdf');
    // };

    var exportToPdfDynamic = function (column, data, title, headerContent, summaryContent, footerContent, documentName) {
        var report = _generateReportForPDF(column, data, title, headerContent, summaryContent, footerContent, false);
        var docName = documentName ? documentName : title;

        var opt = {
            margin: 0.5,
            filename: docName+ '.pdf',
            image: {type: 'jpeg', quality: 0.98},
            html2canvas: {scale: 10, dpi: 192, letterRendering: true},
            jsPDF: {unit: 'in', format: 'A4', orientation: 'landscape'}
        };

        html2pdf().from(report.body).set(opt).save();
    };

    var exportToPdf = function (content, fileName) {
        var opt = {
            margin: 0.5,
            filename: fileName + '.pdf',
            image: {type: 'jpeg', quality: 0.98},
            html2canvas: {scale: 2, dpi: 192, letterRendering: true},
            jsPDF: {unit: 'in', format: 'A4', orientation: 'portrait'}
        };

        html2pdf().from(content).set(opt).save();
    };

    var exportToExcel = function (column, data, wname, headerContent, summaryContent, footerContent) {
        var report = _generateReport(column, data, wname, headerContent, summaryContent, footerContent, false);
        var body = report.body;

        var excelDataStr = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
        excelDataStr = excelDataStr + '<head><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
        excelDataStr = excelDataStr + '<x:Name>Sheet</x:Name>';
        excelDataStr = excelDataStr + '<x:WorksheetOptions><x:Panes></x:Panes></x:WorksheetOptions></x:ExcelWorksheet>';
        excelDataStr = excelDataStr + '</x:ExcelWorksheets></x:ExcelWorkbook></xml></head><body>';
        excelDataStr = excelDataStr + body.outerHTML;
        excelDataStr = excelDataStr + '</html>';

        var ua = window.navigator.userAgent;
        var msie = ua.indexOf('MSIE');
        var filename = wname + '.xls';

        if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
            if (window.navigator.msSaveBlob) {
                var blob = new Blob([excelDataStr], {
                    type: 'application/csv;charset=utf-8;'
                });

                navigator.msSaveBlob(blob, filename);
            }
        } else {
            var blob2 = new Blob([excelDataStr], {
                type: 'data:application/vnd.ms-excel'
            });

            var elem = window.document.createElement('a');

            elem.href = window.URL.createObjectURL(blob2);
            elem.download = filename;
            document.body.appendChild(elem);
            elem.click();
            document.body.removeChild(elem);
        }
    };

    var _generateReport = function (column, data, wname, headerContent, summaryContent, footerContent, isPrint) {
        var app = languageDataStore.getLanguageObj();
        var enLang = languageDataStore.getObjByLanguage('EN');
        var arLang = languageDataStore.getObjByLanguage('AR');
        var body = document.createElement('body');
        var header = document.createElement('div');
        var h3 = document.createElement('h3');
        var title = document.createTextNode(wname);
        var img = document.createElement('img');
        var contentTable = document.createElement('table');
        var table = document.createElement('table');
        var linebreak1 = document.createElement('br');
        var linebreak2 = document.createElement('br');
        var headerTable, tHeader, trHeader, tdHeaderImg, tdHeaderTitle;

        if (isPrint) {
            headerTable = document.createElement('table');
            headerTable.setAttribute('style', 'position: fixed; top: 0.3%; width: 94%; border-collapse: collapse; background-color:#ffffff');

            tHeader = document.createElement('tbody');
            trHeader = document.createElement('tr');
        }

        img.src = [img.baseURI, isPrint ? appConfig.customisation.printLogo : appConfig.customisation.logo].join('');
        img.width = 154;
        img.height = 51;

        utils.logger.logTrace('Print Logo - ' + appConfig.customisation.printLogo);
        utils.logger.logTrace('Generate Report Logo - ' + img.src);

        if (isPrint) {
            tdHeaderImg = document.createElement('td');
            tdHeaderImg.setAttribute('style', 'padding-left: 5px; border-bottom: 1px solid ' + _printHeaderColor + '; text-align: left; width: 50%;');
            tdHeaderImg.appendChild(img);
        } else {
            body.appendChild(img);
        }

        h3.appendChild(title);

        if (isPrint) {
            tdHeaderTitle = document.createElement('td');
            tdHeaderTitle.appendChild(h3);
            tdHeaderTitle.setAttribute('style', 'padding-top: 10px; padding-right: 20px; border-bottom: 1px solid ' + _printHeaderColor + '; color:' + _printHeaderTextColor + '; text-align: right; width: 50%;');
        } else {
            header.appendChild(h3);
        }

        if (isPrint) {
            trHeader.appendChild(tdHeaderImg);
            trHeader.appendChild(tdHeaderTitle);
            tHeader.appendChild(trHeader);
            headerTable.appendChild(tHeader);
            body.appendChild(headerTable);
        }

        contentTable.setAttribute('style', 'width: 100%; margin-top: 60px;');
        contentTable.innerHTML = headerContent;

        header.appendChild(contentTable);

        if (!isPrint) {
            header.appendChild(linebreak1);
        }

        if (utils.validators.isAvailable(summaryContent)) {
            var summaryTable = document.createElement('table');
            summaryTable.setAttribute('style', 'width: 100%; top: 3%; border-collapse: collapse;');
            summaryTable.innerHTML = summaryContent;

            if (isPrint) {
                header.appendChild(linebreak1);
            }

            header.appendChild(summaryTable);
        }

        body.setAttribute('style', 'font-family: "Open Sans", sans-serif; -webkit-print-color-adjust: exact; color-adjust: exact; printer-colors: exact;');

        body.appendChild(header);

        if (!isPrint) {
            body.appendChild(linebreak2);
        }

        table.setAttribute('style', 'font-size: 12px; width: 100%;');

        // Add the header row.
        var row = table.insertRow(-1);

        for (var a = 0; a < column.length; a++) {
            var headerLang = column[a].isArabic ? arLang : column[a].isEnglish ? enLang : app.lang;

            var headerCell = document.createElement('th');
            headerCell.innerHTML = !column[a].isHideHeader ? headerLang.labels[column[a].headerName] ? headerLang.labels[column[a].headerName] : column[a].headerName : '';
            headerCell.setAttribute('style', 'background-color: ' + _printHeaderColor + '; padding: 3px;');
            headerCell.style.textAlign = column[a].isArabic ? 'right' : column[a].isEnglish ? 'left' : sharedService.userSettings.currentLanguage === 'AR' ? 'right' : 'left';

            row.appendChild(headerCell);
        }

        // Add the data rows.
        for (var i = 0; i < data.length; i++) {
            var dataElem = data[i];

            row = table.insertRow(-1);

            for (var j = 0; j < column.length; j++) {
                var cell = row.insertCell(-1);
                var columnElem = column[j].id;
                var convColumnElem = column[j].convertId;
                var dataType = column[j].dataType;
                var valueStyle = column[j].firstValueStyle;

                if(dataElem) {
                    cell = _setFormatters(cell, dataType, dataElem, columnElem, valueStyle, convColumnElem);
                }

                if (columnElem === 'des') {
                    cell = _setHoldingDes(cell, dataElem, columnElem, convColumnElem);
                }

                if (dataType === 'int' || dataType === 'float') {
                    cell.style.textAlign = 'right';
                } else {
                    cell.style.textAlign = column[j].isArabic ? 'right' : column[j].isEnglish ? 'left' : sharedService.userSettings.currentLanguage === 'AR' ? 'right' : 'left';
                }

                cell.style.padding = '3px';
            }
        }

        body.appendChild(table);

        if (isPrint) {
            var dummyTHeader = document.createElement('thead');
            var dummyTrHeader = document.createElement('tr');
            var dummyTdHeader = document.createElement('td');

            dummyTdHeader.setAttribute('style', 'height: 50px;');
            dummyTdHeader.innerHTML = '&nbsp;';

            dummyTrHeader.appendChild(dummyTdHeader);
            dummyTHeader.appendChild(dummyTrHeader);
            table.appendChild(dummyTHeader);
        }

        if (utils.validators.isAvailable(footerContent)) {
            if (isPrint) {
                var dummyTFooter = document.createElement('tfoot');
                var dummyTrFooter = document.createElement('tr');
                var dummyTdFooter = document.createElement('td');

                dummyTdFooter.setAttribute('style', 'height: 100px;');
                dummyTdFooter.innerHTML = '&nbsp;';

                dummyTrFooter.appendChild(dummyTdFooter);
                dummyTFooter.appendChild(dummyTrFooter);
                table.appendChild(dummyTFooter);
            }

            var footer = document.createElement('div');
            footer.setAttribute('style', 'position: fixed; bottom: 2%; width: 94%; border-collapse: collapse; font-size: 11px;');

            var hrFooter = document.createElement('hr');

            var docFooter = document.createElement('table');
            docFooter.setAttribute('style', 'width 100%;');
            docFooter.innerHTML = footerContent;

            footer.appendChild(hrFooter);
            footer.appendChild(docFooter);
            body.appendChild(footer);
        }

        return {
            body: body,
            header: header,
            table: table
        };
    };

    var _generateReportForPDF = function (column, data, wname, headerContent, summaryContent, footerContent, isPrint) {
        var app = languageDataStore.getLanguageObj();
        var enLang = languageDataStore.getObjByLanguage('EN');
        var arLang = languageDataStore.getObjByLanguage('AR');
        var body = document.createElement('body');
        var header = document.createElement('div');
        var h4 = document.createElement('h4');
        var title = document.createTextNode(wname);
        var img = document.createElement('img');
        var contentTable = document.createElement('table');
        var table = document.createElement('table');
        var linebreak1 = document.createElement('br');
        var headerTable, tHeader, trHeader, tdHeaderImg, tdHeaderTitle;

        headerTable = document.createElement('table');
        headerTable.setAttribute('style', 'top: 0.3%; width: 100%; border-collapse: collapse; background-color:#ffffff');

        tHeader = document.createElement('tbody');
        trHeader = document.createElement('tr');

        img.src = [img.baseURI, isPrint ? appConfig.customisation.printLogo : appConfig.customisation.logo].join('');
        img.width = 154;
        img.height = 51;

        utils.logger.logTrace('Print Logo - ' + appConfig.customisation.printLogo);
        utils.logger.logTrace('Generate Report Logo - ' + img.src);

        tdHeaderImg = document.createElement('td');
        tdHeaderImg.setAttribute('style', 'padding-left: 5px; border-bottom: 1px solid ' + _printHeaderColor + '; text-align: left; width: 15%;');
        tdHeaderImg.appendChild(img);

        var tdHeaderCell = document.createElement('td');
        tdHeaderCell.setAttribute('style', 'padding-left: 5px; border-bottom: 1px solid ' + _printHeaderColor + '; text-align: left; width: 70%;');

        h4.appendChild(title);

        tdHeaderTitle = document.createElement('td');
        tdHeaderTitle.appendChild(h4);
        tdHeaderTitle.setAttribute('style', 'padding-top: 10px; padding-right: 20px; border-bottom: 1px solid ' + _printHeaderColor + '; color:' + _printHeaderTextColor + '; text-align: right; width: 15%;');

        trHeader.appendChild(tdHeaderImg);
        trHeader.appendChild(tdHeaderCell);
        trHeader.appendChild(tdHeaderTitle);
        tHeader.appendChild(trHeader);
        headerTable.appendChild(tHeader);
        body.appendChild(headerTable);

        contentTable.setAttribute('style', 'width: 100%; margin-top: 20px;');
        contentTable.innerHTML = headerContent;

        header.appendChild(contentTable);
        header.appendChild(linebreak1);

        if (utils.validators.isAvailable(summaryContent)) {
            var summaryTable = document.createElement('table');
            summaryTable.setAttribute('style', 'width: 100%; top: 3%; border-collapse: collapse;');
            summaryTable.innerHTML = summaryContent;

            header.appendChild(summaryTable);
        }

        body.setAttribute('style', 'font-family: "dejavusanscondensed", sans-serif; -webkit-print-color-adjust: exact; color-adjust: exact; printer-colors: exact;');
        body.appendChild(header);
        table.setAttribute('style', 'font-size: 12px; width: 100%;');

        // Add the header row.
        var row = table.insertRow(-1);

        for (var a = 0; a < column.length; a++) {
            var headerLang = column[a].isArabic ? arLang : column[a].isEnglish ? enLang : app.lang;
            var headerCell = document.createElement('th');

            headerCell.innerHTML = !column[a].isHideHeader ? headerLang.labels[column[a].headerName] ? headerLang.labels[column[a].headerName] : column[a].headerName : '';
            headerCell.setAttribute('style', 'background-color: ' + _printHeaderColor + '; padding: 8px;');
            headerCell.style.textAlign = column[a].isArabic ? 'right' : column[a].isEnglish ? 'left' : sharedService.userSettings.currentLanguage === 'AR' ? 'right' : 'left';

            row.appendChild(headerCell);
        }

        // Add the data rows.
        for (var i = 0; i < data.length; i++) {
            var dataElem = data[i];

            row = table.insertRow(-1);

            for (var j = 0; j < column.length; j++) {
                var cell = row.insertCell(-1);
                var columnElem = column[j].id;
                var convColumnElem = column[j].convertId;
                var dataType = column[j].dataType;
                var valueStyle = column[j].firstValueStyle;
                var span = document.createElement('span');

                span.setAttribute('style', 'padding: 10px;');

                if (dataElem) {
                    span = _setFormatters(span, dataType, dataElem, columnElem, valueStyle, convColumnElem);
                }

                if (columnElem === 'des') {
                    span = _setHoldingDes(span, dataElem, columnElem, convColumnElem);
                }

                if (dataType === 'int' || dataType === 'float') {
                    span.setAttribute('style', 'float: right; padding-right: 10px');
                } else {
                    span.style.textAlign = column[j].isArabic ? 'right' : column[j].isEnglish ? 'left' : sharedService.userSettings.currentLanguage === 'AR' ? 'right' : 'left';
                }

                cell.appendChild(span);
            }
        }

        body.appendChild(table);

        if (utils.validators.isAvailable(footerContent)) {
            var footer = document.createElement('div');
            var hrFooter = document.createElement('hr');
            var docFooter = document.createElement('table');

            footer.setAttribute('style', 'position: fixed; bottom: 2%; width: 94%; border-collapse: collapse; font-size: 11px;');

            docFooter.setAttribute('style', 'width 100%;');
            docFooter.innerHTML = footerContent;

            footer.appendChild(hrFooter);
            footer.appendChild(docFooter);
            body.appendChild(footer);
        }

        return {
            body: body,
            header: header,
            table: table
        };
    };

    var _setFormatters = function (cell, dataType, dataElem, columnElem, valueStyle, convColumnElem) {
        var rowData = convColumnElem && dataElem.get(convColumnElem) ? dataElem.get(convColumnElem) : dataElem.get(columnElem);

        if (valueStyle && valueStyle.indexOf('bold') > -1) {
            cell.style.fontWeight = 'bold';
        }

        if (dataElem.isFooter) {
            cell.style.backgroundColor = _printTableFooterColor;
        }

        if (dataType === 'date') {
            cell.innerHTML = utils.formatters.formatToDate(rowData);
        } else if (dataType === 'dateTime') {
            cell.innerHTML = utils.formatters.formatToDateTime(rowData);
        } else if (dataType === 'int') {
            cell.innerHTML = utils.formatters.formatNumber(rowData, 0);
        } else if (dataType === 'float') {
            cell.innerHTML = utils.formatters.formatNumber(rowData, 2);
        } else if (!utils.validators.isAvailable(rowData)) {
            cell.innerHTML = sharedService.userSettings.displayFormat.noValue;
        } else {
            cell.innerHTML = rowData;
        }

        return cell;
    };

    var _setHoldingDes = function (cell, dataElem, columnElem, convColumnElem) {
        var rowData = convColumnElem && dataElem.get(convColumnElem) ? dataElem.get(convColumnElem) : dataElem.get(columnElem);
        var currentValue = utils.formatters.convertUnicodeToNativeString(rowData);

        cell.innerHTML = languageDataStore.generateLangMessage(currentValue);

        return cell;
    };

    return {
        exportToPdfDynamic: exportToPdfDynamic,
        exportToPrint: exportToPrint,
        exportToPdf: exportToPdf,
        exportToExcel: exportToExcel,
        exportToPrintContent: exportToPrintContent,
        exportToPrintDivContent: exportToPrintDivContent
    };
})();