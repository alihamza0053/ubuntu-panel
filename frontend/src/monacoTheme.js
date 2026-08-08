// Monaco colour theme matching the panel's mint-on-teal-black language.
// Pass `beforeMount={defineMonacoTheme}` and `theme="serverhub-dark"` to
// @monaco-editor/react so the editor sits on the same surfaces as the cards.
export const MONACO_THEME = 'serverhub-dark'

export function defineMonacoTheme(monaco) {
  monaco.editor.defineTheme(MONACO_THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'A6C2C6' },
      { token: 'comment', foreground: '47636D', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7BF3C0' },
      { token: 'string', foreground: '22E5CE' },
      { token: 'number', foreground: 'B6FBDC' },
      { token: 'type', foreground: '3FE39B' },
      { token: 'function', foreground: 'E7F5F1' },
      { token: 'variable', foreground: 'CFE4E1' },
      { token: 'delimiter', foreground: '7B989F' },
      { token: 'tag', foreground: '3FE39B' },
      { token: 'attribute.name', foreground: '7BF3C0' },
      { token: 'attribute.value', foreground: '22E5CE' },
    ],
    colors: {
      'editor.background': '#04090C',
      'editor.foreground': '#A6C2C6',
      'editorLineNumber.foreground': '#47636D',
      'editorLineNumber.activeForeground': '#3FE39B',
      'editorCursor.foreground': '#3FE39B',
      'editor.selectionBackground': '#3FE39B33',
      'editor.inactiveSelectionBackground': '#3FE39B1A',
      'editor.lineHighlightBackground': '#0D1D2566',
      'editorIndentGuide.background1': '#17333D',
      'editorIndentGuide.activeBackground1': '#0E8F52',
      'editorWidget.background': '#0D1D25',
      'editorWidget.border': '#17333D',
      'editorSuggestWidget.background': '#0D1D25',
      'editorSuggestWidget.border': '#17333D',
      'editorSuggestWidget.selectedBackground': '#12282F',
      'editorGutter.background': '#04090C',
      'scrollbarSlider.background': '#17333DAA',
      'scrollbarSlider.hoverBackground': '#22D07E55',
      'scrollbarSlider.activeBackground': '#22D07E88',
      'editorBracketMatch.background': '#22D07E22',
      'editorBracketMatch.border': '#3FE39B',
    },
  })
}
