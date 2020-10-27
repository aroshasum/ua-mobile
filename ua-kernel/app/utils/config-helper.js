import Ember from 'ember';

export default (function () {
    var maxLevel = 3;

    var mergeConfigSettings = function (configInstance, changedSettings, overrideDisabled) {
        var isSettingsChanged = false;

        if (configInstance && changedSettings) {
            if (Ember.$.type(changedSettings) === 'object') {
                isSettingsChanged = _scanSetting(configInstance, '', changedSettings, 1, overrideDisabled);
            }
        }

        return isSettingsChanged;
    };

    var _scanSetting = function (configInstance, settingsProp, settingsObj, level, overrideDisabled) {
        var isSettingsChanged = false;

        Ember.$.each(settingsObj, function (prop, val) {
            if (Ember.$.type(val) === 'object' && level <= maxLevel) {
                if (!configInstance[prop]) {
                    configInstance[prop] = {};
                }

                _scanSetting(configInstance[prop], prop, val, level + 1, overrideDisabled);
            } else {
                if (overrideDisabled) {
                    if (!configInstance[prop]) {
                        configInstance[prop] = val;
                        isSettingsChanged = true;
                    }
                } else {
                    configInstance[prop] = val;
                }
            }
        });

        return isSettingsChanged;
    };

    return {
        mergeConfigSettings: mergeConfigSettings
    };
})();
