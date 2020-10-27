/* global Mousetrap */

import Ember from 'ember';
import sharedService from '../models/shared/shared-service';
import BasePopup from './base-popup';
import appConfig from '../config/app-config';
import languageDataStore from '../models/shared/language/language-data-store';

export default BasePopup.extend({
    layoutName: 'components/bootstrap-dropdown-select',
    responsiveIcon: false,
    clickEventHandler: '',
    title: '',
    dropdownIconClass: '',
    prevActiveWidget: undefined,

    applyDescription: function () {
        var isMobile = appConfig.customisation.isMobile;

        if (isMobile) {
            this.setMobileNativeDropdownValues();

            if (!this.get('title')) {
                this._setDropdownTitle();
            }

            if (this.mobileButtonClass) {
                this.set('buttonClass', this.mobileButtonClass);
            }

            if (!this.buttonClass) {
                this.set('buttonClass', 'dropdown-text-only');
            }

            if (Ember.isIos) {
                this.set('dropdown-arrow', 'icon-angle-down font-xxx-l');
            } else {
                this.set('dropdown-arrow', 'icon-arrow-lowerright font-xx-l v-bottom');
            }
        } else {
            var dropdownIconClass = this.get('dropdownIconClass');

            if (!this.buttonClass) {
                this.set('buttonClass', 'dropdown-solid-back-color');
            }

            this.set('dropdown-arrow', dropdownIconClass ? dropdownIconClass : 'icon-angle-down');
        }

        this.set('userSettings', sharedService.userSettings);
        this._setMobileNativeDropdownValues();
    }.on('init'),

    expose: function () {
        this.set('isDataDropdownDisabled', this.get('isDropdownDisabled'));
    }.on('didInsertElement'),

    setMobileNativeDropdownValues: function () {
        Ember.run.once(this, this._setMobileNativeDropdownValues);
    }.observes('app.lang', 'isDropdownDisabled', 'options.@each.selectedDesc'),

    _setMobileNativeDropdownValues: function () {
        var that = this;
        var optionArray = that.get('options');

        if (optionArray && optionArray.length > 0) {
            var optionArrayMobileNative = [];

            optionArray.forEach(function (element) {
                var value = '';
                var stringValue = '';

                if (element) {
                    var optionObject = {};

                    try {
                        value = element.get(that.get('valueKey'));
                        stringValue = (typeof value === 'number') ? value.toString() : value;

                        optionObject.text = element.get(that.get('labelKey')) ? element.get(that.get('labelKey')) : stringValue;
                        optionObject.value = stringValue;
                    } catch (e) {
                        value = element[that.get('valueKey')];
                        stringValue = (typeof value === 'number') ? value.toString() : value;

                        optionObject.text = element[that.get('labelKey')] ? element[that.get('labelKey')] : stringValue;
                        optionObject.value = stringValue;
                    }

                    optionArrayMobileNative[optionArrayMobileNative.length] = optionObject;
                }
            });

            that.set('optionArrayMobileNative', optionArrayMobileNative);
            this.set('isDataDropdownDisabled', this.get('isDropdownDisabled'));
        } else {
            this.set('isDataDropdownDisabled', true);
        }
    },

    displayDesc: function () {
        var selectedObject = this.get('selectedOption');
        var selectedLabelKey = this.get('selectedLabelKey') ? this.get('selectedLabelKey') : this.get('labelKey');

        if (this.get('responsiveIcon')) {
            return '<i class="' + this.iconClass + '"></i>';
        } else if (selectedObject) {
            try {
                return selectedObject.get(selectedLabelKey);
            } catch (e) {
                return selectedObject[selectedLabelKey];
            }
        }
    }.property('selectedOption', 'isDisplayValueChanged', 'responsiveIcon'),

    onLanguageChanged: function () {
        this._setDropdownTitle();
    }.observes('userSettings.currentLanguage'),

    _setDropdownTitle: function () {
        var app = languageDataStore.getLanguageObj();
        this.set('title', app.lang.labels.selectOption);
    },

    selectedOption: function () {
        var arrOptions = this.get('options');
        var value = this.get('value');
        var defaultValue = this.get('defaultSelect');

        if (!Ember.isEmpty(value)) {
            return arrOptions.findProperty(this.get('valueKey'), value);
        } else if (!Ember.isEmpty(defaultValue)) {
            return defaultValue;
        } else if (!Ember.isEmpty(arrOptions)) {
            return arrOptions[0];
        }
    }.property('options', 'value'),

    reloadDropDown: function () {
        Ember.run.once(this, this.applyDescription);
    }.observes('dropdownIconClass', 'responsiveIcon', 'options.@each'),

    createDropDown: function (viewName, instanceName) {
        // Render component to application.hbs
        var modal = sharedService.getService('sharedUI').getService('modalPopupId');
        var bootstrapDropdown = this.container.lookupFactory(instanceName).create();

        bootstrapDropdown.showPopup(this, viewName, modal, undefined, true);
    },

    _loadDropDownList: function () {
        var viewName = 'components/bootstrap-dropdown-select-list';
        var instanceName = 'component:bootstrap-dropdown-select-list';

        this.createDropDown(viewName, instanceName);
    },

    _onSelectValue: function (option) {
        var selectedOption = option;

        if (navigator.isNativeDevice && !appConfig.customisation.isTablet) {
            var that = this;
            var arrOptions = this.get('options');

            Ember.appGlobal.events.isNativeDropdownOpen = false;

            Ember.$.each(arrOptions, function (index, optionElement) {
                var optionValue = optionElement[that.get('valueKey')];

                if ((optionValue || optionValue === 0) && optionValue.toString() === selectedOption) {
                    selectedOption = optionElement;

                    return false;
                }
            });

            var selectedValue = selectedOption[this.get('valueKey')];

            if (!selectedValue && selectedValue !== 0) {
                selectedOption = {};
                selectedOption[this.get('valueKey')] = this.get('value');
            }
        }

        this.set('value', selectedOption[this.get('valueKey')]);

        selectedOption.customArgs = this.get('customArgs');

        this.sendAction('selectAction', selectedOption);

        var modal = sharedService.getService('sharedUI').getService('modalPopupId');

        if (modal) {
            modal.send('closeModalPopup');
        }

        Ember.appGlobal.activeWidget = this.get('prevActiveWidget');
    },

    _onFocusedIn: function () {
        var that = this;
        var wkey = this.get('wkey');

        Mousetrap.bind('arrowdown', function () {
            that._selectOption(1);
        }, wkey);

        Mousetrap.bind('arrowup', function () {
            that._selectOption(-1);
        }, wkey);

        // Register a focus out event on button to unbind key bindings
        var buttonElem = this.$('button');

        if (buttonElem && buttonElem[0]) {
            buttonElem[0].onfocusout = function () {
                Mousetrap.unbind('arrowdown', wkey);
                Mousetrap.unbind('arrowup', wkey);
            };
        }
    },

    _selectOption: function (increment) {
        var options = this.get('options');
        var currentIndex = options.indexOf(this.get('selectedOption'));
        var nextIndex = currentIndex + increment;

        if (currentIndex > -1 && nextIndex >= 0 && options.length > 1 && nextIndex < options.length) {
            var option = options[nextIndex];

            if (option) {
                this.set('value', option[this.get('valueKey')]);
                this.sendAction('selectAction', option);
            }
        }
    },

    _onCancelSelect: function () {
        Ember.appGlobal.events.isNativeDropdownOpen = false;
    },

    actions: {
        select: function (option) {
            this._onSelectValue(option);
        },

        onWidgetClick: function () {
            if (!this.get('isDataDropdownDisabled')) {
                this.set('prevActiveWidget', Ember.appGlobal.activeWidget);
                Ember.appGlobal.activeWidget = 'bootstrap-dropdown' + this.get('wkey'); // Change active widget key to a key with a prefix to achieve default behaviour

                if (appConfig.customisation.isMobile && !this.get('isNativeDropdownDisabled')) {     // Invoke native dropdown for Mobile
                    var nativePicker = window.plugins && window.plugins.listpicker ? window.plugins.listpicker : '';
                    var options = this.get('optionArrayMobileNative');
                    var selectedOption = this.get('selectedOption');
                    var value = selectedOption ? selectedOption[this.get('valueKey')] : '';
                    var stringValue = (typeof value === 'number') ? value.toString() : value;

                    this.clickEventHandler = this._onSelectValue.bind(this);
                    this.onCancel = this._onCancelSelect.bind(this);

                    if (nativePicker && navigator.isNativeDevice) {
                        var displayTitle = this.get('title');
                        var config = {title: displayTitle, items: options, selectedValue: stringValue};

                        // Show the picker
                        if (!Ember.appGlobal.events.isNativeDropdownOpen) {
                            Ember.appGlobal.events.isNativeDropdownOpen = true;
                            nativePicker.showPicker(config, this.clickEventHandler, this.onCancel);
                        }
                    } else {
                        this._loadDropDownList();
                    }
                } else {
                    this._loadDropDownList();
                }
            }
        },

        onFocusedIn: function () {
            if (!appConfig.customisation.isMobile) {
                this._onFocusedIn();
            }
        }
    }
});