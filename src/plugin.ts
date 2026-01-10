import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { ClaudeInstanceAction } from "./actions/claude-instance-action.js";
import { GeminiInstanceAction } from "./actions/gemini-instance-action.js";
import { CursorInstanceAction } from "./actions/cursor-instance-action.js";
import { getStatusServer } from "./server/status-server.js";

// Set up logging
streamDeck.logger.setLevel(LogLevel.DEBUG);

// Start the status server
const statusServer = getStatusServer();
statusServer.start().then(() => {
  streamDeck.logger.info("AgentDeck status server started");
}).catch((err) => {
  streamDeck.logger.error("Failed to start status server:", err);
});

// Register the Claude Instance action
streamDeck.actions.registerAction(new ClaudeInstanceAction());

// Register the Gemini Instance action
streamDeck.actions.registerAction(new GeminiInstanceAction());

// Register the Cursor Instance action
streamDeck.actions.registerAction(new CursorInstanceAction());

// Connect to Stream Deck
streamDeck.connect();

streamDeck.logger.info("AgentDeck plugin initialized");

// Handle plugin shutdown
process.on("SIGTERM", async () => {
  streamDeck.logger.info("AgentDeck plugin shutting down");
  await statusServer.stop();
  process.exit(0);
});

process.on("SIGINT", async () => {
  streamDeck.logger.info("AgentDeck plugin interrupted");
  await statusServer.stop();
  process.exit(0);
});
