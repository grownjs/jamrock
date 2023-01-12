import { markupAdapter } from '../utils/server.mjs';
import { Expr } from './expr.mjs';

function isTag(node) {
  return node && (node.type === 'element' || node.type === 'fragment');
}

function getAttributeValue(node, name) {
  if (!this.isTag(node)) return;

  let value;
  if (node.attributes[name] instanceof Expr) {
    value = node.attributes[name].toString();
  } else {
    value = node.attributes[name];
  }

  if (name === 'class') {
    return Object.keys(node.attributes)
      .filter(x => x.includes('class:'))
      .map(x => x.replace('class:', ''))
      .concat(value)
      .join(' ');
  }
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
