export interface RouteInfo {
  handler: string[];
  path: string;
  verb: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  as: string;
}

export interface Route extends RouteInfo {
  /**
  Renders URL from its template, e.g. `/:foo` will render `/42` if `{ foo: 42 }` is given.
  @param args List of values to render in the URL template, can be scalars or objects
  */
  url(params?: any): string;
  url<T>(params?: T): string;
}

/**
SOME INFO
*/
export interface RouteMap {
  /**
  FIXME MAP
  @param path Named route to render from, e.g. `foo.bar`
  @param args List of values to render in the URL template, can be scalars or objects
  */
  (path: string, params?: any): string;
  <T>(path: string, params?: T): string;
}

export type PathParam = string | number | string[] | number[];

export type PartialRecord<K extends keyof any, T> = { [P in K]?: T; };

export type ExtractParam<Path, NextPart> = Path extends `*${infer Param}`
  ? PartialRecord<Param, PathParam> & NextPart
  : Path extends `:${infer Param}`
    ? Record<Param, PathParam> & NextPart
    : NextPart;

export type RouteParams<Path> = Path extends `${infer Segment}/${infer Rest}`
  ? ExtractParam<Segment, RouteParams<Rest>>
    : Path extends `${infer Segment}.${infer Rest}`
      ? ExtractParam<Segment, RouteParams<Rest>>
      : Path extends `${infer Segment}-${infer Rest}`
        ? ExtractParam<Segment, RouteParams<Rest>>
        : Path extends `${infer Segment}+${infer Rest}`
          ? ExtractParam<Segment, RouteParams<Rest>>
          : ExtractParam<Path, {}>

export type NestedRoute<Path, T> = Path extends `${infer Segment}.${infer Rest}`
  ? Record<Segment, NestedRoute<Rest, T>>
  : Record<Path & string, T>;

export type HTMLDocumentElement = {
  querySelectorAll: HTMLDocumentElement[];
  querySelector: HTMLDocumentElement;
  innerHTML: string;
  outerHTML: string;
};

export type Environment = {
  mount: (result: Page | Component, opts?: Params) => Promise<HTMLDocumentElement>,
  locate: () => void,
  lookup: (path: string) => Component,
  resolve: (page: Component) => Promise<Page>,
};

export type TestGroup = {
  (label: string, body?: Function): Promise<void>;
  group: (label: string, body?: Function) => Promise<void>;
};

export type Env<T> = {
  env: Environment;
  test: TestGroup;
  routes: T;
};

export type Options = {
  src?: string;
  dest?: string;
  uws?: boolean;
  port?: number;
  host?: string;
  redis?: boolean;
  watch?: boolean;
  unocss?: boolean;
  fswatch?: boolean;
};

export type CSSChunk = string | string[];

export type Component = {
  src: string,
  props: Record<string, any>;
  render: Function;
  resolve: Function;
  stylesheet: CSSChunk[],
};

export type Match = {
  verb: 'GET' | 'PUT' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
};

export type Page = {
  as: string;
  src: string;
  opts: {
    use?: string[],
  },
  routes: Match[],
  context: 'module' | 'static' | 'client',
  exported: string[],
  functions: string[],
};

export type Value = true | false | null | string | Date | RegExp | VNode;
export type Tuple = [string, any];
export type Props = Record<string, any> | Tuple[];
export type Children = Value[];
export type VNode = [string, Props, Children] | Children;

export type Params = {
  props: Record<string, any>,
  slots: {
    default: Children,
    before: Children,
    after: Children,
  },
};
