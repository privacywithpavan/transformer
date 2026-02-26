// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { getFilePreviews } from './filePreview';
import {
	getNumstat,
	getStatus,
	getUnifiedDiff,
	getUntrackedFiles,
	getWorkspaceRoot,
	formatNumstat,
} from './git';
import { buildReviewPrompt } from './review/prompt';
import { getVscodeLmSelectorConfig } from './config';
import { requestVscodeLmReview } from './review/providers/vscodeLm';
import { showChangesOutput, showReviewOutput } from './ui';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "transformer" is now active!');
	void removeLegacySecrets(context);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const output = vscode.window.createOutputChannel('Repo Changes');
	const reviewOutput = vscode.window.createOutputChannel('LLM Review');

	const disposable = vscode.commands.registerCommand('transformer.listRepoChanges', async () => {
		try {
			const repoRoot = getWorkspaceRoot();
			const unstaged = formatNumstat(await getNumstat(repoRoot, false));
			const staged = formatNumstat(await getNumstat(repoRoot, true));
			const status = await getStatus(repoRoot);

			showChangesOutput(output, repoRoot, status, unstaged, staged);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			vscode.window.showErrorMessage(`Failed to list repo changes: ${message}`);
		}
	});

	context.subscriptions.push(disposable);

	const pickReviewDisposable = vscode.commands.registerCommand('transformer.reviewRepoChangesPickModel', async () => {
		await runVscodeLmReviewPick(context, reviewOutput);
	});

	context.subscriptions.push(pickReviewDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

async function removeLegacySecrets(context: vscode.ExtensionContext) {
	try {
		await context.secrets.delete('transformer.openaiApiKey');
	} catch (err) {
		console.warn('Failed to remove legacy secret transformer.openaiApiKey:', err);
	}
}

async function runVscodeLmReviewPick(context: vscode.ExtensionContext, output: vscode.OutputChannel) {
	try {
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: 'Reviewing git changes with language model...',
				cancellable: true,
			},
			async (_progress, token) => {
				if (token.isCancellationRequested) {
					throw new Error('Review cancelled.');
				}
				token.onCancellationRequested(() => {
					// Intentionally empty; requestVscodeLmReview will receive the token.
				});

				const repoRoot = getWorkspaceRoot();
				const status = await getStatus(repoRoot);
				if (status.length === 0) {
					vscode.window.showInformationMessage('There are no changes to review.');
					return;
				}
				const diffInfo = await getUnifiedDiff(repoRoot);
				const untracked = getUntrackedFiles(status);
				const previews = diffInfo.hasDiff ? [] : await getFilePreviews(repoRoot, untracked);

				const prompt = buildReviewPrompt(status, diffInfo.text, previews);
				const selector = getVscodeLmSelectorConfig();
				const responseText = await requestVscodeLmReview(prompt, selector, true, token);

				showReviewOutput(output, repoRoot, responseText, 'vscode-lm');
			},
		);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (message.toLowerCase().includes('cancel')) {
			vscode.window.showInformationMessage('Review cancelled.');
			return;
		}
		vscode.window.showErrorMessage(`Failed to review repo changes: ${message}`);
	}
}
