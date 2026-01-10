import { IconGenerator } from "./icon-generator.js";
import type { ClaudeState, InstanceSource } from "../server/types.js";

export type FrameUpdateCallback = (dataUrl: string) => void;

/**
 * Controls frame-based animations for Stream Deck icons
 */
export class AnimationController {
  private currentState: ClaudeState = "disconnected";
  private currentFrame: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private onFrameUpdate: FrameUpdateCallback;
  private isRunning: boolean = false;
  private kittyAvailable: boolean | undefined = undefined;
  private source: InstanceSource;
  private holdProgress: number | undefined = undefined;

  // State transition properties
  private previousState: ClaudeState | null = null;
  private transitionProgress: number = 1;  // 1 = no transition, 0 = start of transition
  private inTransition: boolean = false;
  private transitionIntervalId: NodeJS.Timeout | null = null;

  /** Animation frame rate (frames per second) - 12 FPS for smooth, calm animations */
  private static readonly FPS = 12;
  /** Frame interval in milliseconds */
  private static readonly FRAME_INTERVAL_MS = 1000 / AnimationController.FPS;
  /** Number of frames for state transitions (~333ms at 12fps) */
  private static readonly TRANSITION_FRAMES = 4;

  constructor(onFrameUpdate: FrameUpdateCallback, source: InstanceSource = "claude") {
    this.onFrameUpdate = onFrameUpdate;
    this.source = source;
  }

  /**
   * Set Kitty availability status and update display
   */
  setKittyAvailable(available: boolean): void {
    if (this.kittyAvailable === available) {
      return;
    }

    this.kittyAvailable = available;
    // Force a frame update to show the new Kitty status
    this.updateFrame();
  }

  /**
   * Get current Kitty availability status
   */
  isKittyAvailable(): boolean | undefined {
    return this.kittyAvailable;
  }

  /**
   * Set hold progress (0-1) and update display
   * @param progress - 0-1 progress value, or undefined to clear
   */
  setHoldProgress(progress: number | undefined): void {
    this.holdProgress = progress;
    this.updateFrame();
  }

  /**
   * Clear hold progress
   */
  clearHoldProgress(): void {
    this.holdProgress = undefined;
    this.updateFrame();
  }

  /**
   * Set the current state and update the display
   */
  setState(state: ClaudeState): void {
    if (this.currentState === state) {
      return;
    }

    // Store previous state for crossfade transition
    this.previousState = this.currentState;
    this.currentState = state;
    this.currentFrame = 0;

    // Stop existing animation
    this.stopAnimation();

    // Start crossfade transition
    this.startTransition();
  }

  /**
   * Start a crossfade transition between states
   */
  private startTransition(): void {
    // Stop any existing transition
    if (this.transitionIntervalId) {
      clearInterval(this.transitionIntervalId);
      this.transitionIntervalId = null;
    }

    this.inTransition = true;
    this.transitionProgress = 0;
    let transitionFrame = 0;

    // Update immediately for first frame
    this.updateFrame();

    this.transitionIntervalId = setInterval(() => {
      transitionFrame++;
      this.transitionProgress = transitionFrame / AnimationController.TRANSITION_FRAMES;

      if (transitionFrame >= AnimationController.TRANSITION_FRAMES) {
        // Transition complete
        this.inTransition = false;
        this.transitionProgress = 1;
        this.previousState = null;
        clearInterval(this.transitionIntervalId!);
        this.transitionIntervalId = null;

        // Start normal animation if state is animated
        if (IconGenerator.isAnimated(this.currentState)) {
          this.startAnimation();
        } else {
          this.updateFrame();
        }
      } else {
        this.updateFrame();
      }
    }, AnimationController.FRAME_INTERVAL_MS);
  }

  /**
   * Get the current state
   */
  getState(): ClaudeState {
    return this.currentState;
  }

  /**
   * Force an immediate frame update
   */
  refresh(): void {
    this.updateFrame();
  }

  /**
   * Start the animation loop
   */
  private startAnimation(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.updateFrame();

    this.intervalId = setInterval(() => {
      const frameCount = IconGenerator.getFrameCount(this.currentState);
      this.currentFrame = (this.currentFrame + 1) % frameCount;
      this.updateFrame();
    }, AnimationController.FRAME_INTERVAL_MS);
  }

  /**
   * Stop the animation loop
   */
  private stopAnimation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Update the current frame
   */
  private updateFrame(): void {
    let dataUrl: string;

    if (this.inTransition && this.previousState) {
      // During transition, generate crossfade frame
      dataUrl = IconGenerator.generateTransitionDataUrl(
        this.previousState,
        this.currentState,
        this.transitionProgress,
        this.currentFrame,
        this.kittyAvailable,
        this.source,
        this.holdProgress
      );
    } else {
      dataUrl = IconGenerator.generateDataUrl(this.currentState, this.currentFrame, this.kittyAvailable, this.source, this.holdProgress);
    }

    this.onFrameUpdate(dataUrl);
  }

  /**
   * Stop the animation and clean up
   */
  stop(): void {
    this.stopAnimation();
    // Also stop any transition
    if (this.transitionIntervalId) {
      clearInterval(this.transitionIntervalId);
      this.transitionIntervalId = null;
    }
    this.inTransition = false;
  }

  /**
   * Check if an animation is currently running
   */
  isAnimating(): boolean {
    return this.isRunning;
  }
}
