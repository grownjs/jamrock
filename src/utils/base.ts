const RE_FIXED_NAMES = /^[a-zA-Z][\w:-]*$/;

export class Is {
  static num(value: unknown): value is number {
    return typeof value === 'number';
  }

  static tag(value: unknown): boolean {
    return Is.str(value) && RE_FIXED_NAMES.test(value);
  }

  static data(value: unknown): boolean {
    return Is.arr(value) || Is.plain(value) || Is.scalar(value);
  }

  static value(value: unknown): boolean {
    if (value === null) return true;
    if (value instanceof Date) return true;
    if (value instanceof Symbol) return true;
    if (value instanceof RegExp) return true;
    if (value instanceof String) return true;
    if (value instanceof Number) return true;
    if (value instanceof Boolean) return true;
    return Is.scalar(value);
  }

  static vnode(value: unknown): boolean {
    return Is.arr(value) && Is.tag(value[0]) && Is.plain(value[1]);
  }

  static empty(value: unknown): boolean {
    if (Is.arr(value)) return value.every(Is.empty);
    if (Is.not(value)) return true;
    return Is.str(value) && value.trim() === '';
  }

  static iterable(value: unknown): boolean | undefined {
    if (Object.isFrozen(value)) return;
    return typeof value === 'object' && (
      Is.func(value[Symbol.iterator])
      || Object.prototype.toString.call(value) === '[object AsyncGenerator]'
    );
  }

  // These are added dynamically by utils/server.mjs and utils/client.mjs
  static str: (value: unknown) => value is string;
  static arr: (value: unknown) => value is any[];
  static not: (value: unknown) => boolean;
  static func: (value: unknown) => value is Function;
  static plain: (value: unknown) => value is Record<string, unknown>;
  static scalar: (value: unknown) => boolean;
}
