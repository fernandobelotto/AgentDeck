#!/bin/bash
# ClaudeDeck Hook Installation Script
#
# This script installs the ClaudeDeck hooks for Claude Code.
# It copies the status-reporter.sh script to ~/.claudedeck/hooks/
# and provides instructions for configuring Claude Code.
#
# IMPORTANT: This script does NOT modify your ~/.claude/settings.json
# You must manually add the hooks configuration to preserve your existing settings.
# See the hooks/hooks.json file for the configuration to add.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$HOME/.claudedeck/hooks"
CLAUDE_SETTINGS="$HOME/.claude/settings.json"

echo "ClaudeDeck Hook Installation"
echo "============================"
echo ""
echo "NOTE: This script will NOT modify your Claude Code settings."
echo "It only copies the hook script and provides manual setup instructions."
echo ""

# Create installation directory
echo "Creating installation directory: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

# Copy the status reporter script
echo "Installing status-reporter.sh..."
cp "$SCRIPT_DIR/status-reporter.sh" "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/status-reporter.sh"

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
echo "----------"
echo ""
echo "You need to add the ClaudeDeck hooks to your Claude Code configuration."
echo ""

if [[ -f "$CLAUDE_SETTINGS" ]]; then
    echo "Found existing Claude settings at: $CLAUDE_SETTINGS"
    echo ""
    echo "You can either:"
    echo "1. Manually merge the hooks from hooks.json into your settings.json"
    echo "2. Use the command below to open both files for comparison"
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
echo "After configuring the hooks, restart any running Claude Code instances"
echo "to pick up the new hook configuration."
echo ""
echo "The ClaudeDeck status server will automatically receive status updates"
echo "from Claude Code when you run the Stream Deck plugin."
echo ""
echo "Installation complete!"
