# GEMINI.md

## Project Overview

This project, "AgentDeck," is a Stream Deck plugin designed to monitor and control AI agent instances, specifically Google's Gemini and Anthropic's Claude. It provides real-time status updates, gesture controls, and multi-instance support directly on the Stream Deck device.

The project is a TypeScript monorepo consisting of three main parts:

1.  **Stream Deck Plugin**: The core plugin that runs on the Stream Deck, written in TypeScript. It communicates with a local server to get status updates and send commands.
2.  **Status Server**: A local HTTP and WebSocket server that acts as a bridge between the AI agents and the Stream Deck plugin. It receives status updates from the agents via webhooks and relays them to the plugin via WebSockets.
3.  **Website**: A promotional and documentation website built with Next.js and Tailwind CSS, located in the `website` directory.

## Building and Running

### Prerequisites

*   Node.js 20+
*   Stream Deck software 6.6+
*   `jq` and `curl`

### Installation and Building

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Build the plugin**:
    ```bash
    npm run build
    ```
    This command uses Rollup to bundle the TypeScript source code into a single JavaScript file located at `com.agentdeck.plugin.sdPlugin/bin/plugin.js`.

### Running the Plugin

1.  **Link the plugin to the Stream Deck software**:
    ```bash
    npm run link
    ```
    This command creates a symbolic link from the project's plugin directory to the Stream Deck's plugin directory.

2.  **Run in watch mode (for development)**:
    ```bash
    npm run watch
    ```
    This will automatically rebuild the plugin when files are changed.

## Development Conventions

*   **Code Style**: The project uses Prettier for code formatting and ESLint for linting, as indicated by the presence of `prettier.config.cjs` and `eslint.config.mjs` in the `website` directory. The main project likely uses similar conventions.
*   **Testing**: There are no dedicated test files visible in the directory structure, so the testing strategy is unclear.
*   **Architecture**:
    *   The plugin communicates with a local server via WebSockets.
    *   The local server receives status updates from AI agents via webhooks.
    *   The plugin supports both Gemini and Claude, with separate action classes for each.
    *   The plugin integrates with the Kitty terminal for advanced features like focusing windows and sending signals.
*   **Contribution**: There is no `CONTRIBUTING.md` file, so contribution guidelines are not explicit.

## Key Files

*   `package.json`: Defines the project's dependencies, scripts, and metadata.
*   `rollup.config.mjs`: The Rollup configuration for building the plugin.
*   `src/plugin.ts`: The main entry point for the Stream Deck plugin.
*   `src/server/status-server.ts`: The implementation of the local status server.
*   `src/actions/gemini-instance-action.ts`: The action class for the Gemini integration.
*   `src/actions/claude-instance-action.ts`: The action class for the Claude integration.
*   `website/`: The directory containing the Next.js marketing and documentation website.
*   `com.agentdeck.plugin.sdPlugin/`: The directory that contains the Stream Deck plugin assets and binary.
