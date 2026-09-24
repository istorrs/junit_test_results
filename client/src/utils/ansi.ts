import AnsiToHtml from 'ansi-to-html'

const ansiConverter = new AnsiToHtml({
  fg: '#d4d4d4',
  bg: '#1e1e1e',
  escapeXML: true,
  colors: {
    0: '#2e3436',
    1: '#cc0000',
    2: '#4e9a06',
    3: '#c4a000',
    4: '#3465a4',
    5: '#75507b',
    6: '#06989a',
    7: '#d3d7cf',
  },
})

export const normalizeAnsiEscapes = (value: string) =>
  value
    .replace(/#x1B/g, '\x1B')
    .replace(/\\x1b/gi, '\x1B')
    .replace(/\\u001b/gi, '\x1B')
    .replace(/\\033/g, '\x1B')
    .replace(/␛/g, '\x1B')

export const renderAnsi = (value: string) => ansiConverter.toHtml(normalizeAnsiEscapes(value))
