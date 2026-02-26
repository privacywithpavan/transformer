import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getMaxDiffBytes } from './config';

const execFileAsync = promisify(execFile);

export function getWorkspaceRoot(): string {
	const folders = vscode.workspace.workspaceFolders;
	if (!folders || folders.length === 0) {
		throw new Error('No workspace folder is open.');
	}
	return folders[0].uri.fsPath;
}

async function runGit(repoRoot: string, args: string[]): Promise<string> {
	const { stdout } = await execFileAsync('git', args, { cwd: repoRoot });
	return stdout.trimEnd();
}

export async function getStatus(repoRoot: string): Promise<string[]> {
	const output = await runGit(repoRoot, ['status', '--porcelain']);
	if (!output) {
		return [];
	}
	return output.split('\n');
}

export type Numstat = {
	added: number | null;
	deleted: number | null;
	path: string;
};

export async function getNumstat(repoRoot: string, staged: boolean): Promise<Numstat[]> {
	const args = ['diff', '--numstat'];
	if (staged) {
		args.push('--staged');
	}
	const output = await runGit(repoRoot, args);
	if (!output) {
		return [];
	}
	return output.split('\n').map(parseNumstatLine).filter((line): line is Numstat => line !== null);
}

function parseNumstatLine(line: string): Numstat | null {
	const parts = line.split('\t');
	if (parts.length < 3) {
		return null;
	}
	const [addedRaw, deletedRaw, ...pathParts] = parts;
	const added = addedRaw === '-' ? null : Number(addedRaw);
	const deleted = deletedRaw === '-' ? null : Number(deletedRaw);
	return {
		added: Number.isFinite(added) ? added : null,
		deleted: Number.isFinite(deleted) ? deleted : null,
		path: pathParts.join('\t'),
	};
}

export function formatNumstat(stats: Numstat[]): string[] {
	if (stats.length === 0) {
		return [];
	}
	return stats.map((stat) => {
		const added = stat.added === null ? '-' : String(stat.added);
		const deleted = stat.deleted === null ? '-' : String(stat.deleted);
		return `+${added} -${deleted}  ${stat.path}`;
	});
}

export async function getUnifiedDiff(repoRoot: string): Promise<{ text: string; hasDiff: boolean }> {
	const output = await runGit(repoRoot, ['diff']);
	const staged = await runGit(repoRoot, ['diff', '--staged']);
	const hasDiff = output.length > 0 || staged.length > 0;
	const combined = [
		'--- UNSTAGED DIFF ---',
		output || '(no unstaged changes)',
		'',
		'--- STAGED DIFF ---',
		staged || '(no staged changes)',
	].join('\n');
	return { text: truncateForReview(combined), hasDiff };
}

function truncateForReview(diff: string): string {
	const maxBytes = getMaxDiffBytes();
	const encoder = new TextEncoder();
	const bytes = encoder.encode(diff);
	if (bytes.length <= maxBytes) {
		return diff;
	}
	let truncated = diff.slice(0, Math.floor(diff.length * 0.8));
	while (encoder.encode(truncated).length > maxBytes) {
		truncated = truncated.slice(0, Math.floor(truncated.length * 0.9));
	}
	return `${truncated}\n\n[Diff truncated to ${maxBytes} bytes for review]`;
}

export function getUntrackedFiles(status: string[]): string[] {
	return status
		.filter((line) => line.startsWith('?? '))
		.map((line) => line.slice(3).trim())
		.filter((line) => line.length > 0);
}
