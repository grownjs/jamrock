import type { PluginBuild } from 'esbuild';

export type FetchSource = (url: string) => Promise<{ contents: string }>;

// Built-in support for esbuild.
export type EsbuildPlugin = {
  // The name of this plugin
  name: string;
  // The esbuild plugin setup
  setup: (build: PluginBuild) => void;
};

// Setup esbuild transformation.
export type EsbuildTransform = (deps: {
  fetchSource: FetchSource;
}) => EsbuildPlugin;

// The details needed to be processed by esbuild.
export type TemplateInfo = {
  // This belongs to a specific node
  ref: string;
  // Tracks the ref across children nodes
  root: string;
  // The source code as plain text
  content: string;
  // Filepath for the given soure code
  filepath: string;
  // Any dependency loaded by the code
  children: string[];
  // Generated from node references
  identifier: string;
  // Given attributes from node origin
  attributes: Record<string, string>;
};

export type TemplateImpl = {
  module: any;
};

export type TemplateCache = Map<string, TemplateImpl> | null;
