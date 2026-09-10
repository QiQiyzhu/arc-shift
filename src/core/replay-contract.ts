import type { Input, RoomKind } from '../game/types';
import type { ShopId } from '../economy/catalog';

/** UI decisions outside the fixed input stream. Their order is significant. */
export type GameCommand =
  | { type: 'reward' | 'route' | 'event'; id: string }
  | { type: 'legacyRoute'; kind: RoomKind }
  | { type: 'shop'; id: ShopId }
  | { type: 'chest'; method: 'key' | 'bomb' }
  | { type: 'pact' | 'bank' | 'reroll' | 'pause' };
export interface SimulationObserver {
  beforeStep(dt: number, input: Input): void;
  afterStep(): void;
  beforeCommand(command: GameCommand): void;
  command(command: GameCommand, result: boolean | void): void;
  reset(): void;
}
