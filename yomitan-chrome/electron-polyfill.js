/*
 * Minimal shim for the chrome.permissions API, which Electron does not
 * implement and Yomitan calls unguarded at startup. Reports every permission
 * in the manifest as granted. Loaded first by sw.js and by the extension's
 * HTML pages.
 */
if (!chrome.permissions) {
    const noopEvent = {
        addListener() {},
        removeListener() {},
        hasListener() { return false; },
    };
    const manifest = chrome.runtime.getManifest();
    const granted = {
        permissions: [...(manifest.permissions || []), ...(manifest.optional_permissions || [])],
        origins: manifest.host_permissions || [],
    };
    const reply = (callback, result) => (
        typeof callback === 'function' ?
        void setTimeout(() => callback(result), 0) :
        Promise.resolve(result)
    );
    chrome.permissions = {
        getAll: (callback) => reply(callback, granted),
        contains: (_permissions, callback) => reply(callback, true),
        request: (_permissions, callback) => reply(callback, true),
        remove: (_permissions, callback) => reply(callback, true),
        onAdded: noopEvent,
        onRemoved: noopEvent,
    };
}