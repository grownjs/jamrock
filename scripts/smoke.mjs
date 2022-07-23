import {
  Template, Markup, Render,
} from '../dist/main.mjs';

const styles = `
  h1 { color: red }
  h1:not(.x) { color: red }
`;

function compile(source, isAsync) {
  const chunk = Markup.block(source, 'test.html', isAsync);
  const css = Markup.scopify('foo', styles, chunk.markup.content);

  chunk.markup.content.unshift({
    type: 'element',
    name: 'style',
    elements: [{
      type: 'text',
      content: `\n${css}\n`,
    }],
  });
  chunk.build();

  // eslint-disable-next-line no-new-func
  new Function('', `this.render = ${chunk.code}`).call(chunk);
  return chunk;
}

const Tpl = compile(`
  <h1>It works.</h1>
  <h1 class="x">It works.</h1>
`);

if (typeof document === 'undefined') {
  console.log(Template.highlight(Markup.taggify(Render.renderSync(Tpl))));
} else {
  document.body.innerHTML = Template.highlight(Markup.taggify(Render.renderSync(Tpl)), true);
}
