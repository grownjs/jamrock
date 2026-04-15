import { GObject, Gio } from './deps.ts';

// =============
// Signal System
// =============

let trackingContext: Set<Set<(v: any) => void>> | null = null;

export interface Signal<T> {
  readonly value: T;
  subscribe(callback: (value: T) => void): () => void;
  peek(): T;
}

export interface Computed<T> {
  readonly value: T;
  subscribe(callback: () => void): () => void;
}

/**
 * Create a reactive signal with automatic dependency tracking
 * 
 * @param initial - Initial value
 * @returns Signal object with value, subscribe, and peek
 * 
 * @example
 * const count = signal(0);
 * count.value = 1;
 * count.subscribe(v => console.log(v));
 */
export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  const subscribers = new Set<(v: T) => void>();

  return {
    get value() { 
      if (trackingContext) {
        trackingContext.add(subscribers);
      }
      return value; 
    },
    set value(v: T) {
      if (value !== v) {
        value = v;
        subscribers.forEach(cb => cb(v));
      }
    },
    subscribe(callback: (v: T) => void) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    peek() { return value; }
  } as Signal<T>;
}

/**
 * Create a computed signal with automatic dependency tracking
 * 
 * @param fn - Computation function
 * @returns Computed signal
 * 
 * @example
 * const doubled = computed(() => count.value * 2);
 */
export function computed<T>(fn: () => T): Computed<T> {
  const deps = new Set<Set<(v: any) => void>>();
  const subscribers = new Set<() => void>();
  let cached: T;

  const compute = () => {
    const prevContext = trackingContext;
    trackingContext = deps;
    try {
      cached = fn();
    } finally {
      trackingContext = prevContext;
    }
    subscribers.forEach(cb => cb());
  };

  compute();

  deps.forEach(subscriberSet => {
    subscriberSet.add(compute);
  });

  return {
    get value() { 
      if (trackingContext) {
        trackingContext.add(subscribers);
      }
      return cached; 
    },
    subscribe(callback: () => void) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    }
  };
}

// =============
// GObject DSL
// =============

type PropertyType = 'int' | 'uint' | 'double' | 'string' | 'boolean' | 'object';

interface PropertyDef {
  type: PropertyType;
  default?: any;
  min?: number;
  max?: number;
  flags?: GObject.ParamFlags;
}

type PropertySchema = Record<string, PropertyDef | any>;

function inferType(value: any): PropertyType {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'int' : 'double';
  }
  if (typeof value === 'string') return 'string';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'object') return 'object';
  return 'string';
}

function getDefaultValue(type: PropertyType): any {
  switch (type) {
    case 'int':
    case 'uint':
    case 'double':
      return 0;
    case 'string':
      return '';
    case 'boolean':
      return false;
    case 'object':
      return null;
    default:
      return null;
  }
}

function createParamSpec(name: string, def: PropertyDef): GObject.ParamSpec {
  const nick = name.charAt(0).toUpperCase() + name.slice(1);
  const blurb = `${nick} property`;
  const flags = def.flags ?? GObject.ParamFlags.READWRITE;
  const defaultValue = def.default ?? getDefaultValue(def.type);

  switch (def.type) {
    case 'int':
      return GObject.ParamSpec.int(name, nick, blurb, flags,
        def.min ?? 0, def.max ?? 2147483647, defaultValue);
    case 'uint':
      return GObject.ParamSpec.uint(name, nick, blurb, flags,
        def.min ?? 0, def.max ?? 4294967295, defaultValue);
    case 'double':
      return GObject.ParamSpec.double(name, nick, blurb, flags,
        def.min ?? 0, def.max ?? Infinity, defaultValue);
    case 'string':
      return GObject.ParamSpec.string(name, nick, blurb, flags, defaultValue);
    case 'boolean':
      return GObject.ParamSpec.boolean(name, nick, blurb, flags, defaultValue);
    case 'object':
      return GObject.ParamSpec.object(name, nick, blurb, flags, GObject.Object.$gtype);
    default:
      throw new Error(`Unknown type: ${def.type}`);
  }
}

/**
 * Define a GObject class with a simple schema
 * 
 * @param name - Class name (must be unique)
 * @param schema - Property schema (key: default value or full definition)
 * @param methods - Optional methods to add to the class
 * @returns Registered GObject class
 * 
 * @example
 * // Simple: infer types from defaults
 * const Item = define('Item', {
 *   id: 0,
 *   name: '',
 *   price: 0.0,
 *   done: false,
 * });
 * 
 * // Full: explicit options
 * const Item = define('Item', {
 *   id: { type: 'int', min: 0 },
 *   name: { type: 'string', default: '' },
 *   price: { type: 'double', min: 0 },
 * });
 * 
 * // With methods
 * const Item = define('Item', { id: 0, name: '' }, {
 *   toString() { return `${this.name} (${this.id})`; }
 * });
 */
