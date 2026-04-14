export default {
  inspect: obj => String(obj),
  format: (fmt, ...args) => fmt.replace(/%[sdj]/g, () => args.shift()),
  inherits: (ctor, superCtor) => {
    ctor.super_ = superCtor;
    Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
  },
  isDate: d => d instanceof Date,
  isError: e => e instanceof Error,
  types: {},
  TextEncoder,
  TextDecoder,
};
