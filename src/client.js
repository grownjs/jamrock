import {
  onError, useRef, useMemo, useState, useEffect,
} from 'somedom';

import './client/events.mjs';

import { Browser } from './client/browser.mjs';
import { Fragment } from './client/fragment.mjs';
import { LiveSocket } from './client/livesocket.mjs';
import { registerComponent } from './client/component.mjs';

const VERSION = process.env.VERSION;

Browser._ = Object.freeze({
  onError,
  useRef,
  useMemo,
  useState,
  useEffect,
  registerComponent,
});

window.Jamrock = {
  components: Object.create(null),
  LiveSocket,
  Fragment,
  Browser,
  VERSION,
};

function main() {
  const { href } = location;
  const url = href.replace(/[&?]noscript(?:=[^&?=]*?)?/, '');

  if (url !== href) {
    location.href = url;
  } else if (window.req_uuid) {
    Browser.init(LiveSocket.getInstance().ws);
  }
}

if (['complete', 'loaded', 'interactive'].includes(document.readyState)) {
  main();
} else {
  document.addEventListener('DOMContentLoaded', () => main());
}
