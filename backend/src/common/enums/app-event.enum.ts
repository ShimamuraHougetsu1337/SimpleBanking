/**
 * Global application event identifiers for EventEmitter2.
 *
 * Usage:
 *   import { AppEvent } from '@/common/enums/app-event.enum';
 *   this.eventEmitter.emit(AppEvent.USER_PASSWORD_CHANGED, { userId });
 */
export enum AppEvent {
  /** Triggered when a user successfully changes their password. */
  USER_PASSWORD_CHANGED = 'user.password-changed',
}
