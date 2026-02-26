import * as vscode from 'vscode';
import { readFile } from 'fs/promises';
import { getMaxFilePreviewBytes } from './config';

export async function getFilePreviews(repoRoot: string, paths: string[]): Promise<string[]> {
	if (paths.length === 0) {
		return [];
	}
	const maxBytes = getMaxFilePreviewBytes();
	const previews: string[] = [];
	let remaining = maxBytes;

	for (const relPath of paths) {
		if (remaining <= 0) {
			break;
		}
		const fullPath = vscode.Uri.joinPath(vscode.Uri.file(repoRoot), relPath).fsPath;
		const buffer = await readFile(fullPath);
		if (buffer.includes(0)) {
			previews.push(`[${relPath}]\n(binary file skipped)`);
			continue;
		}
		const text = buffer.toString('utf8');
		let snippet = text;
		if (Buffer.byteLength(snippet, 'utf8') > remaining) {
			snippet = snippet.slice(0, Math.max(0, remaining - 50));
		}
		previews.push(`[${relPath}]\n${snippet}`);
		remaining -= Buffer.byteLength(snippet, 'utf8');
	}

	return previews;
}
