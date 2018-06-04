'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

let dollar_commands: vscode.CompletionItem[] = [
    new vscode.CompletionItem("$Macro", vscode.CompletionItemKind.Keyword)
];

class VPCHoverProvider implements vscode.HoverProvider {
    public provideHover(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
         vscode.ProviderResult<vscode.Hover> 
    {
        return new Promise((resolve, reject) =>
        {
            
        });
    }
}

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

// What a mess.
// documentUri: string = { macroName:string = macroValue:string }
let macrosFound: Map<string, Map<string, string>> = new Map;

/**
 * parseMacrosInDocument
 */
function parseMacrosInDocument(document: vscode.TextDocument) {
    if(document.languageId != "VPC")
        return;
    
    let macro_regex = /(\$Macro)(.\w+)(.+)/g; // Look for a macro definition in a line.

    let macros: Map<string, string> = new Map<string, string>();

    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        let lineText = line.text;

        let match = macro_regex.exec(lineText);
        
        if(match != undefined && match.length >= 3)
        {
            let macroName = match[2].trim();
            let mv = match[3].trim();
            let macroValue = "";

            for (let i = 0; i < mv.length; i++) {
                const char = mv[i];
                
                if(char != "\"")
                {
                    console.log(char);
                    macroValue = macroValue + char;
                }
            }

            macros.set(macroName, macroValue);
        }
    }

    macrosFound.set(document.uri.toString(), macros);
}

class VPCDefinintionProvider implements vscode.DefinitionProvider {
    public provideDefinition(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
    vscode.ProviderResult<vscode.Definition>
    {
        return new Promise((resolve, reject) =>
        {
            let definition: vscode.Definition = [];

            let line = document.lineAt(position.line);
            let lineTextTrimed = line.text.trim();

            if(lineTextTrimed.startsWith("$Include"))
            {
                // We have an include line, get the parameter of the Include.
                let includeTrimmed = lineTextTrimed.replace("$Include", "").trim();
                let eil = "";

                for (let index = 0; index < includeTrimmed.length; index++) {
                    const char = includeTrimmed[index];
                    
                    if(char != "\"")
                    {
                        eil = eil + char;
                    }
                }

                let expectedIncludeLocation = eil;

                let macros = macrosFound.get(document.uri.toString());

                // (\$Macro).+
                // Regex for macro lines
                let regex_macro = new RegExp(/(\$.+?)(?=[\\/;])/g);
                let match = regex_macro.exec(eil);
                if(match != undefined)
                {
                    for(let i = 0; i < match.length; i++)
                    {
                        let macroName = match[i].substr(1);
                        let macroValue = macros.get(macroName);
                        expectedIncludeLocation = expectedIncludeLocation.replace(match[i], macroValue);
                    }
                }
                
                // TODO: Handle cases where macros are used.
                let documentUri = document.uri;
                let fsPath = documentUri.fsPath;
                if(expectedIncludeLocation.startsWith('..' + path.sep))
                {
                    let dir = path.dirname(documentUri.fsPath);
                    let fileName = path.basename(expectedIncludeLocation);

                    let newPath = path.relative(expectedIncludeLocation, dir);

                    let fileLoc: vscode.Location = new vscode.Location(vscode.Uri.parse(documentUri.scheme + "://" + newPath + path.sep + fileName), new vscode.Position(0,0));
                    definition.push(fileLoc);
                    // Relative path
                }
                else
                {
                    // Work from workspace location.
                    // Get the workspace that holds the documentUri.
                    let workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);

                    if(workspaceFolder == undefined)
                    {
                        resolve([]);
                        return;
                    }

                    let workspaceUri = workspaceFolder.uri;
                    let appenededUri = vscode.Uri.parse(workspaceUri.toString().concat(path.sep, expectedIncludeLocation));
                    
                    let fileLoc: vscode.Location = new vscode.Location(vscode.Uri.parse(appenededUri.toString().replace(workspaceUri.fsPath, "")), new vscode.Position(0,0));
                    definition.push(fileLoc);
                }
            }

            resolve(definition);
        });
    }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const VPC_MODE: vscode.DocumentFilter = { language: 'VPC', scheme: 'file' };

    vscode.window.onDidChangeVisibleTextEditors(function (textEditors)
    {
        textEditors.forEach(editor => {
            parseMacrosInDocument(editor.document);
        });
    });

    if(vscode.window.visibleTextEditors.length > 0)
    {
        vscode.window.visibleTextEditors.forEach(editor => {
            parseMacrosInDocument(editor.document);
        });
    }

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(VPC_MODE, new VPCCompletionItemProvider(), '$'));
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(VPC_MODE, new VPCDefinintionProvider()));
}

// this method is called when your extension is deactivated
export function deactivate() {
}