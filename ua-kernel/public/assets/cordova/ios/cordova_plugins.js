cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
  {
    "id": "com.darktalker.cordova.screenshot.screenshot",
    "file": "plugins/com.darktalker.cordova.screenshot/www/Screenshot.js",
    "pluginId": "com.darktalker.cordova.screenshot",
    "merges": [
      "navigator.screenshot"
    ]
  },
  {
    "id": "cordova-plugin-app-version.AppVersionPlugin",
    "file": "plugins/cordova-plugin-app-version/www/AppVersionPlugin.js",
    "pluginId": "cordova-plugin-app-version",
    "clobbers": [
      "cordova.getAppVersion"
    ]
  },
  {
    "id": "cordova-plugin-datepicker.DatePicker",
    "file": "plugins/cordova-plugin-datepicker/www/ios/DatePicker.js",
    "pluginId": "cordova-plugin-datepicker",
    "clobbers": [
      "datePicker"
    ]
  },
  {
    "id": "cordova-plugin-dialogs.notification",
    "file": "plugins/cordova-plugin-dialogs/www/notification.js",
    "pluginId": "cordova-plugin-dialogs",
    "merges": [
      "navigator.notification"
    ]
  },
  {
    "id": "cordova-plugin-inappbrowser.inappbrowser",
    "file": "plugins/cordova-plugin-inappbrowser/www/inappbrowser.js",
    "pluginId": "cordova-plugin-inappbrowser",
    "clobbers": [
      "cordova.InAppBrowser.open",
      "window.open"
    ]
  },
  {
    "id": "cordova-plugin-listpicker.ListPicker",
    "file": "plugins/cordova-plugin-listpicker/www/ListPicker.js",
    "pluginId": "cordova-plugin-listpicker",
    "clobbers": [
      "window.plugins.listpicker"
    ]
  },
  {
    "id": "cordova-plugin-market.Market",
    "file": "plugins/cordova-plugin-market/www/market.js",
    "pluginId": "cordova-plugin-market",
    "clobbers": [
      "cordova.plugins.market"
    ]
  },
  {
    "id": "cordova-plugin-screen-orientation.screenorientation",
    "file": "plugins/cordova-plugin-screen-orientation/www/screenorientation.js",
    "pluginId": "cordova-plugin-screen-orientation",
    "clobbers": [
      "cordova.plugins.screenorientation"
    ]
  },
  {
    "id": "cordova-plugin-splashscreen-iphonex-support.SplashScreen",
    "file": "plugins/cordova-plugin-splashscreen-iphonex-support/www/splashscreen.js",
    "pluginId": "cordova-plugin-splashscreen-iphonex-support",
    "clobbers": [
      "navigator.splashscreen"
    ]
  },
  {
    "id": "cordova-plugin-statusbar.statusbar",
    "file": "plugins/cordova-plugin-statusbar/www/statusbar.js",
    "pluginId": "cordova-plugin-statusbar",
    "clobbers": [
      "window.StatusBar"
    ]
  },
  {
    "id": "cordova-plugin-touch-id.TouchID",
    "file": "plugins/cordova-plugin-touch-id/www/TouchID.js",
    "pluginId": "cordova-plugin-touch-id",
    "clobbers": [
      "window.plugins.touchid"
    ]
  },
  {
    "id": "cordova-plugin-wkwebview-engine.ios-wkwebview-exec",
    "file": "plugins/cordova-plugin-wkwebview-engine/src/www/ios/ios-wkwebview-exec.js",
    "pluginId": "cordova-plugin-wkwebview-engine",
    "clobbers": [
      "cordova.exec"
    ]
  },
  {
    "id": "es6-promise-plugin.Promise",
    "file": "plugins/es6-promise-plugin/www/promise.js",
    "pluginId": "es6-promise-plugin",
    "runs": true
  },
  {
    "id": "cordova-plugin-x-socialsharing.SocialSharing",
    "file": "plugins/cordova-plugin-x-socialsharing/www/SocialSharing.js",
    "pluginId": "cordova-plugin-x-socialsharing",
    "clobbers": [
      "window.plugins.socialsharing"
    ]
  },
  {
    "id": "cordova-plugin-iroot.IRoot",
    "file": "plugins/cordova-plugin-iroot/www/iroot.js",
    "pluginId": "cordova-plugin-iroot.IRoot",
    "clobbers": [
      "window.plugins.IRoot"
    ]
  },
  {
      "id": "cordova-plugin-keyboard.Keyboard",
      "file": "plugins/cordova-plugin-keyboard/www/keyboard.js",
      "pluginId": "cordova-plugin-keyboard.Keyboard",
      "clobbers": [
          "window.plugins.Keyboard"
      ]
  }
];
module.exports.metadata = 
// TOP OF METADATA
{
  "com.darktalker.cordova.screenshot": "0.1.5",
  "cordova-plugin-app-version": "0.1.9",
  "cordova-plugin-datepicker": "0.9.3",
  "cordova-plugin-dialogs": "1.3.3",
  "cordova-plugin-inappbrowser": "1.7.1",
  "cordova-plugin-ios-camera-permissions": "1.2.0",
  "cordova-plugin-listpicker": "2.2.2",
  "cordova-plugin-market": "1.2.0",
  "cordova-plugin-screen-orientation": "2.0.1",
  "cordova-plugin-splashscreen-iphonex-support": "4.1.1-dev",
  "cordova-plugin-statusbar": "2.4.2",
  "cordova-plugin-touch-id": "3.3.1",
  "cordova-plugin-whitelist": "1.3.2",
  "cordova-plugin-wkwebview-engine": "1.1.3",
  "es6-promise-plugin": "4.1.0",
  "cordova-plugin-x-socialsharing": "5.1.8",
  "cordova-plugin-iroot": "0.8.0",
  "cordova-plugin-keyboard": "4.5.5"
};
// BOTTOM OF METADATA
});