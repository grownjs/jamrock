import { computed, session } from '../lib/store.mjs';

export const currentInfo = computed(ctx => (ctx.session.user ? ctx.session.user.currentInfo : null));
export const isLogged = session('user.isLogged', value => (value && value.expirationDate > Date.now() ? true : null));
