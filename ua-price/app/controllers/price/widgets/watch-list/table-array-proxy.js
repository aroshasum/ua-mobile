import Ember from 'ember';

export default Ember.ArrayProxy.extend({
    content: Ember.A(),
    sortedContent: Ember.A(),
    isContentReady: false,

    removedIndex: -1,
    startIndex: 0,
    numItemsShowing: 0,

    init: function () {
        this.createDummyCollection();
        this._super();
    },

    onClearData: function () {
        this.set('startIndex', 0);
        this.set('isContentReady', false);
    },

    // This will create empty rows until data binding happens
    createDummyCollection: function () {
        // TODO: [satheeqh] Calculate initial row count
        for (var i = 0; i < 30; i++) {
            this.get('content').pushObject(Ember.Object.create({dataObj: undefined}));
        }
    },

    // Array proxy overwrite to support content sort event handling
    arrayWillChange: Ember.K,

    /* *
     * Callback function while array content changes. Triggers when add/remove elements.
     * @param contentWrap - Wrapper of content base
     * @param start - Start index of change occurred
     * @param removeCount - No. of removed elements
     * @param addCount - No. of added elements
     */
    arrayDidChange: function (contentWrap, start, removeCount, addCount) {
        // TODO: [satheeqh] Checks whether this required
        this.set('sortedContent', contentWrap.get('arrangedContent'));

        var startIndex = this.get('startIndex'),
            lastIndex = this.get('numItemsShowing') + startIndex,
            contentLength = this.get('sortedContent.length');

        if ((addCount === contentLength || removeCount === contentLength) && start === 0) {
            // Allow full array sort, update only viewport elements
            this._updateContent(startIndex, lastIndex);

            return;
        }

        if (removeCount > 0) {
            // Keep track of removed element index, consider this on calculating start index while add happens
            if (startIndex <= start <= lastIndex) {
                this.set('removedIndex', start);
            }

            return;
        } else if (addCount <= 0) {
            return;
        }

        var rmIndex = this.get('removedIndex'),
            updateStart = -1,
            updateEnd = -1;

        if (startIndex <= start && start <= lastIndex) {
            // Added to viewport
            if (startIndex <= rmIndex && rmIndex <= lastIndex) {
                // Swap
                updateStart = start < rmIndex ? start : rmIndex;
                updateEnd = start < rmIndex ? rmIndex : start;
            } else {
                // Moving in
                updateStart = rmIndex < start ? startIndex : start;
                updateEnd = rmIndex < start ? start : lastIndex;
            }
        } else {
            // Removed from viewport
            if (startIndex <= rmIndex && rmIndex <= lastIndex) {
                // Moving out
                updateStart = rmIndex < start ? rmIndex : startIndex; // When row move from upper to down, need to refresh upper portion
                updateEnd = rmIndex < start ? lastIndex : rmIndex;
            } else {
                // Change out of viewport
                return;
            }
        }

        if (updateStart >= 0 && updateStart <= updateEnd) {
            this._updateContent(updateStart, updateEnd);
        }

        this.set('removedIndex', -1);
    },

    /* *
     * Updates content object element. This way all the elements from start index will be updated.
     * @param updateStart - Top most index to start updating.
     * @param updateEnd - Last index to stop updating.
     * @private
     */
    _updateContent: function (updateStart, updateEnd) {
        // This will block style mixin on updating styles
        // TODO: [satheeqh] Do this via table component
        Ember.appGlobal.isSortingProgress = true;

        for (var i = updateStart; i <= updateEnd; i++) {
            this.objectAt(i);
        }

        Ember.run.next(this, function () {
            Ember.appGlobal.isSortingProgress = false;
        });
    },

    // Since initial content length based on dummy rows, then required to switch to actual content length
    length: Ember.computed(function () {
        return this.get('isContentReady') ? this.get('sortedContent.length') : this.get('content.length');
    }).property('sortedContent.length', 'isContentReady'),

    /* *
     * Overwriting default array proxy method to provided table row content with updated data binding.
     * @param index - ember-table row index to fetch object from content
     * @returns {Row Object}
     */
    objectAt: function (index) {
        // TODO: [satheeqh] Need to add a logic not to create all objects in content. Based on index, set the data object instead. (Analyze)

        var content = this.get('content');
        var obj = content[index];

        if (!obj) {
            // Empty dummy object created to update the data object instead teardown the row content
            obj = Ember.Object.create({dataObj: undefined});
            content[index] = obj;
        }

        obj.set('dataObj', this.sortedContent[index]);

        return obj;
    }
});