// Per-request log context carried through async calls, so any log line emitted
// while handling a request automatically includes requestId, tenant, user, etc.

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

function runWithContext(store, fn) {
  return storage.run(store, fn);
}

// Merges static fields with values resolved lazily (e.g. from req after auth ran).
function getContext() {
  const store = storage.getStore();
  if (!store) return {};

  const merged = { ...store.fields, ...(store.resolve ? store.resolve() : {}) };
  return Object.fromEntries(Object.entries(merged).filter(([, value]) => value !== null && value !== undefined));
}

function bindContext(fields) {
  const store = storage.getStore();
  if (store) {
    Object.assign(store.fields, fields);
  }
}

module.exports = { runWithContext, getContext, bindContext };
