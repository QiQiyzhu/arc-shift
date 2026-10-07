/** English presentation copy. Chinese source messages remain the canonical
 * content authored by the game. Keep complete sentences before short fragments. */
import shell from './locale-shell.json';
import { CONTENT_COPY } from './locale-content';
import { INTERFACE_COPY } from './locale-interface';
import { TRIAL_COPY } from './locale-trial';
import { COACH_COPY } from './locale-coach';
export const ENGLISH_COPY: Record<string, string> = {
  ...shell,
  ...CONTENT_COPY,
  ...INTERFACE_COPY,
  ...TRIAL_COPY,
  ...COACH_COPY,
};
