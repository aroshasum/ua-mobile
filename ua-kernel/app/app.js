import Ember from 'ember';
import Resolver from 'ember/resolver';
import loadInitializers from 'ember/load-initializers';
import config from './config/environment';

Ember.MODEL_FACTORY_INJECTIONS = true;

var App = Ember.Application.extend({
    modulePrefix: config.modulePrefix,
    podModulePrefix: config.podModulePrefix,
    Resolver: Resolver,
    LOG_VIEW_LOOKUPS: true,
    LOG_ACTIVE_GENERATION: true,
    rootElement: '#ember-app-root'
});

loadInitializers(App, config.modulePrefix);

export default App;