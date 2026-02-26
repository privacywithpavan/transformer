import * as vscode from 'vscode';

export type VscodeLmSelectorConfig = {
	vscodeLmVendor?: string;
	vscodeLmFamily?: string;
	vscodeLmVersion?: string;
	vscodeLmId?: string;
};

export function getVscodeLmSelectorConfig(): VscodeLmSelectorConfig {
	const config = vscode.workspace.getConfiguration('transformer');
	return {
		vscodeLmVendor: emptyToUndefined(config.get<string>('vscodeLmVendor')),
		vscodeLmFamily: emptyToUndefined(config.get<string>('vscodeLmFamily')),
		vscodeLmVersion: emptyToUndefined(config.get<string>('vscodeLmVersion')),
		vscodeLmId: emptyToUndefined(config.get<string>('vscodeLmId')),
	};
}

export function getMaxDiffBytes(): number {
	return vscode.workspace.getConfiguration('transformer').get<number>('maxDiffBytes', 120000);
}

export function getMaxFilePreviewBytes(): number {
	return vscode.workspace.getConfiguration('transformer').get<number>('maxFilePreviewBytes', 20000);
}

export function shouldPickModel(): boolean {
	return vscode.workspace.getConfiguration('transformer').get<boolean>('vscodeLmPickModel', false);
}

function emptyToUndefined(value: string | undefined | null): string | undefined {
	if (!value) {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}
