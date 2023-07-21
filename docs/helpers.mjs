import { readFileSync } from 'fs';

const __dirname = import.meta.dirname;

export function makeTree(prefix, entry) {
  const result = [];
  const level = { result };

  entry.forEach(node => {
    const key = node.relative
      .replace(/(package)\.txt/, '$1.json')
      .replace(node.basepath, '')
      .replace(prefix, '')
      .substr(1);

    key.split('/').reduce((r, name) => {
      const top_name = [r.parent, r.name].filter(Boolean).join('/') || undefined;

      if (name.includes('.')) {
        r.result.push({ name, parent: top_name, contents: readFileSync(node.filepath) });
      } else if(!r[name]) {
        r[name] = { name, parent: top_name, result: [] };
        r.result.push({ name, children: r[name].result })
      }
      return r[name];
    }, level);
  });

  return result;
}
