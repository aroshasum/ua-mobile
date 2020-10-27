import Ember from 'ember';

/* Note: Only add common properties to this class. For very specific unique properties, add them within the context
  taking the advantage of dynamic behaviour of JavaScript

  Ex: objUiWrapper.set('unique-UI-property-name-goes-here', 'value-goes-here');
 */
export default Ember.Object.extend({
    entity: null, // Actual business entity wrapped
    css: null,
    style: null,
    icon: null
});