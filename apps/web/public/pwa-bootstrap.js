(function () {
  if (window.__livoriaPwaBootstrapLoaded) return;
  window.__livoriaPwaBootstrapLoaded = true;
  window.__pwa_deferred_prompt = window.__pwa_deferred_prompt || null;
  window.__pwa_prompt_available = Boolean(window.__pwa_deferred_prompt);
  window.__pwa_installed = false;
  window.__livoria_pwa_update_pending = window.__livoria_pwa_update_pending || null;

  var versionStorageKey = 'livoria:pwa-build-version';
  var pendingVersionStorageKey = 'livoria:pwa-build-version-pending';
  var reloadKey = 'livoria_boot_recover_attempted';
  var updateIntervalMs = 60 * 1000;
  var initialServiceWorkerUpdateDelayMs = 4000;
  var initialVersionCheckDelayMs = 5000;
  var minVersionCheckIntervalMs = 15000;
  var updateInFlight = false;
  var versionInFlight = false;
  var lastVersionCheckAt = 0;
  var chunkPattern = /chunk|chunkloaderror|loading chunk|dynamically imported|module script|failed to fetch|import\(\)|turbopack|_next\/static/i;

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function safeGet(key) {
    try { return window.localStorage.getItem(key); } catch (_) { return null; }
  }

  function safeSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (_) {}
  }

  function safeRemove(key) {
    try { window.localStorage.removeItem(key); } catch (_) {}
  }

  function rememberPendingUpdate(detail) {
    window.__livoria_pwa_update_pending = detail;
    if (detail && detail.version) safeSet(pendingVersionStorageKey, JSON.stringify(detail));
    emit('livoria-pwa-update-ready', detail);
  }

  function restorePendingUpdate() {
    if (window.__livoria_pwa_update_pending) {
      emit('livoria-pwa-update-ready', window.__livoria_pwa_update_pending);
      return;
    }

    var raw = safeGet(pendingVersionStorageKey);
    if (!raw) return;
    try {
      var detail = JSON.parse(raw);
      if (detail && detail.version) rememberPendingUpdate(detail);
    } catch (_) {
      safeRemove(pendingVersionStorageKey);
    }
  }

  function markPendingUpdateApplied() {
    var detail = window.__livoria_pwa_update_pending;
    if (!detail) {
      var raw = safeGet(pendingVersionStorageKey);
      try { detail = raw ? JSON.parse(raw) : null; } catch (_) { detail = null; }
    }

    if (detail && detail.version) safeSet(versionStorageKey, detail.version);
    window.__livoria_pwa_update_pending = null;
    safeRemove(pendingVersionStorageKey);
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

  function checkBuildVersion(reason, options) {
    var force = options && options.force;
    var now = Date.now();
    if (!force && now - lastVersionCheckAt < minVersionCheckIntervalMs) return;
    if (versionInFlight) return;
    versionInFlight = true;
    lastVersionCheckAt = now;

    fetch('/version.json', {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    })
      .then(function (response) {
        return response.ok ? response.json() : null;
      })
      .then(function (payload) {
        if (!payload || typeof payload.version !== 'string') return;

        var currentVersion = safeGet(versionStorageKey);

        if (!currentVersion) {
          safeSet(versionStorageKey, payload.version);
          return;
        }

        if (currentVersion !== payload.version) {
          rememberPendingUpdate({
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

  function checkForUpdates(registration, reason, options) {
    triggerRegistrationUpdate(registration);
    checkBuildVersion(reason, options);
  }

  function wireRegistration(registration) {
    restorePendingUpdate();
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

    window.setTimeout(function () {
      triggerRegistrationUpdate(registration);
    }, initialServiceWorkerUpdateDelayMs);
    window.setTimeout(function () {
      checkBuildVersion('initial', { force: true });
    }, initialVersionCheckDelayMs);

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
    markPendingUpdateApplied();
    emit('livoria-pwa-controller-ready');
  });

  window.addEventListener('livoria-pwa-apply-update', markPendingUpdateApplied);
})();
