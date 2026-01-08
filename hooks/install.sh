#!/bin/bash
# AgentDeck Hook Installation Script
#
# This script installs the AgentDeck hooks for Claude Code and Gemini CLI.
# It copies the status-reporter.sh and gemini-status-reporter.sh scripts to ~/.agentdeck/hooks/
# and provides instructions for configuring both tools.
#
# IMPORTANT: This script does NOT modify your settings files.
# You must manually add the hooks configuration to preserve your existing settings.
# See the hooks/hooks.json and hooks/gemini-hooks.json files for the configurations to add.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$HOME/.agentdeck/hooks"
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
GEMINI_SETTINGS="$HOME/.gemini/settings.json"

echo "AgentDeck Hook Installation"
echo "============================"
echo ""
echo "NOTE: This script will NOT modify your settings files."
echo "It only copies the hook scripts and provides manual setup instructions."
echo ""

# Create installation directory
echo "Creating installation directory: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

# Copy the Claude status reporter script
echo "Installing status-reporter.sh (Claude Code)..."
cp "$SCRIPT_DIR/status-reporter.sh" "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/status-reporter.sh"

# Copy the Gemini status reporter script
echo "Installing gemini-status-reporter.sh (Gemini CLI)..."
cp "$SCRIPT_DIR/gemini-status-reporter.sh" "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/gemini-status-reporter.sh"

echo ""
echo "Hook script installed successfully!"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "WARNING: jq is not installed. The hook script requires jq to parse JSON."
    echo "Please install jq:"
    echo "  macOS:   brew install jq"
    echo "  Ubuntu:  sudo apt-get install jq"
    echo ""
fi

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo "WARNING: curl is not installed. The hook script requires curl to send HTTP requests."
    echo ""
fi

# Provide instructions for Claude Code configuration
echo "Next Steps"
echo "=========="
echo ""
echo "1. CLAUDE CODE SETUP"
echo "--------------------"
echo "Add the AgentDeck hooks to your Claude Code configuration."
echo ""

if [[ -f "$CLAUDE_SETTINGS" ]]; then
    echo "Found existing Claude settings at: $CLAUDE_SETTINGS"
    echo ""
    echo "You can either:"
    echo "a. Manually merge the hooks from hooks.json into your settings.json"
    echo "b. Use the command below to open both files for comparison"
    echo ""

    if command -v code &> /dev/null; then
        echo "   code \"$CLAUDE_SETTINGS\" \"$SCRIPT_DIR/hooks.json\""
    else
        echo "   Open both files in your editor:"
        echo "   - $CLAUDE_SETTINGS"
        echo "   - $SCRIPT_DIR/hooks.json"
    fi
else
    echo "Claude settings file not found at: $CLAUDE_SETTINGS"
    echo ""
    echo "Create the file with the following content:"
    echo ""
    cat "$SCRIPT_DIR/hooks.json" | grep -v '^\s*"\$' | grep -v '^\s*"_'
fi

echo ""
echo ""
echo "2. GEMINI CLI SETUP (Optional)"
echo "------------------------------"
echo "Add the AgentDeck hooks to your Gemini CLI configuration."
echo ""

if [[ -f "$GEMINI_SETTINGS" ]]; then
    echo "Found existing Gemini settings at: $GEMINI_SETTINGS"
    echo ""
    echo "You can either:"
    echo "a. Manually merge the hooks from gemini-hooks.json into your settings.json"
    echo "b. Use the command below to open both files for comparison"
    echo ""

    if command -v code &> /dev/null; then
        echo "   code \"$GEMINI_SETTINGS\" \"$SCRIPT_DIR/gemini-hooks.json\""
    else
        echo "   Open both files in your editor:"
        echo "   - $GEMINI_SETTINGS"
        echo "   - $SCRIPT_DIR/gemini-hooks.json"
    fi
else
    echo "Gemini settings file not found at: $GEMINI_SETTINGS"
    echo ""
    echo "Create the file with the following content:"
    echo ""
    cat "$SCRIPT_DIR/gemini-hooks.json"
fi

echo ""
echo ""
echo "After configuring the hooks, restart any running Claude Code or Gemini CLI"
echo "instances to pick up the new hook configuration."
echo ""
echo "The AgentDeck status server will automatically receive status updates"
echo "from both Claude Code and Gemini CLI when you run the Stream Deck plugin."
echo ""
echo "Installation complete!"
