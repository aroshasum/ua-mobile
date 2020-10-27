import sharedDataModuleInitializer from '../models/shared/initializers/shared-data-module-initializer';

export default {
    modules: [sharedDataModuleInitializer],
    preInitModules: [
		'controller:shared/initializers/mobile/shared-ui-module-initializer-mobile'
	],
    lazyModules: [{
		path: 'assets/post-lib.js'
	}, {
		path: 'assets/addons/ua-price.js',
		initializers: [
			'model:price/initializers/price-data-module-initializer',
			'controller:price/initializers/mobile/price-ui-module-initializer-mobile'
		]
	}, {
		path: 'assets/addons/pixi.min.js'
	}, {
		path: 'assets/addons/ua-chart.js'
	}]
};