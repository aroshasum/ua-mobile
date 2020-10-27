import languagePrimary from '../../../models/shared/language/language-primary';
import languageSecondary from '../../../models/shared/language/language-secondary';
import languageDataStore from '../../../models/shared/language/language-data-store';
import utils from '../../../utils/utils';

export default (function () {
    var loadLanguageData = function () {
        try {
            languageDataStore.setLanguageObj(languagePrimary.lang, languagePrimary.obj);
            languageDataStore.setLanguageObj(languageSecondary.lang, languageSecondary.obj);
        } catch (e) {
            utils.logger.logError('Error in loading language data : ' + e);
        }
    };

    return {
        loadLanguageData: loadLanguageData
    };
})();
