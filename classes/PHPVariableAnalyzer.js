const vscode = require('vscode');

class PHPVariableAnalyzer {
    /**
     * @param {vscode.DiagnosticCollection} diagnostics
     */
    constructor(diagnostics) {
        this.diagnostics = diagnostics;
    }

    /**
     * @param {vscode.TextDocument} document
     */
    analyzeDocument(document) {
        if (document.languageId !== 'php') {
            this.showErrorMessage("This command is only applicable to PHP files.");
            return;
        }
        const { globalVariables, variableUsageMap } = this.findGlobalVariables(document);
        this.highlightUnusedVariables(globalVariables, variableUsageMap, document);
    }

/**
 * @param {vscode.TextDocument} document
 * @returns {{ globalVariables: string[], variableUsageMap: { [x: string]: any; } }}
 */
findGlobalVariables(document) {
    const globalVariables = [];
    const variableUsageMap = {};
    const variableDeclarationRegex = /\$([a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)\s*(?=[=;])/;
    let isInsideComment = false; // Flag to track if currently inside a comment block

    for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
        const line = document.lineAt(lineIndex);
        const lineText = line.text;

        // Check for comment start and end
        if (lineText.includes('/*')) {
            isInsideComment = true;
        }
        if (lineText.includes('*/')) {
            isInsideComment = false;
            continue; // Skip the line with comment end
        }

        // Skip line if inside comment or starts with //
        if (isInsideComment || lineText.trim().startsWith('//')) {
            continue;
        }

        const match = lineText.match(variableDeclarationRegex);
        if (match) {
            console.log('Found variable:', match[1]);
            const variableName = match[1];
            const fullVariable = '$' + variableName;
            // !!Note: We don't need to check if the variable is already in the list if we want to highlight all declarations
            // if (!globalVariables.includes(fullVariable)) {
                globalVariables.push(fullVariable);
                if (!variableUsageMap[fullVariable]) {
                    // Initialize with empty declarations and usages
                    variableUsageMap[fullVariable] = { declarations: [], usages: [] };
                }
                // Add this line as a declaration, not a usage
                variableUsageMap[fullVariable].declarations.push(lineIndex);
            // }
        }

        globalVariables.forEach(variable => {
            if (lineText.includes(variable) && (!match || ('$' + match[1]) !== variable)) {
                // If the line contains the variable and it's not a declaration of the same variable
                variableUsageMap[variable].usages.push(lineIndex);
            }
        });
    }

    return { globalVariables, variableUsageMap };
}

highlightUnusedVariables(globalVariables, variableUsageMap, document) {
    const diagnostics = [];

    globalVariables.forEach(variable => {
        const { declarations, usages } = variableUsageMap[variable];
        // Check if the variable has no usages beyond its declarations
        if (usages.length === 0 || (declarations.length > 0 && usages.every(usageLine => declarations.includes(usageLine)))) {
            // Highlight all declarations as unused
            declarations.forEach(declaredLine => {
                const line = document.lineAt(declaredLine);
                const variableIndex = line.text.indexOf(variable);
                const range = new vscode.Range(declaredLine, variableIndex, declaredLine, variableIndex + variable.length);
                const diagnostic = new vscode.Diagnostic(range, `Variable '${variable}' is declared but not used.`, vscode.DiagnosticSeverity.Warning);
                diagnostics.push(diagnostic);
            });
        }
    });

    this.diagnostics.set(document.uri, diagnostics);

    if (diagnostics.length > 0) {
        this.showInformationMessage('Analysis complete. Unused variables highlighted.');
    } else {
        this.showInformationMessage('No unused variables found.');
    }
}





    /**
     * @param {string} message
     */
    showErrorMessage(message) {
        vscode.window.showErrorMessage(message);
    }

    /**
     * @param {string} message
     */
    showInformationMessage(message) {
        vscode.window.showInformationMessage(message);
    }
}

module.exports = PHPVariableAnalyzer;
