/**
 * Gesture detection for Stream Deck keys
 * Detects single press, double press, and hold gestures
 */

// Logger function that can be set externally
let logFn: (message: string) => void = console.log;

export function setInteractionLogger(fn: (message: string) => void): void {
  logFn = fn;
}

export enum InteractionType {
  SinglePress = "single",
  DoublePress = "double",
  Hold = "hold"
}

export interface InteractionCallbacks {
  onSinglePress: () => void;
  onDoublePress: () => void;
  onHold: () => void;
}

export class InteractionHandler {
  private callbacks: InteractionCallbacks;
  private lastKeyDownTime: number = 0;
  private keyDownTime: number = 0;
  private holdTimeout: NodeJS.Timeout | null = null;
  private clickTimeout: NodeJS.Timeout | null = null;
  private clickCount: number = 0;
  private holdTriggered: boolean = false;

  /** Maximum time between clicks for double-click detection (ms) */
  private static readonly DOUBLE_CLICK_THRESHOLD_MS = 300;

  /** Time key must be held for hold detection (ms) */
  private static readonly HOLD_THRESHOLD_MS = 500;

  /** Time to wait after a click before confirming single-click (ms) */
  private static readonly CLICK_WAIT_MS = 350;

  constructor(callbacks: InteractionCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Call this when a key down event is received
   */
  handleKeyDown(): void {
    const now = Date.now();
    const timeSinceLastDown = now - this.lastKeyDownTime;
    this.keyDownTime = now;
    this.holdTriggered = false;

    logFn(`[KeyDown] timeSinceLastDown=${timeSinceLastDown}ms`);

    // Check for potential double-click
    if (timeSinceLastDown < InteractionHandler.DOUBLE_CLICK_THRESHOLD_MS) {
      this.clickCount++;
      logFn(`[KeyDown] Potential double-click, clickCount=${this.clickCount}`);
      // Clear single-click timeout if we're detecting a double-click
      if (this.clickTimeout) {
        clearTimeout(this.clickTimeout);
        this.clickTimeout = null;
        logFn(`[KeyDown] Cleared pending single-click timeout`);
      }
    } else {
      this.clickCount = 1;
      logFn(`[KeyDown] New click sequence`);
    }

    this.lastKeyDownTime = now;

    // Start hold detection timer
    logFn(`[KeyDown] Starting hold timer (${InteractionHandler.HOLD_THRESHOLD_MS}ms)`);
    this.holdTimeout = setTimeout(() => {
      // Cancel any pending click handlers
      if (this.clickTimeout) {
        clearTimeout(this.clickTimeout);
        this.clickTimeout = null;
      }
      this.clickCount = 0;
      this.holdTriggered = true;
      logFn(`[HOLD] >>> HOLD TRIGGERED <<<`);
      this.callbacks.onHold();
    }, InteractionHandler.HOLD_THRESHOLD_MS);
  }

  /**
   * Call this when a key up event is received
   */
  handleKeyUp(): void {
    const pressDuration = Date.now() - this.keyDownTime;

    logFn(`[KeyUp] pressDuration=${pressDuration}ms, clickCount=${this.clickCount}, holdTriggered=${this.holdTriggered}`);

    // Clear hold timeout since key was released
    if (this.holdTimeout) {
      clearTimeout(this.holdTimeout);
      this.holdTimeout = null;
      logFn(`[KeyUp] Cleared hold timer`);
    }

    // If hold was triggered, don't process as a click
    if (this.holdTriggered) {
      logFn(`[KeyUp] Hold was triggered, ignoring key up`);
      return;
    }

    // If press was long enough to be a hold, it was already handled
    if (pressDuration >= InteractionHandler.HOLD_THRESHOLD_MS) {
      logFn(`[KeyUp] Press was long enough for hold, ignoring`);
      return;
    }

    // Handle click detection
    if (this.clickCount >= 2) {
      // Double-click detected
      this.clickCount = 0;
      logFn(`[DOUBLE] >>> DOUBLE PRESS TRIGGERED <<<`);
      this.callbacks.onDoublePress();
    } else {
      // Wait to see if another click is coming
      const remainingWait = Math.max(
        0,
        InteractionHandler.CLICK_WAIT_MS - pressDuration
      );

      logFn(`[KeyUp] Waiting ${remainingWait}ms for potential second click`);
      this.clickTimeout = setTimeout(() => {
        if (this.clickCount === 1) {
          logFn(`[SINGLE] >>> SINGLE PRESS TRIGGERED <<<`);
          this.callbacks.onSinglePress();
        }
        this.clickCount = 0;
        this.clickTimeout = null;
      }, remainingWait);
    }
  }

  /**
   * Cancel any pending interactions
   */
  cancel(): void {
    if (this.holdTimeout) {
      clearTimeout(this.holdTimeout);
      this.holdTimeout = null;
    }
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
    }
    this.clickCount = 0;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.cancel();
  }
}
