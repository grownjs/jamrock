/**
 * Widget tree utilities — diff, flatten, path lookup
 */

/**
 * Flatten a tree node into an array with depth info.
 * @param {object} node - serialized widget node
 * @param {number} depth
 * @returns {Array<{node, depth, path}>}
 */
export function flattenTree(node, depth = 0, path = []) {
  if (!node) return [];
  const entry = { node, depth, path: [...path, node.name || node.type] };
  const children = (node.children ?? []).flatMap(
    (child, i) => flattenTree(child, depth + 1, [...entry.path])
  );
  return [entry, ...children];
}

/**
 * Find a node by name in a tree.
 */
export function findInTree(root, name) {
  if (!root) return null;
  if (root.name === name) return root;
  for (const child of root.children ?? []) {
    const found = findInTree(child, name);
    if (found) return found;
  }
  return null;
}

/**
 * Structural diff — returns list of changes between two trees.
 * @returns {{ added: string[], removed: string[], changed: string[] }}
 */
export function diffTree(prev, next) {
  const prevNames = new Set(flattenTree(prev).map(e => e.path.join('/')));
  const nextNames = new Set(flattenTree(next).map(e => e.path.join('/')));

  const added = [...nextNames].filter(n => !prevNames.has(n));
  const removed = [...prevNames].filter(n => !nextNames.has(n));

  return { added, removed };
}

/**
 * Format tree as a readable string.
 */
export function formatTree(node, depth = 0) {
  if (!node) return '';
  const indent = '  '.repeat(depth);
  const name = node.name ? `${node.name} ` : '';
  const pos = node.x !== null ? ` @${node.x},${node.y} ${node.width}x${node.height}` : '';
  const vis = node.visible === false ? ' [hidden]' : '';
  const sens = node.sensitive === false ? ' [disabled]' : '';
  const lines = [`${indent}${name}(${node.type})${pos}${vis}${sens}`];

  for (const child of node.children ?? []) {
    lines.push(formatTree(child, depth + 1));
  }
  return lines.join('\n');
}
