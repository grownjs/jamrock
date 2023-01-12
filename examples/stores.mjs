import { connect, session } from '../lib/store.mjs';

export const currentInfo = connect(ctx => (ctx.session.user ? ctx.session.user.currentInfo : null));
export const isLogged = session('user.isLogged', value => (value && value.expirationDate > Date.now() ? true : null));
