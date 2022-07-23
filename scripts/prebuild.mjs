import { writeFileSync } from 'fs';
import chalk from 'chalk';

const _chalk = [
  'gray', 'green', 'cyan', 'blue', 'yellow', 'magenta', 'red', 'italic', 'bold', 'inverse',
];

let colors = '';
_chalk.forEach(k => {
  colors += `  '${k}': s => ${
    JSON.stringify(chalk[k]('%').split('%')[0])
  } + s + ${
    JSON.stringify(chalk[k]('%').split('%')[1])
  },\n`;
});

writeFileSync('src/chalk.mjs', `export default {\n${colors}};`);
