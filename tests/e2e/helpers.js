import { t } from 'testcafe';
import { $ } from './selectors';

export function form(tag) {
  const $form = $(tag);
  const stack = [];

  $form.ok = async () => {
    for (const fn of stack) await fn();
  };

  $form.fill = fields => {
    Object.entries(fields).forEach(([key, value]) => {
      stack.push(async () => {
        const elem = $(`${tag}.elements.${key}`);

        if (typeof value === 'boolean') {
          const checked = await elem.checked;

          if (value && !checked) await t.click();
          if (!value && checked) await t.click();
        } else {
          await t.typeText(elem, value, { replace: true });
        }
      });
    });
    return $form;
  };

  $form.check = fields => {
    Object.entries(fields).forEach(([key, assert]) => {
      stack.push(async () => {
        const elem = $(`${tag}.failures.${key}`);

        if (assert instanceof RegExp) {
          await t.expect(elem.textContent).match(assert);
        } else if (typeof assert === 'number') {
          await t.expect(elem.count).eql(assert);
        } else if (typeof assert === 'string') {
          await t.expect(elem.textContent).contains(assert);
        } else {
          await t.expect(elem.exists)[!assert ? 'ok' : 'notOk']();
        }
      });
    });
    return $form;
  };

  $form.submit = () => {
    stack.push(async () => {
      await t.click($(`${tag}.container`).find('button[type=submit]'));
    });
    return $form;
  };

  $form.failures = length => {
    stack.push(async () => {
      await t.expect($(`${tag}.failure`).count).eql(length);
    });
    return $form;
  };

  return $form;
}
