import { Expr } from './expr.ts';
import { Is, repeat } from '../utils/server.ts';

let widgetCounter = 0;
const widgetIds = new Map<string, string>();
const subscriptions: string[] = [];

function getWidgetId(name: string): string {
  if (!widgetIds.has(name)) {
    widgetIds.set(name, `${name}_${widgetCounter++}`);
  }
  return widgetIds.get(name)!;
}

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function extractSignals(content: string): string[] {
  const signals: string[] = [];
  const regex = /\{\$(\w+)\}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    signals.push(match[1]);
  }
  return signals;
}

function replaceSignalsWithValue(content: string): string {
  return content.replace(/\{\$(\w+)\}/g, "' + $1.value + '");
}

function extractTextContent(node: any): { text: string; signals: string[] } {
  if (!node.elements) return { text: '', signals: [] };
  
  const texts: string[] = [];
  const allSignals: string[] = [];
  
  for (const child of node.elements) {
    if (child.type === 'text') {
      const signals = extractSignals(child.content);
      allSignals.push(...signals);
      texts.push(child.content);
    } else if (child.type === 'code' && child.content) {
      const code = child.content.toString();
      const signals = extractSignals(code);
      allSignals.push(...signals);
      texts.push(code.replace(/\{\$(\w+)\}/g, "' + $1.value + '"));
    }
  }
  
  return { text: texts.join('').trim(), signals: allSignals };
}

export function reduceGTK(tree: any, context: any, indent: number = 0): string {
  if (Is.arr(tree)) {
    return reduceGTK({ elements: tree }, context, indent);
  }

  const _tabs = repeat('\t', indent + 1);
  const result = tree.elements.reduce((memo: string[], node: any) => {
    if (['element', 'fragment'].includes(node.type)) {
      const name = node.name;
      const widgetId = getWidgetId(name);
      const { text, signals } = extractTextContent(node);
      const hasSignals = signals.length > 0;
      
      const children = node.elements && node.type !== 'fragment'
        ? reduceGTK(node, context, indent + 1)
        : '';
      
      const props = node.attributes ? Expr.props(node.attributes, `${_tabs}\t`) : '';
      const prefix = node.offset
        ? `\n/*!#${node.offset.start.line + 1}:${node.offset.start.column + 1}*/`
        : '';

      if (node.type === 'fragment') {
        memo.push(`${_tabs}${prefix} /* fragment */ [${children}]`);
      } else if (Is.upper(name)) {
        memo.push(`${_tabs}${prefix} ${name}.createWidget({ ${props} })`);
      } else {
        const childArray = children ? `[${children}]` : '[]';
        const propsStr = props ? `{ ${props}, name: '${widgetId}' }` : `{ name: '${widgetId}' }`;
        
        if (['vstack', 'hstack', 'box'].includes(name)) {
          memo.push(`${_tabs}${prefix} ${name}(${childArray}, ${propsStr})`);
        } else if (name === 'button') {
          const btnText = hasSignals ? `'${replaceSignalsWithValue(text)}'` : `'${escapeText(text || 'Button')}'`;
          memo.push(`${_tabs}${prefix} button(${btnText}, ${propsStr})`);
          
          if (hasSignals) {
            for (const sig of signals) {
              subscriptions.push(`${sig}.subscribe(v => self.${widgetId}.set_label('${text.replace(/\{\$(\w+)\}/g, "' + v + '")}'));`);
            }
          }
        } else if (name === 'label') {
          const labelText = hasSignals ? `'${replaceSignalsWithValue(text)}'` : `'${escapeText(text || '')}'`;
          memo.push(`${_tabs}${prefix} label(${labelText}, ${propsStr})`);
          
          if (hasSignals) {
            for (const sig of signals) {
              subscriptions.push(`${sig}.subscribe(v => self.${widgetId}.set_label('${text.replace(/\{\$(\w+)\}/g, "' + v + '")}'));`);
            }
          }
        } else if (name === 'entry') {
          const placeholder = node.attributes?.placeholder || '';
          memo.push(`${_tabs}${prefix} entry('${placeholder}', ${propsStr})`);
        } else if (name === 'toggle') {
          memo.push(`${_tabs}${prefix} toggle(${propsStr})`);
        } else if (name === 'check') {
          memo.push(`${_tabs}${prefix} check(${propsStr})`);
        } else if (name === 'listview') {
          memo.push(`${_tabs}${prefix} listview(${propsStr})`);
        } else if (name === 'scroll') {
          memo.push(`${_tabs}${prefix} scroll(${childArray}, ${propsStr})`);
        } else if (name === 'stack') {
          memo.push(`${_tabs}${prefix} stack(${childArray}, ${propsStr})`);
        } else if (name === 'overlay') {
          memo.push(`${_tabs}${prefix} overlay(${childArray}, ${propsStr})`);
        } else if (name === 'paned') {
          memo.push(`${_tabs}${prefix} paned(${childArray}, ${propsStr})`);
        } else if (name === 'expander') {
          memo.push(`${_tabs}${prefix} expander(${childArray}, ${propsStr})`);
        } else if (name === 'revealer') {
          memo.push(`${_tabs}${prefix} revealer(${childArray}, ${propsStr})`);
        } else if (name === 'frame') {
          memo.push(`${_tabs}${prefix} frame(${childArray}, ${propsStr})`);
        } else if (name === 'progress') {
          memo.push(`${_tabs}${prefix} progress(${propsStr})`);
        } else if (name === 'level') {
          memo.push(`${_tabs}${prefix} level(${propsStr})`);
        } else if (name === 'spinner') {
          memo.push(`${_tabs}${prefix} spinner(${propsStr})`);
        } else if (name === 'image') {
          memo.push(`${_tabs}${prefix} image(${propsStr})`);
        } else if (name === 'dropdown') {
          memo.push(`${_tabs}${prefix} dropdown(${propsStr})`);
        } else if (name === 'calendar') {
          memo.push(`${_tabs}${prefix} calendar(${propsStr})`);
        } else {
          memo.push(`${_tabs}${prefix} widget('${name}', ${propsStr}, ${childArray})`);
        }
      }
    } else if (node.type === 'text') {
      if (node.content.trim().length > 0) {
        const signals = extractSignals(node.content);
        if (signals.length > 0) {
          const widgetId = getWidgetId('label');
          const text = `'${replaceSignalsWithValue(node.content)}'`;
          memo.push(`${_tabs}label(${text}, { name: '${widgetId}' })`);
          for (const sig of signals) {
            subscriptions.push(`${sig}.subscribe(v => self.${widgetId}.set_label('${node.content.replace(/\{\$(\w+)\}/g, "' + v + '")}'));`);
          }
        } else {
          memo.push(`${_tabs}label('${escapeText(node.content)}')`);
        }
      }
    } else if (node.type === 'code') {
      memo.push(node.content.wrap(_tabs));
    } else if (node instanceof Expr) {
      memo.push(node.wrap(_tabs));
    }
    return memo;
  }, []).join(',\n');

  return result;
}

export function getSubscriptions(): string[] {
  return subscriptions;
}

export function resetGTKCompiler(): void {
  widgetCounter = 0;
  widgetIds.clear();
  subscriptions.length = 0;
}
