define([], function () {
    var ctor = function(spec) {

        var defaultTranslations = window.getTranslations().cn;

        if (!_.isNullOrUndefined(spec) && !_.isNullOrUndefined(spec.translations)) {
            spec.translations = mapTranslations(spec.translations);
        }
        
        function mapTranslations(translations) {
            return translations.concat(_.difference(defaultTranslations, translations));
        }

        var templateSetting = _.defaults(spec, {
            "logo": {
                "url": ""
            },
            "theme": {
                "key": ""
            },
            "xApi": {
                "enabled": true,
                "selectedLrs": "default",
                "lrs": {
                    "uri": "",
                    "credentials": {
                        "username": "",
                        "password": ""
                    },
                    "authenticationRequired": false
                },
                "allowedVerbs": []
            },
            "masteryScore": {
                "score": "100"
            },
            "translations": defaultTranslations
        });

        return templateSetting;
    };

    return ctor;

});