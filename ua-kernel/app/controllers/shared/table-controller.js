import Ember from 'ember';
import columnDefinition from 'ember-table/models/column-definition';
import sortableColumnMixin from '../../components/mixins/sortable-column-mixin';
import priceWidgetConfig from '../../config/price-widget-config';
import BaseArrayController from '../base-array-controller';
import sharedService from '../../models/shared/shared-service';

export default BaseArrayController.extend({
    // Sorting Parameters
    sortAscending: false,
    sortColumn: null,
    sortProperties: [],
    isSortApplied: false,

    // Column Parameters
    columnViews: {},
    numOfFixedColumns: 0,
    fixedColumns: 0,
    language: '',
    defaultColumnMapping: {},
    moreColumnsIds: [],
    nonRemovableColumnIds: [],
    defaultColumnDeclarations: Ember.A(),
    columnDeclarations: Ember.A(),

    // Content related Parameters
    model: Ember.A(),
    masterContent: Ember.A(),

    // Widget Refresh Parameters
    isWidgetRefreshed: true,

    moreColumnPopup: {},
    debounceDelay: 300,

    columns: (function () {
        var that = this;
        var colData = Ember.A();
        var columnArray = this.get('columnDeclarations');

        Ember.$.each(columnArray, function (index, elem) {
            colData.pushObject(that.createColumn(elem, that.get('app')));
        });

        if (sharedService.userSettings.currentLanguage === 'AR') {        // Only arabic language needs column RTL
            colData = colData.reverse();
        }

        return colData;
    }).property('columnDeclarations', 'language'),

    createColumn: function createColumn(element, app) {        // Column Declarations parameters : id, width, headerName, sortKeyword, style, isColumnSortDisabled, fontColor, isBold, dataType, backgroundColour
        var sortMixin, sortKeyword, columnView;

        // Get Views assigned by parent controller
        var viewMapping = this.get('columnViews');

        // Get Views assigned by child controller
        var viewExternalMapping = this.get('cellViewsForColumns');

        if (element.type) {
            columnView = viewMapping[element.type] ? viewMapping[element.type] : viewExternalMapping[element.type];
        } else {
            columnView = 'Ember.Cell';
        }

        var column = {
            contentPath: element.id,
            dataType: element.dataType,
            headerCellName: app.lang.labels[element.headerName] ? app.lang.labels[element.headerName] : element.headerName,
            headerCellSecondName: app.lang.labels[element.headerSecondName] ? app.lang.labels[element.headerSecondName] : element.headerSecondName,
            headerCellThirdName: app.lang.labels[element.headerThirdName] ? app.lang.labels[element.headerThirdName] : element.headerThirdName,
            name: element.name,
            positiveNegativeChange: element.positiveNegativeChange,
            cellStyle: element.cellStyle,
            firstValueStyle: element.firstValueStyle,
            secondValueStyle: element.secondValueStyle,
            backgroundStyle: element.backgroundStyle,
            headerTitleName: app.lang.labels[element.headerTitleName] ? app.lang.labels[element.headerTitleName] : element.headerTitleName,
            isBlink: element.isBlink,
            blinkUpStyle: element.blinkUpStyle,
            blinkDownStyle: element.blinkDownStyle,
            positiveStyle: element.positiveStyle,
            negativeStyle: element.negativeStyle,
            zeroStyle: element.zeroStyle,
            noOfDecimalPlaces: element.noOfDecimalPlaces,
            noOfSecValueDecimalPlaces: element.noOfSecValueDecimalPlaces,
            iconClass: element.iconClass,
            secondId: element.secondId,
            thirdId: element.thirdId,
            buttonFunction: element.buttonFunction,
            linkFunction: element.linkFunction,
            buttonMenu: element.buttonMenu,
            buttonStyle: element.buttonStyle,
            headerStyles: element.headerStyle,
            secondHeaderStyle: element.secondHeaderStyle,
            tableCellViewClass: columnView,
            headerCellViewClass: element.headerCellView ? element.headerCellView : 'Ember.HeaderCell',
            canAutoResize: true,
            columnMode: 'fluid',
            isndicatorAvailable: element.isndicatorAvailable,
            isFieldConfigAvailable: element.isFieldConfigAvailable,
            title: app.lang.labels[element.title] ? app.lang.labels[element.title] : element.title,
            isDefaultValueCheck: element.isDefaultValueCheck,
            defaultValue: element.defaultValue,
            expandedWidthRatio: element.expandedWidthRatio,
            defaultWidthRatio: element.defaultWidthRatio,
            firstHeaderStyle: element.firstHeaderStyle,
            thirdHeaderStyle: element.thirdHeaderStyle,
            secondIdConvertible: element.secondIdConvertible,
            thirdIdConvertible: element.thirdIdConvertible,
            getCellContent: function (row) {
                var values = {};
                values.firstValue = typeof row.get === 'function' ? row.get(element.id) : row[element.id];
                values.secondValue = element.secondId ? row.get(element.secondId) : undefined;
                values.thirdValue = element.thirdId ? row.get(element.thirdId) : undefined;

                return values;
            }
        };

        if (element.width) {
            column = Ember.$.extend(column, {savedWidth: element.width});
        }

        if (!element.isColumnSortDisabled) {  // Default behavior is sorting enabled. If not, isColumnSortDisabled should be true
            sortMixin = sortableColumnMixin;
            sortKeyword = element.sortKeyword ? element.sortKeyword : element.id;
            column = Ember.$.extend(column, {sortKey: sortKeyword});
        }

        return columnDefinition.create(sortMixin, column);
    },

    getColumnDefinitionsByMap: function (columnList, columnIdArray) {
        var that = this;
        var columnDefArray = [];
        var columns = columnList ? columnList : priceWidgetConfig.watchList.defaultColumnMapping;
        var columnIds = columnIdArray ? columnIdArray : priceWidgetConfig.watchList.defaultColumnIds;

        Ember.$.each(columnIds, function (index, columnId) {
            var id = columnId;

            // TODO: [satheeqh] Temporary fix to support watch-list array proxy
            if (columnId.indexOf('dataObj.') === 0) {
                id = columnId.split(that.utils.Constants.StringConst.Dot)[1];
            }

            if (columns[id]) {
                var column = columns[id];
                column.keyName = id;

                columnDefArray[columnDefArray.length] = column;
            }
        });

        return columnDefArray;
    },

    setClickMenuPosition: function (popupId) {
        var that = this;
        var fullHeight = document.documentElement.clientHeight;
        var fullWidth = document.documentElement.clientWidth;

        var positionX = that.get('clickRowX');
        var positionY = that.get('clickRowY');

        if (fullHeight && (fullHeight - positionY > 0 && fullHeight - positionY < 160)) {
            positionY = fullHeight - 160;
        }

        if (fullWidth && fullWidth - positionX > 0) {       // TODO [Arosha] Position management should be done by central modal
            if (document.body.className.indexOf('ar') > -1) {       // Note this.get('currentLanguage') is not working inside clickEvent function
                positionX = positionX < 400 ? 400 : positionX - 40;
            } else if (fullWidth - positionX < 400) {
                positionX = fullWidth - 400;
            }
        }

        var rightClickPopupMenu = Ember.$('#' + popupId);      // Be Careful to call this after calling 'show modal'

        if (rightClickPopupMenu && rightClickPopupMenu.length > 0) {
            if (that.get('isFullScreenWL')) {
                rightClickPopupMenu.css({'left': positionX, 'top': positionY, 'position': 'absolute'});
            } else {
                rightClickPopupMenu.css({'left': positionX - 75, 'top': positionY - 290, 'position': 'absolute'});
            }

            rightClickPopupMenu.draggable();
        }
    },

    // Wrap table component with 'isWidgetRefreshed' flag on Demand
    refreshTableComponent: function () {
        var that = this;
        this.set('isWidgetRefreshed', false);

        Ember.run.next(function () {
            that.set('isWidgetRefreshed', true);
        });
    },

    // Base method to update table language specific settings
    setLangLayoutSettings: function (lang) {
        this.set('numOfFixedColumns', lang === 'AR' ? 0 : this.fixedColumns);
        this.set('language', lang);
        this.set('lan', lang.toLowerCase());
    },

    setDefaultColumns: function () {
        var that = this;
        var defaultColumnIds = this.get('defaultColumnIds');
        var defaultColumnMapping = this.get('defaultColumnMapping');

        this.set('columnDeclarations', this.getColumnDefinitionsByMap(defaultColumnMapping, defaultColumnIds));

        if (this.get('isRenderingEnabled')) {
            Ember.run.next(this, function () {
                var antiScrollWrap = Ember.$('#' + that.get('widgetContainerKey') + ' .antiscroll-wrap');

                if (antiScrollWrap.antiscroll().data('antiscroll')) {
                    antiScrollWrap.antiscroll().data('antiscroll').rebuild();
                }

                that.setLangLayoutSettings(sharedService.userSettings.currentLanguage);
            });
        }
    },

    setDefaultColumnDeclarations: function () {
        var that = this;
        var labels = that.get('app').lang.labels;
        var defaultColumnMapping = this.get('defaultColumnMapping');
        var moreColumnsIds = this.get('moreColumnsIds');
        var columnArray = this.getColumnDefinitionsByMap(defaultColumnMapping, moreColumnsIds);
        var currentColumnArray = this.get('columnDeclarations');
        var currentColumnMap = {};

        Ember.$.each(currentColumnArray, function (index, column) {
            currentColumnMap[column.id] = column;
        });

        Ember.$.each(columnArray, function (index, column) {
            var columnNameLabel = labels[column.name];
            var columnHeaderSecondName = column.headerSecondName;
            var name = columnNameLabel ? columnNameLabel : labels[column.headerName];

            if (columnHeaderSecondName) {
                name = [name, labels[columnHeaderSecondName]].join(' / ');
            }

            Ember.set(column, 'isSelectedColumn', currentColumnMap[column.id]);
            Ember.set(column, 'displayName', name);
        });

        this.set('defaultColumnDeclarations', columnArray);
    },

    getChangedColumnIds: function () {
        var currentLanguage = sharedService.userSettings.currentLanguage;
        var nonRemovableColumnIds = this.get('nonRemovableColumnIds');
        var columnDeclaration = this.get('defaultColumnDeclarations');
        var columns = this.get('columns');
        var contentMap = {};
        var addedColumns = [];
        var changedColumnIds = [];

        if (currentLanguage !== 'AR') {
            changedColumnIds = changedColumnIds.concat(nonRemovableColumnIds);
        }

        Ember.$.each(columns, function (index, column) {
            contentMap[column.contentPath] = index;
        });

        Ember.$.each(columnDeclaration, function (index, column) {
            if (column.isSelectedColumn) {
                var indexVal = contentMap[column.id];

                if (indexVal) {
                    changedColumnIds[indexVal] = column.keyName;
                } else {
                    addedColumns[addedColumns.length] = column.keyName;
                }
            }
        });

        if (currentLanguage === 'AR') {
            changedColumnIds = changedColumnIds.reverse();

            Ember.$.each(nonRemovableColumnIds, function (index, column) {
                changedColumnIds.splice(index, 0, column);
            });
        }

        changedColumnIds = changedColumnIds.concat(addedColumns);

        // Used for loop instead of foreach as needed to remove undefined values from original array
        for (var i = changedColumnIds.length - 1; i >= 0; i--) {
            var item = changedColumnIds[i];

            if (item === undefined) {
                changedColumnIds.splice(i, 1);
            }
        }

        return changedColumnIds;
    },

    getReOrderedColoumnIds: function (columns, columnMap) {
        var currentLanguage = sharedService.userSettings.currentLanguage;
        var contentMap = {};
        var reOrderedColumnIdArray = [];

        Ember.$.each(columns, function (index, column) {
            contentMap[column.contentPath] = index;
        });

        Ember.$.each(columnMap, function (prop, val) {
            var indexVal = contentMap[val.id];
            reOrderedColumnIdArray[indexVal] = prop;
        });

        if (currentLanguage === 'AR') {
            reOrderedColumnIdArray = reOrderedColumnIdArray.reverse();
        }

        return reOrderedColumnIdArray;
    },

    changeTableColumns: function () {
        var changedColumnIds = this.getChangedColumnIds();

        this.set('defaultColumnIds', changedColumnIds);
        this.closePopup();
        this.saveWidget({defaultColumnIds: changedColumnIds});
        this.setDefaultColumns();
        this.utils.analyticsService.trackEvent(this.get('gaKey'), this.utils.Constants.GAActions.select, ['newColumnsAfterChange:', changedColumnIds.join('')].join(''));
    },

    reOrderTableColumns: function (columns) {
        var columnMap = this.get('defaultColumnMapping');
        var reOrderedColumnIds = this.getReOrderedColoumnIds(columns, columnMap);

        this.set('defaultColumnIds', reOrderedColumnIds);

        this.saveWidget({defaultColumnIds: reOrderedColumnIds});
        this.setDefaultColumns();
    },

    closePopup: function () {
        var modal = sharedService.getService('sharedUI').getService('modalPopupId');

        if (modal) {
            modal.send('closeModalPopup');
        }
    },

    setPopupColumns: function () {
        if (!this.get('moreColumnPopup.isEnabled')) {
            this.setDefaultColumnDeclarations();
            this.removeObserver('moreColumnPopup.isEnabled', this, this.setColumnsOnOverlayClose);
        }
    },

    setColumnsOnOverlayClose: function () {
        Ember.run.debounce(this, this.setPopupColumns, this.debounceDelay);
    },

    actions: {
        clickRow: function (event) {
            if (event) {
                if ((event.clientX || event.pageX)) {      // Set position params before show
                    this.set('clickRowX', event.pageX ? event.pageX : event.clientX);
                    this.set('clickRowY', event.pageY ? event.pageY : event.clientY);
                }
            }
        },

        changeColumns: function () {
            this.changeTableColumns();
        },

        reOrderColumns: function (columns) {
            this.reOrderTableColumns(columns);
        },

        cancelMoreColumns: function () {
            this.closePopup();
        },

        loadMoreColumnsDropDown: function () {
            var viewName = 'components/more-columns-dropdown';
            var instanceName = 'component:more-columns-dropdown';

            // Render component to application.hbs
            var modal = sharedService.getService('sharedUI').getService('modalPopupId');
            var moreColumnsDropdown = this.container.lookupFactory(instanceName).create();

            moreColumnsDropdown.showPopup(this, viewName, modal, undefined, true);

            this.set('moreColumnPopup', modal);
            this.addObserver('moreColumnPopup.isEnabled', this, this.setColumnsOnOverlayClose);
        }
    }
});
