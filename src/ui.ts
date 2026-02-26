import * as vscode from 'vscode';
export function showReviewOutput(
	output: vscode.OutputChannel,
	repoRoot: string,
	reviewText: string,
	provider: string,
) {
	output.clear();
	output.appendLine(`Repository: ${repoRoot}`);
	output.appendLine(`Provider: ${provider}`);
	output.appendLine('');
	output.appendLine(reviewText);
	output.show(true);
}

export function showChangesOutput(
	output: vscode.OutputChannel,
	repoRoot: string,
	status: string[],
	unstaged: string[],
	staged: string[],
) {
	output.clear();
	output.appendLine(`Repository: ${repoRoot}`);
	output.appendLine('');
	output.appendLine('Changed files (status):');
	if (status.length === 0) {
		output.appendLine('  (no changes)');
	} else {
		for (const line of status) {
			output.appendLine(`  ${line}`);
		}
	}

	output.appendLine('');
	output.appendLine('Line changes (unstaged):');
	appendNumstat(output, unstaged);

	output.appendLine('');
	output.appendLine('Line changes (staged):');
	appendNumstat(output, staged);

	output.show(true);
}

function appendNumstat(output: vscode.OutputChannel, lines: string[]) {
	if (lines.length === 0) {
		output.appendLine('  (no changes)');
		return;
	}
	for (const line of lines) {
		output.appendLine(`  ${line}`);
	}
}
