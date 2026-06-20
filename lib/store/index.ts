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
  startDailyReviewGeneration,
  setDailyReviewSuccess,
  setDailyReviewFailure,
} from "./actions"
export { INITIAL_STATE, STORAGE_KEY, STATE_VERSION, type AppState } from "./state"
export type { DailyReviewUiState } from "./store"
