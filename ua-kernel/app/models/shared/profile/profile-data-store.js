import Ember from 'ember';
import Profile from './profile';
import Component from './component';
import utils from '../../../utils/utils';
import profileMeta from './profile-meta';

export default (function () {
    var componentParams = {
        componentTypeId: 1,
        status: 0,
        type: 'tab',
        permissionList: null,
        idShift: 1000,
        noOfDefaultComponents: 5
    };

    var profileObj = Profile.create({});

    var getUserProfileObj = function () {
        return profileObj;
    };

    var updateProfileObj = function (key, strValue) {
        var componentInProfileObj;

        Ember.$.each(profileObj.Components, function (index, component) {
            if (component.Name === key) {
                componentInProfileObj = component;
                return false;
            }
        });

        if (componentInProfileObj) {
            componentInProfileObj.Contents = strValue;
        } else {
            _createComponent(key, strValue);
        }
    };

    var _createComponent = function (key, contentValue) {
        var componentArray = profileObj.Components;
        var profileId = profileObj.Id ? profileObj.Id : profileMeta.id;
        var compId = (profileId * componentParams.idShift) + componentParams.noOfDefaultComponents + componentArray.length;

        var newComponentObj = Component.create({
            Id: compId,
            ComponentTypeId: componentParams.componentTypeId,
            Status: componentParams.status,
            ProfileId: profileId,
            Version: componentParams.version,
            Name: key,
            Type: componentParams.type,
            Contents: (typeof contentValue === 'object') ? utils.jsonHelper.convertToJson(contentValue) : contentValue,
            PermissionList: componentParams.permissionList
        });

        profileObj.Components.pushObject(newComponentObj);
        return newComponentObj;
    };

    return {
        getUserProfileObj: getUserProfileObj,
        updateProfileObj: updateProfileObj,
        componentParams: componentParams,
        profileMeta: profileMeta
    };
})();