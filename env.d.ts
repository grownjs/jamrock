import type { HttpMethod, RequestConnection } from './server.d.ts';

export interface RouteInfo {
  handler: string[];
  path: string;
  verb: HttpMethod;
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
  mount: (result: Component, opts?: any) => Promise<HTMLDocumentElement>,
  locate: (filepath: string) => any,
  lookup: (path: string) => Component,
  cache: any;
  pages: Set;
  routes: RouteInfo[];
  context: any;
  version: string;
  options: Record<string, any>;
  files: Record<string, any>;
  assets: string[];
  build: (reload: boolean) => Promise<void>;
  request: (params: any) => RequestConnection;
};

// FIXME: accommodate the test.mjs api here?
export type TestStack = {
  (label: string, body?: Function): void;
  group: (label: string, body?: Function) => void;
};

export type Env<T> = {
  env: Environment;
  test: TestStack;
  routes: T;
};

export type Options = {
  src: string;
  dest: string;
  uws: boolean;
  port: number;
  host: string;
  redis: boolean;
  watch: boolean;
  unocss: boolean;
};

export type CSSChunk = string | string[];

export type Component = {
  __routes: any;
  __snippets: any;
  __fragments: any;
  __scripts: any;
  __styles: any;
  __media: string[];
  __context: string;
  __doctype: any;
  __metadata: any;
  __attributes: any;
  __template: any;
  __src: string;
  __dest: string;
};
