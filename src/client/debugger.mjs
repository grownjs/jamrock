// export const ERROR_STACK = [];

// export const COLORS = {
//   log: 'gray',
//   info: 'green',
//   warn: 'orange',
//   error: 'red',
//   debug: 'black',
// };

// export function log(data) {
//   if (data.length) {
//     console.group(`[LOGS] ${new Date()}`);
//     data.forEach(info => {
//       console[info.lvl](`%c${info.now} · ${info.src}`,
//         `background-color:${COLORS[info.lvl]};color:#fff;font-weight:bold;padding:4px`);
//       console[info.lvl](...JSON.parse(info.msg, (k, v) => {
//         if (typeof v === 'string') {
//           const matches = v.match(/<!#\(\[object (.+?)\]\)>/);
//           if (matches) return window[matches[1]];
//         }
//         return v;
//       }));
//     });
//     console.groupEnd();
//   }
// }

// export function warn(e, title) {
//   let label = '';
//   if (e.status) title = `Error ${e.status}`;
//   if (title) label = ['h3', { style: 'margin:0' }, title];

//   const msg = ((e.status && e.result) || e.stack || e.message).trim()
//     .split(Browser.src).join('jamrock.js')
//     .split(location.origin).join('/')
//     .replace(/\w*Error: /, '');

//   function onclick() {
//     ERROR_STACK.pop().remove();
//   }

//   const offset = `${ERROR_STACK.length * 5}px`;

//   const css = {
//     overflow: 'auto',
//     border: '1px dashed red',
//     padding: '.5em',
//     marginBottom: '.5em',
//     lineHeight: 1,
//   };

//   const btn = {
//     padding: '.5em',
//     border: '2px solid black',
//     backgroundColor: 'inherit',
//   };

//   const err = {
//     top: '10%',
//     left: '0',
//     right: '0',
//     width: '87%',
//     padding: '.5em',
//     position: 'fixed',
//     color: 'black',
//     margin: 'auto',
//     overflow: 'auto',
//     maxWidth: '960px',
//     border: '2px solid black',
//     backgroundColor: 'white',
//     transform: `translate3d(${offset}, ${offset}, 0)`,
//   };

//   const ERROR_TAG = $(['div', { style: err },
//     label,
//     ['div', { contenteditable: true, style: css, '@html': msg }],
//     ['button', { style: btn, onclick }, 'Close'],
//   ]);

//   ERROR_STACK.push(ERROR_TAG);

//   mount(document.body, ERROR_TAG);
// }

export function showDebug(e, msg) {
  console.debug(e, msg);
}
