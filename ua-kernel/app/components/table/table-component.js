import Ember from 'ember';
import EmberTableComponent from 'ember-table/components/ember-table';
import RowArrayController from 'ember-table/controllers/row-array';
import RowDefinition from '../../views/table/row-definition';
import appConfig from '../../config/app-config';
import sharedService from '../../models/shared/shared-service';
import appEvents from '../../app-events';

export default EmberTableComponent.extend({
    layoutName: 'components/table-component',
    hasBody: true,

    afterRenderEvent: function () {}, // TODO [AROSHA] remove calling this from ember table library
    buttonAction: null,
    buttonMenuAction: null,

    // Extended from lib to give our row view
    tableRowView: 'Ember.TableRow',
    tableRowViewClass: Ember.computed.alias('tableRowView'),

    // To access table scroll
    scrollLeft: Ember.computed.alias('_tableScrollLeft'),

    // Event handling params
    clickEventHandler: null,

    isMobile: false,

    // Alias for ember table private variables, to be used in proxies for handling sorting
    startIndex: 0,
    numItemsShowing: 0,

    bodyContent: Ember.computed(function () {   // Extended from lib to give our row definition
        return RowArrayController.create({
            target: this,
            parentController: this,
            container: this.get('container'),
            itemController: RowDefinition,
            content: this.get('content')
        });
    }).property('content'),

    onDomReady: function () {
        this.elementSizeDidChange();
        appEvents.unSubscribeDomReady(this.get('id'));
    },

    /* *
     * Overwriting ember-table function to register DOM ready
     */
    elementSizeDidChange: function () {
        if ((this.get('_state') || this.get('state')) !== 'inDOM') {
            return;
        }

        if (Ember.appGlobal.events.isDomReady) {
            this.set('_width', this.$().parent().width());
            this.set('_height', this.$().parent().height());

            // We need to wait for the table to be fully rendered before antiscroll can be used
            Ember.run.next(this, this.updateLayout);
        } else {
            appEvents.subscribeDomReady(this.get('id'), this);
        }
    },

    /* *
     * Overwriting ember-table private property to modify height calculation params
     */
    _tableContentHeight: Ember.computed(function () {
        var bodyContentLen = this.get('content.length');
        var contentLen = this.get('lenContent.length');
        var rowCount = contentLen && bodyContentLen < contentLen ? contentLen : bodyContentLen;

        this.set('bodyContent.length', rowCount);

        return this.get('rowHeight') * rowCount;
    }).property('rowHeight', 'lenContent.length', 'bodyContent.length'),

    _numItemsShowing: Ember.computed(function () {
        var numViews = Math.floor(this.get('_bodyHeight') / this.get('rowHeight'));
        this.set('numItemsShowing', numViews);

        return numViews;
    }).property('_bodyHeight', 'rowHeight'),

    _startIndex: Ember.computed(function () {
        var numContent = this.get('bodyContent.length');
        var numViews = this.get('_numItemsShowing');
        var rowHeight = this.get('rowHeight');
        var scrollTop = this.get('_tableScrollTop');
        var index = Math.floor(scrollTop / rowHeight);

        // Adjust start index so that end index doesn't exceed content length
        if (index + numViews >= numContent) {
            index = numContent - numViews;
        }

        index = Math.max(index, 0);
        this.set('startIndex', index);

        return index;
    }).property('bodyContent.length', '_numItemsShowing', 'rowHeight', '_tableScrollTop'),

    refreshTableComponent: function () {
        var that = this;
        Ember.run(that, that.elementSizeDidChange);
    }.observes('isRefreshed'),

    getTableComponent: function () {
        var widget = Ember.$('#' + this.get('id'));

        if (widget && widget.length > 0) {
            widget = widget[0];
        }

        return widget;
    },

    onBodyContentLengthDidChange: Ember.observer(function () {
        Ember.run.next(this, function () {
            Ember.run.once(this, this.updateLayout);
        });
    }, 'bodyContent.length', 'lenContent.length'),

    /* Starting Event handling Functions */
    clickEventFunction: function (e) {  // This only blocks default right click menu
        var event = e;

        if (event.ctrlKey) {
            event.returnValue = true;
            return true;
        }

        if (!event) {
            event = Ember.appGlobal.events.mousedown ? Ember.appGlobal.events.mousedown : window.event;
        }

        if (event.preventDefault) {
            event.preventDefault();
        } else {
            event.returnValue = false;
        }

        event.stopPropagation();
        return false;
    },

    doubleClick: function (e) {
        var event = e;

        if (!event) {
            event = Ember.appGlobal.events.mousedown ? Ember.appGlobal.events.mousedown : window.event;
        }

        var selectedRow = this.getRowForEvent(event);

        if (!selectedRow) {
            return true;
        } else {
            this.sendAction('doubleClickAction', selectedRow, event);
        }
    },

    init: function () {
        this.set('isMobile', appConfig.customisation.isMobile);
        this._super();
    },

    load: function () {
        this.clickEventHandler = this.onDocumentClick.bind(this);
        var widget = this.getTableComponent();

        if (widget.addEventListener) { // For all major browsers, except IE 8 and earlier
            widget.addEventListener('mousedown', this.clickEventHandler);
            document.addEventListener('contextmenu', this.clickEventFunction);
        } else if (widget.attachEvent) { // For IE 8 and earlier versions
            widget.attachEvent('onclick', this.clickEventHandler);
            widget.attachEvent('onmousedown', this.clickEventHandler);
            document.attachEvent('oncontextmenu', this.clickEventFunction);
        }
    }.on('didInsertElement'),

    unload: function () {
        // Implement rest of the event removal
        var widget = this.getTableComponent();

        if (widget && widget.removeEventListener) {
            widget.removeEventListener('mousedown', this.clickEventHandler);
            document.removeEventListener('contextmenu', this.clickEventFunction);
        } else if (widget && widget.detachEvent) { // For IE 8 and earlier versions
            widget.detachEvent('onclick', this.clickEventHandler);
            widget.detachEvent('onmousedown', this.clickEventHandler);
            document.detachEvent('oncontextmenu', this.clickEventFunction);
        }
    }.on('willDestroyElement'),

    onDocumentClick: function (e) {
        var event = e;

        if (event.ctrlKey) {
            event.returnValue = true;
            return true;
        }

        if (!event) {
            event = Ember.appGlobal.events.mousedown ? Ember.appGlobal.events.mousedown : window.event;
        }

        var selectedRow = this.getRowForEvent(event);

        if (!selectedRow) {
            return true;
        } else {
            var that = this;
            that.sendAction('rowClickAction', selectedRow, event);      // This should be executed before event.stopPropagation();

            // This patch is needed in order to make the selection appear in the table
            Ember.run.later(function () {
                that.click(event);
            }, 100);
        }
    },

    /* Ending Event handling Functions */

    footerContent: Ember.computed(function () {
        var rows = this.get('footerArray');

        if (!rows) {
            return Ember.A();
        }

        return rows;
    }).property('footerArray'),

    /* *
     * Ember-Table function
     * To prevent iterating all bodyContent, used subControllers instead.
     * @param row
     * @returns {*}
     */
    rowIndex: function (row) {
        if (!this.get('bodyContent._subControllers')) {
            return null;
        }

        return this.get('bodyContent._subControllers').indexOf(row);
    },

    /* *
     * Ember-Table function
     * This adds debounce to antiscroll rebuild and fill columns for improving performance.
     */
    updateLayout: function () {
        if (this.get('isMobile') || (this.get('_state') || this.get('state')) !== 'inDOM') {
            return;
        }

        Ember.run.debounce(this, this._rebuildAntiScroll, 100);
    },

    /* *
     * Rebuild anti scroll
     * @private
     */
    _rebuildAntiScroll: function () {
        var antiScrollWrap = Ember.$('#' + this.get('id') + ' .antiscroll-wrap');

        if (antiScrollWrap && antiScrollWrap.antiscroll().data('antiscroll')) {
            antiScrollWrap.antiscroll().data('antiscroll').rebuild();

            var scrollLeftSize = 0;

            if (sharedService.userSettings.currentLanguage === 'AR') {
                scrollLeftSize = this.get('bodyContent.length') > 0 || this.get('lenContent.length') > 0 ? 5700 : 5600;
            }

            this.set('scrollLeft', scrollLeftSize);
        }

        if (this.get('columnsFillTable') && this.get('columns')) {
            this.doForceFillColumns();
        }
    },

    actions: {
        sortByColumn: function sortByColumn(column) {
            this.sendAction('sortAction', column);
        },

        expandColumnAction: function expandColumnAction() {
            this.sendAction('expandColumnAction');
        },

        buttonAction: function buttonAction(column, row) {
            this.set('buttonAction', column.get('buttonFunction'));
            this.sendAction('buttonAction', column, row);
        },

        buttonMenuAction: function buttonMenuAction(option, row, column) {
            this.set('buttonMenuAction', column.get('buttonFunction'));
            this.sendAction('buttonMenuAction', option, row, column);
        },

        linkAction: function buttonAction(column, row) {
            this.set('linkAction', column.get('linkFunction'));
            this.sendAction('linkAction', column, row);
        }
    }
});
