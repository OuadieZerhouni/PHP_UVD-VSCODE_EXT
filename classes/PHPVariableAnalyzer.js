const vscode = require('vscode');

class PHPVariableAnalyzer {
    /**
     * @param {vscode.DiagnosticCollection} diagnostics
     */
    constructor(diagnostics) {
        this.diagnostics = diagnostics;
        this.skipRegions = [];
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
    // Enhanced regex to account for optional whitespace and newlines
    const variableDeclarationRegex = /(?<!->)\$([a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)\s*(?=[=;])/;    // Adjusted regex to match variable declarations in foreach loops across lines
    const catchAndForeachRegex = /(?:catch|foreach|while)?\s*\(\s*.*?\s+as\s+(?:\s*\r?\n?)*\$(\w+)\)|^\s*as\s+\$(\w+)/gm;
    const variableUsageRegex = /(?<!as\s+)\$([a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)/g;
    const superGlobals = [
        '$GLOBALS', '$_SERVER', '$_REQUEST', '$_POST', '$_GET', '$_FILES',
        '$_ENV', '$_COOKIE', '$_SESSION'
    ];

    let isInsideComment = false;
    let isInsideClassOrFunction = false;
    let braceCounter = 0;
    this.skipRegions = [];
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

        // Check if inside a class or function
        if (lineText.match(/\bclass\b/) || lineText.match(/\bfunction\b/)) {
            isInsideClassOrFunction = true;
            this.skipRegions.push(lineIndex);
        }

        // Check for opening and closing braces to manage class or function scope
        if (lineText.includes('{') && isInsideClassOrFunction) {
            braceCounter++;
        }
        if (lineText.includes('}') && isInsideClassOrFunction) {
            braceCounter--;
            if (braceCounter === 0) {
                isInsideClassOrFunction = false;
                this.skipRegions.push(lineIndex);
            }
        }

        // If inside class or function, skip further analysis
        if (isInsideClassOrFunction) {
            continue;
        }

        // Enhanced logic for catch and foreach to handle variable whitespace/newlines
        let match1;
        while ((match1 = catchAndForeachRegex.exec(lineText)) !== null) {
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

        // Matching other variable declarations
        const match = lineText.match(variableDeclarationRegex);
        if (match) {
            const variableName = match[1];
            const fullVariable = '$' + variableName;

            if (!globalVariables.includes(fullVariable) && !superGlobals.includes(fullVariable)) {
                globalVariables.push(fullVariable);
                if (!variableUsageMap[fullVariable]?.declarations) {
                    variableUsageMap[fullVariable] = { declarations: [], usages: [] };
                }
                variableUsageMap[fullVariable].declarations.push(lineIndex);
            }
        }

        // Tracking variable usages
        if (lineText.match(variableUsageRegex)) {
            const matches = lineText.matchAll(variableUsageRegex);
            for (const match of matches) {
                const fullVariable = match[0];
                if (!globalVariables.includes(fullVariable) && !superGlobals.includes(fullVariable) && !variableUsageMap[fullVariable]) {
                    globalVariables.push(fullVariable);
                    variableUsageMap[fullVariable] = { declarations: [], usages: [] };
                }
                variableUsageMap[fullVariable].usages.push(lineIndex);
            }
        }
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
            // if the first bigger than  lineIndex element in skipRegions  has a odd indexin the array then skip the line
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
            let firstBigger = this.skipRegions.find((element) => element > lineIndex);
            if (firstBigger && this.skipRegions.indexOf(firstBigger) % 2 == 1) {
                // make the lineIndex to be the first bigger element after the current lineIndex
                lineIndex = firstBigger;
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
