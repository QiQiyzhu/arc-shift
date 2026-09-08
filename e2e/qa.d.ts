import type { installQA } from '../src/game/qa';
declare global {
  interface Window {
    arcQA: ReturnType<typeof installQA>;
  }
}
