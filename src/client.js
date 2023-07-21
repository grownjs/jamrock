export const generateClientCode = (state, immediate) => {
  function main() {
    const { href } = location;
    const url = href.replace(/[&?]noscript(?:=[^&?=]*?)?/, '');

    if (url !== href) {
      location.href = url;
    } else if (typeof window.Jamrock === 'undefined') {
      Promise.all([
        import('./client/browser.mjs'),
        import('./client/components.mjs'),
      ]).then(([{ Browser }, { Components }]) => Browser.init(Components, process.env.VERSION, state, () => null));
    } else {
      window.Jamrock.Browser.csrf_token = state.csrf;
    }
  }

  if (immediate || ['complete', 'loaded', 'interactive'].includes(document.readyState)) {
    main();
  } else {
    document.addEventListener('DOMContentLoaded', () => main());
  }
};
