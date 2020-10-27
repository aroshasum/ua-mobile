import Ember from 'ember';

export default Ember.Object.extend({
    // Basic Information
    logo: '',       // Logo
    sym: '',        // Symbol
    compName: '',   // Company Name
    des: '',        // Description
    indGrp: '',     // Industry Group
    subInd: '',     // Sub Industry
    isin: '',       // ISIN Code
    estbOn: '',     // Established On
    outShr: '',     // Outstanding Share
    listedShr: '',  // Listed Shares
    mktCap1: '',    // Market Cap
    authCap: '',    // Authorized Capital
    trdName: '',    // Trade Name
    currency: '',   // Currency
    country: '',    // Country
    bbgid: '',      // BBGID
    sector: '',     // Sector
    auditor: '',    // Auditor
    compID: '',     // Company ID

    // Contact Information
    addr: '',       // Address
    phn: '',        // Tel
    fax: '',        // Fax
    email: '',      // Email
    web: '',        // Website

    compManagement: null,
    compOwners: null,
    compSubsidiaries: null,

    init: function () {
        this._super();
        this.set('compManagement', Ember.A());
        this.set('compOwners', Ember.A());
        this.set('compSubsidiaries', Ember.A());
    },

    setData: function (companyProfileData) {
        var that = this;

        Ember.$.each(companyProfileData, function (key, value) {
            that.set(key, value);
        });
    }
});
