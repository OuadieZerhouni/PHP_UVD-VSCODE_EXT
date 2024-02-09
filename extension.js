const vscode = require('vscode');
const PHPVariableAnalyzer = require('./classes/PHPVariableAnalyzer');

function activate(context) {
    const diagnostics = vscode.languages.createDiagnosticCollection('phpUnusedVariables');
    context.subscriptions.push(diagnostics);

    const analyzer = new PHPVariableAnalyzer(diagnostics);

    let disposable = vscode.commands.registerCommand('php-uvd.analyzeFile', function () {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor found.");
            return;
        }

        let document = editor.document;
        analyzer.analyzeDocument(document);
    });

    context.subscriptions.push(disposable);

    vscode.workspace.onDidSaveTextDocument((document) => {
        if (document.languageId === 'php') {
            vscode.commands.executeCommand('php-uvd.analyzeFile');
        }
    });
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
