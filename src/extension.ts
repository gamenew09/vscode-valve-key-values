'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

let dollar_commands: vscode.CompletionItem[] = [
    new vscode.CompletionItem("$Macro", vscode.CompletionItemKind.Keyword)
];

class VPCCompletionItemProvider  implements vscode.CompletionItemProvider {
    public provideCompletionItems(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext):
        Thenable<vscode.CompletionItem[]>
    {
        return new Promise((resolve, reject) => {
            let wordToComplete = '';
            let range = document.getWordRangeAtPosition(position);
            if(range) 
            {
                wordToComplete = document.getText(range);
            }

            let items: vscode.CompletionItem[] = [];

            dollar_commands.forEach(element => {
                if(wordToComplete == "")
                {
                    let item = element;
                    item.insertText = element.label;
                    items.push(item);
                }
                else if(element.label.startsWith(wordToComplete))
                {
                    let item = element;
                    item.insertText = element.label.replace(wordToComplete, "");
                    items.push(item);
                }
            });

            resolve(items);
        });
    }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const VPC_MODE: vscode.DocumentFilter = { language: 'VPC', scheme: 'file' };

    //context.subscriptions.push(vscode.languages.registerCompletionItemProvider(VPC_MODE, new VPCCompletionItemProvider(), '$'));
}

// this method is called when your extension is deactivated
export function deactivate() {
}