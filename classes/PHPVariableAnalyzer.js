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
        const array1 = this.highlightUnusedVariables(globalVariables, variableUsageMap, document);
        const array2 = this.highlightUndeclaredVariables(globalVariables, variableUsageMap, document);
        const diagnostics = array1.concat(array2);
        this.diagnostics.set(document.uri, diagnostics);
    }

/**
 * @param {vscode.TextDocument} document
 * @returns {{ globalVariables: string[], variableUsageMap: { [x: string]: any; } }}
 */
findGlobalVariables(document) {
    const globalVariables = [];
    const variableUsageMap = {};
    const variableDeclarationRegex = /\$([a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)\s*(?=[=;])/;
    const catchAndForeachRegex = /catch\s*\(\s*\S+\s+\$(\w+)\s*\)|foreach\s*\(\s*\$\w+\s+as\s+\$(\w+)\s*\)/g;
    const variableUsageRegex = /(?<!as\s+)\$([a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)/g;
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
        // New logic for catch and foreach
        let match1;
        while ((match1 = catchAndForeachRegex.exec(lineText)) !== null) {
            // match[1] is the variable from the catch statement, match[2] from the foreach
            const variableName = match1[1] || match1[2];
            const fullVariable = '$' + variableName;
            if (!globalVariables.includes(fullVariable)) {
                globalVariables.push(fullVariable);
                if (!variableUsageMap[fullVariable]) {
                    variableUsageMap[fullVariable] = { declarations: [], usages: [] };
                }
                variableUsageMap[fullVariable].declarations.push(lineIndex);
            }
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
        else if (lineText.match(variableUsageRegex)) {
            const matches = lineText.match(variableUsageRegex);
            matches.forEach(match => {
                if (!globalVariables.includes(match)) {
                    globalVariables.push(match);
                    if (!variableUsageMap[match]) {
                        // Initialize with empty declarations and usages
                        variableUsageMap[match] = { declarations: [], usages: [] };
                    }
                }
                // Add this line as a usage
                variableUsageMap[match].usages.push(lineIndex);
            });
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

   

    if (diagnostics.length > 0) {
        this.showInformationMessage('Analysis complete. Unused variables highlighted.');
        return diagnostics;
    } else {
        this.showInformationMessage('No unused variables found.');
        return [];
    }
}


highlightUndeclaredVariables(globalVariables, variableUsageMap, document) {
    const diagnostics = [];

    for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
        const line = document.lineAt(lineIndex);
        const lineText = line.text;
        let isInsideComment = false; // Flag to track if currently inside a comment block
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
        globalVariables.forEach(variable => {
            if (lineText.includes(variable) && !variableUsageMap[variable].declarations.length) {
                const variableIndex = lineText.indexOf(variable);
                const range = new vscode.Range(lineIndex, variableIndex, lineIndex, variableIndex + variable.length);
                const diagnostic = new vscode.Diagnostic(range, `Variable '${variable}' is used before it's declared.`, vscode.DiagnosticSeverity.Warning);
                diagnostics.push(diagnostic);
            }
        });
    }
    
    if (diagnostics.length > 0) {
        this.showInformationMessage('Analysis complete. Undeclared variables highlighted.');
        return diagnostics;
    }
    else {
        this.showInformationMessage('No undeclared variables found.');
        return [];
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
