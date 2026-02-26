import * as vscode from 'vscode';
import { VscodeLmSelectorConfig, shouldPickModel } from '../../config';

export async function requestVscodeLmReview(
	prompt: string,
	config: VscodeLmSelectorConfig,
	forcePickModel: boolean,
	token?: vscode.CancellationToken,
): Promise<string> {
	if (!vscode.lm) {
		throw new Error('VS Code Language Model API is not available in this host.');
	}

	const selector: vscode.LanguageModelChatSelector = {};
	if (config.vscodeLmVendor) {
		selector.vendor = config.vscodeLmVendor;
	}
	if (config.vscodeLmFamily) {
		selector.family = config.vscodeLmFamily;
	}
	if (config.vscodeLmVersion) {
		selector.version = config.vscodeLmVersion;
	}
	if (config.vscodeLmId) {
		selector.id = config.vscodeLmId;
	}

	const models = await vscode.lm.selectChatModels(selector);
	if (!models || models.length === 0) {
		throw new Error('No VS Code language models available for the configured selector.');
	}

	const model = await pickVscodeModel(models, forcePickModel);
	const response = await model.sendRequest(
		[new vscode.LanguageModelChatMessage(vscode.LanguageModelChatMessageRole.User, prompt)],
		{ justification: 'Review git changes and provide feedback.' },
		token,
	);
	return collectResponseText(response);
}

async function collectResponseText(response: vscode.LanguageModelChatResponse): Promise<string> {
	let text = '';
	for await (const part of response.text) {
		text += part;
	}
	return text.trim() || 'No response text returned by the model.';
}

async function pickVscodeModel(
	models: vscode.LanguageModelChat[],
	forcePickModel: boolean,
): Promise<vscode.LanguageModelChat> {
	const shouldPick = forcePickModel || shouldPickModel();
	if (!shouldPick || models.length === 1) {
		return models[0];
	}

	const items = models.map((model) => ({
		label: model.name,
		description: `${model.vendor}/${model.family}/${model.version}`,
		detail: model.id,
		model,
	}));

	const picked = await vscode.window.showQuickPick(items, {
		placeHolder: 'Select a language model to use for review',
		ignoreFocusOut: true,
	});

	if (!picked) {
		throw new Error('Model selection cancelled.');
	}

	return picked.model;
}
