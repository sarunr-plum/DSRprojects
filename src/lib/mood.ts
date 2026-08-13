/**
 * Tiny pub/sub so anything on the board can make the logo react
 * (`cheer("sparkle")`) without threading callbacks through the tree.
 */

export type Mood =
  | "crossed" // default — fingers crossed 🤞
  | "heart" // something reached Done
  | "sparkle" // task created
  | "thumbsup" // task saved / edited
  | "rocket" // dragged into In Progress
  | "wave" // signed in
  | "confetti" // project completed
  | "eyes" // refreshing / looking
  | "oops" // something failed

export const DEFAULT_MOOD: Mood = "crossed"

type Listener = (mood: Mood) => void
const listeners = new Set<Listener>()

/** Flash a mood on the logo. It falls back to DEFAULT_MOOD on its own. */
export function cheer(mood: Mood): void {
  listeners.forEach((l) => l(mood))
}

export function onCheer(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