export function define(
  name: string,
  schema: PropertySchema,
  methods: Record<string, Function> = {}
): typeof GObject.Object {
  const properties: Record<string, GObject.ParamSpec> = {};
  const defaults: Record<string, any> = {};

  // Process schema
  for (const [key, value] of Object.entries(schema)) {
    let def: PropertyDef;

    if (typeof value === 'object' && value !== null && 'type' in value) {
      def = value as PropertyDef;
    } else {
      def = {
        type: inferType(value),
        default: value,
      };
    }

    properties[key] = createParamSpec(key, def);
    defaults[key] = def.default ?? getDefaultValue(def.type);
  }

  // Create class
  const Klass = class extends GObject.Object {
    constructor(props: Record<string, any> = {}) {
      super();
      Object.assign(this, defaults, props);
    }
  };

  // Add methods
  Object.assign(Klass.prototype, methods);

  // Register with GObject
  return GObject.registerClass({
    GTypeName: name,
    Properties: properties,
  }, Klass);
}

// =============
// Store Sync
// =============

interface SyncOptions {
  key?: string;
  create?: (data: any) => GObject.Object;
  update?: (item: GObject.Object, data: any) => void;
}

function syncByIndex(
  newData: any[],
  store: Gio.ListStore,
  Klass: typeof GObject.Object,
  create?: (data: any) => GObject.Object,
  update?: (item: GObject.Object, data: any) => void
): void {
  // Update or add items
  for (let i = 0; i < newData.length; i++) {
    const data = newData[i];
    const item = store.get_item(i);

    if (item) {
      if (update) {
        update(item, data);
      } else {
        Object.assign(item, data);
      }
    } else {
      const newItem = create ? create(data) : new Klass(data);
      store.append(newItem);
    }
  }

  // Remove extra
  while (store.get_n_items() > newData.length) {
    store.remove(store.get_n_items() - 1);
  }
}

function findItemIndex(store: Gio.ListStore, key: string, value: any): number {
  for (let i = 0; i < store.get_n_items(); i++) {
    const item = store.get_item(i);
    if (item && item[key] === value) {
      return i;
    }
  }
  return -1;
}

function syncByKey(
  newData: any[],
  store: Gio.ListStore,
  Klass: typeof GObject.Object,
  key: string,
  create?: (data: any) => GObject.Object,
  update?: (item: GObject.Object, data: any) => void
): void {
  const currentCount = store.get_n_items();

  // Build map of current items by key
  const currentMap = new Map<any, { item: GObject.Object; index: number }>();
  for (let i = 0; i < currentCount; i++) {
    const item = store.get_item(i);
    if (item) {
      currentMap.set(item[key], { item, index: i });
    }
  }

  // Track which items to keep
  const keepKeys = new Set<any>();

  // Update or add items
  for (let i = 0; i < newData.length; i++) {
    const data = newData[i];
    const keyValue = data[key];
    const existing = currentMap.get(keyValue);

    if (existing) {
      if (update) {
        update(existing.item, data);
      } else {
        Object.assign(existing.item, data);
      }
      keepKeys.add(keyValue);
    } else {
      const newItem = create ? create(data) : new Klass(data);
      store.append(newItem);
      keepKeys.add(keyValue);
    }
  }

  // Remove items not in new data
  for (const [keyValue] of currentMap) {
    if (!keepKeys.has(keyValue)) {
      const currentIndex = findItemIndex(store, key, keyValue);
      if (currentIndex >= 0) {
        store.remove(currentIndex);
      }
    }
  }
}

/**
 * Sync a signal to a Gio.ListStore with mutations
 * 
 * Items are mutated in place, never recreated.
 * This preserves widget state (scroll position, focus, etc.)
 * 
 * @param signal - Signal holding array data
 * @param store - Gio.ListStore to sync to
 * @param Klass - GObject class for new items
 * @param options - Sync options
 * 
 * @example
 * const todos = signal([{ id: 1, text: 'Learn GTK' }]);
 * const store = Gio.ListStore.new(TodoItem);
 * 
 * // Index-based (faster)
 * syncToStore(todos, store, TodoItem);
 * 
 * // Key-based (for reorderable lists)
 * syncToStore(todos, store, TodoItem, { key: 'id' });
 * 
 * // Custom update
 * syncToStore(todos, store, TodoItem, {
 *   update: (item, data) => {
 *     if (item.text !== data.text) item.text = data.text;
 *   }
 * });
 */
export function syncToStore(
  sig: Signal<any[]>,
  store: Gio.ListStore,
  Klass: typeof GObject.Object,
  options: SyncOptions = {}
): void {
  const { key, create, update } = options;

  function sync(newData: any[]) {
    if (key) {
      syncByKey(newData, store, Klass, key, create, update);
    } else {
      syncByIndex(newData, store, Klass, create, update);
    }
  }

  sync(sig.peek());
  sig.subscribe(sync);
}
