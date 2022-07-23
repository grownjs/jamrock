import { markupAdapter } from 'somedom/ssr';

import { isArray } from '../utils.mjs';
import { Expr } from './expr.mjs';

function isTag(node) {
  return node && node.type === 'element';
}

function getAttributeValue(node, name) {
  if (!this.isTag(node)) return;
  if (node.attributes[name] instanceof Expr) {
    return node.attributes[name].raw.length > 0
      ? node.attributes[name].raw.join('')
      : undefined;
  }
  if (isArray(node.attributes[name])) {
    return node.attributes[name]
      .filter(x => x.type === 'text')
      .map(x => x.content)
      .join('');
  }
  return node.attributes[name];
}

function getName(node) {
  return node.name;
}

function getChildren(node) {
  return node ? node.elements : [];
}

function getParent(node) {
  return node ? node.root : null;
}

function getText(node) {
  return node.text;
}

export const fixedAdapter = {
  ...markupAdapter, isTag, getAttributeValue, getName, getChildren, getParent, getText,
};
