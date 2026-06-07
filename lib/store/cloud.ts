import type { SupabaseClient } from "@supabase/supabase-js"
import {
  AppStateSchema,
  INITIAL_STATE,
  migrate,
  type AppState,
} from "@/lib/store/state"

const TABLE = "anchor_user_states"

interface AnchorStateRow {
  state: unknown
}

export async function loadCloudState(
  client: SupabaseClient,
  userId: string
): Promise<AppState | null> {
  const { data, error } = await client
    .from(TABLE)
    .select("state")
    .eq("user_id", userId)
    .maybeSingle<AnchorStateRow>()

  if (error) throw error
  return data ? migrate(data.state) : null
}

export async function saveCloudState(
  client: SupabaseClient,
  userId: string,
  state: AppState
): Promise<void> {
  const safeState = AppStateSchema.parse(state)
  const { error } = await client.from(TABLE).upsert(
    {
      user_id: userId,
      state: safeState,
    },
    { onConflict: "user_id" }
  )

  if (error) throw error
}

export function mergeCloudState(local: AppState, remote: AppState): AppState {
  return {
    entries: { ...remote.entries, ...local.entries },
    habits: hasCustomHabits(local) ? local.habits : remote.habits,
    notificationMorning:
      local.notificationMorning === INITIAL_STATE.notificationMorning
        ? remote.notificationMorning
        : local.notificationMorning,
    notificationEvening:
      local.notificationEvening === INITIAL_STATE.notificationEvening
        ? remote.notificationEvening
        : local.notificationEvening,
  }
}

function hasCustomHabits(state: AppState): boolean {
  return JSON.stringify(state.habits) !== JSON.stringify(INITIAL_STATE.habits)
}
