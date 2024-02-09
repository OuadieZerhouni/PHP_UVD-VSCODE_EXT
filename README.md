# PHP Variable Analyzer for VS Code

The PHP Variable Analyzer extension for Visual Studio Code provides an efficient way to detect and highlight unused variables in your PHP code. By analyzing PHP files, it helps developers clean up their codebase, making it easier to maintain and understand. This extension is particularly useful for large projects where unused variables can accumulate over time and potentially lead to bugs or reduce code readability.

## Features

- **Detect Unused Variables**: Quickly identifies variables that are declared but never used.
- **Highlight Declarations**: Highlights all declarations of unused variables directly in the editor, making it easy to spot and remove them.
- **PHP File Support**: Specifically designed for PHP files, ensuring accurate analysis of PHP syntax and variable usage.
- **Efficient Analysis**: Runs analysis on the fly, updating highlights as you code for real-time feedback.
- **Easy to Use**: Integrates seamlessly with VS Code, providing a straightforward user experience without complicated setup.

## Installation

To install the PHP Variable Analyzer extension, follow these steps:

1. Open Visual Studio Code.
2. Navigate to the Extensions view by clicking on the square icon on the sidebar or pressing `Ctrl+Shift+X`.
3. Search for `PHP Variable Analyzer`.
4. Click on the Install button.

Alternatively, you can install the extension via the Command Palette:

1. Open the Command Palette with `Ctrl+Shift+P` or `Cmd+Shift+P` on macOS.
2. Type `ext install` followed by the extension name, e.g., `ext install php-variable-analyzer`.
3. Press Enter to execute the command and install the extension.

## Usage

Once installed, the PHP Variable Analyzer automatically analyzes open PHP files for unused variables. To manually trigger an analysis, follow these steps:

1. Open a PHP file in VS Code.
2. Open the Command Palette with `Ctrl+Shift+P` or `Cmd+Shift+P` on macOS.
3. Type `Analyze PHP Variables` and press Enter.
