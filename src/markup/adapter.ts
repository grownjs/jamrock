import { markupAdapter } from '../utils/server.ts';
import { Expr } from './expr.ts';

function isTag(node: any): boolean {
  return node && (node.type === 'element' || node.type === 'fragment');
}

function getAttributeValue(this: any, node: any, name: string): string | undefined {
  if (!this.isTag(node)) return;

  let value;
  if (node.attributes[name] instanceof Expr) {
    value = node.attributes[name].toString();
  } else {
    value = node.attributes[name];
  }

  if (name === 'class') {
    return Object.keys(node.attributes)
      .filter((x: string) => x.includes('class:'))
      .map((x: string) => x.replace('class:', ''))
      .concat(value)
      .join(' ');
  }
}

function getName(node: any): string {
  return node.name;
}

function getChildren(node: any): any[] {
  return node ? node.elements : [];
}

function getParent(node: any): any {
  return node ? node.root : null;
}

function getText(node: any): string {
  return node.text;
}

export const fixedAdapter: any = {
  ...markupAdapter, isTag, getAttributeValue, getName, getChildren, getParent, getText,
};
