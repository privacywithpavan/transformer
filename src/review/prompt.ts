export function buildReviewPrompt(status: string[], diff: string, previews: string[]): string {
	const statusBlock = status.length ? status.join('\n') : '(no changes)';
	const previewBlock = previews.length ? previews.join('\n\n') : '(no previews)';
	return [
		'You are a senior code reviewer.',
		'Review the following git changes and provide feedback.',
		'Focus on correctness bugs, edge cases, security issues, performance pitfalls, and maintainability.',
		'If there are untracked files, review their contents as provided.',
		'',
		'Changed files (git status --porcelain):',
		statusBlock,
		'',
		'Unified diff:',
		diff,
		'',
		'Untracked file previews (when diff is empty):',
		previewBlock,
	].join('\n');
}
