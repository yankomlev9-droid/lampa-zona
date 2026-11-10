/*
 * Zona Launcher for Lampa — v0.1 (experimental)
 * Created for TCL 55C8L / Android TV.
 * Adds a "Zona" button to a movie/series detail view.
 *
 * IMPORTANT: This is NOT a Zona video-source or an automatic movie handoff.
 * It only attempts to launch the installed Zona app. Automatic opening of a
 * particular title requires a documented Zona deep-link/API (not verified).
 *
 * No outbound requests, no credentials, no tracking.
 */
(function () {
    'use strict';

    if (window.plugin_zona_launcher_v01) return;
    window.plugin_zona_launcher_v01 = true;

    var PACKAGES = ['mobi.zona', 'ru.zona'];
    var BUTTON_CLASS = 'view--zona-launcher-v01';

    function notify(message) {
        try {
            if (window.Lampa && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
                Lampa.Noty.show(message);
                return;
            }
        } catch (ignored) {}
        try { console.log('[Zona Launcher] ' + message); } catch (ignored2) {}
    }

    function getTitle(movie) {
        movie = movie || {};
        return movie.title || movie.name || movie.original_title || movie.original_name || '';
    }

    function tryCordovaLauncher(title) {
        var bridge = window.startApp;
        if (!bridge && window.cordova && window.cordova.plugins) {
            bridge = window.cordova.plugins.startApp || window.cordova.plugins.startapp;
        }
        if (!bridge || typeof bridge.set !== 'function') return false;

        function tryPackage(index) {
            if (index >= PACKAGES.length) {
                notify('Zona не запустилась: не найден подходящий пакет Android.');
                return;
            }
            try {
                bridge.set({ application: PACKAGES[index] }).start(
                    function () { notify('Zona запущена. Найди фильм: ' + title); },
                    function () { tryPackage(index + 1); }
                );
            } catch (error) {
                tryPackage(index + 1);
            }
        }
        tryPackage(0);
        return true;
    }

    function tryAndroidIntent(title) {
        // WebView-dependent Android intent URL. May be blocked by the Lampa app.
        // Deliberately no unverified movie identifiers/deep-link parameters.
        var uri = 'intent:#Intent;package=' + PACKAGES[0] +
            ';action=android.intent.action.MAIN;' +
            'category=android.intent.category.LAUNCHER;end';
        notify('Пробую открыть Zona. Если не запустится, Lampa не поддерживает Android intent.');
        try {
            window.location.href = uri;
            return true;
        } catch (error) {
            notify('Запуск другого приложения заблокирован этой версией Lampa.');
            return false;
        }
    }

    function launchZona(movie) {
        var title = getTitle(movie);
        // Keep the name accessible from Lampa even if Android launch fails.
        try {
            if (Lampa.Storage && typeof Lampa.Storage.set === 'function') {
                Lampa.Storage.set('zona_launcher_last_title', title);
            }
        } catch (ignored) {}
        if (title) notify('Название для поиска в Zona: ' + title);
        if (tryCordovaLauncher(title)) return;
        tryAndroidIntent(title);
    }

    function addButton(event) {
        if (!event || !event.object || !event.object.activity ||
            typeof event.object.activity.render !== 'function') return;
        var root = event.object.activity.render();
        if (!root || !root.find || root.find('.' + BUTTON_CLASS).length) return;
        var target = root.find('.full-start-new__buttons, .full-start__buttons').eq(0);
        if (!target.length) {
            var torrent = root.find('.view--torrent').eq(0);
            if (torrent.length) target = torrent.parent();
        }
        if (!target.length) return;

        var movie = event.data && event.data.movie ? event.data.movie : {};
        var button = $('<div class="full-start__button selector ' + BUTTON_CLASS + '">' +
            '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">' +
            '<path fill="currentColor" d="M8 5v14l11-7z"/></svg>' +
            '<span>Zona</span></div>');
        button.on('hover:enter', function () { launchZona(movie); });
        target.append(button);
    }

    function start() {
        if (!window.Lampa || !Lampa.Listener || typeof Lampa.Listener.follow !== 'function') return;
        if (window.plugin_zona_launcher_hooked_v01) return;
        window.plugin_zona_launcher_hooked_v01 = true;
        Lampa.Listener.follow('full', function (event) {
            // Actual Lampa event spelling is "complite".
            if (event && event.type === 'complite') addButton(event);
        });
        notify('Zona Launcher готов: открой карточку фильма или сериала.');
    }

    if (window.Lampa && window.appready) {
        start();
    } else if (window.Lampa && Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
        Lampa.Listener.follow('app', function (event) {
            if (event && event.type === 'ready') start();
        });
    } else {
        console.warn('[Zona Launcher] Lampa API not available at load time');
    }
}());
