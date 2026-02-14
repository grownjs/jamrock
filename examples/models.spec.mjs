/* eslint-disable max-len */

import { test } from '@japa/runner';

import { pb, connect, User } from './models.mjs';

test.group('pocketbase', t => {
  let email;
  let password;
  t.setup(async () => {
    email = `a+${Math.random()}@b.c`;
    password = Math.random().toString(36);

    await connect('yo@soypache.co', 'Password.123');
  });
  t.teardown(() => {
    pb.authStore.clear();
  });

  test('it should create users', async ({ expect }) => {
    const { user, pending } = await User.addUser({ email });

    expect(user.verified).toBeFalsy();
    expect(pending).toBeTruthy();

    const auth = await User.verifyAuth({ email, password });

    expect(auth).toBeNull();

    await User.update({ data: { password, passwordConfirm: password }, where: { email } });

    const next = await User.findOne({ where: { email } });

    expect(next.email).toEqual(email);
    expect(next.verified).toBeFalsy();
  });

  test('it should authenticate users', async ({ expect }) => {
    const auth = await User.verifyAuth({ email, password });

    expect(auth.record.verified).toBeFalsy();

    expect(pb.authStore.isValid).toBeTruthy();
    expect(pb.authStore.token).toEqual(auth.token);
    expect(pb.authStore.model.id).toEqual(auth.record.id);

    await User.delete({ where: { email } });
  });
});
