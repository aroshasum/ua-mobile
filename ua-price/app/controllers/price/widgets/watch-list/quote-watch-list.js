/* global Mousetrap */

import Ember from 'ember';
import sharedService from '../../../../models/shared/shared-service';
import priceWidgetConfig from '../../../../config/price-widget-config';
import BaseWatchList from './base-watch-list';
import appEvents from '../../../../app-events';
import constant from '../../../../utils/constants';

// Cell Views
import ExpandedSymbolCell from '../../../../views/table/dual-cells/expanded-symbol-cell';
import ExpandedLtpCell from '../../../../views/table/dual-cells/expanded-ltp-cell';
import ExpandedChgCell from '../../../../views/table/dual-cells/expanded-chg-cell';
import HeaderCell from '../../../../views/table/dual-cells/header-cell';
import Cell from '../../../../views/table/cell';
import DualChangeCell from '../../../../views/table/dual-cells/dual-change-cell';
import DualTextCell from '../../../../views/table/dual-cells/dual-text-cell';
import TextIconCell from '../../../../views/table/dual-cells/text-icon-cell';
import UpDownCell from '../../../../views/table/up-down-cell';
import TableRow from '../../../../views/table/table-row';

export default BaseWatchList.extend({
    rowHeight: 44,
    isShowTitle: false,
    isRenderingEnabled: false,
    isChangeWidth: false,

    navigation: {
        up: 1,
        down: 0
    },

    tableComponentId: function () {
        return this.get('wkey');
    }.property('wkey'),

    onLoadWidget: function () {
        this._super();
        this._bindFirstElement();
        this._bindKeyboardShortcuts();
        this.setDefaultSort();

        this.set('columnDeclarations', priceWidgetConfig.watchList.quoteColumns);
        this.set('isShowTitle', this.get('widgetContainer.showTitle') || this.get('isTablet'));
    },

    onAfterRender: function () {
        var that = this;

        Ember.run.next(this, function () {
            that.set('isRenderingEnabled', true);
        });
    },

    onUnloadWidget: function () {
        this._super();

        // Reset anti-scroll position
        this.resetScroll();

        this.set('content', Ember.A());
        this.set('masterContent', Ember.A());
    },

    setCellViewsScopeToGlobal: function () {
        Ember.HeaderCell = HeaderCell;
        Ember.Cell = Cell;
        Ember.DualChangeCell = DualChangeCell;
        Ember.DualTextCell = DualTextCell;
        Ember.TextIconCell = TextIconCell;
        Ember.UpDownCell = UpDownCell;
        Ember.TableRow = TableRow;
        Ember.ExpandedSymbolCell = ExpandedSymbolCell;
        Ember.ExpandedLtpCell = ExpandedLtpCell;
        Ember.ExpandedChgCell = ExpandedChgCell;
    },

    cellViewsForColumns: {
        dualText: 'Ember.DualTextCell',
        textIconCell: 'Ember.TextIconCell',
        upDown: 'Ember.UpDownCell',
        dualChange: 'Ember.DualChangeCell',
        expandedSymbolCell: 'Ember.ExpandedSymbolCell',
        expandedLtpCell: 'Ember.ExpandedLtpCell',
        expandedChgCell: 'Ember.ExpandedChgCell'
    },

    _bindKeyboardShortcuts: function () {
        var widgetKey = this.get('wkey');
        var that = this;

        Ember.appGlobal.activeWidget = widgetKey;

        Mousetrap.bind('enter', function () {
            that._onEnterPress();
            Ember.appGlobal.activeWidget = widgetKey;
        }, widgetKey);

        Mousetrap.bind('arrowdown', function () {
            that._navigateUpDown(that.navigation.down);
            Ember.appGlobal.activeWidget = widgetKey;
        }, widgetKey);

        Mousetrap.bind('arrowup', function () {
            that._navigateUpDown(that.navigation.up);
            Ember.appGlobal.activeWidget = widgetKey;
        }, widgetKey);
    },

    _bindFirstElement: function () {
        var that = this;

        Ember.run.next(function () {
            var tableIdDiv = Ember.$('#' + that.get('wkey'));

            if (tableIdDiv.length !== 0) {
                var firstRowElement = tableIdDiv.children().closest('div').get('1').children[0].children[0].children[0].children[0].children[0];

                that.set('viewId', firstRowElement.id);
                firstRowElement.className += ' ember-table-hover';
            }
        });
    },

    _onEnterPress: function () {
        var view = Ember.View.views[this.get('viewId')];

        if (view) {
            var rowData = view.get('row');
            this.triggerSymbolChange(rowData);
        }
    },

    _navigateUpDown: function (navDirection) {
        var currentIndex = 0;
        var isSelected = false;
        var minNextTopIndex = 0;
        var innerScroll = this._getAntiScroller();
        var rowHeight = this.get('rowHeight');
        var tableIdDiv = Ember.$('#' + this.get('wkey'));

        if (tableIdDiv.length !== 0) {
            var childTop, currentTop, beforeLastDiv, lastRowTop, previousLastRow, lastRow, noOfRows;
            var mainDiv = tableIdDiv.children().closest('div').get('1').children[0].children[0].children[0];
            var divSet = mainDiv.children[0];
            var tableHeight = mainDiv.clientHeight;
            var lastDivTop = navDirection * tableHeight;

            // Get current selected row if any
            for (var i = 0; i < divSet.childElementCount; i++) {
                childTop = parseInt(divSet.children[i].style.top, 10);

                if (navDirection === this.navigation.down) {
                    if (childTop > lastDivTop) {
                        lastDivTop = childTop;
                    }
                } else {
                    if (childTop < lastDivTop) {
                        lastDivTop = childTop;
                    }
                }

                if (divSet.children[i].classList.contains('ember-table-hover')) {
                    currentTop = childTop;
                    currentIndex = i;
                    isSelected = true;
                }
            }

            // Select first row if none of rows are selected
            if (!isSelected) {
                this._setFirstElement(divSet);
                this.set('viewId', divSet.children[0].id);
                return false;
            }

            if (navDirection === this.navigation.down) {
                lastRow = tableHeight - rowHeight; // Scroll down when it reaches last fully rendered row
                lastRowTop = tableHeight - rowHeight; // Set top of scrolling point
            } else {
                noOfRows = divSet.childElementCount - 2; // Scroll up when it reaches first fully rendered row
                lastRowTop = tableHeight - noOfRows * rowHeight; // Set top of scrolling point
            }

            // If it reaches the bottom,it scrolls to the top of the watch-list
            if (navDirection === this.navigation.down && currentTop === lastRow) {
                innerScroll.scrollTop = 0;
                return false;
            }

            if (navDirection === this.navigation.up && currentTop === 0) {
                innerScroll.scrollTop = lastRowTop;
                return false;
            }

            // Remove selected css class if any
            if (isSelected) {
                divSet.children[currentIndex].classList.remove('ember-table-hover');
                minNextTopIndex = currentIndex - 1;
            }

            var minNextTop = (navDirection === this.navigation.up) ? lastDivTop : tableHeight;

            // Search for the row element which has minimum scroll Top after current scrollTop
            for (var j = 0; j < divSet.childElementCount; j++) {
                childTop = parseInt(divSet.children[j].style.top, 10);

                if (navDirection === this.navigation.down) {
                    if (childTop > currentTop && childTop < minNextTop) {
                        minNextTop = childTop;
                        minNextTopIndex = j;
                    }
                } else {
                    if (childTop < currentTop && childTop > minNextTop) {
                        minNextTop = childTop;
                        minNextTopIndex = j;
                    }
                }
            }

            // Apply selected css class to next element
            this._setNextElement(divSet.children[minNextTopIndex]);

            // Update viewId of currently selected row
            if (divSet.children[minNextTopIndex]) {
                this.set('viewId', divSet.children[minNextTopIndex].id);
            }

            // Get previous row of last row in current list
            if (navDirection === this.navigation.down) {
                beforeLastDiv = lastDivTop - 2 * rowHeight; // Get last fully rendered row
                previousLastRow = lastRowTop - 2 * rowHeight; // Get top value of last fully rendered row
            } else {
                beforeLastDiv = lastDivTop + rowHeight;
            }

            // Check whether selected item has reached to before last row and previous row of bottom of watchlist
            if (navDirection === this.navigation.down && currentTop === beforeLastDiv && currentTop !== previousLastRow) {
                innerScroll.scrollTop = currentTop;
                return false;
            }

            if (navDirection === this.navigation.up && currentTop === beforeLastDiv) {
                innerScroll.scrollTop = currentTop - noOfRows * rowHeight;
                return false;
            }
        }

        return false;
    },

    _setFirstElement: function (divElement) {
        var element = divElement.children[0];
        element.className += ' ember-table-hover';
    },

    _setNextElement: function (divElement) {
        if (divElement) {
            divElement.className += ' ember-table-hover';
        }
    },

    _getAntiScroller: function () {
        var tableIdDiv = Ember.$('#' + this.get('tableComponentId'));
        return tableIdDiv && tableIdDiv.length > 0 ? tableIdDiv.children().closest('div').get('1').children[0].children[0] : undefined;
    },

    _initializeMenuComponents: function () {
        this.menuComponent = this.container.lookup('component:symbol-click-menu-popup');
        this.menuComponent.associatedController = this;

        if (!this.menuComponent) { // Create a symbol-click-menu-popup component object and call base-context-menu
            this.menuComponent = this.container.lookupFactory('component:symbol-click-menu-popup').create({associatedController: this});
        }

        this._generateFullContextMenu();
    },

    _onClickRow: function (selectedRow, clickEvent) {
        var stock = selectedRow.sym ? selectedRow : selectedRow.getProperties('exg', 'sym', 'inst');

        if (this.get('viewId')) {
            var view = Ember.View.views[this.get('viewId')];

            if (view) {
                view.element.classList.remove('ember-table-hover');
            }
        }

        var currentView = clickEvent.target.offsetParent;

        this.set('viewId', currentView.id);
        this._setNextElement(currentView);

        if (clickEvent && clickEvent.button === constant.MouseButtons.RightClick) {
            this._initializeMenuComponents();
            sharedService.getService('sharedUI').invokeRightClick(stock, this.get('wkey'), clickEvent, this.menuComponent);
        } else {
            this.triggerSymbolChange(stock);
        }
    },

    _onKeyDown: function (event) {
        var keyCode = event.keyCode;
        var KeyCodeEnum = this.utils.Constants.KeyCodes;

        Ember.appGlobal.activeWidget = this.get('wkey');

        switch (keyCode) {
            case KeyCodeEnum.DownArrow:
                this._navigateUpDown(this.navigation.down);
                break;

            case KeyCodeEnum.UpArrow:
                this._navigateUpDown(this.navigation.up);
                break;

            case KeyCodeEnum.Enter:
                this._onEnterPress();
                break;

            case KeyCodeEnum.Escape:
                this.set('textFilter', '');
                break;

            default:
                break;
        }

        return false;
    },

    onPriceMetaReceived: function () {
        if (this.get('isExgChanged')) {
            Ember.run.next(this, this._setFirstSymbol);
        }
    },

    _setFirstSymbol: function () {
        var selectedLink = 1;
        var stockArr = this.get('content');

        if (stockArr && stockArr.length > 0) {
            var stock = stockArr[0];
            appEvents.onSymbolChanged(stock.sym, stock.exg, stock.inst, selectedLink);
        }
    },

    actions: {
        clickRow: function (selectedRow, clickEvent) {
            this._super(clickEvent);
            this._onClickRow(selectedRow, clickEvent);
        },

        doubleClickRow: function (selectedRow) {
            var rowData = selectedRow.getProperties('exg', 'sym', 'inst');
            sharedService.getService('priceUI').showPopupWidget({container: this.container, controllerString: 'view:symbol-popup-view'}, {tabId: 0, sym: rowData.sym, exg: rowData.exg, inst: rowData.inst});
        },

        onSelectExchange: function (exchg) {
            if (this.get('exg') !== exchg.code) {
                this.set('isExgChanged', true);
                this._super(exchg);
            } else {
                this.set('isExgChanged', false);
            }
        },

        onKeyDown: function (event) {
            this._onKeyDown(event);
        },

        showFilterBox: function () {
            var that = this;
            var currentState = this.get('isChangeWidth');

            this.set('textFilter', '');

            Ember.run.later(function () {
                that.set('isChangeWidth', !currentState);
            }, 10);
        }
    }
});