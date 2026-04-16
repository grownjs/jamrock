/**
 * Source map generation for Jamrock .generated.mjs files.
 *
 * Strategy: post-process the already-written .generated.mjs, parse the
 * embedded /*!#line:col*\/ markers, and produce a standard v3 source map.
 * No compiler changes needed — markers are already emitted by Expr.
 *
 * Output: a .generated.mjs.map sidecar + appends
 *   //# sourceMappingURL=./foo.generated.mjs.map
 * to the generated file.
 */

// ---------------------------------------------------------------------------
// VLQ encoding (Source Map v3 spec)
// ---------------------------------------------------------------------------

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function encodeVLQ(value: number): string {
  // Convert to sign-magnitude: negative → 2*abs+1, positive → 2*abs
  let vlq = value < 0 ? ((-value) << 1) | 1 : value << 1;
  let result = '';
  do {
    const digit = vlq & 0b11111;
    vlq >>>= 5;
    result += BASE64[digit | (vlq ? 0b100000 : 0)];
  } while (vlq);
  return result;
}

function encodeSegment(
  genColDelta: number,
  srcIdxDelta: number,
  srcLineDelta: number,
  srcColDelta: number,
): string {
  return encodeVLQ(genColDelta)
    + encodeVLQ(srcIdxDelta)
    + encodeVLQ(srcLineDelta)
    + encodeVLQ(srcColDelta);
}

// ---------------------------------------------------------------------------
// Marker regex — matches /*!#line:col*/ (with optional whitespace)
// ---------------------------------------------------------------------------

const RE_MARKER = /\/\*!#(\d+):(\d+)\*\//g;

// ---------------------------------------------------------------------------
// Main: generate source map from generated.mjs content
// ---------------------------------------------------------------------------

export interface SourceMapV3 {
  version: 3;
  file: string;
  sources: string[];
  sourcesContent: (string | null)[];
  names: string[];
  mappings: string;
}

export function generateSourceMap(
  generatedContent: string,
  generatedFile: string,  // e.g. 'generated/components/foo.generated.mjs'
  sourceFile: string,     // e.g. 'generated/components/foo.html'
  sourceContent: string,  // original .html file content
): SourceMapV3 {
  const lines = generatedContent.split('\n');
  const mappingLines: string[] = [];

  // Track deltas for VLQ (all values are relative to previous)
  let prevSrcLine = 0;
  let prevSrcCol = 0;
  let prevGenCol = 0;

  for (let genLine = 0; genLine < lines.length; genLine++) {
    const line = lines[genLine];
    const segments: string[] = [];
    prevGenCol = 0; // reset per line

    let match: RegExpExecArray | null;
    RE_MARKER.lastIndex = 0;

    while ((match = RE_MARKER.exec(line)) !== null) {
      const srcLine = parseInt(match[1], 10) - 1; // 0-indexed
      const srcCol = parseInt(match[2], 10) - 1;  // 0-indexed
      const genCol = match.index;

      segments.push(encodeSegment(
        genCol - prevGenCol,
        0, // always source index 0 (single source)
        srcLine - prevSrcLine,
        srcCol - prevSrcCol,
      ));

      prevGenCol = genCol;
      prevSrcLine = srcLine;
      prevSrcCol = srcCol;
    }

    mappingLines.push(segments.join(','));
  }

  return {
    version: 3,
    file: generatedFile,
    sources: [sourceFile],
    sourcesContent: [sourceContent],
    names: [],
    mappings: mappingLines.join(';'),
  };
}

// ---------------------------------------------------------------------------
// Write source map sidecar and append sourceMappingURL to generated file
// ---------------------------------------------------------------------------

const SOURCE_MAP_COMMENT = '\n//# sourceMappingURL=';

export function attachSourceMap(
  generatedContent: string,
  generatedFile: string,
  sourceFile: string,
  sourceContent: string,
  write: (path: string, content: string) => void,
): string {
  // Don't double-attach
  if (generatedContent.includes(SOURCE_MAP_COMMENT)) return generatedContent;

  const map = generateSourceMap(generatedContent, generatedFile, sourceFile, sourceContent);
  const mapFile = `${generatedFile}.map`;
  const mapFileName = mapFile.split('/').pop()!;

  write(mapFile, JSON.stringify(map));

  return `${generatedContent}${SOURCE_MAP_COMMENT}${mapFileName}\n`;
}
