export const codeLanguages = ['json', 'sql', 'text'] as const
export type CodeLanguage = (typeof codeLanguages)[number]
export const codeLanguageLabels = { json: 'JSON', sql: 'SQL', text: 'TXT' } as const
