module.exports = {
  as: 'logout_path',
  use: ['auth'],
  DELETE(ctx) {
    ctx.delete_session(['auth', 'user']);
    ctx.put_flash('success', 'Your session has been closed!');
    ctx.redirect(ctx.routes.login_page());
  },
};
