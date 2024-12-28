export const generateClientCode = (state, headless) => {
  function main() {
    const { href } = location;
    const url = href.replace(/[&?]noscript(?:=[^&?=]*?)?/, '');

    if (url !== href) {
      location.href = url;
    } else if (typeof window.Jamrock === 'undefined') {
      Promise.all([
        import('./client/browser.mjs'),
        import('./client/components.mjs'),
      ]).then(([{ Browser }, { Components }]) => Browser.init(Components, headless, process.env.VERSION, state, this));
    } else {
      window.Jamrock.Browser.csrf_token = state.csrf;
    }
  }

  if (['complete', 'loaded', 'interactive'].includes(document.readyState)) {
    main();
  } else {
    document.addEventListener('DOMContentLoaded', () => main());
  }
};
