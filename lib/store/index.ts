/**
 * Public surface of the store. Components import actions from here; the
 * reactive primitives (`subscribe`/`getSnapshot`/`setState`) are consumed
 * only by the hooks layer (`hooks/use-store.ts`) via `./store` directly.
 */
export {
  updateTodayEntry,
  addHabit,
  removeHabit,
  setNotificationTime,
} from "./actions"
export {
  ANON_STORAGE_KEY,
  AUTHED_STORAGE_KEY_PREFIX,
  INITIAL_STATE,
  LEGACY_STORAGE_KEY,
  STATE_VERSION,
  authedStorageKey,
  type AppState,
} from "./state"
