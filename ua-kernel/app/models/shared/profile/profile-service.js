import Ember from 'ember';
import WebConnection from '../communication-adapters/web-http-connection';
import utils from '../../../utils/utils';
import profileDS from './profile-data-store';
import sharedService from '../shared-service';
import appEvents from '../../../app-events';
import LanguageDataStore from '../language/language-data-store';
import appConfig from '../../../config/app-config';

export default (function () {
    // TODO: [Sahan] Discuss case for these variable names.
    var requestParams = {
        getUserProfile: {
            requestType: 175,
            version: 1
        },

        modifyUserProfile: {
            requestType: 275,
            isSavePanel: 0
        }
    };

    var urlType = 'profile';
    var hasServerProfile = false;
    var profileUpdateInterval = 300000;

    var initialize = function () {
        if (appConfig.customisation.profileServiceEnabled) {
            setTimeout(function () {
                _updateProfilePeriodically();
            }, profileUpdateInterval);

            appEvents.subscribeAppClose(this);
        }
    };

    var saveComponent = function (key, value, saveImmediately) {
        if (appConfig.customisation.profileServiceEnabled && utils.validators.isAvailable(key) && utils.validators.isAvailable(value)) {
            profileDS.updateProfileObj(key, value);

            if (saveImmediately) {
                _saveUserProfile();
            }
        }
    };

    var getUserProfile = function () {
        if (appConfig.customisation.profileServiceEnabled) {
            var profileObj = profileDS.getUserProfileObj();
            var url = _generateGetUserProfileUrl();

            _sendProfileServiceRequest({
                url: url,
                type: 'GET',
                contentType: undefined,
                data: undefined,
                profileObj: profileObj
            }, _processGetUserProfileResponse, _onError);
        }
    };

    var loadProfileMeta = function () {
        if (appConfig.customisation.profileServiceEnabled) {
            profileDS.profileMeta.load();
        }
    };

    var _saveUserProfile = function () {
        if (hasServerProfile) {
            profileDS.profileMeta.version++;
            profileDS.profileMeta.save();

            var profileObj = profileDS.getUserProfileObj();

            // Properties of an Ember object are not converted by convertToJason. As a workaround assigning to itself
            // noinspection SillyAssignmentJS
            profileObj.Components = profileObj.Components; // NOSONAR

            var data = _generateProfileData(utils.jsonHelper.convertToJson(profileObj));
            _sendProfileServiceRequest({
                url: urlType,
                type: 'POST',
                contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
                data: data
            });
        }
    };

    var _generateProfileData = function (profileStrObj) {
        var queryParams = {
            RT: requestParams.modifyUserProfile.requestType,
            PROFILE: profileStrObj,
            ISP: requestParams.modifyUserProfile.isSavePanel
        };

        return utils.requestHelper.generateQueryString(undefined, queryParams, _getGeneralQueryParams());
    };

    var _sendProfileServiceRequest = function (params, onSuccess, onError) {
        WebConnection.sendAjaxRequest({
            url: params.url,
            type: params.type,
            contentType: params.contentType,
            data: params.data,

            onSuccess: function (dataObj) {
                if (Ember.$.isFunction(onSuccess)) {
                    onSuccess(dataObj, params.profileObj);
                }
            },

            onError: function () {
                if (Ember.$.isFunction(onError)) {
                    onError();
                }
            }
        });
    };

    var _generateGetUserProfileUrl = function () {
        var queryParams = {
            RT: requestParams.getUserProfile.requestType,
            VER: requestParams.getUserProfile.version,
            BCD: sharedService.getService('price').userDS.billingCode
        };

        return utils.requestHelper.generateQueryString(urlType, queryParams, _getGeneralQueryParams());
    };

    var _processGetUserProfileResponse = function (dataObj, profileObj) {
        try {
            var data = dataObj.DAT;

            if (data) {
                var metaVersion = _getVersionFromProfileMeta(data);
                hasServerProfile = true;

                if (profileDS.profileMeta.version < metaVersion || !metaVersion) {
                    var languageObj = LanguageDataStore.getLanguageObj();
                    utils.messageService.showMessage(languageObj.lang.messages.newerWorkspaceExists, utils.Constants.MessageTypes.Info, false);

                    var components = [];

                    Ember.$.each(data.Components, function (id, component) {
                        if (component.Id >= (component.ProfileId * profileDS.componentParams.idShift) + profileDS.componentParams.noOfDefaultComponents && component.ProfileId === data.Id) {   // 5 to skip default components. temporary until default components are removed.
                            utils.webStorage.addString(component.Name, component.Contents, utils.Constants.StorageType.Local);
                            components.push(component);

                            if (component.Name === utils.webStorage.getKey(profileDS.profileMeta.cacheKey)) {
                                profileDS.profileMeta.setData(utils.jsonHelper.convertFromJson(component.Contents));
                            }

                            if (component.Name === utils.webStorage.getKey(sharedService.userState.cacheKey)) {
                                _setUserState(utils.jsonHelper.convertFromJson(component.Contents));
                            }
                        }
                    });

                    profileObj.setData({
                        Components: components
                    });

                    appEvents.onWorkspaceUpdated();
                }

                if (!profileDS.profileMeta.id) {
                    profileDS.profileMeta.setData({
                        id: data.Id,
                        version: data.Version,
                        panels: data.Panels
                    });
                }

                profileObj.setData({
                    Id: data.Id,
                    Version: data.Version,
                    ProductId: data.ProductId,
                    Name: data.Name,
                    Panels: data.Panels,
                    BillingCode: data.BillingCode
                });

            } else {
                profileObj.setData({
                    Id: profileDS.profileMeta.id,
                    Version: 1,
                    ProductId: requestParams.PDM,
                    Name: profileDS.profileMeta.name,
                    Panels: profileDS.profileMeta.panels,
                    Components: profileObj.Components,
                    BillingCode: requestParams.getUserProfile.BCD
                });
            }
        } catch (e) {
            utils.logger.logError('Error in response for get user profile request: ' + e);
        }
    };

    var _onError = function () {
        var languageObj = LanguageDataStore.getLanguageObj();
        utils.messageService.showMessage(languageObj.lang.messages.workspaceLoadingFaild, utils.Constants.MessageTypes.Warning, false);
    };

    var _getVersionFromProfileMeta = function (data) {
        var metaVersion = -1;

        Ember.$.each(data.Components, function (id, component) {
            if (component.Name === utils.webStorage.getKey(profileDS.profileMeta.cacheKey)) {
                var content = utils.jsonHelper.convertFromJson(component.Contents);
                metaVersion = content.version;

                return false;
            }
        });

        return metaVersion;
    };

    var _setUserState = function (content) {
        var tmpUserState = {};
        var ignoreProperties = ['lastMenu', 'lastTab', 'lastArgs', 'lastInnerWidget'];

        Ember.$.each(content, function (key, value) {
            if (Ember.$.inArray(key, ignoreProperties) === -1) {
                tmpUserState[key] = value;
            }
        });

        sharedService.userState.setData(tmpUserState);
    };

    var _updateProfilePeriodically = function () {
        _saveUserProfile();

        setTimeout(function () {
            _updateProfilePeriodically();
        }, profileUpdateInterval);
    };

    var _getGeneralQueryParams = function () {
        var priceService = sharedService.getService('price');

        return {
            PDM: appConfig.customisation.productType,
            UID: priceService.userDS.userId,
            SID: priceService.userDS.sessionId
        };
    };

    var onAppClose = function () {
        _saveUserProfile();
    };

    return {
        initialize: initialize,
        getUserProfile: getUserProfile,
        saveComponent: saveComponent,
        loadProfileMeta: loadProfileMeta,
        onAppClose: onAppClose,
        profileDS: profileDS
    };
})();

