import Ember from 'ember';
import BaseComponent from './base-component';
import languageDataStore from '../models/shared/language/language-data-store';
import sharedService from '../models/shared/shared-service';

export default BaseComponent.extend({
    layoutName: 'components/multi-step-progress-bar',
    app: languageDataStore.getLanguageObj(),
    isShowError: false,

    initialize: function () {
        this.setLayout();
        this.set('userSettings', sharedService.userSettings);
    }.on('init'),

    setLayout: function () {
        var that = this;
        var stepArray = this.get('stepArray');
        var currentStep = this.get('currentStep');

        Ember.$.each(stepArray, function (key, step) {
            that._setDisplayName(step);

            if (key < currentStep) {
                Ember.set(step, 'step', 'completed-step');
                Ember.set(step, 'isCompleted', true);
            } else if (key === currentStep) {
                Ember.set(step, 'step', 'current-step');
                Ember.set(step, 'isCompleted', false);
            } else {
                Ember.set(step, 'step', 'not-completed-step');
                Ember.set(step, 'isCompleted', false);
            }
        });
    }.observes('this.currentStep'),

    onLanguageChanged: function () {
        var that = this;
        var stepArray = this.get('stepArray');

        Ember.$.each(stepArray, function (key, step) {
            that._setDisplayName(step);
        });
    }.observes('userSettings.currentLanguage'),

    showError: function () {
        var stepArray = this.get('stepArray');
        var step = stepArray[this.get('currentStep')];

        Ember.set(step, 'step', 'error-step');
        Ember.set(step, 'isCompleted', false);
    }.observes('isShowError'),

    _setDisplayName: function (step) {
        Ember.set(step, 'displayName', this.app.lang.labels[step.des]);
    },

    actions: {
        selectStep: function () {
            var currentStep = this.get('currentStep');
            this.sendAction('selectAction', currentStep);
        }
    }
});
