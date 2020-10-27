import userSettings from './business-entities/user-settings';
import userState from './business-entities/user-state';
import windowState from './business-entities/window-state';

export default (function () {
    var serviceMap = {};

    var registerService = function (type, service) {
        serviceMap[type] = service;
    };

    var getService = function (type) {
        return serviceMap[type];
    };

    return {
        registerService: registerService,
        getService: getService,
        userSettings: userSettings,
        userState: userState,
        windowState: windowState
    };
})();
