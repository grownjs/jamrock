export default {
  'gray': s => "\u001b[90m" + s + "\u001b[39m",
  'green': s => "\u001b[32m" + s + "\u001b[39m",
  'cyan': s => "\u001b[36m" + s + "\u001b[39m",
  'blue': s => "\u001b[34m" + s + "\u001b[39m",
  'yellow': s => "\u001b[33m" + s + "\u001b[39m",
  'magenta': s => "\u001b[35m" + s + "\u001b[39m",
  'red': s => "\u001b[31m" + s + "\u001b[39m",
  'italic': s => "\u001b[3m" + s + "\u001b[23m",
  'bold': s => "\u001b[1m" + s + "\u001b[22m",
  'inverse': s => "\u001b[7m" + s + "\u001b[27m",
};