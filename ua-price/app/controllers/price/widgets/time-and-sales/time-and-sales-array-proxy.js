import Ember from 'ember';
import sharedService from '../../../../models/shared/shared-service';

export default Ember.ArrayProxy.extend({
    // Backlog request initial values
    backlogBatchSize: 100,
    nextBacklogReqIndex: 20,
    backlogReqIndex: -1,
    latestBacklogSeq: -1,

    realTimeContent: Ember.A([]),
    backlogContent: Ember.A([]),

    exg: '',
    sym: '',

    isLoading: false,
    isReqProcessing: false,

    realTimeArrayLastIndex: function () {
        return this.get('realTimeContent.length') - 1;
    }.property('realTimeContent.length'),

    lastIndex: function () {
        return this.get('content.length') - 1;
    }.property('content.length'),

    /* *
     * Overwriting default array proxy method to handle backlog and real-time content
     * @param index - ember-table row index to fetch object from content
     * @returns {Object} Time and Sales object
     */
    objectAt: function (index) {
        var backlogContent = this.get('backlogContent');
        var realTimeArrayLastIndex = this.get('realTimeArrayLastIndex');
        var lastIndex = this.get('lastIndex');

        if (index > realTimeArrayLastIndex) {
            var backlogIndex = index - (realTimeArrayLastIndex + 1);
            var tradeObj = backlogContent[backlogIndex];

            if (index !== lastIndex && !this.get('isReqProcessing') && backlogIndex > this.get('nextBacklogReqIndex')) {
                this.set('backlogReqIndex', backlogIndex);
                this._sendBacklogRequest();
            }

            if (!tradeObj && index <= lastIndex) {
                // If the row content not available add an empty trade object to collection.
                tradeObj = sharedService.getService('price').timeAndSalesDS.getBacklogEmptyRecord(this.get('exg'), this.get('sym'), backlogIndex);
            }

            if (this.get('isLoading') && tradeObj && !tradeObj.isEmpty) {
                this.set('isLoading', false);
            } else if (!this.get('isLoading') && tradeObj && tradeObj.isEmpty && index !== lastIndex) {
                this.set('isLoading', true);
            }

            return tradeObj;
        } else {
            return this.get('realTimeContent')[index];
        }
    },

    _sendBacklogRequest: function () {
        if (this.get('latestBacklogSeq') > 0) {
            this.set('isReqProcessing', true);
            sharedService.getService('price').sendTimeAndSalesBacklogRequest(this.get('exg'), this.get('sym'), this.get('latestBacklogSeq'), this.backlogBatchSize);
        }
    }
});
