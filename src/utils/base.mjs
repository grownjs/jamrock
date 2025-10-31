const RE_FIXED_NAMES = /^[a-zA-Z][\w:-]*$/;

export class Is {
  static num(value) {
    return typeof value === 'number';
  }

  static tag(value) {
    return Is.str(value) && RE_FIXED_NAMES.test(value);
  }

  static data(value) {
    return Is.arr(value) || Is.plain(value) || Is.scalar(value);
  }

  static value(value) {
    if (value === null) return true;
    if (value instanceof Date) return true;
    if (value instanceof Symbol) return true;
    if (value instanceof RegExp) return true;
    if (value instanceof String) return true;
    if (value instanceof Number) return true;
    if (value instanceof Boolean) return true;
    return Is.scalar(value);
  }

  static vnode(value) {
    return Is.arr(value) && Is.tag(value[0]) && Is.plain(value[1]);
  }

  static empty(value) {
    if (Is.arr(value)) return value.every(Is.empty);
    if (Is.not(value)) return true;
    return Is.str(value) && value.trim() === '';
  }

  static iterable(value) {
    if (Object.isFrozen(value)) return;
    return typeof value === 'object' && (
      Is.func(value[Symbol.iterator])
      || Object.prototype.toString.call(value) === '[object AsyncGenerator]'
    );
  }
}
