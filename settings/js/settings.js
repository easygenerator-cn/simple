$(function () {
    function getURLParameter(name) {
        return decodeURI(
            (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search) || [, null])[1]
        );
    }
    
    function sortByName(a, b) {
        var aName = a.name.toLowerCase();
        var bName = b.name.toLowerCase();
        return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
    }

    var
        courseId = getURLParameter('courseId'),
        templateId = getURLParameter('templateId'),

        baseURL = location.protocol + "//" + location.host,
        settingsURL = baseURL + "/api/course/" + courseId + "/template/" + templateId,

        index = location.toString().indexOf('/settings/settings'),
        templateUrl = location.toString().substring(0, index),

        starterAccessType = 1,
        translations = window.getTranslations(),
        allSupportedLanguages = [
            {
                key: "cn",
                name: "Chinese"
            },
            {
                key: "en",
                name: "English"
            },
            {
                key: "it",
                name: "Italian"
            },
            {
                key: "nl",
                name: "Dutch"
            },
            {
                key: "ua",
                name: "Ukrainian"
            },
            {
                key: "tr",
                name: "Turkish"
            }
        ];

    allSupportedLanguages = allSupportedLanguages.sort(sortByName);
    allSupportedLanguages.push({
        key: "xx",
        name: "自定义"
    });

    var viewModel = {
        trackingData: (function () {
            var data = {};

            data.enableXAPI = ko.observable(true),

            data.lrsOptions = [
                { key: 'default', text: 'easygenerator(推荐)' },
                { key: 'custom', text: '自定义接收方式' }
            ];

            data.selectedLrs = ko.observable(data.lrsOptions[0].key);

            ko.utils.arrayMap(data.lrsOptions, function (lrsOption) {
                lrsOption.isSelected = ko.computed({
                    read: function () {
                        return data.selectedLrs() == lrsOption.key;
                    },
                    write: function () { }
                });
                lrsOption.select = function () {
                    ko.utils.arrayForEach(data.lrsOptions, function (item) {
                        item.isSelected(false);
                    });
                    lrsOption.isSelected(true);
                    data.selectedLrs(lrsOption.key);
                };
                return lrsOption;
            });

            data.customLrsEnabled = ko.computed(function () {
                return data.enableXAPI() && data.selectedLrs() != data.lrsOptions[0].key;
            });

            data.lrsUrl = ko.observable('');
            data.authenticationRequired = ko.observable(false);
            data.lapLogin = ko.observable();
            data.lapPassword = ko.observable();

            data.credentialsEnabled = ko.computed(function () {
                return data.customLrsEnabled() && data.authenticationRequired();
            });

            data.statements = {
                started: ko.observable(true),
                stopped: ko.observable(true),
                experienced: ko.observable(true),
                mastered: ko.observable(true),
                answered: ko.observable(true),
                passed: ko.observable(true),
                failed: ko.observable(true)
            };

            return data;
        })(),

        isSaved: ko.observable(false),
        isFailed: ko.observable(false),
        advancedSettingsExpanded: ko.observable(false),
        toggleAdvancedSettings: function () {
            this.advancedSettingsExpanded(!this.advancedSettingsExpanded());
        },

        logo: (function () {
            var logo = {};

            logo.url = ko.observable('').extend({ throttle: 300 });
            logo.hasLogo = ko.computed(function () {
                return logo.url() !== '';
            });
            logo.clear = function () {
                logo.url('');
            };
            logo.isError = ko.observable(false);
            logo.errorText = ko.observable('');
            logo.errorDescription = ko.observable('');
            logo.isLoading = ko.observable(false);

            return logo;
        })(),

        themes: (function () {
            var themes = {};

            themes.list = [
                {
                    title: '活力',
                    key: 'cartoon'
                },
                {
                    title: '灰底',
                    key: 'grey'
                },
                {
                    title: '黑底',
                    key: 'black'
                },
                {
                    title: '沉稳',
                    key: 'flat'
                }
            ];
            themes.default = 'cartoon';
            themes.selected = ko.observable('');

            ko.utils.arrayMap(themes.list, function (theme) {
                theme.isSelected = ko.observable(false);
                theme.select = function () {
                    ko.utils.arrayForEach(themes.list, function (item) {
                        item.isSelected(false);
                    });
                    theme.isSelected(true);
                    themes.selected(theme.key);
                };
                return theme;
            });

            themes.setSelected = function (key) {
                var theme = ko.utils.arrayFirst(themes.list, function (item) {
                    return item.key == key;
                });
                if (!!theme) {
                    theme.select();
                }
            };

            themes.setSelected(themes.default);

            themes.openDemo = function () {
                window.open(templateUrl + '?v=' + new Date().getTime() + '&theme=' + themes.selected(), '_blank');
            };

            return themes;
        })(),

        defaultTranslations: $.extend(translations, {
            xx: $.map(translations.en, function (item) {
                return { key: item.key, value: ko.observable(item.value) };
            })
        }),

        languages: allSupportedLanguages,

        hasStarterPlan: ko.observable(true),
        masteryScore: ko.observable('')
    };

    viewModel.escapeHtml = function (html) {
        return $('<div/>').text(html).html();
    }

    viewModel.unescapeHtml = function (text) {
        return $('<div/>').html(text).text();
    }

    viewModel.selectedLanguage = ko.observable("cn");

    viewModel.isCustom = ko.computed(function () {
        var language = viewModel.selectedLanguage();
        return language == 'xx';
    });

    viewModel.translations = ko.computed(function () {
        return viewModel.defaultTranslations[viewModel.selectedLanguage()];
    });

    viewModel.getCustomTranslations = function () {
        return viewModel.defaultTranslations['xx'];
    }

    viewModel.saveChanges = function () {
        var settings = {
            logo: {
                url: viewModel.logo.url()
            },
            xApi: {
                enabled: viewModel.trackingData.enableXAPI(),
                selectedLrs: viewModel.trackingData.selectedLrs(),
                lrs: {
                    uri: viewModel.trackingData.lrsUrl(),
                    authenticationRequired: viewModel.trackingData.authenticationRequired(),
                    credentials: {
                        username: viewModel.trackingData.lapLogin(),
                        password: viewModel.trackingData.lapPassword()
                    }
                },
                allowedVerbs: $.map(viewModel.trackingData.statements, function (value, key) {
                    return value() ? key : undefined;
                })
            },
            masteryScore: {
                score: viewModel.masteryScore()
            },
            theme: {
                key: viewModel.themes.selected()
            },
            translations: $.map(viewModel.defaultTranslations[viewModel.selectedLanguage()], function (item) {
                return { key: item.key, value: viewModel.escapeHtml(viewModel.isCustom() ? item.value() : item.value) };
            })
        };

        viewModel.isFailed(false);
        viewModel.isSaved(false);

        var extraData = {
            selectedLanguage: viewModel.selectedLanguage(),
            customTranslations: $.map(viewModel.getCustomTranslations(), function (value) {
                return { key: value.key, value: viewModel.escapeHtml(value.value()) };
            })
        }

        $.post(settingsURL, { settings: JSON.stringify(settings), extraData: JSON.stringify(extraData) })
            .done(function () {
                viewModel.isSaved(true);
            })
            .fail(function () {
                viewModel.isFailed(true);
            });
    };

    //#region Binding handlers

    ko.bindingHandlers.fadeVisible = {
        init: function (element, valueAccessor) {
            var value = valueAccessor();
            $(element).toggle(ko.unwrap(value));
        },
        update: function (element, valueAccessor) {
            var value = valueAccessor();
            if (ko.unwrap(value)) {
                $(element).fadeIn();
            } else {
                $(element).fadeOut();
            }
        }
    };

    ko.bindingHandlers.number = {
        init: function (element) {
            var $element = $(element),
                maxValue = 100;
            $element.on('keydown', function (e) {
                var key = e.charCode || e.keyCode || 0;
                return (key == 8 || key == 9 || key == 46 || (key >= 37 && key <= 40) ||
                        (key >= 48 && key <= 57) || (key >= 96 && key <= 105));
            });
            $element.on('keyup', function () {
                if ($(this).val() > maxValue) {
                    $(this).val(maxValue);
                }
            });
        }
    };

    ko.bindingHandlers.disableDragNDrop = {
        init: function (element) {
            $(element).on('dragstart', function (event) {
                event.preventDefault();
            });
        }
    };

    ko.bindingHandlers.spinner = {
        init: function (element, valueAccessor) {
            var masteryScore = valueAccessor();

            $(element).spinner('changed', function (e, newValue) {
                masteryScore(newValue);
            });

        }
    };

    ko.bindingHandlers.switchToggle = {
        init: function (element, valueAccessor) {
            var switchToggle = ko.bindingHandlers.switchToggle,
                viewModel = switchToggle.viewModel(element, valueAccessor),
                value = ko.unwrap(valueAccessor().value());

            viewModel.setInitialValue(value);

            switchToggle.onClick(element, function () {
                viewModel.toggle();

                var currentValue = ko.unwrap(valueAccessor().value());
                valueAccessor().value(!currentValue);
            });
        },
        update: function (element, valueAccessor) {
            var viewModel = ko.bindingHandlers.switchToggle.viewModel(element, valueAccessor),
                value = ko.unwrap(valueAccessor().value());

            viewModel.updateValue(value);
        },
        viewModel: function (element) {
            var $element = $(element),
                $wrapper = $('.switch-toggle-wrapper', $element);

            function setInitialValue(value) {
                setElementValue(value);
                updateElementPosition(value);
            }

            function toggle() {
                var value = getValue();
                setElementValue(!value);

                $wrapper.stop().animate({
                    marginLeft: calculateElementLeftMargin(!value)
                }, 250);
            }

            function getValue() {
                return $element.hasClass('on');
            }

            function updateValue(value) {
                if (getValue() != value) {
                    setInitialValue(value);
                }
            }

            function setElementValue(value) {
                $element.toggleClass('on', value);
                $element.toggleClass('off', !value);
            }

            function updateElementPosition(value) {
                $wrapper.css('margin-left', calculateElementLeftMargin(value) + 'px');
            }

            function calculateElementLeftMargin(value) {
                return value ? 0 : $element.height() - $element.width();
            }

            return {
                setInitialValue: setInitialValue,
                updateValue: updateValue,
                toggle: toggle
            }
        },
        onClick: function (element, handler) {
            var $element = $(element),
                isMouseDownFired = false;

            $element.mousedown(function (event) {
                if (event.which != 1)
                    return;

                isMouseDownFired = true;
                handler();
            });

            $element.click(function () {
                if (isMouseDownFired) {
                    isMouseDownFired = false;
                    return;
                }

                handler();
            });
        }
    };

    ko.bindingHandlers.dropdown = {
        cssClasses: {
            dropdown: 'dropdown',
            disabled: 'disabled',
            expanded: 'expanded',
            optionsList: 'dropdown-options-list',
            optionItem: 'dropdown-options-item',
            currentItem: 'dropdown-current-item',
            currentItemText: 'dropdown-current-item-text',
            indicatorHolder: 'dropdown-indicator-holder',
            indicator: 'dropdown-indicator'
        },
        init: function (element, valueAccessor) {
            var $element = $(element),
                cssClasses = ko.bindingHandlers.dropdown.cssClasses;

            $element.addClass(cssClasses.dropdown);

            var $currentItemElement = $('<div />')
                .addClass(cssClasses.currentItem)
                .appendTo($element);

            $('<div />')
                .addClass(cssClasses.currentItemText)
                .appendTo($currentItemElement);

            var $indicatorHolder = $('<div />')
                .addClass(cssClasses.indicatorHolder)
                .appendTo($currentItemElement);

            $('<span />')
                .addClass(cssClasses.indicator)
                .appendTo($indicatorHolder);

            $('<ul />')
                .addClass(cssClasses.optionsList)
                .appendTo($element);

            $currentItemElement.on('click', function (e) {
                if ($element.hasClass(cssClasses.disabled)) {
                    return;
                }

                $currentItemElement.toggleClass(cssClasses.expanded);
                e.stopPropagation();
            });

            var collapseHandler = function () {
                $currentItemElement.removeClass(cssClasses.expanded);
            };

            $('html').bind('click', collapseHandler);
            $(window).bind('blur', collapseHandler);

            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                $('html').unbind('click', collapseHandler);
                $(window).unbind('blur', collapseHandler);
            });
        },
        update: function (element, valueAccessor) {
            var $element = $(element),
                cssClasses = ko.bindingHandlers.dropdown.cssClasses,

                $optionsListElement = $element.find('ul.' + cssClasses.optionsList),
                $currentItemTextElement = $element.find('div.' + cssClasses.currentItemText);


            var options = valueAccessor().options,
                optionsText = valueAccessor().optionsText,
                value = valueAccessor().value,
                optionsValue = valueAccessor().optionsValue,
                currentValue = ko.unwrap(value),
                disable = ko.unwrap(valueAccessor().disable);

            if (disable) {
                $element.toggleClass(cssClasses.disabled);
            } else {
                $element.removeClass(cssClasses.disabled);
            }

            $optionsListElement.empty();

            $.each(options, function (index, option) {
                if (option[optionsValue] == currentValue) {
                    $currentItemTextElement.text(option[optionsText]);
                    return;
                }

                $('<li />')
                    .addClass(cssClasses.optionItem)
                    .appendTo($optionsListElement)
                    .text(option[optionsText])
                    .on('click', function (e) {
                        value(option[optionsValue]);
                        $element.trigger('change');
                    });
            });
        }
    };

    ko.bindingHandlers.tabs = {
        init: function (element) {
            var $element = $(element),
                dataTabLink = 'data-tab-link',
                dataTab = 'data-tab',
                activeClass = 'active',
                $tabLinks = $element.find('[' + dataTabLink + ']'),
                $tabs = $element.find('[' + dataTab + ']');

            $tabs.hide();

            $tabLinks.first().addClass(activeClass);
            $tabs.first().show();

            $tabLinks.each(function (index, item) {
                var $item = $(item);
                $item.on('click', function () {
                    var key = $item.attr(dataTabLink),
                        currentContentTab = $element.find('[' + dataTab + '="' + key + '"]');
                    $tabLinks.removeClass(activeClass);
                    $item.addClass(activeClass);
                    $tabs.hide();
                    currentContentTab.show();
                });
            });

        }
    };

    //#endregion Binding handlers

    ko.applyBindings(viewModel, $("#settingsForm")[0]);

    //#region Image uploader

    var imageUploader = {
        apiUrl: baseURL + '/storage/image/upload',
        maxFileSize: 10, //MB
        supportedExtensions: ['jpeg', 'jpg', 'png', 'bmp', 'gif'],
        somethingWentWrongMessage: { title: '出错了', description: '请再试一遍' },

        status: {
            default: function () {
                viewModel.logo.isLoading(false);
                viewModel.logo.isError(false);
            },
            fail: function (reason) {
                viewModel.logo.clear();
                viewModel.logo.isLoading(false);
                viewModel.logo.errorText(reason.title);
                viewModel.logo.errorDescription(reason.description);
                viewModel.logo.isError(true);
            },
            loading: function () {
                viewModel.logo.isLoading(true);
            }
        },

        button: {
            enable: function () {
                this.$input.attr('disabled', false).closest('.image-upload-button').removeClass('disabled');
            },
            disable: function () {
                this.$input.attr('disabled', true).closest('.image-upload-button').addClass('disabled');
            },
            submit: function () {
                this.$input[0].form.submit();
                this.disable();
                imageUploader.status.loading();
            },
            $input: $('#logoInput')
        },

        init: function () {
            imageUploader.button.$input.on('change', imageUploader.processFile);
            imageUploader.button.enable();
        },

        processFile: function () {
            if (!this.files) {
                imageUploader.button.submit();
                return;
            }
            if (this.files.length === 0) {
                return;
            }

            var file = this.files[0],
                fileExtension = file.name.split('.').pop().toLowerCase();

            if ($.inArray(fileExtension, imageUploader.supportedExtensions) === -1) {
                imageUploader.status.fail({ title: '不支持的图片格式', description: '(支持的格式:' + imageUploader.supportedExtensions.join(', ') + ')' });
                return;
            }
            if (file.size > imageUploader.maxFileSize * 1024 * 1024) {
                imageUploader.status.fail({ title: '文件太大', description: '(文件最大不超过' + imageUploader.maxFileSize + 'MB)' });
                return;
            }
            imageUploader.uploadFile(file);
        },

        uploadFile: function (file) {
            imageUploader.button.disable();
            imageUploader.status.loading();

            var formData = new FormData();
            formData.append("file", file);

            $.ajax({
                url: imageUploader.apiUrl,
                type: 'POST',
                data: formData,
                cache: false,
                dataType: 'json',
                processData: false, // Don't process the files
                contentType: false, // Set content type to false as jQuery will tell the server its a query string request
            }).done(function (response) {
                imageUploader.handleResponse(response);
            }).fail(function () {
                imageUploader.status.fail(imageUploader.somethingWentWrongMessage);
                imageUploader.button.enable();
            });
        },

        handleResponse: function (response) {
            try {
                if (!response) {
                    throw "Response is empty";
                }

                if (typeof response != "object") {
                    response = JSON.parse(response);
                }

                if (!response || !response.success || !response.data) {
                    throw "Request is not success";
                }

                viewModel.logo.url(response.data.url);
                imageUploader.status.default();
            } catch (e) {
                imageUploader.status.fail(imageUploader.somethingWentWrongMessage);
            } finally {
                imageUploader.button.enable();
            }
        }
    };

    //#endregion Image uploader

    //#region Ajax requests

    $.ajax({
        cache: false,
        url: settingsURL,
        dataType: "json",
        success: function (response) {
            var defaultSettings = { logo: {}, xApi: { enabled: true, selectedLrs: "default", lrs: { credentials: {} } }, masteryScore: {} },
                defaultExtraData = { customTranslations: [] };

            var settings, extraData;
            try {
                settings = JSON.parse(response.settings) || defaultSettings;
            } catch (e) {
                settings = defaultSettings;
            }
            try {
                extraData = JSON.parse(response.extraData) || defaultExtraData;
            } catch (e) {
                extraData = defaultExtraData;
            }

            viewModel.trackingData.enableXAPI(settings.xApi.enabled || false);
            var defaultLrs = settings.xApi.enabled ? 'custom' : 'default';
            viewModel.trackingData.selectedLrs(settings.xApi.selectedLrs || defaultLrs);
            viewModel.trackingData.lrsUrl(settings.xApi.lrs.uri || '');
            viewModel.trackingData.authenticationRequired(settings.xApi.lrs.authenticationRequired || false);
            viewModel.trackingData.lapLogin(settings.xApi.lrs.credentials.username || '');
            viewModel.trackingData.lapPassword(settings.xApi.lrs.credentials.password || '');

            if (settings.xApi.allowedVerbs) {
                $.each(viewModel.trackingData.statements, function (key, value) {
                    value($.inArray(key, settings.xApi.allowedVerbs) > -1);
                });
            }

            viewModel.logo.url(settings.logo.url || '');
            if (typeof settings.masteryScore != 'undefined' && settings.masteryScore.score >= 0 && settings.masteryScore.score <= 100) {
                viewModel.masteryScore(settings.masteryScore.score);
            } else {
                viewModel.masteryScore(100);
            }

            if (settings.theme && settings.theme.key) {
                viewModel.themes.setSelected(settings.theme.key);
            }

            var customTranslations = viewModel.getCustomTranslations();

            if (extraData.customTranslations.length == 0 && settings.translations != null) {
                $.each(settings.translations, function (i) {
                    $.each(customTranslations, function (j) {
                        if (settings.translations[i].key === customTranslations[j].key) {
                            customTranslations[j].value(viewModel.unescapeHtml(settings.translations[i].value));
                        }
                    });
                });

                viewModel.selectedLanguage("xx");
                return;
            }

            $.each(extraData.customTranslations, function (i) {
                $.each(customTranslations, function (j) {
                    if (extraData.customTranslations[i].key === customTranslations[j].key) {
                        customTranslations[j].value(viewModel.unescapeHtml(extraData.customTranslations[i].value));
                    }
                });
            });

            if (extraData.selectedLanguage != null && extraData.selectedLanguage != undefined) {
                viewModel.selectedLanguage(extraData.selectedLanguage);
            }
        },
        error: function () {
            viewModel.masteryScore(100);
        }
    });

    $.ajax({
        url: baseURL + '/api/identify',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        success: function (user) {
            if (user.hasOwnProperty('subscription') && user.subscription.hasOwnProperty('accessType')) {
                var hasStarterAccess = user.subscription.accessType >= starterAccessType && new Date(user.subscription.expirationDate) >= new Date();
                viewModel.hasStarterPlan(hasStarterAccess);

                if (hasStarterAccess) {
                    imageUploader.init();
                }
            } else {
                viewModel.hasStarterPlan(false);
            }
        },
        error: function () {
            viewModel.hasStarterPlan(false);
        }
    });

    //#endregion Ajax requests

});