/* eslint-disable max-len */

import { test } from '@japa/runner';

import { fixture, build } from './helpers/utils.mjs';

// eslint-disable-next-line no-unused-expressions
fixture/* javascript */`./sandbox/ui-context.js
  export default {}
`;

// eslint-disable-next-line no-unused-expressions
fixture/* html */`./sandbox/gtk-test.html
  <script>
    import { self, log, env } from 'jamrock:gjs';
    import { ctx } from './sandbox/ui-context.js';

    import MyTrackList from './components/my-track-list.html';

    function playTrack() {}
    function onPrev() {}
    function onNext() {}
    function playBack() {}
    function playNext() {}
    function onAlert() {}
    function onStop() {}
    function goBack() {}
    function goNext() {}
    function onPlay() {}
    function env(){}

    let my_tracklist;
    function onAction(action) {
      if (action === 'prev') goBack();
      if (action === 'next') goNext();
    }
    function onChange(type, selection) {
      if (type === 'activated') {
        ctx.tap(() => onPlay(selection), 420);
      }
      if (type === 'toggled') {
        ctx.togglePlaylist(selection);
      }
      if (type === 'selected') {
        ctx.selectedTrackOffset = my_tracklist.get_model().get_selected();
      }
    }
  </script>

  <MyTrackList {onAction} {onChange} bind:my_tracklist />

  <vstack className="m-2">
      <hstack className="sp-8">
          <hstack className="sp-2 hx">
              <button class="btn icon hx" onclick="{() => ctx.tap(() => playTrack(ctx.selectedTrackOffset))}">▶ PLAY</button>
              <button class="btn icon" onclick="{() => ctx.tap(() => onPrev())}">▲</button>
              <button class="btn icon" onclick="{() => ctx.tap(() => onNext())}">▼</button>
          </hstack>
          <hstack class="sp-2 hx">
              <button class="btn icon xs hx" onclick="{() => ctx.tap(() => playBack(), 333)}">⏮</button>
                  <button class="btn icon xs hx" onclick="{() => ctx.tap(() => playNext(), 333)}">⏭</button>
          </hstack>
          <hstack class="sp-2 hx">
              <button class="btn icon xs hx" onclick="{() => onStop(ctx.lastPlayingOffset)}">⏹</button>
              <push class="psh btn icon xs hx" ontoggle={onAlert} disabled>⏺</push>
          </hstack>
      </hstack>
      <hstack class="mx-2 mb-1">
          <label class="lbl ha-start hx">{env('OS_NAME')}</label>
          <label class="lbl" name="status_label" />
      </hstack>
  </vstack>
`;

test.group('gtk4 integration', () => {
  test.skip('compiler', async () => {
    const tpl = await build('./sandbox/gtk-test.html', { raw: true });
    process.env.IS_GTK4_TARGET = 1;
    // const { html } = await tpl.render();
    console.log(tpl.partial.toString());
  });
});
