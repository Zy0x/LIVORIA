(function () {
  if (window.__livoriaPwaBootstrapLoaded) return;
  window.__livoriaPwaBootstrapLoaded = true;
  window.__pwa_deferred_prompt = window.__pwa_deferred_prompt || null;
  window.__pwa_prompt_available = Boolean(window.__pwa_deferred_prompt);
  window.__pwa_installed = false;

  var versionStorageKey = 'livoria:pwa-build-version';
  var reloadKey = 'livoria_boot_recover_attempted';
  var updateIntervalMs = 10 * 1000;
  var updateInFlight = false;
  var versionInFlight = false;
  var chunkPattern = /chunk|chunkloaderror|loading chunk|dynamically imported|module script|failed to fetch|import\(\)|turbopack|_next\/static/i;

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function shouldRecover(value) {
    var message = '';
    try {
      if (value && value.message) message += ' ' + value.message;
      if (value && value.name) message += ' ' + value.name;
      if (typeof value === 'string') message += ' ' + value;
    } catch (_) {}
    return chunkPattern.test(message);
  }

  function recoverFromStaleBuild() {
    var lastAttempt = 0;
    try {
      lastAttempt = Number(window.sessionStorage.getItem(reloadKey) || 0);
    } catch (_) {}
    if (Date.now() - lastAttempt < 60000) return;
    try {
      window.sessionStorage.setItem(reloadKey, String(Date.now()));
    } catch (_) {}

    var cleanup = 'caches' in window
      ? window.caches.keys().then(function (keys) {
          return Promise.all(keys.filter(function (key) {
            return key.indexOf('livoria-') === 0;
          }).map(function (key) {
            return window.caches.delete(key);
          }));
        }).catch(function () {})
      : Promise.resolve();

    cleanup.finally(function () {
      window.location.reload();
    });
  }

  window.addEventListener('error', function (event) {
    var target = event && event.target;
    var source = target && target.src ? String(target.src) : '';
    if (source.indexOf('/_next/static/') !== -1 || shouldRecover(event.error || event.message)) {
      if (event.preventDefault) event.preventDefault();
      recoverFromStaleBuild();
    }
  }, true);

  window.addEventListener('unhandledrejection', function (event) {
    if (shouldRecover(event.reason)) {
      if (event.preventDefault) event.preventDefault();
      recoverFromStaleBuild();
    }
  });

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    window.__pwa_deferred_prompt = event;
    window.__pwa_prompt_available = true;
    emit('pwa_prompt_ready', { prompt: event });
  });

  window.addEventListener('appinstalled', function () {
    window.__pwa_installed = true;
    window.__pwa_deferred_prompt = null;
    window.__pwa_prompt_available = false;
    emit('pwa_installed');
  });

  if (!('serviceWorker' in navigator)) return;

  function notifyWaitingWorker(registration) {
    if (registration && registration.waiting) {
      emit('livoria-pwa-update-ready', { scope: registration.scope, waiting: true });
    }
  }

  function triggerRegistrationUpdate(registration) {
    if (!registration || updateInFlight) return;
    updateInFlight = true;
    registration.update()
      .then(function () { notifyWaitingWorker(registration); })
      .catch(function () {})
      .finally(function () { updateInFlight = false; });
  }

  function checkBuildVersion(reason) {
    if (versionInFlight) return;
    versionInFlight = true;

    fetch('/version.json?ts=' + Date.now(), {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    })
      .then(function (response) {
        return response.ok ? response.json() : null;
      })
      .then(function (payload) {
        if (!payload || typeof payload.version !== 'string') return;

        var currentVersion = null;
        try {
          currentVersion = window.localStorage.getItem(versionStorageKey);
        } catch (_) {}

        if (!currentVersion) {
          try {
            window.localStorage.setItem(versionStorageKey, payload.version);
          } catch (_) {}
          return;
        }

        if (currentVersion !== payload.version) {
          try {
            window.localStorage.setItem(versionStorageKey, payload.version);
          } catch (_) {}
          emit('livoria-pwa-update-ready', {
            source: 'version-json',
            reason: reason,
            version: payload.version,
            previousVersion: currentVersion,
          });
        }
      })
      .catch(function () {})
      .finally(function () { versionInFlight = false; });
  }

  function checkForUpdates(registration, reason) {
    triggerRegistrationUpdate(registration);
    checkBuildVersion(reason);
  }

  function wireRegistration(registration) {
    notifyWaitingWorker(registration);

    if (registration.installing) {
      registration.installing.addEventListener('statechange', function () {
        if (registration.installing && registration.installing.state === 'installed' && navigator.serviceWorker.controller) {
          notifyWaitingWorker(registration);
        }
      });
    }

    registration.addEventListener('updatefound', function () {
      var installing = registration.installing;
      if (!installing) return;
      installing.addEventListener('statechange', function () {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          notifyWaitingWorker(registration);
        }
      });
    });

    checkForUpdates(registration, 'initial');
    window.setInterval(function () { checkForUpdates(registration, 'interval'); }, updateIntervalMs);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') checkForUpdates(registration, 'visibility');
    });
    window.addEventListener('online', function () { checkForUpdates(registration, 'online'); });
    window.addEventListener('focus', function () { checkForUpdates(registration, 'focus'); });
    window.addEventListener('pageshow', function () { checkForUpdates(registration, 'pageshow'); });
  }

  navigator.serviceWorker
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then(wireRegistration)
    .catch(function () {});

  navigator.serviceWorker.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'SYNC_COMPLETE') emit('livoria-pwa-sync-complete', event.data);
    if (event.data && event.data.type === 'UPDATE_AVAILABLE') emit('livoria-pwa-update-ready', { source: 'service-worker-message' });
    if (event.data && event.data.type === 'PWA_READY') emit('livoria-pwa-ready', event.data);
    if (event.data && event.data.type === 'CACHE_CLEARED') emit('livoria-pwa-cache-cleared', event.data);
  });

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    emit('livoria-pwa-controller-ready');
  });
})();
