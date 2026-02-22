
if (typeof globalThis.process === 'undefined' || !globalThis.process.env) {
  globalThis.process = { env: { NODE_ENV: 'production' }, platform: 'linux', version: 'v20.0.0', argv: [] };
}
if (typeof globalThis.location === 'undefined') {
  globalThis.location = { protocol: 'file:', href: 'file:///', hostname: 'localhost' };
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    currentScript: null,
    getElementsByTagName: () => [],
    createElement: () => ({ setAttribute: () => {}, appendChild: () => {} }),
    createTextNode: () => ({}),
    head: { appendChild: () => {} },
    documentElement: {},
  };
}

var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/less/dist/less.js
var require_less = __commonJS({
  "node_modules/less/dist/less.js"(exports, module) {
    (function(global, factory) {
      typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, global.less = factory());
    })(exports, function() {
      "use strict";
      function defaultOptions() {
        return {
          /* Inline Javascript - @plugin still allowed */
          javascriptEnabled: false,
          /* Outputs a makefile import dependency list to stdout. */
          depends: false,
          /* (DEPRECATED) Compress using less built-in compression.
           * This does an okay job but does not utilise all the tricks of
           * dedicated css compression. */
          compress: false,
          /* Runs the less parser and just reports errors without any output. */
          lint: false,
          /* Sets available include paths.
           * If the file in an @import rule does not exist at that exact location,
           * less will look for it at the location(s) passed to this option.
           * You might use this for instance to specify a path to a library which
           * you want to be referenced simply and relatively in the less files. */
          paths: [],
          /* color output in the terminal */
          color: true,
          /**
           * @deprecated This option has confusing behavior and may be removed in a future version.
           *
           * When true, prevents @import statements for .less files from being evaluated inside
           * selector blocks (rulesets). The imports are silently ignored and not output.
           *
           * Behavior:
           * - @import at root level: Always processed
           * - @import inside @-rules (@media, @supports, etc.): Processed (these are not selector blocks)
           * - @import inside selector blocks (.class, #id, etc.): NOT processed (silently ignored)
           *
           * When false (default): All @import statements are processed regardless of context.
           *
           * Note: Despite the name "strict", this option does NOT throw an error when imports
           * are used in selector blocks - it silently ignores them. This is confusing
           * behavior that may catch users off guard.
           *
           * Note: Only affects .less file imports. CSS imports (url(...) or .css files) are
           * always output as CSS @import statements regardless of this setting.
           *
           * @see https://github.com/less/less.js/issues/656
           */
          strictImports: false,
          /* Allow Imports from Insecure HTTPS Hosts */
          insecure: false,
          /* Allows you to add a path to every generated import and url in your css.
           * This does not affect less import statements that are processed, just ones
           * that are left in the output css. */
          rootpath: "",
          /* By default URLs are kept as-is, so if you import a file in a sub-directory
           * that references an image, exactly the same URL will be output in the css.
           * This option allows you to re-write URL's in imported files so that the
           * URL is always relative to the base imported file */
          rewriteUrls: false,
          /* How to process math
           *   0 always           - eagerly try to solve all operations
           *   1 parens-division  - require parens for division "/"
           *   2 parens | strict  - require parens for all operations
           *   3 strict-legacy    - legacy strict behavior (super-strict)
           */
          math: 1,
          /* Without this option, less attempts to guess at the output unit when it does maths. */
          strictUnits: false,
          /* Effectively the declaration is put at the top of your base Less file,
           * meaning it can be used but it also can be overridden if this variable
           * is defined in the file. */
          globalVars: null,
          /* As opposed to the global variable option, this puts the declaration at the
           * end of your base file, meaning it will override anything defined in your Less file. */
          modifyVars: null,
          /* This option allows you to specify a argument to go on to every URL.  */
          urlArgs: ""
        };
      }
      function extractId(href) {
        return href.replace(/^[a-z-]+:\/+?[^/]+/, "").replace(/[?&]livereload=\w+/, "").replace(/^\//, "").replace(/\.[a-zA-Z]+$/, "").replace(/[^.\w-]+/g, "-").replace(/\./g, ":");
      }
      function addDataAttr(options2, tag) {
        if (!tag) {
          return;
        }
        for (var opt in tag.dataset) {
          if (Object.prototype.hasOwnProperty.call(tag.dataset, opt)) {
            if (opt === "env" || opt === "dumpLineNumbers" || opt === "rootpath" || opt === "errorReporting") {
              options2[opt] = tag.dataset[opt];
            } else {
              try {
                options2[opt] = JSON.parse(tag.dataset[opt]);
              } catch (_) {
              }
            }
          }
        }
      }
      var browser = {
        createCSS: function(document2, styles, sheet) {
          var href = sheet.href || "";
          var id = "less:".concat(sheet.title || extractId(href));
          var oldStyleNode = document2.getElementById(id);
          var keepOldStyleNode = false;
          var styleNode = document2.createElement("style");
          styleNode.setAttribute("type", "text/css");
          if (sheet.media) {
            styleNode.setAttribute("media", sheet.media);
          }
          styleNode.id = id;
          if (!styleNode.styleSheet) {
            styleNode.appendChild(document2.createTextNode(styles));
            keepOldStyleNode = oldStyleNode !== null && oldStyleNode.childNodes.length > 0 && styleNode.childNodes.length > 0 && oldStyleNode.firstChild.nodeValue === styleNode.firstChild.nodeValue;
          }
          var head2 = document2.getElementsByTagName("head")[0];
          if (oldStyleNode === null || keepOldStyleNode === false) {
            var nextEl = sheet && sheet.nextSibling || null;
            if (nextEl) {
              nextEl.parentNode.insertBefore(styleNode, nextEl);
            } else {
              head2.appendChild(styleNode);
            }
          }
          if (oldStyleNode && keepOldStyleNode === false) {
            oldStyleNode.parentNode.removeChild(oldStyleNode);
          }
          if (styleNode.styleSheet) {
            try {
              styleNode.styleSheet.cssText = styles;
            } catch (e) {
              throw new Error("Couldn't reassign styleSheet.cssText.");
            }
          }
        },
        currentScript: function(window2) {
          var document2 = window2.document;
          return document2.currentScript || function() {
            var scripts = document2.getElementsByTagName("script");
            return scripts[scripts.length - 1];
          }();
        }
      };
      var addDefaultOptions = function(window2, options2) {
        addDataAttr(options2, browser.currentScript(window2));
        if (options2.isFileProtocol === void 0) {
          options2.isFileProtocol = /^(file|(chrome|safari)(-extension)?|resource|qrc|app):/.test(window2.location.protocol);
        }
        options2.async = options2.async || false;
        options2.fileAsync = options2.fileAsync || false;
        options2.poll = options2.poll || (options2.isFileProtocol ? 1e3 : 1500);
        options2.env = options2.env || (window2.location.hostname == "127.0.0.1" || window2.location.hostname == "0.0.0.0" || window2.location.hostname == "localhost" || window2.location.port && window2.location.port.length > 0 || options2.isFileProtocol ? "development" : "production");
        var dumpLineNumbers = /!dumpLineNumbers:(comments|mediaquery|all)/.exec(window2.location.hash);
        if (dumpLineNumbers) {
          options2.dumpLineNumbers = dumpLineNumbers[1];
        }
        if (options2.useFileCache === void 0) {
          options2.useFileCache = true;
        }
        if (options2.onReady === void 0) {
          options2.onReady = true;
        }
        if (options2.relativeUrls) {
          options2.rewriteUrls = "all";
        }
      };
      var logger$1 = {
        error: function(msg) {
          this._fireEvent("error", msg);
        },
        warn: function(msg) {
          this._fireEvent("warn", msg);
        },
        info: function(msg) {
          this._fireEvent("info", msg);
        },
        debug: function(msg) {
          this._fireEvent("debug", msg);
        },
        addListener: function(listener) {
          this._listeners.push(listener);
        },
        removeListener: function(listener) {
          for (var i_1 = 0; i_1 < this._listeners.length; i_1++) {
            if (this._listeners[i_1] === listener) {
              this._listeners.splice(i_1, 1);
              return;
            }
          }
        },
        _fireEvent: function(type, msg) {
          for (var i_2 = 0; i_2 < this._listeners.length; i_2++) {
            var logFunction = this._listeners[i_2][type];
            if (logFunction) {
              logFunction(msg);
            }
          }
        },
        _listeners: []
      };
      var Environment = (
        /** @class */
        function() {
          function Environment2(externalEnvironment, fileManagers) {
            this.fileManagers = fileManagers || [];
            externalEnvironment = externalEnvironment || {};
            var optionalFunctions = ["encodeBase64", "mimeLookup", "charsetLookup", "getSourceMapGenerator"];
            var requiredFunctions = [];
            var functions2 = requiredFunctions.concat(optionalFunctions);
            for (var i_1 = 0; i_1 < functions2.length; i_1++) {
              var propName = functions2[i_1];
              var environmentFunc = externalEnvironment[propName];
              if (environmentFunc) {
                this[propName] = environmentFunc.bind(externalEnvironment);
              } else if (i_1 < requiredFunctions.length) {
                this.warn("missing required function in environment - ".concat(propName));
              }
            }
          }
          Environment2.prototype.getFileManager = function(filename, currentDirectory, options2, environment, isSync) {
            if (!filename) {
              logger$1.warn("getFileManager called with no filename.. Please report this issue. continuing.");
            }
            if (currentDirectory === void 0) {
              logger$1.warn("getFileManager called with null directory.. Please report this issue. continuing.");
            }
            var fileManagers = this.fileManagers;
            if (options2.pluginManager) {
              fileManagers = [].concat(fileManagers).concat(options2.pluginManager.getFileManagers());
            }
            for (var i_2 = fileManagers.length - 1; i_2 >= 0; i_2--) {
              var fileManager = fileManagers[i_2];
              if (fileManager[isSync ? "supportsSync" : "supports"](filename, currentDirectory, options2, environment)) {
                return fileManager;
              }
            }
            return null;
          };
          Environment2.prototype.addFileManager = function(fileManager) {
            this.fileManagers.push(fileManager);
          };
          Environment2.prototype.clearFileManagers = function() {
            this.fileManagers = [];
          };
          return Environment2;
        }()
      );
      var colors = {
        "aliceblue": "#f0f8ff",
        "antiquewhite": "#faebd7",
        "aqua": "#00ffff",
        "aquamarine": "#7fffd4",
        "azure": "#f0ffff",
        "beige": "#f5f5dc",
        "bisque": "#ffe4c4",
        "black": "#000000",
        "blanchedalmond": "#ffebcd",
        "blue": "#0000ff",
        "blueviolet": "#8a2be2",
        "brown": "#a52a2a",
        "burlywood": "#deb887",
        "cadetblue": "#5f9ea0",
        "chartreuse": "#7fff00",
        "chocolate": "#d2691e",
        "coral": "#ff7f50",
        "cornflowerblue": "#6495ed",
        "cornsilk": "#fff8dc",
        "crimson": "#dc143c",
        "cyan": "#00ffff",
        "darkblue": "#00008b",
        "darkcyan": "#008b8b",
        "darkgoldenrod": "#b8860b",
        "darkgray": "#a9a9a9",
        "darkgrey": "#a9a9a9",
        "darkgreen": "#006400",
        "darkkhaki": "#bdb76b",
        "darkmagenta": "#8b008b",
        "darkolivegreen": "#556b2f",
        "darkorange": "#ff8c00",
        "darkorchid": "#9932cc",
        "darkred": "#8b0000",
        "darksalmon": "#e9967a",
        "darkseagreen": "#8fbc8f",
        "darkslateblue": "#483d8b",
        "darkslategray": "#2f4f4f",
        "darkslategrey": "#2f4f4f",
        "darkturquoise": "#00ced1",
        "darkviolet": "#9400d3",
        "deeppink": "#ff1493",
        "deepskyblue": "#00bfff",
        "dimgray": "#696969",
        "dimgrey": "#696969",
        "dodgerblue": "#1e90ff",
        "firebrick": "#b22222",
        "floralwhite": "#fffaf0",
        "forestgreen": "#228b22",
        "fuchsia": "#ff00ff",
        "gainsboro": "#dcdcdc",
        "ghostwhite": "#f8f8ff",
        "gold": "#ffd700",
        "goldenrod": "#daa520",
        "gray": "#808080",
        "grey": "#808080",
        "green": "#008000",
        "greenyellow": "#adff2f",
        "honeydew": "#f0fff0",
        "hotpink": "#ff69b4",
        "indianred": "#cd5c5c",
        "indigo": "#4b0082",
        "ivory": "#fffff0",
        "khaki": "#f0e68c",
        "lavender": "#e6e6fa",
        "lavenderblush": "#fff0f5",
        "lawngreen": "#7cfc00",
        "lemonchiffon": "#fffacd",
        "lightblue": "#add8e6",
        "lightcoral": "#f08080",
        "lightcyan": "#e0ffff",
        "lightgoldenrodyellow": "#fafad2",
        "lightgray": "#d3d3d3",
        "lightgrey": "#d3d3d3",
        "lightgreen": "#90ee90",
        "lightpink": "#ffb6c1",
        "lightsalmon": "#ffa07a",
        "lightseagreen": "#20b2aa",
        "lightskyblue": "#87cefa",
        "lightslategray": "#778899",
        "lightslategrey": "#778899",
        "lightsteelblue": "#b0c4de",
        "lightyellow": "#ffffe0",
        "lime": "#00ff00",
        "limegreen": "#32cd32",
        "linen": "#faf0e6",
        "magenta": "#ff00ff",
        "maroon": "#800000",
        "mediumaquamarine": "#66cdaa",
        "mediumblue": "#0000cd",
        "mediumorchid": "#ba55d3",
        "mediumpurple": "#9370d8",
        "mediumseagreen": "#3cb371",
        "mediumslateblue": "#7b68ee",
        "mediumspringgreen": "#00fa9a",
        "mediumturquoise": "#48d1cc",
        "mediumvioletred": "#c71585",
        "midnightblue": "#191970",
        "mintcream": "#f5fffa",
        "mistyrose": "#ffe4e1",
        "moccasin": "#ffe4b5",
        "navajowhite": "#ffdead",
        "navy": "#000080",
        "oldlace": "#fdf5e6",
        "olive": "#808000",
        "olivedrab": "#6b8e23",
        "orange": "#ffa500",
        "orangered": "#ff4500",
        "orchid": "#da70d6",
        "palegoldenrod": "#eee8aa",
        "palegreen": "#98fb98",
        "paleturquoise": "#afeeee",
        "palevioletred": "#d87093",
        "papayawhip": "#ffefd5",
        "peachpuff": "#ffdab9",
        "peru": "#cd853f",
        "pink": "#ffc0cb",
        "plum": "#dda0dd",
        "powderblue": "#b0e0e6",
        "purple": "#800080",
        "rebeccapurple": "#663399",
        "red": "#ff0000",
        "rosybrown": "#bc8f8f",
        "royalblue": "#4169e1",
        "saddlebrown": "#8b4513",
        "salmon": "#fa8072",
        "sandybrown": "#f4a460",
        "seagreen": "#2e8b57",
        "seashell": "#fff5ee",
        "sienna": "#a0522d",
        "silver": "#c0c0c0",
        "skyblue": "#87ceeb",
        "slateblue": "#6a5acd",
        "slategray": "#708090",
        "slategrey": "#708090",
        "snow": "#fffafa",
        "springgreen": "#00ff7f",
        "steelblue": "#4682b4",
        "tan": "#d2b48c",
        "teal": "#008080",
        "thistle": "#d8bfd8",
        "tomato": "#ff6347",
        "turquoise": "#40e0d0",
        "violet": "#ee82ee",
        "wheat": "#f5deb3",
        "white": "#ffffff",
        "whitesmoke": "#f5f5f5",
        "yellow": "#ffff00",
        "yellowgreen": "#9acd32"
      };
      var unitConversions = {
        length: {
          "m": 1,
          "cm": 0.01,
          "mm": 1e-3,
          "in": 0.0254,
          "px": 0.0254 / 96,
          "pt": 0.0254 / 72,
          "pc": 0.0254 / 72 * 12
        },
        duration: {
          "s": 1,
          "ms": 1e-3
        },
        angle: {
          "rad": 1 / (2 * Math.PI),
          "deg": 1 / 360,
          "grad": 1 / 400,
          "turn": 1
        }
      };
      var data = { colors, unitConversions };
      var Node = (
        /** @class */
        function() {
          function Node2() {
            this.parent = null;
            this.visibilityBlocks = void 0;
            this.nodeVisible = void 0;
            this.rootNode = null;
            this.parsed = null;
          }
          Object.defineProperty(Node2.prototype, "currentFileInfo", {
            get: function() {
              return this.fileInfo();
            },
            enumerable: false,
            configurable: true
          });
          Object.defineProperty(Node2.prototype, "index", {
            get: function() {
              return this.getIndex();
            },
            enumerable: false,
            configurable: true
          });
          Node2.prototype.setParent = function(nodes, parent) {
            function set(node) {
              if (node && node instanceof Node2) {
                node.parent = parent;
              }
            }
            if (Array.isArray(nodes)) {
              nodes.forEach(set);
            } else {
              set(nodes);
            }
          };
          Node2.prototype.getIndex = function() {
            return this._index || this.parent && this.parent.getIndex() || 0;
          };
          Node2.prototype.fileInfo = function() {
            return this._fileInfo || this.parent && this.parent.fileInfo() || {};
          };
          Node2.prototype.isRulesetLike = function() {
            return false;
          };
          Node2.prototype.toCSS = function(context) {
            var strs = [];
            this.genCSS(context, {
              // remove when genCSS has JSDoc types
              // eslint-disable-next-line no-unused-vars
              add: function(chunk, fileInfo, index) {
                strs.push(chunk);
              },
              isEmpty: function() {
                return strs.length === 0;
              }
            });
            return strs.join("");
          };
          Node2.prototype.genCSS = function(context, output) {
            output.add(this.value);
          };
          Node2.prototype.accept = function(visitor) {
            this.value = visitor.visit(this.value);
          };
          Node2.prototype.eval = function() {
            return this;
          };
          Node2.prototype._operate = function(context, op, a, b) {
            switch (op) {
              case "+":
                return a + b;
              case "-":
                return a - b;
              case "*":
                return a * b;
              case "/":
                return a / b;
            }
          };
          Node2.prototype.fround = function(context, value) {
            var precision = context && context.numPrecision;
            return precision ? Number((value + 2e-16).toFixed(precision)) : value;
          };
          Node2.compare = function(a, b) {
            if (a.compare && // for "symmetric results" force toCSS-based comparison
            // of Quoted or Anonymous if either value is one of those
            !(b.type === "Quoted" || b.type === "Anonymous")) {
              return a.compare(b);
            } else if (b.compare) {
              return -b.compare(a);
            } else if (a.type !== b.type) {
              return void 0;
            }
            a = a.value;
            b = b.value;
            if (!Array.isArray(a)) {
              return a === b ? 0 : void 0;
            }
            if (a.length !== b.length) {
              return void 0;
            }
            for (var i_1 = 0; i_1 < a.length; i_1++) {
              if (Node2.compare(a[i_1], b[i_1]) !== 0) {
                return void 0;
              }
            }
            return 0;
          };
          Node2.numericCompare = function(a, b) {
            return a < b ? -1 : a === b ? 0 : a > b ? 1 : void 0;
          };
          Node2.prototype.blocksVisibility = function() {
            if (this.visibilityBlocks === void 0) {
              this.visibilityBlocks = 0;
            }
            return this.visibilityBlocks !== 0;
          };
          Node2.prototype.addVisibilityBlock = function() {
            if (this.visibilityBlocks === void 0) {
              this.visibilityBlocks = 0;
            }
            this.visibilityBlocks = this.visibilityBlocks + 1;
          };
          Node2.prototype.removeVisibilityBlock = function() {
            if (this.visibilityBlocks === void 0) {
              this.visibilityBlocks = 0;
            }
            this.visibilityBlocks = this.visibilityBlocks - 1;
          };
          Node2.prototype.ensureVisibility = function() {
            this.nodeVisible = true;
          };
          Node2.prototype.ensureInvisibility = function() {
            this.nodeVisible = false;
          };
          Node2.prototype.isVisible = function() {
            return this.nodeVisible;
          };
          Node2.prototype.visibilityInfo = function() {
            return {
              visibilityBlocks: this.visibilityBlocks,
              nodeVisible: this.nodeVisible
            };
          };
          Node2.prototype.copyVisibilityInfo = function(info) {
            if (!info) {
              return;
            }
            this.visibilityBlocks = info.visibilityBlocks;
            this.nodeVisible = info.nodeVisible;
          };
          return Node2;
        }()
      );
      var Color = function(rgb, a, originalForm) {
        var self2 = this;
        if (Array.isArray(rgb)) {
          this.rgb = rgb;
        } else if (rgb.length >= 6) {
          this.rgb = [];
          rgb.match(/.{2}/g).map(function(c, i) {
            if (i < 3) {
              self2.rgb.push(parseInt(c, 16));
            } else {
              self2.alpha = parseInt(c, 16) / 255;
            }
          });
        } else {
          this.rgb = [];
          rgb.split("").map(function(c, i) {
            if (i < 3) {
              self2.rgb.push(parseInt(c + c, 16));
            } else {
              self2.alpha = parseInt(c + c, 16) / 255;
            }
          });
        }
        this.alpha = this.alpha || (typeof a === "number" ? a : 1);
        if (typeof originalForm !== "undefined") {
          this.value = originalForm;
        }
      };
      Color.prototype = Object.assign(new Node(), {
        type: "Color",
        luma: function() {
          var r = this.rgb[0] / 255, g = this.rgb[1] / 255, b = this.rgb[2] / 255;
          r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
          g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
          b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        },
        genCSS: function(context, output) {
          output.add(this.toCSS(context));
        },
        toCSS: function(context, doNotCompress) {
          var compress = context && context.compress && !doNotCompress;
          var color2;
          var alpha;
          var colorFunction;
          var args = [];
          alpha = this.fround(context, this.alpha);
          if (this.value) {
            if (this.value.indexOf("rgb") === 0) {
              if (alpha < 1) {
                colorFunction = "rgba";
              }
            } else if (this.value.indexOf("hsl") === 0) {
              if (alpha < 1) {
                colorFunction = "hsla";
              } else {
                colorFunction = "hsl";
              }
            } else {
              return this.value;
            }
          } else {
            if (alpha < 1) {
              colorFunction = "rgba";
            }
          }
          switch (colorFunction) {
            case "rgba":
              args = this.rgb.map(function(c) {
                return clamp$1(Math.round(c), 255);
              }).concat(clamp$1(alpha, 1));
              break;
            case "hsla":
              args.push(clamp$1(alpha, 1));
            case "hsl":
              color2 = this.toHSL();
              args = [
                this.fround(context, color2.h),
                "".concat(this.fround(context, color2.s * 100), "%"),
                "".concat(this.fround(context, color2.l * 100), "%")
              ].concat(args);
          }
          if (colorFunction) {
            return "".concat(colorFunction, "(").concat(args.join(",".concat(compress ? "" : " ")), ")");
          }
          color2 = this.toRGB();
          if (compress) {
            var splitcolor = color2.split("");
            if (splitcolor[1] === splitcolor[2] && splitcolor[3] === splitcolor[4] && splitcolor[5] === splitcolor[6]) {
              color2 = "#".concat(splitcolor[1]).concat(splitcolor[3]).concat(splitcolor[5]);
            }
          }
          return color2;
        },
        //
        // Operations have to be done per-channel, if not,
        // channels will spill onto each other. Once we have
        // our result, in the form of an integer triplet,
        // we create a new Color node to hold the result.
        //
        operate: function(context, op, other) {
          var rgb = new Array(3);
          var alpha = this.alpha * (1 - other.alpha) + other.alpha;
          for (var c = 0; c < 3; c++) {
            rgb[c] = this._operate(context, op, this.rgb[c], other.rgb[c]);
          }
          return new Color(rgb, alpha);
        },
        toRGB: function() {
          return toHex(this.rgb);
        },
        toHSL: function() {
          var r = this.rgb[0] / 255, g = this.rgb[1] / 255, b = this.rgb[2] / 255, a = this.alpha;
          var max = Math.max(r, g, b), min = Math.min(r, g, b);
          var h;
          var s;
          var l = (max + min) / 2;
          var d = max - min;
          if (max === min) {
            h = s = 0;
          } else {
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
              case g:
                h = (b - r) / d + 2;
                break;
              case b:
                h = (r - g) / d + 4;
                break;
            }
            h /= 6;
          }
          return { h: h * 360, s, l, a };
        },
        // Adapted from http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
        toHSV: function() {
          var r = this.rgb[0] / 255, g = this.rgb[1] / 255, b = this.rgb[2] / 255, a = this.alpha;
          var max = Math.max(r, g, b), min = Math.min(r, g, b);
          var h;
          var s;
          var v = max;
          var d = max - min;
          if (max === 0) {
            s = 0;
          } else {
            s = d / max;
          }
          if (max === min) {
            h = 0;
          } else {
            switch (max) {
              case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
              case g:
                h = (b - r) / d + 2;
                break;
              case b:
                h = (r - g) / d + 4;
                break;
            }
            h /= 6;
          }
          return { h: h * 360, s, v, a };
        },
        toARGB: function() {
          return toHex([this.alpha * 255].concat(this.rgb));
        },
        compare: function(x) {
          return x.rgb && x.rgb[0] === this.rgb[0] && x.rgb[1] === this.rgb[1] && x.rgb[2] === this.rgb[2] && x.alpha === this.alpha ? 0 : void 0;
        }
      });
      Color.fromKeyword = function(keyword) {
        var c;
        var key2 = keyword.toLowerCase();
        if (colors.hasOwnProperty(key2)) {
          c = new Color(colors[key2].slice(1));
        } else if (key2 === "transparent") {
          c = new Color([0, 0, 0], 0);
        }
        if (c) {
          c.value = keyword;
          return c;
        }
      };
      function clamp$1(v, max) {
        return Math.min(Math.max(v, 0), max);
      }
      function toHex(v) {
        return "#".concat(v.map(function(c) {
          c = clamp$1(Math.round(c), 255);
          return (c < 16 ? "0" : "") + c.toString(16);
        }).join(""));
      }
      var __assign = function() {
        __assign = Object.assign || function __assign2(t) {
          for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s)
              if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
          }
          return t;
        };
        return __assign.apply(this, arguments);
      };
      function __spreadArray(to, from, pack) {
        if (pack || arguments.length === 2)
          for (var i = 0, l = from.length, ar; i < l; i++) {
            if (ar || !(i in from)) {
              if (!ar)
                ar = Array.prototype.slice.call(from, 0, i);
              ar[i] = from[i];
            }
          }
        return to.concat(ar || Array.prototype.slice.call(from));
      }
      typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
      };
      var Paren = function(node) {
        this.value = node;
      };
      Paren.prototype = Object.assign(new Node(), {
        type: "Paren",
        genCSS: function(context, output) {
          output.add("(");
          this.value.genCSS(context, output);
          output.add(")");
        },
        eval: function(context) {
          var paren = new Paren(this.value.eval(context));
          if (this.noSpacing) {
            paren.noSpacing = true;
          }
          return paren;
        }
      });
      var _noSpaceCombinators = {
        "": true,
        " ": true,
        "|": true
      };
      var Combinator = function(value) {
        if (value === " ") {
          this.value = " ";
          this.emptyOrWhitespace = true;
        } else {
          this.value = value ? value.trim() : "";
          this.emptyOrWhitespace = this.value === "";
        }
      };
      Combinator.prototype = Object.assign(new Node(), {
        type: "Combinator",
        genCSS: function(context, output) {
          var spaceOrEmpty = context.compress || _noSpaceCombinators[this.value] ? "" : " ";
          output.add(spaceOrEmpty + this.value + spaceOrEmpty);
        }
      });
      var Element = function(combinator, value, isVariable, index, currentFileInfo, visibilityInfo) {
        this.combinator = combinator instanceof Combinator ? combinator : new Combinator(combinator);
        if (typeof value === "string") {
          this.value = value.trim();
        } else if (value) {
          this.value = value;
        } else {
          this.value = "";
        }
        this.isVariable = isVariable;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.copyVisibilityInfo(visibilityInfo);
        this.setParent(this.combinator, this);
      };
      Element.prototype = Object.assign(new Node(), {
        type: "Element",
        accept: function(visitor) {
          var value = this.value;
          this.combinator = visitor.visit(this.combinator);
          if (typeof value === "object") {
            this.value = visitor.visit(value);
          }
        },
        eval: function(context) {
          return new Element(this.combinator, this.value.eval ? this.value.eval(context) : this.value, this.isVariable, this.getIndex(), this.fileInfo(), this.visibilityInfo());
        },
        clone: function() {
          return new Element(this.combinator, this.value, this.isVariable, this.getIndex(), this.fileInfo(), this.visibilityInfo());
        },
        genCSS: function(context, output) {
          output.add(this.toCSS(context), this.fileInfo(), this.getIndex());
        },
        toCSS: function(context) {
          context = context || {};
          var value = this.value;
          var firstSelector = context.firstSelector;
          if (value instanceof Paren) {
            context.firstSelector = true;
          }
          value = value.toCSS ? value.toCSS(context) : value;
          context.firstSelector = firstSelector;
          if (value === "" && this.combinator.value.charAt(0) === "&") {
            return "";
          } else {
            return this.combinator.toCSS(context) + value;
          }
        }
      });
      var Math$1 = {
        ALWAYS: 0,
        PARENS_DIVISION: 1,
        PARENS: 2
        // removed - STRICT_LEGACY: 3
      };
      var RewriteUrls = {
        OFF: 0,
        LOCAL: 1,
        ALL: 2
      };
      function getType(payload) {
        return Object.prototype.toString.call(payload).slice(8, -1);
      }
      function isPlainObject(payload) {
        if (getType(payload) !== "Object")
          return false;
        return payload.constructor === Object && Object.getPrototypeOf(payload) === Object.prototype;
      }
      function isArray(payload) {
        return getType(payload) === "Array";
      }
      function assignProp(carry, key2, newVal, originalObject, includeNonenumerable) {
        const propType = {}.propertyIsEnumerable.call(originalObject, key2) ? "enumerable" : "nonenumerable";
        if (propType === "enumerable")
          carry[key2] = newVal;
        if (includeNonenumerable && propType === "nonenumerable") {
          Object.defineProperty(carry, key2, {
            value: newVal,
            enumerable: false,
            writable: true,
            configurable: true
          });
        }
      }
      function copy(target, options2 = {}) {
        if (isArray(target)) {
          return target.map((item) => copy(item, options2));
        }
        if (!isPlainObject(target)) {
          return target;
        }
        const props = Object.getOwnPropertyNames(target);
        const symbols = Object.getOwnPropertySymbols(target);
        return [...props, ...symbols].reduce((carry, key2) => {
          if (isArray(options2.props) && !options2.props.includes(key2)) {
            return carry;
          }
          const val = target[key2];
          const newVal = copy(val, options2);
          assignProp(carry, key2, newVal, target, options2.nonenumerable);
          return carry;
        }, {});
      }
      function getLocation(index, inputStream) {
        var n = index + 1;
        var line = null;
        var column = -1;
        while (--n >= 0 && inputStream.charAt(n) !== "\n") {
          column++;
        }
        if (typeof index === "number") {
          line = (inputStream.slice(0, index).match(/\n/g) || "").length;
        }
        return {
          line,
          column
        };
      }
      function copyArray(arr) {
        var i;
        var length = arr.length;
        var copy2 = new Array(length);
        for (i = 0; i < length; i++) {
          copy2[i] = arr[i];
        }
        return copy2;
      }
      function clone(obj) {
        var cloned = {};
        for (var prop in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, prop)) {
            cloned[prop] = obj[prop];
          }
        }
        return cloned;
      }
      function defaults(obj1, obj2) {
        var newObj = obj2 || {};
        if (!obj2._defaults) {
          newObj = {};
          var defaults_1 = copy(obj1);
          newObj._defaults = defaults_1;
          var cloned = obj2 ? copy(obj2) : {};
          Object.assign(newObj, defaults_1, cloned);
        }
        return newObj;
      }
      function copyOptions(obj1, obj2) {
        if (obj2 && obj2._defaults) {
          return obj2;
        }
        var opts = defaults(obj1, obj2);
        if (opts.strictMath) {
          opts.math = Math$1.PARENS;
        }
        if (opts.relativeUrls) {
          opts.rewriteUrls = RewriteUrls.ALL;
        }
        if (typeof opts.math === "string") {
          switch (opts.math.toLowerCase()) {
            case "always":
              opts.math = Math$1.ALWAYS;
              break;
            case "parens-division":
              opts.math = Math$1.PARENS_DIVISION;
              break;
            case "strict":
            case "parens":
              opts.math = Math$1.PARENS;
              break;
            default:
              opts.math = Math$1.PARENS;
          }
        }
        if (typeof opts.rewriteUrls === "string") {
          switch (opts.rewriteUrls.toLowerCase()) {
            case "off":
              opts.rewriteUrls = RewriteUrls.OFF;
              break;
            case "local":
              opts.rewriteUrls = RewriteUrls.LOCAL;
              break;
            case "all":
              opts.rewriteUrls = RewriteUrls.ALL;
              break;
          }
        }
        return opts;
      }
      function merge(obj1, obj2) {
        for (var prop in obj2) {
          if (Object.prototype.hasOwnProperty.call(obj2, prop)) {
            obj1[prop] = obj2[prop];
          }
        }
        return obj1;
      }
      function flattenArray(arr, result) {
        if (result === void 0) {
          result = [];
        }
        for (var i_1 = 0, length_1 = arr.length; i_1 < length_1; i_1++) {
          var value = arr[i_1];
          if (Array.isArray(value)) {
            flattenArray(value, result);
          } else {
            if (value !== void 0) {
              result.push(value);
            }
          }
        }
        return result;
      }
      function isNullOrUndefined(val) {
        return val === null || val === void 0;
      }
      var utils = /* @__PURE__ */ Object.freeze({
        __proto__: null,
        getLocation,
        copyArray,
        clone,
        defaults,
        copyOptions,
        merge,
        flattenArray,
        isNullOrUndefined
      });
      var anonymousFunc = /(<anonymous>|Function):(\d+):(\d+)/;
      var LessError = function(e, fileContentMap, currentFilename) {
        Error.call(this);
        var filename = e.filename || currentFilename;
        this.message = e.message;
        this.stack = e.stack;
        this.type = e.type || "Syntax";
        if (fileContentMap && filename) {
          var input = fileContentMap.contents[filename];
          var loc = getLocation(e.index, input);
          var line = loc.line;
          var col = loc.column;
          var callLine = e.call && getLocation(e.call, input).line;
          var lines = input ? input.split("\n") : "";
          this.filename = filename;
          this.index = e.index;
          this.line = typeof line === "number" ? line + 1 : null;
          this.column = col;
          if (!this.line && this.stack) {
            var found = this.stack.match(anonymousFunc);
            var func = new Function("a", "throw new Error()");
            var lineAdjust = 0;
            try {
              func();
            } catch (e2) {
              var match = e2.stack.match(anonymousFunc);
              lineAdjust = 1 - parseInt(match[2]);
            }
            if (found) {
              if (found[2]) {
                this.line = parseInt(found[2]) + lineAdjust;
              }
              if (found[3]) {
                this.column = parseInt(found[3]);
              }
            }
          }
          this.callLine = callLine + 1;
          this.callExtract = lines[callLine];
          this.extract = [
            lines[this.line - 2],
            lines[this.line - 1],
            lines[this.line]
          ];
        }
      };
      if (typeof Object.create === "undefined") {
        var F = function() {
        };
        F.prototype = Error.prototype;
        LessError.prototype = new F();
      } else {
        LessError.prototype = Object.create(Error.prototype);
      }
      LessError.prototype.constructor = LessError;
      LessError.prototype.toString = function(options2) {
        var _a;
        options2 = options2 || {};
        var isWarning = ((_a = this.type) !== null && _a !== void 0 ? _a : "").toLowerCase().includes("warning");
        var type = isWarning ? this.type : "".concat(this.type, "Error");
        var color2 = isWarning ? "yellow" : "red";
        var message = "";
        var extract = this.extract || [];
        var error = [];
        var stylize = function(str) {
          return str;
        };
        if (options2.stylize) {
          var type_1 = typeof options2.stylize;
          if (type_1 !== "function") {
            throw Error("options.stylize should be a function, got a ".concat(type_1, "!"));
          }
          stylize = options2.stylize;
        }
        if (this.line !== null) {
          if (!isWarning && typeof extract[0] === "string") {
            error.push(stylize("".concat(this.line - 1, " ").concat(extract[0]), "grey"));
          }
          if (typeof extract[1] === "string") {
            var errorTxt = "".concat(this.line, " ");
            if (extract[1]) {
              errorTxt += extract[1].slice(0, this.column) + stylize(stylize(stylize(extract[1].substr(this.column, 1), "bold") + extract[1].slice(this.column + 1), "red"), "inverse");
            }
            error.push(errorTxt);
          }
          if (!isWarning && typeof extract[2] === "string") {
            error.push(stylize("".concat(this.line + 1, " ").concat(extract[2]), "grey"));
          }
          error = "".concat(error.join("\n") + stylize("", "reset"), "\n");
        }
        message += stylize("".concat(type, ": ").concat(this.message), color2);
        if (this.filename) {
          message += stylize(" in ", color2) + this.filename;
        }
        if (this.line) {
          message += stylize(" on line ".concat(this.line, ", column ").concat(this.column + 1, ":"), "grey");
        }
        message += "\n".concat(error);
        if (this.callLine) {
          message += "".concat(stylize("from ", color2) + (this.filename || ""), "/n");
          message += "".concat(stylize(this.callLine, "grey"), " ").concat(this.callExtract, "/n");
        }
        return message;
      };
      var _visitArgs = { visitDeeper: true };
      var _hasIndexed = false;
      function _noop(node) {
        return node;
      }
      function indexNodeTypes(parent, ticker) {
        var key2, child;
        for (key2 in parent) {
          child = parent[key2];
          switch (typeof child) {
            case "function":
              if (child.prototype && child.prototype.type) {
                child.prototype.typeIndex = ticker++;
              }
              break;
            case "object":
              ticker = indexNodeTypes(child, ticker);
              break;
          }
        }
        return ticker;
      }
      var Visitor = (
        /** @class */
        function() {
          function Visitor2(implementation) {
            this._implementation = implementation;
            this._visitInCache = {};
            this._visitOutCache = {};
            if (!_hasIndexed) {
              indexNodeTypes(tree, 1);
              _hasIndexed = true;
            }
          }
          Visitor2.prototype.visit = function(node) {
            if (!node) {
              return node;
            }
            var nodeTypeIndex = node.typeIndex;
            if (!nodeTypeIndex) {
              if (node.value && node.value.typeIndex) {
                this.visit(node.value);
              }
              return node;
            }
            var impl = this._implementation;
            var func = this._visitInCache[nodeTypeIndex];
            var funcOut = this._visitOutCache[nodeTypeIndex];
            var visitArgs = _visitArgs;
            var fnName;
            visitArgs.visitDeeper = true;
            if (!func) {
              fnName = "visit".concat(node.type);
              func = impl[fnName] || _noop;
              funcOut = impl["".concat(fnName, "Out")] || _noop;
              this._visitInCache[nodeTypeIndex] = func;
              this._visitOutCache[nodeTypeIndex] = funcOut;
            }
            if (func !== _noop) {
              var newNode = func.call(impl, node, visitArgs);
              if (node && impl.isReplacing) {
                node = newNode;
              }
            }
            if (visitArgs.visitDeeper && node) {
              if (node.length) {
                for (var i_1 = 0, cnt = node.length; i_1 < cnt; i_1++) {
                  if (node[i_1].accept) {
                    node[i_1].accept(this);
                  }
                }
              } else if (node.accept) {
                node.accept(this);
              }
            }
            if (funcOut != _noop) {
              funcOut.call(impl, node);
            }
            return node;
          };
          Visitor2.prototype.visitArray = function(nodes, nonReplacing) {
            if (!nodes) {
              return nodes;
            }
            var cnt = nodes.length;
            var i;
            if (nonReplacing || !this._implementation.isReplacing) {
              for (i = 0; i < cnt; i++) {
                this.visit(nodes[i]);
              }
              return nodes;
            }
            var out = [];
            for (i = 0; i < cnt; i++) {
              var evald = this.visit(nodes[i]);
              if (evald === void 0) {
                continue;
              }
              if (!evald.splice) {
                out.push(evald);
              } else if (evald.length) {
                this.flatten(evald, out);
              }
            }
            return out;
          };
          Visitor2.prototype.flatten = function(arr, out) {
            if (!out) {
              out = [];
            }
            var cnt, i, item, nestedCnt, j, nestedItem;
            for (i = 0, cnt = arr.length; i < cnt; i++) {
              item = arr[i];
              if (item === void 0) {
                continue;
              }
              if (!item.splice) {
                out.push(item);
                continue;
              }
              for (j = 0, nestedCnt = item.length; j < nestedCnt; j++) {
                nestedItem = item[j];
                if (nestedItem === void 0) {
                  continue;
                }
                if (!nestedItem.splice) {
                  out.push(nestedItem);
                } else if (nestedItem.length) {
                  this.flatten(nestedItem, out);
                }
              }
            }
            return out;
          };
          return Visitor2;
        }()
      );
      var contexts = {};
      var copyFromOriginal = function copyFromOriginal2(original, destination, propertiesToCopy) {
        if (!original) {
          return;
        }
        for (var i_1 = 0; i_1 < propertiesToCopy.length; i_1++) {
          if (Object.prototype.hasOwnProperty.call(original, propertiesToCopy[i_1])) {
            destination[propertiesToCopy[i_1]] = original[propertiesToCopy[i_1]];
          }
        }
      };
      var parseCopyProperties = [
        // options
        "paths",
        "rewriteUrls",
        "rootpath",
        "strictImports",
        "insecure",
        "dumpLineNumbers",
        "compress",
        "syncImport",
        "mime",
        "useFileCache",
        // context
        "processImports",
        // Used by the import manager to stop multiple import visitors being created.
        "pluginManager",
        "quiet"
        // option - whether to log warnings
      ];
      contexts.Parse = function(options2) {
        copyFromOriginal(options2, this, parseCopyProperties);
        if (typeof this.paths === "string") {
          this.paths = [this.paths];
        }
      };
      var evalCopyProperties = [
        "paths",
        "compress",
        "math",
        "strictUnits",
        "sourceMap",
        "importMultiple",
        "urlArgs",
        "javascriptEnabled",
        "pluginManager",
        "importantScope",
        "rewriteUrls"
        // option - whether to adjust URL's to be relative
      ];
      contexts.Eval = function(options2, frames) {
        copyFromOriginal(options2, this, evalCopyProperties);
        if (typeof this.paths === "string") {
          this.paths = [this.paths];
        }
        this.frames = frames || [];
        this.importantScope = this.importantScope || [];
      };
      contexts.Eval.prototype.enterCalc = function() {
        if (!this.calcStack) {
          this.calcStack = [];
        }
        this.calcStack.push(true);
        this.inCalc = true;
      };
      contexts.Eval.prototype.exitCalc = function() {
        this.calcStack.pop();
        if (!this.calcStack.length) {
          this.inCalc = false;
        }
      };
      contexts.Eval.prototype.inParenthesis = function() {
        if (!this.parensStack) {
          this.parensStack = [];
        }
        this.parensStack.push(true);
      };
      contexts.Eval.prototype.outOfParenthesis = function() {
        this.parensStack.pop();
      };
      contexts.Eval.prototype.inCalc = false;
      contexts.Eval.prototype.mathOn = true;
      contexts.Eval.prototype.isMathOn = function(op) {
        if (!this.mathOn) {
          return false;
        }
        if (op === "/" && this.math !== Math$1.ALWAYS && (!this.parensStack || !this.parensStack.length)) {
          return false;
        }
        if (this.math > Math$1.PARENS_DIVISION) {
          return this.parensStack && this.parensStack.length;
        }
        return true;
      };
      contexts.Eval.prototype.pathRequiresRewrite = function(path) {
        var isRelative = this.rewriteUrls === RewriteUrls.LOCAL ? isPathLocalRelative : isPathRelative;
        return isRelative(path);
      };
      contexts.Eval.prototype.rewritePath = function(path, rootpath) {
        var newPath;
        rootpath = rootpath || "";
        newPath = this.normalizePath(rootpath + path);
        if (isPathLocalRelative(path) && isPathRelative(rootpath) && isPathLocalRelative(newPath) === false) {
          newPath = "./".concat(newPath);
        }
        return newPath;
      };
      contexts.Eval.prototype.normalizePath = function(path) {
        var segments = path.split("/").reverse();
        var segment;
        path = [];
        while (segments.length !== 0) {
          segment = segments.pop();
          switch (segment) {
            case ".":
              break;
            case "..":
              if (path.length === 0 || path[path.length - 1] === "..") {
                path.push(segment);
              } else {
                path.pop();
              }
              break;
            default:
              path.push(segment);
              break;
          }
        }
        return path.join("/");
      };
      function isPathRelative(path) {
        return !/^(?:[a-z-]+:|\/|#)/i.test(path);
      }
      function isPathLocalRelative(path) {
        return path.charAt(0) === ".";
      }
      var ImportSequencer = (
        /** @class */
        function() {
          function ImportSequencer2(onSequencerEmpty) {
            this.imports = [];
            this.variableImports = [];
            this._onSequencerEmpty = onSequencerEmpty;
            this._currentDepth = 0;
          }
          ImportSequencer2.prototype.addImport = function(callback) {
            var importSequencer = this, importItem = {
              callback,
              args: null,
              isReady: false
            };
            this.imports.push(importItem);
            return function() {
              importItem.args = Array.prototype.slice.call(arguments, 0);
              importItem.isReady = true;
              importSequencer.tryRun();
            };
          };
          ImportSequencer2.prototype.addVariableImport = function(callback) {
            this.variableImports.push(callback);
          };
          ImportSequencer2.prototype.tryRun = function() {
            this._currentDepth++;
            try {
              while (true) {
                while (this.imports.length > 0) {
                  var importItem = this.imports[0];
                  if (!importItem.isReady) {
                    return;
                  }
                  this.imports = this.imports.slice(1);
                  importItem.callback.apply(null, importItem.args);
                }
                if (this.variableImports.length === 0) {
                  break;
                }
                var variableImport = this.variableImports[0];
                this.variableImports = this.variableImports.slice(1);
                variableImport();
              }
            } finally {
              this._currentDepth--;
            }
            if (this._currentDepth === 0 && this._onSequencerEmpty) {
              this._onSequencerEmpty();
            }
          };
          return ImportSequencer2;
        }()
      );
      var ImportVisitor = function(importer, finish) {
        this._visitor = new Visitor(this);
        this._importer = importer;
        this._finish = finish;
        this.context = new contexts.Eval();
        this.importCount = 0;
        this.onceFileDetectionMap = {};
        this.recursionDetector = {};
        this._sequencer = new ImportSequencer(this._onSequencerEmpty.bind(this));
      };
      ImportVisitor.prototype = {
        isReplacing: false,
        run: function(root2) {
          try {
            this._visitor.visit(root2);
          } catch (e) {
            this.error = e;
          }
          this.isFinished = true;
          this._sequencer.tryRun();
        },
        _onSequencerEmpty: function() {
          if (!this.isFinished) {
            return;
          }
          this._finish(this.error);
        },
        visitImport: function(importNode, visitArgs) {
          var inlineCSS = importNode.options.inline;
          if (!importNode.css || inlineCSS) {
            var context = new contexts.Eval(this.context, copyArray(this.context.frames));
            var importParent = context.frames[0];
            this.importCount++;
            if (importNode.isVariableImport()) {
              this._sequencer.addVariableImport(this.processImportNode.bind(this, importNode, context, importParent));
            } else {
              this.processImportNode(importNode, context, importParent);
            }
          }
          visitArgs.visitDeeper = false;
        },
        processImportNode: function(importNode, context, importParent) {
          var evaldImportNode;
          var inlineCSS = importNode.options.inline;
          try {
            evaldImportNode = importNode.evalForImport(context);
          } catch (e) {
            if (!e.filename) {
              e.index = importNode.getIndex();
              e.filename = importNode.fileInfo().filename;
            }
            importNode.css = true;
            importNode.error = e;
          }
          if (evaldImportNode && (!evaldImportNode.css || inlineCSS)) {
            if (evaldImportNode.options.multiple) {
              context.importMultiple = true;
            }
            var tryAppendLessExtension = evaldImportNode.css === void 0;
            for (var i_1 = 0; i_1 < importParent.rules.length; i_1++) {
              if (importParent.rules[i_1] === importNode) {
                importParent.rules[i_1] = evaldImportNode;
                break;
              }
            }
            var onImported = this.onImported.bind(this, evaldImportNode, context), sequencedOnImported = this._sequencer.addImport(onImported);
            this._importer.push(evaldImportNode.getPath(), tryAppendLessExtension, evaldImportNode.fileInfo(), evaldImportNode.options, sequencedOnImported);
          } else {
            this.importCount--;
            if (this.isFinished) {
              this._sequencer.tryRun();
            }
          }
        },
        onImported: function(importNode, context, e, root2, importedAtRoot, fullPath) {
          if (e) {
            if (!e.filename) {
              e.index = importNode.getIndex();
              e.filename = importNode.fileInfo().filename;
            }
            this.error = e;
          }
          var importVisitor = this, inlineCSS = importNode.options.inline, isPlugin = importNode.options.isPlugin, isOptional = importNode.options.optional, duplicateImport = importedAtRoot || fullPath in importVisitor.recursionDetector;
          if (!context.importMultiple) {
            if (duplicateImport) {
              importNode.skip = true;
            } else {
              importNode.skip = function() {
                if (fullPath in importVisitor.onceFileDetectionMap) {
                  return true;
                }
                importVisitor.onceFileDetectionMap[fullPath] = true;
                return false;
              };
            }
          }
          if (!fullPath && isOptional) {
            importNode.skip = true;
          }
          if (root2) {
            importNode.root = root2;
            importNode.importedFilename = fullPath;
            if (!inlineCSS && !isPlugin && (context.importMultiple || !duplicateImport)) {
              importVisitor.recursionDetector[fullPath] = true;
              var oldContext = this.context;
              this.context = context;
              try {
                this._visitor.visit(root2);
              } catch (e2) {
                this.error = e2;
              }
              this.context = oldContext;
            }
          }
          importVisitor.importCount--;
          if (importVisitor.isFinished) {
            importVisitor._sequencer.tryRun();
          }
        },
        visitDeclaration: function(declNode, visitArgs) {
          if (declNode.value.type === "DetachedRuleset") {
            this.context.frames.unshift(declNode);
          } else {
            visitArgs.visitDeeper = false;
          }
        },
        visitDeclarationOut: function(declNode) {
          if (declNode.value.type === "DetachedRuleset") {
            this.context.frames.shift();
          }
        },
        visitAtRule: function(atRuleNode, visitArgs) {
          if (atRuleNode.value) {
            this.context.frames.unshift(atRuleNode);
          } else if (atRuleNode.declarations && atRuleNode.declarations.length) {
            if (atRuleNode.isRooted) {
              this.context.frames.unshift(atRuleNode);
            } else {
              this.context.frames.unshift(atRuleNode.declarations[0]);
            }
          } else if (atRuleNode.rules && atRuleNode.rules.length) {
            this.context.frames.unshift(atRuleNode);
          }
        },
        visitAtRuleOut: function(atRuleNode) {
          this.context.frames.shift();
        },
        visitMixinDefinition: function(mixinDefinitionNode, visitArgs) {
          this.context.frames.unshift(mixinDefinitionNode);
        },
        visitMixinDefinitionOut: function(mixinDefinitionNode) {
          this.context.frames.shift();
        },
        visitRuleset: function(rulesetNode, visitArgs) {
          this.context.frames.unshift(rulesetNode);
        },
        visitRulesetOut: function(rulesetNode) {
          this.context.frames.shift();
        },
        visitMedia: function(mediaNode, visitArgs) {
          this.context.frames.unshift(mediaNode.rules[0]);
        },
        visitMediaOut: function(mediaNode) {
          this.context.frames.shift();
        }
      };
      var SetTreeVisibilityVisitor = (
        /** @class */
        function() {
          function SetTreeVisibilityVisitor2(visible) {
            this.visible = visible;
          }
          SetTreeVisibilityVisitor2.prototype.run = function(root2) {
            this.visit(root2);
          };
          SetTreeVisibilityVisitor2.prototype.visitArray = function(nodes) {
            if (!nodes) {
              return nodes;
            }
            var cnt = nodes.length;
            var i;
            for (i = 0; i < cnt; i++) {
              this.visit(nodes[i]);
            }
            return nodes;
          };
          SetTreeVisibilityVisitor2.prototype.visit = function(node) {
            if (!node) {
              return node;
            }
            if (node.constructor === Array) {
              return this.visitArray(node);
            }
            if (!node.blocksVisibility || node.blocksVisibility()) {
              return node;
            }
            if (this.visible) {
              node.ensureVisibility();
            } else {
              node.ensureInvisibility();
            }
            node.accept(this);
            return node;
          };
          return SetTreeVisibilityVisitor2;
        }()
      );
      var ExtendFinderVisitor = (
        /** @class */
        function() {
          function ExtendFinderVisitor2() {
            this._visitor = new Visitor(this);
            this.contexts = [];
            this.allExtendsStack = [[]];
          }
          ExtendFinderVisitor2.prototype.run = function(root2) {
            root2 = this._visitor.visit(root2);
            root2.allExtends = this.allExtendsStack[0];
            return root2;
          };
          ExtendFinderVisitor2.prototype.visitDeclaration = function(declNode, visitArgs) {
            visitArgs.visitDeeper = false;
          };
          ExtendFinderVisitor2.prototype.visitMixinDefinition = function(mixinDefinitionNode, visitArgs) {
            visitArgs.visitDeeper = false;
          };
          ExtendFinderVisitor2.prototype.visitRuleset = function(rulesetNode, visitArgs) {
            if (rulesetNode.root) {
              return;
            }
            var i;
            var j;
            var extend;
            var allSelectorsExtendList = [];
            var extendList;
            var rules = rulesetNode.rules, ruleCnt = rules ? rules.length : 0;
            for (i = 0; i < ruleCnt; i++) {
              if (rulesetNode.rules[i] instanceof tree.Extend) {
                allSelectorsExtendList.push(rules[i]);
                rulesetNode.extendOnEveryPath = true;
              }
            }
            var paths = rulesetNode.paths;
            for (i = 0; i < paths.length; i++) {
              var selectorPath = paths[i], selector = selectorPath[selectorPath.length - 1], selExtendList = selector.extendList;
              extendList = selExtendList ? copyArray(selExtendList).concat(allSelectorsExtendList) : allSelectorsExtendList;
              if (extendList) {
                extendList = extendList.map(function(allSelectorsExtend) {
                  return allSelectorsExtend.clone();
                });
              }
              for (j = 0; j < extendList.length; j++) {
                this.foundExtends = true;
                extend = extendList[j];
                extend.findSelfSelectors(selectorPath);
                extend.ruleset = rulesetNode;
                if (j === 0) {
                  extend.firstExtendOnThisSelectorPath = true;
                }
                this.allExtendsStack[this.allExtendsStack.length - 1].push(extend);
              }
            }
            this.contexts.push(rulesetNode.selectors);
          };
          ExtendFinderVisitor2.prototype.visitRulesetOut = function(rulesetNode) {
            if (!rulesetNode.root) {
              this.contexts.length = this.contexts.length - 1;
            }
          };
          ExtendFinderVisitor2.prototype.visitMedia = function(mediaNode, visitArgs) {
            mediaNode.allExtends = [];
            this.allExtendsStack.push(mediaNode.allExtends);
          };
          ExtendFinderVisitor2.prototype.visitMediaOut = function(mediaNode) {
            this.allExtendsStack.length = this.allExtendsStack.length - 1;
          };
          ExtendFinderVisitor2.prototype.visitAtRule = function(atRuleNode, visitArgs) {
            atRuleNode.allExtends = [];
            this.allExtendsStack.push(atRuleNode.allExtends);
          };
          ExtendFinderVisitor2.prototype.visitAtRuleOut = function(atRuleNode) {
            this.allExtendsStack.length = this.allExtendsStack.length - 1;
          };
          return ExtendFinderVisitor2;
        }()
      );
      var ProcessExtendsVisitor = (
        /** @class */
        function() {
          function ProcessExtendsVisitor2() {
            this._visitor = new Visitor(this);
          }
          ProcessExtendsVisitor2.prototype.run = function(root2) {
            var extendFinder = new ExtendFinderVisitor();
            this.extendIndices = {};
            extendFinder.run(root2);
            if (!extendFinder.foundExtends) {
              return root2;
            }
            root2.allExtends = root2.allExtends.concat(this.doExtendChaining(root2.allExtends, root2.allExtends));
            this.allExtendsStack = [root2.allExtends];
            var newRoot = this._visitor.visit(root2);
            this.checkExtendsForNonMatched(root2.allExtends);
            return newRoot;
          };
          ProcessExtendsVisitor2.prototype.checkExtendsForNonMatched = function(extendList) {
            var indices = this.extendIndices;
            extendList.filter(function(extend) {
              return !extend.hasFoundMatches && extend.parent_ids.length == 1;
            }).forEach(function(extend) {
              var selector = "_unknown_";
              try {
                selector = extend.selector.toCSS({});
              } catch (_) {
              }
              if (!indices["".concat(extend.index, " ").concat(selector)]) {
                indices["".concat(extend.index, " ").concat(selector)] = true;
                logger$1.warn("WARNING: extend '".concat(selector, "' has no matches"));
              }
            });
          };
          ProcessExtendsVisitor2.prototype.doExtendChaining = function(extendsList, extendsListTarget, iterationCount) {
            var extendIndex;
            var targetExtendIndex;
            var matches;
            var extendsToAdd = [];
            var newSelector;
            var extendVisitor = this;
            var selectorPath;
            var extend;
            var targetExtend;
            var newExtend;
            iterationCount = iterationCount || 0;
            for (extendIndex = 0; extendIndex < extendsList.length; extendIndex++) {
              for (targetExtendIndex = 0; targetExtendIndex < extendsListTarget.length; targetExtendIndex++) {
                extend = extendsList[extendIndex];
                targetExtend = extendsListTarget[targetExtendIndex];
                if (extend.parent_ids.indexOf(targetExtend.object_id) >= 0) {
                  continue;
                }
                selectorPath = [targetExtend.selfSelectors[0]];
                matches = extendVisitor.findMatch(extend, selectorPath);
                if (matches.length) {
                  extend.hasFoundMatches = true;
                  extend.selfSelectors.forEach(function(selfSelector) {
                    var info = targetExtend.visibilityInfo();
                    newSelector = extendVisitor.extendSelector(matches, selectorPath, selfSelector, extend.isVisible());
                    newExtend = new tree.Extend(targetExtend.selector, targetExtend.option, 0, targetExtend.fileInfo(), info);
                    newExtend.selfSelectors = newSelector;
                    newSelector[newSelector.length - 1].extendList = [newExtend];
                    extendsToAdd.push(newExtend);
                    newExtend.ruleset = targetExtend.ruleset;
                    newExtend.parent_ids = newExtend.parent_ids.concat(targetExtend.parent_ids, extend.parent_ids);
                    if (targetExtend.firstExtendOnThisSelectorPath) {
                      newExtend.firstExtendOnThisSelectorPath = true;
                      targetExtend.ruleset.paths.push(newSelector);
                    }
                  });
                }
              }
            }
            if (extendsToAdd.length) {
              this.extendChainCount++;
              if (iterationCount > 100) {
                var selectorOne = "{unable to calculate}";
                var selectorTwo = "{unable to calculate}";
                try {
                  selectorOne = extendsToAdd[0].selfSelectors[0].toCSS();
                  selectorTwo = extendsToAdd[0].selector.toCSS();
                } catch (e) {
                }
                throw { message: "extend circular reference detected. One of the circular extends is currently:".concat(selectorOne, ":extend(").concat(selectorTwo, ")") };
              }
              return extendsToAdd.concat(extendVisitor.doExtendChaining(extendsToAdd, extendsListTarget, iterationCount + 1));
            } else {
              return extendsToAdd;
            }
          };
          ProcessExtendsVisitor2.prototype.visitDeclaration = function(ruleNode, visitArgs) {
            visitArgs.visitDeeper = false;
          };
          ProcessExtendsVisitor2.prototype.visitMixinDefinition = function(mixinDefinitionNode, visitArgs) {
            visitArgs.visitDeeper = false;
          };
          ProcessExtendsVisitor2.prototype.visitSelector = function(selectorNode, visitArgs) {
            visitArgs.visitDeeper = false;
          };
          ProcessExtendsVisitor2.prototype.visitRuleset = function(rulesetNode, visitArgs) {
            if (rulesetNode.root) {
              return;
            }
            var matches;
            var pathIndex;
            var extendIndex;
            var allExtends = this.allExtendsStack[this.allExtendsStack.length - 1];
            var selectorsToAdd = [];
            var extendVisitor = this;
            var selectorPath;
            for (extendIndex = 0; extendIndex < allExtends.length; extendIndex++) {
              for (pathIndex = 0; pathIndex < rulesetNode.paths.length; pathIndex++) {
                selectorPath = rulesetNode.paths[pathIndex];
                if (rulesetNode.extendOnEveryPath) {
                  continue;
                }
                var extendList = selectorPath[selectorPath.length - 1].extendList;
                if (extendList && extendList.length) {
                  continue;
                }
                matches = this.findMatch(allExtends[extendIndex], selectorPath);
                if (matches.length) {
                  allExtends[extendIndex].hasFoundMatches = true;
                  allExtends[extendIndex].selfSelectors.forEach(function(selfSelector) {
                    var extendedSelectors;
                    extendedSelectors = extendVisitor.extendSelector(matches, selectorPath, selfSelector, allExtends[extendIndex].isVisible());
                    selectorsToAdd.push(extendedSelectors);
                  });
                }
              }
            }
            rulesetNode.paths = rulesetNode.paths.concat(selectorsToAdd);
          };
          ProcessExtendsVisitor2.prototype.findMatch = function(extend, haystackSelectorPath) {
            var haystackSelectorIndex;
            var hackstackSelector;
            var hackstackElementIndex;
            var haystackElement;
            var targetCombinator;
            var i;
            var extendVisitor = this;
            var needleElements = extend.selector.elements;
            var potentialMatches = [];
            var potentialMatch;
            var matches = [];
            for (haystackSelectorIndex = 0; haystackSelectorIndex < haystackSelectorPath.length; haystackSelectorIndex++) {
              hackstackSelector = haystackSelectorPath[haystackSelectorIndex];
              for (hackstackElementIndex = 0; hackstackElementIndex < hackstackSelector.elements.length; hackstackElementIndex++) {
                haystackElement = hackstackSelector.elements[hackstackElementIndex];
                if (extend.allowBefore || haystackSelectorIndex === 0 && hackstackElementIndex === 0) {
                  potentialMatches.push({
                    pathIndex: haystackSelectorIndex,
                    index: hackstackElementIndex,
                    matched: 0,
                    initialCombinator: haystackElement.combinator
                  });
                }
                for (i = 0; i < potentialMatches.length; i++) {
                  potentialMatch = potentialMatches[i];
                  targetCombinator = haystackElement.combinator.value;
                  if (targetCombinator === "" && hackstackElementIndex === 0) {
                    targetCombinator = " ";
                  }
                  if (!extendVisitor.isElementValuesEqual(needleElements[potentialMatch.matched].value, haystackElement.value) || potentialMatch.matched > 0 && needleElements[potentialMatch.matched].combinator.value !== targetCombinator) {
                    potentialMatch = null;
                  } else {
                    potentialMatch.matched++;
                  }
                  if (potentialMatch) {
                    potentialMatch.finished = potentialMatch.matched === needleElements.length;
                    if (potentialMatch.finished && (!extend.allowAfter && (hackstackElementIndex + 1 < hackstackSelector.elements.length || haystackSelectorIndex + 1 < haystackSelectorPath.length))) {
                      potentialMatch = null;
                    }
                  }
                  if (potentialMatch) {
                    if (potentialMatch.finished) {
                      potentialMatch.length = needleElements.length;
                      potentialMatch.endPathIndex = haystackSelectorIndex;
                      potentialMatch.endPathElementIndex = hackstackElementIndex + 1;
                      potentialMatches.length = 0;
                      matches.push(potentialMatch);
                    }
                  } else {
                    potentialMatches.splice(i, 1);
                    i--;
                  }
                }
              }
            }
            return matches;
          };
          ProcessExtendsVisitor2.prototype.isElementValuesEqual = function(elementValue1, elementValue2) {
            if (typeof elementValue1 === "string" || typeof elementValue2 === "string") {
              return elementValue1 === elementValue2;
            }
            if (elementValue1 instanceof tree.Attribute) {
              if (elementValue1.op !== elementValue2.op || elementValue1.key !== elementValue2.key) {
                return false;
              }
              if (!elementValue1.value || !elementValue2.value) {
                if (elementValue1.value || elementValue2.value) {
                  return false;
                }
                return true;
              }
              elementValue1 = elementValue1.value.value || elementValue1.value;
              elementValue2 = elementValue2.value.value || elementValue2.value;
              return elementValue1 === elementValue2;
            }
            elementValue1 = elementValue1.value;
            elementValue2 = elementValue2.value;
            if (elementValue1 instanceof tree.Selector) {
              if (!(elementValue2 instanceof tree.Selector) || elementValue1.elements.length !== elementValue2.elements.length) {
                return false;
              }
              for (var i_1 = 0; i_1 < elementValue1.elements.length; i_1++) {
                if (elementValue1.elements[i_1].combinator.value !== elementValue2.elements[i_1].combinator.value) {
                  if (i_1 !== 0 || (elementValue1.elements[i_1].combinator.value || " ") !== (elementValue2.elements[i_1].combinator.value || " ")) {
                    return false;
                  }
                }
                if (!this.isElementValuesEqual(elementValue1.elements[i_1].value, elementValue2.elements[i_1].value)) {
                  return false;
                }
              }
              return true;
            }
            return false;
          };
          ProcessExtendsVisitor2.prototype.extendSelector = function(matches, selectorPath, replacementSelector, isVisible) {
            var currentSelectorPathIndex = 0, currentSelectorPathElementIndex = 0, path = [], matchIndex, selector, firstElement, match, newElements;
            for (matchIndex = 0; matchIndex < matches.length; matchIndex++) {
              match = matches[matchIndex];
              selector = selectorPath[match.pathIndex];
              firstElement = new tree.Element(match.initialCombinator, replacementSelector.elements[0].value, replacementSelector.elements[0].isVariable, replacementSelector.elements[0].getIndex(), replacementSelector.elements[0].fileInfo());
              if (match.pathIndex > currentSelectorPathIndex && currentSelectorPathElementIndex > 0) {
                path[path.length - 1].elements = path[path.length - 1].elements.concat(selectorPath[currentSelectorPathIndex].elements.slice(currentSelectorPathElementIndex));
                currentSelectorPathElementIndex = 0;
                currentSelectorPathIndex++;
              }
              newElements = selector.elements.slice(currentSelectorPathElementIndex, match.index).concat([firstElement]).concat(replacementSelector.elements.slice(1));
              if (currentSelectorPathIndex === match.pathIndex && matchIndex > 0) {
                path[path.length - 1].elements = path[path.length - 1].elements.concat(newElements);
              } else {
                path = path.concat(selectorPath.slice(currentSelectorPathIndex, match.pathIndex));
                path.push(new tree.Selector(newElements));
              }
              currentSelectorPathIndex = match.endPathIndex;
              currentSelectorPathElementIndex = match.endPathElementIndex;
              if (currentSelectorPathElementIndex >= selectorPath[currentSelectorPathIndex].elements.length) {
                currentSelectorPathElementIndex = 0;
                currentSelectorPathIndex++;
              }
            }
            if (currentSelectorPathIndex < selectorPath.length && currentSelectorPathElementIndex > 0) {
              path[path.length - 1].elements = path[path.length - 1].elements.concat(selectorPath[currentSelectorPathIndex].elements.slice(currentSelectorPathElementIndex));
              currentSelectorPathIndex++;
            }
            path = path.concat(selectorPath.slice(currentSelectorPathIndex, selectorPath.length));
            path = path.map(function(currentValue) {
              var derived = currentValue.createDerived(currentValue.elements);
              if (isVisible) {
                derived.ensureVisibility();
              } else {
                derived.ensureInvisibility();
              }
              return derived;
            });
            return path;
          };
          ProcessExtendsVisitor2.prototype.visitMedia = function(mediaNode, visitArgs) {
            var newAllExtends = mediaNode.allExtends.concat(this.allExtendsStack[this.allExtendsStack.length - 1]);
            newAllExtends = newAllExtends.concat(this.doExtendChaining(newAllExtends, mediaNode.allExtends));
            this.allExtendsStack.push(newAllExtends);
          };
          ProcessExtendsVisitor2.prototype.visitMediaOut = function(mediaNode) {
            var lastIndex = this.allExtendsStack.length - 1;
            this.allExtendsStack.length = lastIndex;
          };
          ProcessExtendsVisitor2.prototype.visitAtRule = function(atRuleNode, visitArgs) {
            var newAllExtends = atRuleNode.allExtends.concat(this.allExtendsStack[this.allExtendsStack.length - 1]);
            newAllExtends = newAllExtends.concat(this.doExtendChaining(newAllExtends, atRuleNode.allExtends));
            this.allExtendsStack.push(newAllExtends);
          };
          ProcessExtendsVisitor2.prototype.visitAtRuleOut = function(atRuleNode) {
            var lastIndex = this.allExtendsStack.length - 1;
            this.allExtendsStack.length = lastIndex;
          };
          return ProcessExtendsVisitor2;
        }()
      );
      var JoinSelectorVisitor = (
        /** @class */
        function() {
          function JoinSelectorVisitor2() {
            this.contexts = [[]];
            this._visitor = new Visitor(this);
          }
          JoinSelectorVisitor2.prototype.run = function(root2) {
            return this._visitor.visit(root2);
          };
          JoinSelectorVisitor2.prototype.visitDeclaration = function(declNode, visitArgs) {
            visitArgs.visitDeeper = false;
          };
          JoinSelectorVisitor2.prototype.visitMixinDefinition = function(mixinDefinitionNode, visitArgs) {
            visitArgs.visitDeeper = false;
          };
          JoinSelectorVisitor2.prototype.visitRuleset = function(rulesetNode, visitArgs) {
            var context = this.contexts[this.contexts.length - 1];
            var paths = [];
            var selectors;
            this.contexts.push(paths);
            if (!rulesetNode.root) {
              selectors = rulesetNode.selectors;
              if (selectors) {
                selectors = selectors.filter(function(selector) {
                  return selector.getIsOutput();
                });
                rulesetNode.selectors = selectors.length ? selectors : selectors = null;
                if (selectors) {
                  rulesetNode.joinSelectors(paths, context, selectors);
                }
              }
              if (!selectors) {
                rulesetNode.rules = null;
              }
              rulesetNode.paths = paths;
            }
          };
          JoinSelectorVisitor2.prototype.visitRulesetOut = function(rulesetNode) {
            this.contexts.length = this.contexts.length - 1;
          };
          JoinSelectorVisitor2.prototype.visitMedia = function(mediaNode, visitArgs) {
            var context = this.contexts[this.contexts.length - 1];
            mediaNode.rules[0].root = context.length === 0 || context[0].multiMedia;
          };
          JoinSelectorVisitor2.prototype.visitAtRule = function(atRuleNode, visitArgs) {
            var context = this.contexts[this.contexts.length - 1];
            if (atRuleNode.declarations && atRuleNode.declarations.length) {
              atRuleNode.declarations[0].root = context.length === 0 || context[0].multiMedia;
            } else if (atRuleNode.rules && atRuleNode.rules.length) {
              atRuleNode.rules[0].root = atRuleNode.isRooted || context.length === 0 || null;
            }
          };
          return JoinSelectorVisitor2;
        }()
      );
      var CSSVisitorUtils = (
        /** @class */
        function() {
          function CSSVisitorUtils2(context) {
            this._visitor = new Visitor(this);
            this._context = context;
          }
          CSSVisitorUtils2.prototype.containsSilentNonBlockedChild = function(bodyRules) {
            var rule;
            if (!bodyRules) {
              return false;
            }
            for (var r = 0; r < bodyRules.length; r++) {
              rule = bodyRules[r];
              if (rule.isSilent && rule.isSilent(this._context) && !rule.blocksVisibility()) {
                return true;
              }
            }
            return false;
          };
          CSSVisitorUtils2.prototype.keepOnlyVisibleChilds = function(owner) {
            if (owner && owner.rules) {
              owner.rules = owner.rules.filter(function(thing) {
                return thing.isVisible();
              });
            }
          };
          CSSVisitorUtils2.prototype.isEmpty = function(owner) {
            return owner && owner.rules ? owner.rules.length === 0 : true;
          };
          CSSVisitorUtils2.prototype.hasVisibleSelector = function(rulesetNode) {
            return rulesetNode && rulesetNode.paths ? rulesetNode.paths.length > 0 : false;
          };
          CSSVisitorUtils2.prototype.resolveVisibility = function(node) {
            if (!node.blocksVisibility()) {
              if (this.isEmpty(node)) {
                return;
              }
              return node;
            }
            var compiledRulesBody = node.rules[0];
            this.keepOnlyVisibleChilds(compiledRulesBody);
            if (this.isEmpty(compiledRulesBody)) {
              return;
            }
            node.ensureVisibility();
            node.removeVisibilityBlock();
            return node;
          };
          CSSVisitorUtils2.prototype.isVisibleRuleset = function(rulesetNode) {
            if (rulesetNode.firstRoot) {
              return true;
            }
            if (this.isEmpty(rulesetNode)) {
              return false;
            }
            if (!rulesetNode.root && !this.hasVisibleSelector(rulesetNode)) {
              return false;
            }
            return true;
          };
          return CSSVisitorUtils2;
        }()
      );
      var ToCSSVisitor = function(context) {
        this._visitor = new Visitor(this);
        this._context = context;
        this.utils = new CSSVisitorUtils(context);
      };
      ToCSSVisitor.prototype = {
        isReplacing: true,
        run: function(root2) {
          return this._visitor.visit(root2);
        },
        visitDeclaration: function(declNode, visitArgs) {
          if (declNode.blocksVisibility() || declNode.variable) {
            return;
          }
          return declNode;
        },
        visitMixinDefinition: function(mixinNode, visitArgs) {
          mixinNode.frames = [];
        },
        visitExtend: function(extendNode, visitArgs) {
        },
        visitComment: function(commentNode, visitArgs) {
          if (commentNode.blocksVisibility() || commentNode.isSilent(this._context)) {
            return;
          }
          return commentNode;
        },
        visitMedia: function(mediaNode, visitArgs) {
          var originalRules = mediaNode.rules[0].rules;
          mediaNode.accept(this._visitor);
          visitArgs.visitDeeper = false;
          return this.utils.resolveVisibility(mediaNode, originalRules);
        },
        visitImport: function(importNode, visitArgs) {
          if (importNode.blocksVisibility()) {
            return;
          }
          return importNode;
        },
        visitAtRule: function(atRuleNode, visitArgs) {
          if (atRuleNode.rules && atRuleNode.rules.length) {
            return this.visitAtRuleWithBody(atRuleNode, visitArgs);
          } else {
            return this.visitAtRuleWithoutBody(atRuleNode, visitArgs);
          }
        },
        visitAnonymous: function(anonymousNode, visitArgs) {
          if (!anonymousNode.blocksVisibility()) {
            anonymousNode.accept(this._visitor);
            return anonymousNode;
          }
        },
        visitAtRuleWithBody: function(atRuleNode, visitArgs) {
          function hasFakeRuleset(atRuleNode2) {
            var bodyRules = atRuleNode2.rules;
            return bodyRules.length === 1 && (!bodyRules[0].paths || bodyRules[0].paths.length === 0);
          }
          function getBodyRules(atRuleNode2) {
            var nodeRules = atRuleNode2.rules;
            if (hasFakeRuleset(atRuleNode2)) {
              return nodeRules[0].rules;
            }
            return nodeRules;
          }
          var originalRules = getBodyRules(atRuleNode);
          atRuleNode.accept(this._visitor);
          visitArgs.visitDeeper = false;
          if (!this.utils.isEmpty(atRuleNode)) {
            this._mergeRules(atRuleNode.rules[0].rules);
          }
          return this.utils.resolveVisibility(atRuleNode, originalRules);
        },
        visitAtRuleWithoutBody: function(atRuleNode, visitArgs) {
          if (atRuleNode.blocksVisibility()) {
            return;
          }
          if (atRuleNode.name === "@charset") {
            if (this.charset) {
              if (atRuleNode.debugInfo) {
                var comment = new tree.Comment("/* ".concat(atRuleNode.toCSS(this._context).replace(/\n/g, ""), " */\n"));
                comment.debugInfo = atRuleNode.debugInfo;
                return this._visitor.visit(comment);
              }
              return;
            }
            this.charset = true;
          }
          return atRuleNode;
        },
        checkValidNodes: function(rules, isRoot) {
          if (!rules) {
            return;
          }
          for (var i_1 = 0; i_1 < rules.length; i_1++) {
            var ruleNode = rules[i_1];
            if (isRoot && ruleNode instanceof tree.Declaration && !ruleNode.variable) {
              throw {
                message: "Properties must be inside selector blocks. They cannot be in the root",
                index: ruleNode.getIndex(),
                filename: ruleNode.fileInfo() && ruleNode.fileInfo().filename
              };
            }
            if (ruleNode instanceof tree.Call) {
              throw {
                message: "Function '".concat(ruleNode.name, "' did not return a root node"),
                index: ruleNode.getIndex(),
                filename: ruleNode.fileInfo() && ruleNode.fileInfo().filename
              };
            }
            if (ruleNode.type && !ruleNode.allowRoot) {
              throw {
                message: "".concat(ruleNode.type, " node returned by a function is not valid here"),
                index: ruleNode.getIndex(),
                filename: ruleNode.fileInfo() && ruleNode.fileInfo().filename
              };
            }
          }
        },
        visitRuleset: function(rulesetNode, visitArgs) {
          var rule;
          var rulesets = [];
          this.checkValidNodes(rulesetNode.rules, rulesetNode.firstRoot);
          if (!rulesetNode.root) {
            this._compileRulesetPaths(rulesetNode);
            var nodeRules = rulesetNode.rules;
            var nodeRuleCnt = nodeRules ? nodeRules.length : 0;
            for (var i_2 = 0; i_2 < nodeRuleCnt; ) {
              rule = nodeRules[i_2];
              if (rule && rule.rules) {
                rulesets.push(this._visitor.visit(rule));
                nodeRules.splice(i_2, 1);
                nodeRuleCnt--;
                continue;
              }
              i_2++;
            }
            if (nodeRuleCnt > 0) {
              rulesetNode.accept(this._visitor);
            } else {
              rulesetNode.rules = null;
            }
            visitArgs.visitDeeper = false;
          } else {
            rulesetNode.accept(this._visitor);
            visitArgs.visitDeeper = false;
          }
          if (rulesetNode.rules) {
            this._mergeRules(rulesetNode.rules);
            this._removeDuplicateRules(rulesetNode.rules);
          }
          if (this.utils.isVisibleRuleset(rulesetNode)) {
            rulesetNode.ensureVisibility();
            rulesets.splice(0, 0, rulesetNode);
          }
          if (rulesets.length === 1) {
            return rulesets[0];
          }
          return rulesets;
        },
        _compileRulesetPaths: function(rulesetNode) {
          if (rulesetNode.paths) {
            rulesetNode.paths = rulesetNode.paths.filter(function(p) {
              var i;
              if (p[0].elements[0].combinator.value === " ") {
                p[0].elements[0].combinator = new tree.Combinator("");
              }
              for (i = 0; i < p.length; i++) {
                if (p[i].isVisible() && p[i].getIsOutput()) {
                  return true;
                }
              }
              return false;
            });
          }
        },
        _removeDuplicateRules: function(rules) {
          if (!rules) {
            return;
          }
          var ruleCache = {};
          var ruleList;
          var rule;
          var i;
          for (i = rules.length - 1; i >= 0; i--) {
            rule = rules[i];
            if (rule instanceof tree.Declaration) {
              if (!ruleCache[rule.name]) {
                ruleCache[rule.name] = rule;
              } else {
                ruleList = ruleCache[rule.name];
                if (ruleList instanceof tree.Declaration) {
                  ruleList = ruleCache[rule.name] = [ruleCache[rule.name].toCSS(this._context)];
                }
                var ruleCSS = rule.toCSS(this._context);
                if (ruleList.indexOf(ruleCSS) !== -1) {
                  rules.splice(i, 1);
                } else {
                  ruleList.push(ruleCSS);
                }
              }
            }
          }
        },
        _mergeRules: function(rules) {
          if (!rules) {
            return;
          }
          var groups = {};
          var groupsArr = [];
          for (var i_3 = 0; i_3 < rules.length; i_3++) {
            var rule = rules[i_3];
            if (rule.merge) {
              var key2 = rule.name;
              groups[key2] ? rules.splice(i_3--, 1) : groupsArr.push(groups[key2] = []);
              groups[key2].push(rule);
            }
          }
          groupsArr.forEach(function(group) {
            if (group.length > 0) {
              var result_1 = group[0];
              var space_1 = [];
              var comma_1 = [new tree.Expression(space_1)];
              group.forEach(function(rule2) {
                if (rule2.merge === "+" && space_1.length > 0) {
                  comma_1.push(new tree.Expression(space_1 = []));
                }
                space_1.push(rule2.value);
                result_1.important = result_1.important || rule2.important;
              });
              result_1.value = new tree.Value(comma_1);
            }
          });
        }
      };
      var visitors = {
        Visitor,
        ImportVisitor,
        MarkVisibleSelectorsVisitor: SetTreeVisibilityVisitor,
        ExtendVisitor: ProcessExtendsVisitor,
        JoinSelectorVisitor,
        ToCSSVisitor
      };
      var getParserInput = function() {
        var input;
        var j;
        var saveStack = [];
        var furthest;
        var furthestPossibleErrorMessage;
        var chunks;
        var current;
        var currentPos;
        var parserInput = {};
        var CHARCODE_SPACE = 32;
        var CHARCODE_TAB = 9;
        var CHARCODE_LF = 10;
        var CHARCODE_CR = 13;
        var CHARCODE_PLUS = 43;
        var CHARCODE_COMMA = 44;
        var CHARCODE_FORWARD_SLASH = 47;
        var CHARCODE_9 = 57;
        function skipWhitespace(length) {
          var oldi = parserInput.i;
          var oldj = j;
          var curr = parserInput.i - currentPos;
          var endIndex = parserInput.i + current.length - curr;
          var mem = parserInput.i += length;
          var inp = input;
          var c;
          var nextChar;
          var comment;
          for (; parserInput.i < endIndex; parserInput.i++) {
            c = inp.charCodeAt(parserInput.i);
            if (parserInput.autoCommentAbsorb && c === CHARCODE_FORWARD_SLASH) {
              nextChar = inp.charAt(parserInput.i + 1);
              if (nextChar === "/") {
                comment = { index: parserInput.i, isLineComment: true };
                var nextNewLine = inp.indexOf("\n", parserInput.i + 2);
                if (nextNewLine < 0) {
                  nextNewLine = endIndex;
                }
                parserInput.i = nextNewLine;
                comment.text = inp.substr(comment.index, parserInput.i - comment.index);
                parserInput.commentStore.push(comment);
                continue;
              } else if (nextChar === "*") {
                var nextStarSlash = inp.indexOf("*/", parserInput.i + 2);
                if (nextStarSlash >= 0) {
                  comment = {
                    index: parserInput.i,
                    text: inp.substr(parserInput.i, nextStarSlash + 2 - parserInput.i),
                    isLineComment: false
                  };
                  parserInput.i += comment.text.length - 1;
                  parserInput.commentStore.push(comment);
                  continue;
                }
              }
              break;
            }
            if (c !== CHARCODE_SPACE && c !== CHARCODE_LF && c !== CHARCODE_TAB && c !== CHARCODE_CR) {
              break;
            }
          }
          current = current.slice(length + parserInput.i - mem + curr);
          currentPos = parserInput.i;
          if (!current.length) {
            if (j < chunks.length - 1) {
              current = chunks[++j];
              skipWhitespace(0);
              return true;
            }
            parserInput.finished = true;
          }
          return oldi !== parserInput.i || oldj !== j;
        }
        parserInput.save = function() {
          currentPos = parserInput.i;
          saveStack.push({ current, i: parserInput.i, j });
        };
        parserInput.restore = function(possibleErrorMessage) {
          if (parserInput.i > furthest || parserInput.i === furthest && possibleErrorMessage && !furthestPossibleErrorMessage) {
            furthest = parserInput.i;
            furthestPossibleErrorMessage = possibleErrorMessage;
          }
          var state = saveStack.pop();
          current = state.current;
          currentPos = parserInput.i = state.i;
          j = state.j;
        };
        parserInput.forget = function() {
          saveStack.pop();
        };
        parserInput.isWhitespace = function(offset) {
          var pos = parserInput.i + (offset || 0);
          var code = input.charCodeAt(pos);
          return code === CHARCODE_SPACE || code === CHARCODE_CR || code === CHARCODE_TAB || code === CHARCODE_LF;
        };
        parserInput.$re = function(tok) {
          if (parserInput.i > currentPos) {
            current = current.slice(parserInput.i - currentPos);
            currentPos = parserInput.i;
          }
          var m = tok.exec(current);
          if (!m) {
            return null;
          }
          skipWhitespace(m[0].length);
          if (typeof m === "string") {
            return m;
          }
          return m.length === 1 ? m[0] : m;
        };
        parserInput.$char = function(tok) {
          if (input.charAt(parserInput.i) !== tok) {
            return null;
          }
          skipWhitespace(1);
          return tok;
        };
        parserInput.$peekChar = function(tok) {
          if (input.charAt(parserInput.i) !== tok) {
            return null;
          }
          return tok;
        };
        parserInput.$str = function(tok) {
          var tokLength = tok.length;
          for (var i_1 = 0; i_1 < tokLength; i_1++) {
            if (input.charAt(parserInput.i + i_1) !== tok.charAt(i_1)) {
              return null;
            }
          }
          skipWhitespace(tokLength);
          return tok;
        };
        parserInput.$quoted = function(loc) {
          var pos = loc || parserInput.i;
          var startChar = input.charAt(pos);
          if (startChar !== "'" && startChar !== '"') {
            return;
          }
          var length = input.length;
          var currentPosition = pos;
          for (var i_2 = 1; i_2 + currentPosition < length; i_2++) {
            var nextChar = input.charAt(i_2 + currentPosition);
            switch (nextChar) {
              case "\\":
                i_2++;
                continue;
              case "\r":
              case "\n":
                break;
              case startChar: {
                var str = input.substr(currentPosition, i_2 + 1);
                if (!loc && loc !== 0) {
                  skipWhitespace(i_2 + 1);
                  return str;
                }
                return [startChar, str];
              }
            }
          }
          return null;
        };
        parserInput.$parseUntil = function(tok) {
          var quote = "";
          var returnVal = null;
          var inComment = false;
          var blockDepth = 0;
          var blockStack = [];
          var parseGroups = [];
          var length = input.length;
          var startPos = parserInput.i;
          var lastPos = parserInput.i;
          var i = parserInput.i;
          var loop = true;
          var testChar;
          if (typeof tok === "string") {
            testChar = function(char) {
              return char === tok;
            };
          } else {
            testChar = function(char) {
              return tok.test(char);
            };
          }
          do {
            var nextChar = input.charAt(i);
            if (blockDepth === 0 && testChar(nextChar)) {
              returnVal = input.substr(lastPos, i - lastPos);
              if (returnVal) {
                parseGroups.push(returnVal);
              } else {
                parseGroups.push(" ");
              }
              returnVal = parseGroups;
              skipWhitespace(i - startPos);
              loop = false;
            } else {
              if (inComment) {
                if (nextChar === "*" && input.charAt(i + 1) === "/") {
                  i++;
                  blockDepth--;
                  inComment = false;
                }
                i++;
                continue;
              }
              switch (nextChar) {
                case "\\":
                  i++;
                  nextChar = input.charAt(i);
                  parseGroups.push(input.substr(lastPos, i - lastPos + 1));
                  lastPos = i + 1;
                  break;
                case "/":
                  if (input.charAt(i + 1) === "*") {
                    i++;
                    inComment = true;
                    blockDepth++;
                  }
                  break;
                case "'":
                case '"':
                  quote = parserInput.$quoted(i);
                  if (quote) {
                    parseGroups.push(input.substr(lastPos, i - lastPos), quote);
                    i += quote[1].length - 1;
                    lastPos = i + 1;
                  } else {
                    skipWhitespace(i - startPos);
                    returnVal = nextChar;
                    loop = false;
                  }
                  break;
                case "{":
                  blockStack.push("}");
                  blockDepth++;
                  break;
                case "(":
                  blockStack.push(")");
                  blockDepth++;
                  break;
                case "[":
                  blockStack.push("]");
                  blockDepth++;
                  break;
                case "}":
                case ")":
                case "]": {
                  var expected = blockStack.pop();
                  if (nextChar === expected) {
                    blockDepth--;
                  } else {
                    skipWhitespace(i - startPos);
                    returnVal = expected;
                    loop = false;
                  }
                }
              }
              i++;
              if (i > length) {
                loop = false;
              }
            }
          } while (loop);
          return returnVal ? returnVal : null;
        };
        parserInput.autoCommentAbsorb = true;
        parserInput.commentStore = [];
        parserInput.finished = false;
        parserInput.peek = function(tok) {
          if (typeof tok === "string") {
            for (var i_3 = 0; i_3 < tok.length; i_3++) {
              if (input.charAt(parserInput.i + i_3) !== tok.charAt(i_3)) {
                return false;
              }
            }
            return true;
          } else {
            return tok.test(current);
          }
        };
        parserInput.peekChar = function(tok) {
          return input.charAt(parserInput.i) === tok;
        };
        parserInput.currentChar = function() {
          return input.charAt(parserInput.i);
        };
        parserInput.prevChar = function() {
          return input.charAt(parserInput.i - 1);
        };
        parserInput.getInput = function() {
          return input;
        };
        parserInput.peekNotNumeric = function() {
          var c = input.charCodeAt(parserInput.i);
          return c > CHARCODE_9 || c < CHARCODE_PLUS || c === CHARCODE_FORWARD_SLASH || c === CHARCODE_COMMA;
        };
        parserInput.start = function(str) {
          input = str;
          parserInput.i = j = currentPos = furthest = 0;
          chunks = [str];
          current = chunks[0];
          skipWhitespace(0);
        };
        parserInput.end = function() {
          var message;
          var isFinished = parserInput.i >= input.length;
          if (parserInput.i < furthest) {
            message = furthestPossibleErrorMessage;
            parserInput.i = furthest;
          }
          return {
            isFinished,
            furthest: parserInput.i,
            furthestPossibleErrorMessage: message,
            furthestReachedEnd: parserInput.i >= input.length - 1,
            furthestChar: input[parserInput.i]
          };
        };
        return parserInput;
      };
      function makeRegistry(base) {
        return {
          _data: {},
          add: function(name, func) {
            name = name.toLowerCase();
            if (this._data.hasOwnProperty(name))
              ;
            this._data[name] = func;
          },
          addMultiple: function(functions2) {
            var _this = this;
            Object.keys(functions2).forEach(function(name) {
              _this.add(name, functions2[name]);
            });
          },
          get: function(name) {
            return this._data[name] || base && base.get(name);
          },
          getLocalFunctions: function() {
            return this._data;
          },
          inherit: function() {
            return makeRegistry(this);
          },
          create: function(base2) {
            return makeRegistry(base2);
          }
        };
      }
      var functionRegistry = makeRegistry(null);
      var MediaSyntaxOptions = {
        queryInParens: true
      };
      var ContainerSyntaxOptions = {
        queryInParens: true
      };
      var Anonymous = function(value, index, currentFileInfo, mapLines, rulesetLike, visibilityInfo) {
        this.value = value;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.mapLines = mapLines;
        this.rulesetLike = typeof rulesetLike === "undefined" ? false : rulesetLike;
        this.allowRoot = true;
        this.copyVisibilityInfo(visibilityInfo);
      };
      Anonymous.prototype = Object.assign(new Node(), {
        type: "Anonymous",
        eval: function() {
          return new Anonymous(this.value, this._index, this._fileInfo, this.mapLines, this.rulesetLike, this.visibilityInfo());
        },
        compare: function(other) {
          return other.toCSS && this.toCSS() === other.toCSS() ? 0 : void 0;
        },
        isRulesetLike: function() {
          return this.rulesetLike;
        },
        genCSS: function(context, output) {
          this.nodeVisible = Boolean(this.value);
          if (this.nodeVisible) {
            output.add(this.value, this._fileInfo, this._index, this.mapLines);
          }
        }
      });
      var Parser = function Parser2(context, imports, fileInfo, currentIndex) {
        currentIndex = currentIndex || 0;
        var parsers;
        var parserInput = getParserInput();
        function error(msg, type) {
          throw new LessError({
            index: parserInput.i,
            filename: fileInfo.filename,
            type: type || "Syntax",
            message: msg
          }, imports);
        }
        function warn(msg, index, type) {
          if (!context.quiet) {
            logger$1.warn(new LessError({
              index: index !== null && index !== void 0 ? index : parserInput.i,
              filename: fileInfo.filename,
              type: type ? "".concat(type.toUpperCase(), " WARNING") : "WARNING",
              message: msg
            }, imports).toString());
          }
        }
        function expect(arg, msg) {
          var result = arg instanceof Function ? arg.call(parsers) : parserInput.$re(arg);
          if (result) {
            return result;
          }
          error(msg || (typeof arg === "string" ? "expected '".concat(arg, "' got '").concat(parserInput.currentChar(), "'") : "unexpected token"));
        }
        function expectChar(arg, msg) {
          if (parserInput.$char(arg)) {
            return arg;
          }
          error(msg || "expected '".concat(arg, "' got '").concat(parserInput.currentChar(), "'"));
        }
        function getDebugInfo(index) {
          var filename = fileInfo.filename;
          return {
            lineNumber: getLocation(index, parserInput.getInput()).line + 1,
            fileName: filename
          };
        }
        function parseNode(str, parseList, callback) {
          var result;
          var returnNodes = [];
          var parser = parserInput;
          try {
            parser.start(str);
            for (var x = 0, p = void 0; p = parseList[x]; x++) {
              result = parsers[p]();
              returnNodes.push(result || null);
            }
            var endInfo = parser.end();
            if (endInfo.isFinished) {
              callback(null, returnNodes);
            } else {
              callback(true, null);
            }
          } catch (e) {
            throw new LessError({
              index: e.index + currentIndex,
              message: e.message
            }, imports, fileInfo.filename);
          }
        }
        return {
          parserInput,
          imports,
          fileInfo,
          parseNode,
          //
          // Parse an input string into an abstract syntax tree,
          // @param str A string containing 'less' markup
          // @param callback call `callback` when done.
          // @param [additionalData] An optional map which can contains vars - a map (key, value) of variables to apply
          //
          parse: function(str, callback, additionalData) {
            var root2;
            var err = null;
            var globalVars;
            var modifyVars;
            var ignored;
            var preText = "";
            if (additionalData && additionalData.disablePluginRule) {
              parsers.plugin = function() {
                var dir = parserInput.$re(/^@plugin?\s+/);
                if (dir) {
                  error("@plugin statements are not allowed when disablePluginRule is set to true");
                }
              };
            }
            globalVars = additionalData && additionalData.globalVars ? "".concat(Parser2.serializeVars(additionalData.globalVars), "\n") : "";
            modifyVars = additionalData && additionalData.modifyVars ? "\n".concat(Parser2.serializeVars(additionalData.modifyVars)) : "";
            if (context.pluginManager) {
              var preProcessors = context.pluginManager.getPreProcessors();
              for (var i_1 = 0; i_1 < preProcessors.length; i_1++) {
                str = preProcessors[i_1].process(str, { context, imports, fileInfo });
              }
            }
            if (globalVars || additionalData && additionalData.banner) {
              preText = (additionalData && additionalData.banner ? additionalData.banner : "") + globalVars;
              ignored = imports.contentsIgnoredChars;
              ignored[fileInfo.filename] = ignored[fileInfo.filename] || 0;
              ignored[fileInfo.filename] += preText.length;
            }
            str = str.replace(/\r\n?/g, "\n");
            str = preText + str.replace(/^\uFEFF/, "") + modifyVars;
            imports.contents[fileInfo.filename] = str;
            try {
              parserInput.start(str);
              tree.Node.prototype.parse = this;
              root2 = new tree.Ruleset(null, this.parsers.primary());
              tree.Node.prototype.rootNode = root2;
              root2.root = true;
              root2.firstRoot = true;
              root2.functionRegistry = functionRegistry.inherit();
            } catch (e) {
              return callback(new LessError(e, imports, fileInfo.filename));
            }
            var endInfo = parserInput.end();
            if (!endInfo.isFinished) {
              var message = endInfo.furthestPossibleErrorMessage;
              if (!message) {
                message = "Unrecognised input";
                if (endInfo.furthestChar === "}") {
                  message += ". Possibly missing opening '{'";
                } else if (endInfo.furthestChar === ")") {
                  message += ". Possibly missing opening '('";
                } else if (endInfo.furthestReachedEnd) {
                  message += ". Possibly missing something";
                }
              }
              err = new LessError({
                type: "Parse",
                message,
                index: endInfo.furthest,
                filename: fileInfo.filename
              }, imports);
            }
            var finish = function(e) {
              e = err || e || imports.error;
              if (e) {
                if (!(e instanceof LessError)) {
                  e = new LessError(e, imports, fileInfo.filename);
                }
                return callback(e);
              } else {
                return callback(null, root2);
              }
            };
            if (context.processImports !== false) {
              new visitors.ImportVisitor(imports, finish).run(root2);
            } else {
              return finish();
            }
          },
          //
          // Here in, the parsing rules/functions
          //
          // The basic structure of the syntax tree generated is as follows:
          //
          //   Ruleset ->  Declaration -> Value -> Expression -> Entity
          //
          // Here's some Less code:
          //
          //    .class {
          //      color: #fff;
          //      border: 1px solid #000;
          //      width: @w + 4px;
          //      > .child {...}
          //    }
          //
          // And here's what the parse tree might look like:
          //
          //     Ruleset (Selector '.class', [
          //         Declaration ("color",  Value ([Expression [Color #fff]]))
          //         Declaration ("border", Value ([Expression [Dimension 1px][Keyword "solid"][Color #000]]))
          //         Declaration ("width",  Value ([Expression [Operation " + " [Variable "@w"][Dimension 4px]]]))
          //         Ruleset (Selector [Element '>', '.child'], [...])
          //     ])
          //
          //  In general, most rules will try to parse a token with the `$re()` function, and if the return
          //  value is truly, will return a new node, of the relevant type. Sometimes, we need to check
          //  first, before parsing, that's when we use `peek()`.
          //
          parsers: parsers = {
            //
            // The `primary` rule is the *entry* and *exit* point of the parser.
            // The rules here can appear at any level of the parse tree.
            //
            // The recursive nature of the grammar is an interplay between the `block`
            // rule, which represents `{ ... }`, the `ruleset` rule, and this `primary` rule,
            // as represented by this simplified grammar:
            //
            //     primary  →  (ruleset | declaration)+
            //     ruleset  →  selector+ block
            //     block    →  '{' primary '}'
            //
            // Only at one point is the primary rule not called from the
            // block rule: at the root level.
            //
            primary: function() {
              var mixin = this.mixin;
              var root2 = [];
              var node;
              while (true) {
                while (true) {
                  node = this.comment();
                  if (!node) {
                    break;
                  }
                  root2.push(node);
                }
                if (parserInput.finished) {
                  break;
                }
                if (parserInput.peek("}")) {
                  break;
                }
                node = this.extendRule();
                if (node) {
                  root2 = root2.concat(node);
                  continue;
                }
                node = mixin.definition() || this.declaration() || mixin.call(false, false) || this.ruleset() || this.variableCall() || this.entities.call() || this.atrule();
                if (node) {
                  root2.push(node);
                } else {
                  var foundSemiColon = false;
                  while (parserInput.$char(";")) {
                    foundSemiColon = true;
                  }
                  if (!foundSemiColon) {
                    break;
                  }
                }
              }
              return root2;
            },
            // comments are collected by the main parsing mechanism and then assigned to nodes
            // where the current structure allows it
            comment: function() {
              if (parserInput.commentStore.length) {
                var comment = parserInput.commentStore.shift();
                return new tree.Comment(comment.text, comment.isLineComment, comment.index + currentIndex, fileInfo);
              }
            },
            //
            // Entities are tokens which can be found inside an Expression
            //
            entities: {
              mixinLookup: function() {
                return parsers.mixin.call(true, true);
              },
              //
              // A string, which supports escaping " and '
              //
              //     "milky way" 'he\'s the one!'
              //
              quoted: function(forceEscaped) {
                var str;
                var index = parserInput.i;
                var isEscaped = false;
                parserInput.save();
                if (parserInput.$char("~")) {
                  isEscaped = true;
                } else if (forceEscaped) {
                  parserInput.restore();
                  return;
                }
                str = parserInput.$quoted();
                if (!str) {
                  parserInput.restore();
                  return;
                }
                parserInput.forget();
                return new tree.Quoted(str.charAt(0), str.substr(1, str.length - 2), isEscaped, index + currentIndex, fileInfo);
              },
              //
              // A catch-all word, such as:
              //
              //     black border-collapse
              //
              keyword: function() {
                var k = parserInput.$char("%") || parserInput.$re(/^\[?(?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+\]?/);
                if (k) {
                  return tree.Color.fromKeyword(k) || new tree.Keyword(k);
                }
              },
              //
              // A function call
              //
              //     rgb(255, 0, 255)
              //
              // The arguments are parsed with the `entities.arguments` parser.
              //
              call: function() {
                var name;
                var args;
                var func;
                var index = parserInput.i;
                if (parserInput.peek(/^url\(/i)) {
                  return;
                }
                parserInput.save();
                name = parserInput.$re(/^([\w-]+|%|~|progid:[\w.]+)\(/);
                if (!name) {
                  parserInput.forget();
                  return;
                }
                name = name[1];
                func = this.customFuncCall(name);
                if (func) {
                  args = func.parse();
                  if (args && func.stop) {
                    parserInput.forget();
                    return args;
                  }
                }
                args = this.arguments(args);
                if (!parserInput.$char(")")) {
                  parserInput.restore("Could not parse call arguments or missing ')'");
                  return;
                }
                parserInput.forget();
                return new tree.Call(name, args, index + currentIndex, fileInfo);
              },
              declarationCall: function() {
                var validCall;
                var args;
                var index = parserInput.i;
                parserInput.save();
                validCall = parserInput.$re(/^[\w]+\(/);
                if (!validCall) {
                  parserInput.forget();
                  return;
                }
                validCall = validCall.substring(0, validCall.length - 1);
                var rule = this.ruleProperty();
                var value;
                if (rule) {
                  value = this.value();
                }
                if (rule && value) {
                  args = [new tree.Declaration(rule, value, null, null, parserInput.i + currentIndex, fileInfo, true)];
                }
                if (!parserInput.$char(")")) {
                  parserInput.restore("Could not parse call arguments or missing ')'");
                  return;
                }
                parserInput.forget();
                return new tree.Call(validCall, args, index + currentIndex, fileInfo);
              },
              //
              // Parsing rules for functions with non-standard args, e.g.:
              //
              //     boolean(not(2 > 1))
              //
              //     This is a quick prototype, to be modified/improved when
              //     more custom-parsed funcs come (e.g. `selector(...)`)
              //
              customFuncCall: function(name) {
                return {
                  alpha: f2(parsers.ieAlpha, true),
                  boolean: f2(condition),
                  "if": f2(condition)
                }[name.toLowerCase()];
                function f2(parse, stop) {
                  return {
                    parse,
                    stop
                    // when true - stop after parse() and return its result,
                    // otherwise continue for plain args
                  };
                }
                function condition() {
                  return [expect(parsers.condition, "expected condition")];
                }
              },
              arguments: function(prevArgs) {
                var argsComma = prevArgs || [];
                var argsSemiColon = [];
                var isSemiColonSeparated;
                var value;
                parserInput.save();
                while (true) {
                  if (prevArgs) {
                    prevArgs = false;
                  } else {
                    value = parsers.detachedRuleset() || this.assignment() || parsers.expression();
                    if (!value) {
                      break;
                    }
                    if (value.value && value.value.length == 1) {
                      value = value.value[0];
                    }
                    argsComma.push(value);
                  }
                  if (parserInput.$char(",")) {
                    continue;
                  }
                  if (parserInput.$char(";") || isSemiColonSeparated) {
                    isSemiColonSeparated = true;
                    value = argsComma.length < 1 ? argsComma[0] : new tree.Value(argsComma);
                    argsSemiColon.push(value);
                    argsComma = [];
                  }
                }
                parserInput.forget();
                return isSemiColonSeparated ? argsSemiColon : argsComma;
              },
              literal: function() {
                return this.dimension() || this.color() || this.quoted() || this.unicodeDescriptor();
              },
              // Assignments are argument entities for calls.
              // They are present in ie filter properties as shown below.
              //
              //     filter: progid:DXImageTransform.Microsoft.Alpha( *opacity=50* )
              //
              assignment: function() {
                var key2;
                var value;
                parserInput.save();
                key2 = parserInput.$re(/^\w+(?=\s?=)/i);
                if (!key2) {
                  parserInput.restore();
                  return;
                }
                if (!parserInput.$char("=")) {
                  parserInput.restore();
                  return;
                }
                value = parsers.entity();
                if (value) {
                  parserInput.forget();
                  return new tree.Assignment(key2, value);
                } else {
                  parserInput.restore();
                }
              },
              //
              // Parse url() tokens
              //
              // We use a specific rule for urls, because they don't really behave like
              // standard function calls. The difference is that the argument doesn't have
              // to be enclosed within a string, so it can't be parsed as an Expression.
              //
              url: function() {
                var value;
                var index = parserInput.i;
                parserInput.autoCommentAbsorb = false;
                if (!parserInput.$str("url(")) {
                  parserInput.autoCommentAbsorb = true;
                  return;
                }
                value = this.quoted() || this.variable() || this.property() || parserInput.$re(/^(?:(?:\\[()'"])|[^()'"])+/) || "";
                parserInput.autoCommentAbsorb = true;
                expectChar(")");
                return new tree.URL(value.value !== void 0 || value instanceof tree.Variable || value instanceof tree.Property ? value : new tree.Anonymous(value, index), index + currentIndex, fileInfo);
              },
              //
              // A Variable entity, such as `@fink`, in
              //
              //     width: @fink + 2px
              //
              // We use a different parser for variable definitions,
              // see `parsers.variable`.
              //
              variable: function() {
                var ch;
                var name;
                var index = parserInput.i;
                parserInput.save();
                if (parserInput.currentChar() === "@" && (name = parserInput.$re(/^@@?[\w-]+/))) {
                  ch = parserInput.currentChar();
                  if (ch === "(" || ch === "[" && !parserInput.prevChar().match(/^\s/)) {
                    var result = parsers.variableCall(name);
                    if (result) {
                      parserInput.forget();
                      return result;
                    }
                  }
                  parserInput.forget();
                  return new tree.Variable(name, index + currentIndex, fileInfo);
                }
                parserInput.restore();
              },
              // A variable entity using the protective {} e.g. @{var}
              variableCurly: function() {
                var curly;
                var index = parserInput.i;
                if (parserInput.currentChar() === "@" && (curly = parserInput.$re(/^@\{([\w-]+)\}/))) {
                  return new tree.Variable("@".concat(curly[1]), index + currentIndex, fileInfo);
                }
              },
              //
              // A Property accessor, such as `$color`, in
              //
              //     background-color: $color
              //
              property: function() {
                var name;
                var index = parserInput.i;
                if (parserInput.currentChar() === "$" && (name = parserInput.$re(/^\$[\w-]+/))) {
                  return new tree.Property(name, index + currentIndex, fileInfo);
                }
              },
              // A property entity useing the protective {} e.g. ${prop}
              propertyCurly: function() {
                var curly;
                var index = parserInput.i;
                if (parserInput.currentChar() === "$" && (curly = parserInput.$re(/^\$\{([\w-]+)\}/))) {
                  return new tree.Property("$".concat(curly[1]), index + currentIndex, fileInfo);
                }
              },
              //
              // A Hexadecimal color
              //
              //     #4F3C2F
              //
              // `rgb` and `hsl` colors are parsed through the `entities.call` parser.
              //
              color: function() {
                var rgb;
                parserInput.save();
                if (parserInput.currentChar() === "#" && (rgb = parserInput.$re(/^#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3,4})([\w.#[])?/))) {
                  if (!rgb[2]) {
                    parserInput.forget();
                    return new tree.Color(rgb[1], void 0, rgb[0]);
                  }
                }
                parserInput.restore();
              },
              colorKeyword: function() {
                parserInput.save();
                var autoCommentAbsorb = parserInput.autoCommentAbsorb;
                parserInput.autoCommentAbsorb = false;
                var k = parserInput.$re(/^[_A-Za-z-][_A-Za-z0-9-]+/);
                parserInput.autoCommentAbsorb = autoCommentAbsorb;
                if (!k) {
                  parserInput.forget();
                  return;
                }
                parserInput.restore();
                var color2 = tree.Color.fromKeyword(k);
                if (color2) {
                  parserInput.$str(k);
                  return color2;
                }
              },
              //
              // A Dimension, that is, a number and a unit
              //
              //     0.5em 95%
              //
              dimension: function() {
                if (parserInput.peekNotNumeric()) {
                  return;
                }
                var value = parserInput.$re(/^([+-]?\d*\.?\d+)(%|[a-z_]+)?/i);
                if (value) {
                  return new tree.Dimension(value[1], value[2]);
                }
              },
              //
              // A unicode descriptor, as is used in unicode-range
              //
              // U+0??  or U+00A1-00A9
              //
              unicodeDescriptor: function() {
                var ud;
                ud = parserInput.$re(/^U\+[0-9a-fA-F?]+(-[0-9a-fA-F?]+)?/);
                if (ud) {
                  return new tree.UnicodeDescriptor(ud[0]);
                }
              },
              //
              // JavaScript code to be evaluated
              //
              //     `window.location.href`
              //
              javascript: function() {
                var js;
                var index = parserInput.i;
                parserInput.save();
                var escape = parserInput.$char("~");
                var jsQuote = parserInput.$char("`");
                if (!jsQuote) {
                  parserInput.restore();
                  return;
                }
                js = parserInput.$re(/^[^`]*`/);
                if (js) {
                  parserInput.forget();
                  return new tree.JavaScript(js.substr(0, js.length - 1), Boolean(escape), index + currentIndex, fileInfo);
                }
                parserInput.restore("invalid javascript definition");
              }
            },
            //
            // The variable part of a variable definition. Used in the `rule` parser
            //
            //     @fink:
            //
            variable: function() {
              var name;
              if (parserInput.currentChar() === "@" && (name = parserInput.$re(/^(@[\w-]+)\s*:/))) {
                return name[1];
              }
            },
            //
            // Call a variable value to retrieve a detached ruleset
            // or a value from a detached ruleset's rules.
            //
            //     @fink();
            //     @fink;
            //     color: @fink[@color];
            //
            variableCall: function(parsedName) {
              var lookups;
              var i = parserInput.i;
              var inValue = !!parsedName;
              var name = parsedName;
              parserInput.save();
              if (name || parserInput.currentChar() === "@" && (name = parserInput.$re(/^(@[\w-]+)(\(\s*\))?/))) {
                lookups = this.mixin.ruleLookups();
                if (!lookups && (inValue && parserInput.$str("()") !== "()" || name[2] !== "()")) {
                  parserInput.restore("Missing '[...]' lookup in variable call");
                  return;
                }
                if (!inValue) {
                  name = name[1];
                }
                var call = new tree.VariableCall(name, i, fileInfo);
                if (!inValue && parsers.end()) {
                  parserInput.forget();
                  return call;
                } else {
                  parserInput.forget();
                  return new tree.NamespaceValue(call, lookups, i, fileInfo);
                }
              }
              parserInput.restore();
            },
            //
            // extend syntax - used to extend selectors
            //
            extend: function(isRule) {
              var elements;
              var e;
              var index = parserInput.i;
              var option;
              var extendList;
              var extend;
              if (!parserInput.$str(isRule ? "&:extend(" : ":extend(")) {
                return;
              }
              do {
                option = null;
                elements = null;
                var first = true;
                while (!(option = parserInput.$re(/^(!?all)(?=\s*(\)|,))/))) {
                  e = this.element();
                  if (!e) {
                    break;
                  }
                  if (!first && e.combinator.value) {
                    warn("Targeting complex selectors can have unexpected behavior, and this behavior may change in the future.", index);
                  }
                  first = false;
                  if (elements) {
                    elements.push(e);
                  } else {
                    elements = [e];
                  }
                }
                option = option && option[1];
                if (!elements) {
                  error("Missing target selector for :extend().");
                }
                extend = new tree.Extend(new tree.Selector(elements), option, index + currentIndex, fileInfo);
                if (extendList) {
                  extendList.push(extend);
                } else {
                  extendList = [extend];
                }
              } while (parserInput.$char(","));
              expect(/^\)/);
              if (isRule) {
                expect(/^;/);
              }
              return extendList;
            },
            //
            // extendRule - used in a rule to extend all the parent selectors
            //
            extendRule: function() {
              return this.extend(true);
            },
            //
            // Mixins
            //
            mixin: {
              //
              // A Mixin call, with an optional argument list
              //
              //     #mixins > .square(#fff);
              //     #mixins.square(#fff);
              //     .rounded(4px, black);
              //     .button;
              //
              // We can lookup / return a value using the lookup syntax:
              //
              //     color: #mixin.square(#fff)[@color];
              //
              // The `while` loop is there because mixins can be
              // namespaced, but we only support the child and descendant
              // selector for now.
              //
              call: function(inValue, getLookup) {
                var s = parserInput.currentChar();
                var important = false;
                var lookups;
                var index = parserInput.i;
                var elements;
                var args;
                var hasParens;
                var parensIndex;
                var parensWS = false;
                if (s !== "." && s !== "#") {
                  return;
                }
                parserInput.save();
                elements = this.elements();
                if (elements) {
                  parensIndex = parserInput.i;
                  if (parserInput.$char("(")) {
                    parensWS = parserInput.isWhitespace(-2);
                    args = this.args(true).args;
                    expectChar(")");
                    hasParens = true;
                    if (parensWS) {
                      warn("Whitespace between a mixin name and parentheses for a mixin call is deprecated", parensIndex, "DEPRECATED");
                    }
                  }
                  if (getLookup !== false) {
                    lookups = this.ruleLookups();
                  }
                  if (getLookup === true && !lookups) {
                    parserInput.restore();
                    return;
                  }
                  if (inValue && !lookups && !hasParens) {
                    parserInput.restore();
                    return;
                  }
                  if (!inValue && parsers.important()) {
                    important = true;
                  }
                  if (inValue || parsers.end()) {
                    parserInput.forget();
                    var mixin = new tree.mixin.Call(elements, args, index + currentIndex, fileInfo, !lookups && important);
                    if (lookups) {
                      return new tree.NamespaceValue(mixin, lookups);
                    } else {
                      if (!hasParens) {
                        warn("Calling a mixin without parentheses is deprecated", parensIndex, "DEPRECATED");
                      }
                      return mixin;
                    }
                  }
                }
                parserInput.restore();
              },
              /**
               * Matching elements for mixins
               * (Start with . or # and can have > )
               */
              elements: function() {
                var elements;
                var e;
                var c;
                var elem;
                var elemIndex;
                var re = /^[#.](?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+/;
                while (true) {
                  elemIndex = parserInput.i;
                  e = parserInput.$re(re);
                  if (!e) {
                    break;
                  }
                  elem = new tree.Element(c, e, false, elemIndex + currentIndex, fileInfo);
                  if (elements) {
                    elements.push(elem);
                  } else {
                    elements = [elem];
                  }
                  c = parserInput.$char(">");
                }
                return elements;
              },
              args: function(isCall) {
                var entities = parsers.entities;
                var returner = { args: null, variadic: false };
                var expressions = [];
                var argsSemiColon = [];
                var argsComma = [];
                var isSemiColonSeparated;
                var expressionContainsNamed;
                var name;
                var nameLoop;
                var value;
                var arg;
                var expand;
                var hasSep = true;
                parserInput.save();
                while (true) {
                  if (isCall) {
                    arg = parsers.detachedRuleset() || parsers.expression();
                  } else {
                    parserInput.commentStore.length = 0;
                    if (parserInput.$str("...")) {
                      returner.variadic = true;
                      if (parserInput.$char(";") && !isSemiColonSeparated) {
                        isSemiColonSeparated = true;
                      }
                      (isSemiColonSeparated ? argsSemiColon : argsComma).push({ variadic: true });
                      break;
                    }
                    arg = entities.variable() || entities.property() || entities.literal() || entities.keyword() || this.call(true);
                  }
                  if (!arg || !hasSep) {
                    break;
                  }
                  nameLoop = null;
                  if (arg.throwAwayComments) {
                    arg.throwAwayComments();
                  }
                  value = arg;
                  var val = null;
                  if (isCall) {
                    if (arg.value && arg.value.length == 1) {
                      val = arg.value[0];
                    }
                  } else {
                    val = arg;
                  }
                  if (val && (val instanceof tree.Variable || val instanceof tree.Property)) {
                    if (parserInput.$char(":")) {
                      if (expressions.length > 0) {
                        if (isSemiColonSeparated) {
                          error("Cannot mix ; and , as delimiter types");
                        }
                        expressionContainsNamed = true;
                      }
                      value = parsers.detachedRuleset() || parsers.expression();
                      if (!value) {
                        if (isCall) {
                          error("could not understand value for named argument");
                        } else {
                          parserInput.restore();
                          returner.args = [];
                          return returner;
                        }
                      }
                      nameLoop = name = val.name;
                    } else if (parserInput.$str("...")) {
                      if (!isCall) {
                        returner.variadic = true;
                        if (parserInput.$char(";") && !isSemiColonSeparated) {
                          isSemiColonSeparated = true;
                        }
                        (isSemiColonSeparated ? argsSemiColon : argsComma).push({ name: arg.name, variadic: true });
                        break;
                      } else {
                        expand = true;
                      }
                    } else if (!isCall) {
                      name = nameLoop = val.name;
                      value = null;
                    }
                  }
                  if (value) {
                    expressions.push(value);
                  }
                  argsComma.push({ name: nameLoop, value, expand });
                  if (parserInput.$char(",")) {
                    hasSep = true;
                    continue;
                  }
                  hasSep = parserInput.$char(";") === ";";
                  if (hasSep || isSemiColonSeparated) {
                    if (expressionContainsNamed) {
                      error("Cannot mix ; and , as delimiter types");
                    }
                    isSemiColonSeparated = true;
                    if (expressions.length > 1) {
                      value = new tree.Value(expressions);
                    }
                    argsSemiColon.push({ name, value, expand });
                    name = null;
                    expressions = [];
                    expressionContainsNamed = false;
                  }
                }
                parserInput.forget();
                returner.args = isSemiColonSeparated ? argsSemiColon : argsComma;
                return returner;
              },
              //
              // A Mixin definition, with a list of parameters
              //
              //     .rounded (@radius: 2px, @color) {
              //        ...
              //     }
              //
              // Until we have a finer grained state-machine, we have to
              // do a look-ahead, to make sure we don't have a mixin call.
              // See the `rule` function for more information.
              //
              // We start by matching `.rounded (`, and then proceed on to
              // the argument list, which has optional default values.
              // We store the parameters in `params`, with a `value` key,
              // if there is a value, such as in the case of `@radius`.
              //
              // Once we've got our params list, and a closing `)`, we parse
              // the `{...}` block.
              //
              definition: function() {
                var name;
                var params = [];
                var match;
                var ruleset;
                var cond;
                var variadic = false;
                if (parserInput.currentChar() !== "." && parserInput.currentChar() !== "#" || parserInput.peek(/^[^{]*\}/)) {
                  return;
                }
                parserInput.save();
                match = parserInput.$re(/^([#.](?:[\w-]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+)\s*\(/);
                if (match) {
                  name = match[1];
                  var argInfo = this.args(false);
                  params = argInfo.args;
                  variadic = argInfo.variadic;
                  if (!parserInput.$char(")")) {
                    parserInput.restore("Missing closing ')'");
                    return;
                  }
                  parserInput.commentStore.length = 0;
                  if (parserInput.$str("when")) {
                    cond = expect(parsers.conditions, "expected condition");
                  }
                  ruleset = parsers.block();
                  if (ruleset) {
                    parserInput.forget();
                    return new tree.mixin.Definition(name, params, ruleset, cond, variadic);
                  } else {
                    parserInput.restore();
                  }
                } else {
                  parserInput.restore();
                }
              },
              ruleLookups: function() {
                var rule;
                var lookups = [];
                if (parserInput.currentChar() !== "[") {
                  return;
                }
                while (true) {
                  parserInput.save();
                  rule = this.lookupValue();
                  if (!rule && rule !== "") {
                    parserInput.restore();
                    break;
                  }
                  lookups.push(rule);
                  parserInput.forget();
                }
                if (lookups.length > 0) {
                  return lookups;
                }
              },
              lookupValue: function() {
                parserInput.save();
                if (!parserInput.$char("[")) {
                  parserInput.restore();
                  return;
                }
                var name = parserInput.$re(/^(?:[@$]{0,2})[_a-zA-Z0-9-]*/);
                if (!parserInput.$char("]")) {
                  parserInput.restore();
                  return;
                }
                if (name || name === "") {
                  parserInput.forget();
                  return name;
                }
                parserInput.restore();
              }
            },
            //
            // Entities are the smallest recognized token,
            // and can be found inside a rule's value.
            //
            entity: function() {
              var entities = this.entities;
              return this.comment() || entities.literal() || entities.variable() || entities.url() || entities.property() || entities.call() || entities.keyword() || this.mixin.call(true) || entities.javascript();
            },
            //
            // A Declaration terminator. Note that we use `peek()` to check for '}',
            // because the `block` rule will be expecting it, but we still need to make sure
            // it's there, if ';' was omitted.
            //
            end: function() {
              return parserInput.$char(";") || parserInput.peek("}");
            },
            //
            // IE's alpha function
            //
            //     alpha(opacity=88)
            //
            ieAlpha: function() {
              var value;
              if (!parserInput.$re(/^opacity=/i)) {
                return;
              }
              value = parserInput.$re(/^\d+/);
              if (!value) {
                value = expect(parsers.entities.variable, "Could not parse alpha");
                value = "@{".concat(value.name.slice(1), "}");
              }
              expectChar(")");
              return new tree.Quoted("", "alpha(opacity=".concat(value, ")"));
            },
            /**
             * A Selector Element
             *
             *   div
             *   + h1
             *   #socks
             *   input[type="text"]
             *
             * Elements are the building blocks for Selectors,
             * they are made out of a `Combinator` (see combinator rule),
             * and an element name, such as a tag a class, or `*`.
             */
            element: function() {
              var e;
              var c;
              var v;
              var index = parserInput.i;
              c = this.combinator();
              e = parserInput.$re(/^(?:\d+\.\d+|\d+)%/) || // eslint-disable-next-line no-control-regex
              parserInput.$re(/^(?:[.#]?|:*)(?:[\w-]|[^\x00-\x9f]|\\(?:[A-Fa-f0-9]{1,6} ?|[^A-Fa-f0-9]))+/) || parserInput.$char("*") || parserInput.$char("&") || this.attribute() || parserInput.$re(/^\([^&()@]+\)/) || parserInput.$re(/^[.#:](?=@)/) || this.entities.variableCurly();
              if (!e) {
                parserInput.save();
                if (parserInput.$char("(")) {
                  if (v = this.selector(false)) {
                    var selectors = [];
                    while (parserInput.$char(",")) {
                      selectors.push(v);
                      selectors.push(new Anonymous(","));
                      v = this.selector(false);
                    }
                    selectors.push(v);
                    if (parserInput.$char(")")) {
                      if (selectors.length > 1) {
                        e = new tree.Paren(new Selector(selectors));
                      } else {
                        e = new tree.Paren(v);
                      }
                      parserInput.forget();
                    } else {
                      parserInput.restore("Missing closing ')'");
                    }
                  } else {
                    parserInput.restore("Missing closing ')'");
                  }
                } else {
                  parserInput.forget();
                }
              }
              if (e) {
                return new tree.Element(c, e, e instanceof tree.Variable, index + currentIndex, fileInfo);
              }
            },
            //
            // Combinators combine elements together, in a Selector.
            //
            // Because our parser isn't white-space sensitive, special care
            // has to be taken, when parsing the descendant combinator, ` `,
            // as it's an empty space. We have to check the previous character
            // in the input, to see if it's a ` ` character. More info on how
            // we deal with this in *combinator.js*.
            //
            combinator: function() {
              var c = parserInput.currentChar();
              if (c === "/") {
                parserInput.save();
                var slashedCombinator = parserInput.$re(/^\/[a-z]+\//i);
                if (slashedCombinator) {
                  parserInput.forget();
                  return new tree.Combinator(slashedCombinator);
                }
                parserInput.restore();
              }
              if (c === ">" || c === "+" || c === "~" || c === "|" || c === "^") {
                parserInput.i++;
                if (c === "^" && parserInput.currentChar() === "^") {
                  c = "^^";
                  parserInput.i++;
                }
                while (parserInput.isWhitespace()) {
                  parserInput.i++;
                }
                return new tree.Combinator(c);
              } else if (parserInput.isWhitespace(-1)) {
                return new tree.Combinator(" ");
              } else {
                return new tree.Combinator(null);
              }
            },
            //
            // A CSS Selector
            // with less extensions e.g. the ability to extend and guard
            //
            //     .class > div + h1
            //     li a:hover
            //
            // Selectors are made out of one or more Elements, see above.
            //
            selector: function(isLess) {
              var index = parserInput.i;
              var elements;
              var extendList;
              var c;
              var e;
              var allExtends;
              var when;
              var condition;
              isLess = isLess !== false;
              while (isLess && (extendList = this.extend()) || isLess && (when = parserInput.$str("when")) || (e = this.element())) {
                if (when) {
                  condition = expect(this.conditions, "expected condition");
                } else if (condition) {
                  error("CSS guard can only be used at the end of selector");
                } else if (extendList) {
                  if (allExtends) {
                    allExtends = allExtends.concat(extendList);
                  } else {
                    allExtends = extendList;
                  }
                } else {
                  if (allExtends) {
                    error("Extend can only be used at the end of selector");
                  }
                  c = parserInput.currentChar();
                  if (Array.isArray(e)) {
                    e.forEach(function(ele) {
                      return elements.push(ele);
                    });
                  }
                  if (elements) {
                    elements.push(e);
                  } else {
                    elements = [e];
                  }
                  e = null;
                }
                if (c === "{" || c === "}" || c === ";" || c === "," || c === ")") {
                  break;
                }
              }
              if (elements) {
                return new tree.Selector(elements, allExtends, condition, index + currentIndex, fileInfo);
              }
              if (allExtends) {
                error("Extend must be used to extend a selector, it cannot be used on its own");
              }
            },
            selectors: function() {
              var s;
              var selectors;
              while (true) {
                s = this.selector();
                if (!s) {
                  break;
                }
                if (selectors) {
                  selectors.push(s);
                } else {
                  selectors = [s];
                }
                parserInput.commentStore.length = 0;
                if (s.condition && selectors.length > 1) {
                  error("Guards are only currently allowed on a single selector.");
                }
                if (!parserInput.$char(",")) {
                  break;
                }
                if (s.condition) {
                  error("Guards are only currently allowed on a single selector.");
                }
                parserInput.commentStore.length = 0;
              }
              return selectors;
            },
            attribute: function() {
              if (!parserInput.$char("[")) {
                return;
              }
              var entities = this.entities;
              var key2;
              var val;
              var op;
              var cif;
              if (!(key2 = entities.variableCurly())) {
                key2 = expect(/^(?:[_A-Za-z0-9-*]*\|)?(?:[_A-Za-z0-9-]|\\.)+/);
              }
              op = parserInput.$re(/^[|~*$^]?=/);
              if (op) {
                val = entities.quoted() || parserInput.$re(/^[0-9]+%/) || parserInput.$re(/^[\w-]+/) || entities.variableCurly();
                if (val) {
                  cif = parserInput.$re(/^[iIsS]/);
                }
              }
              expectChar("]");
              return new tree.Attribute(key2, op, val, cif);
            },
            //
            // The `block` rule is used by `ruleset` and `mixin.definition`.
            // It's a wrapper around the `primary` rule, with added `{}`.
            //
            block: function() {
              var content;
              if (parserInput.$char("{") && (content = this.primary()) && parserInput.$char("}")) {
                return content;
              }
            },
            blockRuleset: function() {
              var block = this.block();
              if (block) {
                block = new tree.Ruleset(null, block);
              }
              return block;
            },
            detachedRuleset: function() {
              var argInfo;
              var params;
              var variadic;
              parserInput.save();
              if (parserInput.$re(/^[.#]\(/)) {
                argInfo = this.mixin.args(false);
                params = argInfo.args;
                variadic = argInfo.variadic;
                if (!parserInput.$char(")")) {
                  parserInput.restore();
                  return;
                }
              }
              var blockRuleset = this.blockRuleset();
              if (blockRuleset) {
                parserInput.forget();
                if (params) {
                  return new tree.mixin.Definition(null, params, blockRuleset, null, variadic);
                }
                return new tree.DetachedRuleset(blockRuleset);
              }
              parserInput.restore();
            },
            //
            // div, .class, body > p {...}
            //
            ruleset: function() {
              var selectors;
              var rules;
              var debugInfo2;
              parserInput.save();
              if (context.dumpLineNumbers) {
                debugInfo2 = getDebugInfo(parserInput.i);
              }
              selectors = this.selectors();
              if (selectors && (rules = this.block())) {
                parserInput.forget();
                var ruleset = new tree.Ruleset(selectors, rules, context.strictImports);
                if (context.dumpLineNumbers) {
                  ruleset.debugInfo = debugInfo2;
                }
                return ruleset;
              } else {
                parserInput.restore();
              }
            },
            declaration: function() {
              var name;
              var value;
              var index = parserInput.i;
              var hasDR;
              var c = parserInput.currentChar();
              var important;
              var merge2;
              var isVariable;
              if (c === "." || c === "#" || c === "&" || c === ":") {
                return;
              }
              parserInput.save();
              name = this.variable() || this.ruleProperty();
              if (name) {
                isVariable = typeof name === "string";
                if (isVariable) {
                  value = this.detachedRuleset();
                  if (value) {
                    hasDR = true;
                  }
                }
                parserInput.commentStore.length = 0;
                if (!value) {
                  merge2 = !isVariable && name.length > 1 && name.pop().value;
                  if (name[0].value && name[0].value.slice(0, 2) === "--") {
                    if (parserInput.$char(";")) {
                      value = new Anonymous("");
                    } else {
                      value = this.permissiveValue(/[;}]/, true);
                    }
                  } else {
                    value = this.anonymousValue();
                  }
                  if (value) {
                    parserInput.forget();
                    return new tree.Declaration(name, value, false, merge2, index + currentIndex, fileInfo);
                  }
                  if (!value) {
                    value = this.value();
                  }
                  if (value) {
                    important = this.important();
                  } else if (isVariable) {
                    value = this.permissiveValue();
                  }
                }
                if (value && (this.end() || hasDR)) {
                  parserInput.forget();
                  return new tree.Declaration(name, value, important, merge2, index + currentIndex, fileInfo);
                } else {
                  parserInput.restore();
                }
              } else {
                parserInput.restore();
              }
            },
            anonymousValue: function() {
              var index = parserInput.i;
              var match = parserInput.$re(/^([^.#@$+/'"*`(;{}-]*);/);
              if (match) {
                return new tree.Anonymous(match[1], index + currentIndex);
              }
            },
            /**
             * Used for custom properties, at-rules, and variables (as fallback)
             * Parses almost anything inside of {} [] () "" blocks
             * until it reaches outer-most tokens.
             *
             * First, it will try to parse comments and entities to reach
             * the end. This is mostly like the Expression parser except no
             * math is allowed.
             *
             * @param {RexExp} untilTokens - Characters to stop parsing at
             */
            permissiveValue: function(untilTokens) {
              var i;
              var e;
              var done;
              var value;
              var tok = untilTokens || ";";
              var index = parserInput.i;
              var result = [];
              function testCurrentChar() {
                var char = parserInput.currentChar();
                if (typeof tok === "string") {
                  return char === tok;
                } else {
                  return tok.test(char);
                }
              }
              if (testCurrentChar()) {
                return;
              }
              value = [];
              do {
                e = this.comment();
                if (e) {
                  value.push(e);
                  continue;
                }
                e = this.entity();
                if (e) {
                  value.push(e);
                }
                if (parserInput.peek(",")) {
                  value.push(new tree.Anonymous(",", parserInput.i));
                  parserInput.$char(",");
                }
              } while (e);
              done = testCurrentChar();
              if (value.length > 0) {
                value = new tree.Expression(value);
                if (done) {
                  return value;
                } else {
                  result.push(value);
                }
                if (parserInput.prevChar() === " ") {
                  result.push(new tree.Anonymous(" ", index));
                }
              }
              parserInput.save();
              value = parserInput.$parseUntil(tok);
              if (value) {
                if (typeof value === "string") {
                  error("Expected '".concat(value, "'"), "Parse");
                }
                if (value.length === 1 && value[0] === " ") {
                  parserInput.forget();
                  return new tree.Anonymous("", index);
                }
                var item = void 0;
                for (i = 0; i < value.length; i++) {
                  item = value[i];
                  if (Array.isArray(item)) {
                    result.push(new tree.Quoted(item[0], item[1], true, index, fileInfo));
                  } else {
                    if (i === value.length - 1) {
                      item = item.trim();
                    }
                    var quote = new tree.Quoted("'", item, true, index, fileInfo);
                    var variableRegex = /@([\w-]+)/g;
                    var propRegex = /\$([\w-]+)/g;
                    if (variableRegex.test(item)) {
                      warn("@[ident] in unknown values will not be evaluated as variables in the future. Use @{[ident]}", index, "DEPRECATED");
                    }
                    if (propRegex.test(item)) {
                      warn("$[ident] in unknown values will not be evaluated as property references in the future. Use ${[ident]}", index, "DEPRECATED");
                    }
                    quote.variableRegex = /@([\w-]+)|@{([\w-]+)}/g;
                    quote.propRegex = /\$([\w-]+)|\${([\w-]+)}/g;
                    result.push(quote);
                  }
                }
                parserInput.forget();
                return new tree.Expression(result, true);
              }
              parserInput.restore();
            },
            //
            // An @import atrule
            //
            //     @import "lib";
            //
            // Depending on our environment, importing is done differently:
            // In the browser, it's an XHR request, in Node, it would be a
            // file-system operation. The function used for importing is
            // stored in `import`, which we pass to the Import constructor.
            //
            "import": function() {
              var path;
              var features;
              var index = parserInput.i;
              var dir = parserInput.$re(/^@import\s+/);
              if (dir) {
                var options2 = (dir ? this.importOptions() : null) || {};
                if (path = this.entities.quoted() || this.entities.url()) {
                  features = this.mediaFeatures({});
                  if (!parserInput.$char(";")) {
                    parserInput.i = index;
                    error("missing semi-colon or unrecognised media features on import");
                  }
                  features = features && new tree.Value(features);
                  return new tree.Import(path, features, options2, index + currentIndex, fileInfo);
                } else {
                  parserInput.i = index;
                  error("malformed import statement");
                }
              }
            },
            importOptions: function() {
              var o;
              var options2 = {};
              var optionName;
              var value;
              if (!parserInput.$char("(")) {
                return null;
              }
              do {
                o = this.importOption();
                if (o) {
                  optionName = o;
                  value = true;
                  switch (optionName) {
                    case "css":
                      optionName = "less";
                      value = false;
                      break;
                    case "once":
                      optionName = "multiple";
                      value = false;
                      break;
                  }
                  options2[optionName] = value;
                  if (!parserInput.$char(",")) {
                    break;
                  }
                }
              } while (o);
              expectChar(")");
              return options2;
            },
            importOption: function() {
              var opt = parserInput.$re(/^(less|css|multiple|once|inline|reference|optional)/);
              if (opt) {
                return opt[1];
              }
            },
            mediaFeature: function(syntaxOptions) {
              var entities = this.entities;
              var nodes = [];
              var e;
              var p;
              var rangeP;
              var spacing = false;
              parserInput.save();
              do {
                parserInput.save();
                if (parserInput.$re(/^[0-9a-z-]*\s+\(/)) {
                  spacing = true;
                }
                parserInput.restore();
                e = entities.declarationCall.bind(this)() || entities.keyword() || entities.variable() || entities.mixinLookup();
                if (e) {
                  nodes.push(e);
                } else if (parserInput.$char("(")) {
                  p = this.property();
                  parserInput.save();
                  if (!p && syntaxOptions.queryInParens && parserInput.$re(/^[0-9a-z-]*\s*([<>]=|<=|>=|[<>]|=)/)) {
                    parserInput.restore();
                    p = this.condition();
                    parserInput.save();
                    rangeP = this.atomicCondition(null, p.rvalue);
                    if (!rangeP) {
                      parserInput.restore();
                    }
                  } else {
                    parserInput.restore();
                    e = this.value();
                  }
                  if (parserInput.$char(")")) {
                    if (p && !e) {
                      nodes.push(new tree.Paren(new tree.QueryInParens(p.op, p.lvalue, p.rvalue, rangeP ? rangeP.op : null, rangeP ? rangeP.rvalue : null, p._index)));
                      e = p;
                    } else if (p && e) {
                      nodes.push(new tree.Paren(new tree.Declaration(p, e, null, null, parserInput.i + currentIndex, fileInfo, true)));
                      if (!spacing) {
                        nodes[nodes.length - 1].noSpacing = true;
                      }
                      spacing = false;
                    } else if (e) {
                      nodes.push(new tree.Paren(e));
                      spacing = false;
                    } else {
                      error("badly formed media feature definition");
                    }
                  } else {
                    error("Missing closing ')'", "Parse");
                  }
                }
              } while (e);
              parserInput.forget();
              if (nodes.length > 0) {
                return new tree.Expression(nodes);
              }
            },
            mediaFeatures: function(syntaxOptions) {
              var entities = this.entities;
              var features = [];
              var e;
              do {
                e = this.mediaFeature(syntaxOptions);
                if (e) {
                  features.push(e);
                  if (!parserInput.$char(",")) {
                    break;
                  } else if (!features[features.length - 1].noSpacing) {
                    features[features.length - 1].noSpacing = false;
                  }
                } else {
                  e = entities.variable() || entities.mixinLookup();
                  if (e) {
                    features.push(e);
                    if (!parserInput.$char(",")) {
                      break;
                    } else if (!features[features.length - 1].noSpacing) {
                      features[features.length - 1].noSpacing = false;
                    }
                  }
                }
              } while (e);
              return features.length > 0 ? features : null;
            },
            prepareAndGetNestableAtRule: function(treeType, index, debugInfo2, syntaxOptions) {
              var features = this.mediaFeatures(syntaxOptions);
              var rules = this.block();
              if (!rules) {
                error("media definitions require block statements after any features");
              }
              parserInput.forget();
              var atRule = new treeType(rules, features, index + currentIndex, fileInfo);
              if (context.dumpLineNumbers) {
                atRule.debugInfo = debugInfo2;
              }
              return atRule;
            },
            nestableAtRule: function() {
              var debugInfo2;
              var index = parserInput.i;
              if (context.dumpLineNumbers) {
                debugInfo2 = getDebugInfo(index);
              }
              parserInput.save();
              if (parserInput.$peekChar("@")) {
                if (parserInput.$str("@media")) {
                  return this.prepareAndGetNestableAtRule(tree.Media, index, debugInfo2, MediaSyntaxOptions);
                }
                if (parserInput.$str("@container")) {
                  return this.prepareAndGetNestableAtRule(tree.Container, index, debugInfo2, ContainerSyntaxOptions);
                }
              }
              parserInput.restore();
            },
            //
            // A @plugin directive, used to import plugins dynamically.
            //
            //     @plugin (args) "lib";
            //
            plugin: function() {
              var path;
              var args;
              var options2;
              var index = parserInput.i;
              var dir = parserInput.$re(/^@plugin\s+/);
              if (dir) {
                args = this.pluginArgs();
                if (args) {
                  options2 = {
                    pluginArgs: args,
                    isPlugin: true
                  };
                } else {
                  options2 = { isPlugin: true };
                }
                if (path = this.entities.quoted() || this.entities.url()) {
                  if (!parserInput.$char(";")) {
                    parserInput.i = index;
                    error("missing semi-colon on @plugin");
                  }
                  return new tree.Import(path, null, options2, index + currentIndex, fileInfo);
                } else {
                  parserInput.i = index;
                  error("malformed @plugin statement");
                }
              }
            },
            pluginArgs: function() {
              parserInput.save();
              if (!parserInput.$char("(")) {
                parserInput.restore();
                return null;
              }
              var args = parserInput.$re(/^\s*([^);]+)\)\s*/);
              if (args[1]) {
                parserInput.forget();
                return args[1].trim();
              } else {
                parserInput.restore();
                return null;
              }
            },
            atruleUnknown: function(value, name, hasBlock) {
              value = this.permissiveValue(/^[{;]/);
              hasBlock = parserInput.currentChar() === "{";
              if (!value) {
                if (!hasBlock && parserInput.currentChar() !== ";") {
                  error("".concat(name, " rule is missing block or ending semi-colon"));
                }
              } else if (!value.value) {
                value = null;
              }
              return [value, hasBlock];
            },
            atruleBlock: function(rules, value, isRooted, isKeywordList) {
              rules = this.blockRuleset();
              parserInput.save();
              if (!rules && !isRooted) {
                value = this.entity();
                rules = this.blockRuleset();
              }
              if (!rules && !isRooted) {
                parserInput.restore();
                var e = [];
                value = this.entity();
                while (parserInput.$char(",")) {
                  e.push(value);
                  value = this.entity();
                }
                if (value && e.length > 0) {
                  e.push(value);
                  value = e;
                  isKeywordList = true;
                } else {
                  rules = this.blockRuleset();
                }
              } else {
                parserInput.forget();
              }
              return [rules, value, isKeywordList];
            },
            //
            // A CSS AtRule
            //
            //     @charset "utf-8";
            //
            atrule: function() {
              var index = parserInput.i;
              var name;
              var value;
              var rules;
              var nonVendorSpecificName;
              var hasIdentifier;
              var hasExpression;
              var hasUnknown;
              var hasBlock = true;
              var isRooted = true;
              var isKeywordList = false;
              if (parserInput.currentChar() !== "@") {
                return;
              }
              value = this["import"]() || this.plugin() || this.nestableAtRule();
              if (value) {
                return value;
              }
              parserInput.save();
              name = parserInput.$re(/^@[a-z-]+/);
              if (!name) {
                return;
              }
              nonVendorSpecificName = name;
              if (name.charAt(1) == "-" && name.indexOf("-", 2) > 0) {
                nonVendorSpecificName = "@".concat(name.slice(name.indexOf("-", 2) + 1));
              }
              switch (nonVendorSpecificName) {
                case "@charset":
                  hasIdentifier = true;
                  hasBlock = false;
                  break;
                case "@namespace":
                  hasExpression = true;
                  hasBlock = false;
                  break;
                case "@keyframes":
                case "@counter-style":
                  hasIdentifier = true;
                  break;
                case "@document":
                case "@supports":
                  hasUnknown = true;
                  isRooted = false;
                  break;
                case "@starting-style":
                  isRooted = false;
                  break;
                case "@layer":
                  isRooted = false;
                  break;
                default:
                  hasUnknown = true;
                  break;
              }
              parserInput.commentStore.length = 0;
              if (hasIdentifier) {
                value = this.entity();
                if (!value) {
                  error("expected ".concat(name, " identifier"));
                }
              } else if (hasExpression) {
                value = this.expression();
                if (!value) {
                  error("expected ".concat(name, " expression"));
                }
              } else if (hasUnknown) {
                var unknownPackage = this.atruleUnknown(value, name, hasBlock);
                value = unknownPackage[0];
                hasBlock = unknownPackage[1];
              }
              if (hasBlock) {
                var blockPackage = this.atruleBlock(rules, value, isRooted, isKeywordList);
                rules = blockPackage[0];
                value = blockPackage[1];
                isKeywordList = blockPackage[2];
                if (!rules && !hasUnknown) {
                  parserInput.restore();
                  name = parserInput.$re(/^@[a-z-]+/);
                  var unknownPackage = this.atruleUnknown(value, name, hasBlock);
                  value = unknownPackage[0];
                  hasBlock = unknownPackage[1];
                  if (hasBlock) {
                    blockPackage = this.atruleBlock(rules, value, isRooted, isKeywordList);
                    rules = blockPackage[0];
                    value = blockPackage[1];
                    isKeywordList = blockPackage[2];
                  }
                }
              }
              if (rules || isKeywordList || !hasBlock && value && parserInput.$char(";")) {
                parserInput.forget();
                return new tree.AtRule(name, value, rules, index + currentIndex, fileInfo, context.dumpLineNumbers ? getDebugInfo(index) : null, isRooted);
              }
              parserInput.restore("at-rule options not recognised");
            },
            //
            // A Value is a comma-delimited list of Expressions
            //
            //     font-family: Baskerville, Georgia, serif;
            //
            // In a Rule, a Value represents everything after the `:`,
            // and before the `;`.
            //
            value: function() {
              var e;
              var expressions = [];
              var index = parserInput.i;
              do {
                e = this.expression();
                if (e) {
                  expressions.push(e);
                  if (!parserInput.$char(",")) {
                    break;
                  }
                }
              } while (e);
              if (expressions.length > 0) {
                return new tree.Value(expressions, index + currentIndex);
              }
            },
            important: function() {
              if (parserInput.currentChar() === "!") {
                return parserInput.$re(/^! *important/);
              }
            },
            sub: function() {
              var a;
              var e;
              parserInput.save();
              if (parserInput.$char("(")) {
                a = this.addition();
                if (a && parserInput.$char(")")) {
                  parserInput.forget();
                  e = new tree.Expression([a]);
                  e.parens = true;
                  return e;
                }
                parserInput.restore("Expected ')'");
                return;
              }
              parserInput.restore();
            },
            colorOperand: function() {
              parserInput.save();
              var match = parserInput.$re(/^[lchrgbs]\s+/);
              if (match) {
                return new tree.Keyword(match[0]);
              }
              parserInput.restore();
            },
            multiplication: function() {
              var m;
              var a;
              var op;
              var operation;
              var isSpaced;
              m = this.operand();
              if (m) {
                isSpaced = parserInput.isWhitespace(-1);
                while (true) {
                  if (parserInput.peek(/^\/[*/]/)) {
                    break;
                  }
                  parserInput.save();
                  op = parserInput.$char("/") || parserInput.$char("*");
                  if (!op) {
                    var index = parserInput.i;
                    op = parserInput.$str("./");
                    if (op) {
                      warn("./ operator is deprecated", index, "DEPRECATED");
                    }
                  }
                  if (!op) {
                    parserInput.forget();
                    break;
                  }
                  a = this.operand();
                  if (!a) {
                    parserInput.restore();
                    break;
                  }
                  parserInput.forget();
                  m.parensInOp = true;
                  a.parensInOp = true;
                  operation = new tree.Operation(op, [operation || m, a], isSpaced);
                  isSpaced = parserInput.isWhitespace(-1);
                }
                return operation || m;
              }
            },
            addition: function() {
              var m;
              var a;
              var op;
              var operation;
              var isSpaced;
              m = this.multiplication();
              if (m) {
                isSpaced = parserInput.isWhitespace(-1);
                while (true) {
                  op = parserInput.$re(/^[-+]\s+/) || !isSpaced && (parserInput.$char("+") || parserInput.$char("-"));
                  if (!op) {
                    break;
                  }
                  a = this.multiplication();
                  if (!a) {
                    break;
                  }
                  m.parensInOp = true;
                  a.parensInOp = true;
                  operation = new tree.Operation(op, [operation || m, a], isSpaced);
                  isSpaced = parserInput.isWhitespace(-1);
                }
                return operation || m;
              }
            },
            conditions: function() {
              var a;
              var b;
              var index = parserInput.i;
              var condition;
              a = this.condition(true);
              if (a) {
                while (true) {
                  if (!parserInput.peek(/^,\s*(not\s*)?\(/) || !parserInput.$char(",")) {
                    break;
                  }
                  b = this.condition(true);
                  if (!b) {
                    break;
                  }
                  condition = new tree.Condition("or", condition || a, b, index + currentIndex);
                }
                return condition || a;
              }
            },
            condition: function(needsParens) {
              var result;
              var logical;
              var next;
              function or() {
                return parserInput.$str("or");
              }
              result = this.conditionAnd(needsParens);
              if (!result) {
                return;
              }
              logical = or();
              if (logical) {
                next = this.condition(needsParens);
                if (next) {
                  result = new tree.Condition(logical, result, next);
                } else {
                  return;
                }
              }
              return result;
            },
            conditionAnd: function(needsParens) {
              var result;
              var logical;
              var next;
              var self2 = this;
              function insideCondition() {
                var cond = self2.negatedCondition(needsParens) || self2.parenthesisCondition(needsParens);
                if (!cond && !needsParens) {
                  return self2.atomicCondition(needsParens);
                }
                return cond;
              }
              function and() {
                return parserInput.$str("and");
              }
              result = insideCondition();
              if (!result) {
                return;
              }
              logical = and();
              if (logical) {
                next = this.conditionAnd(needsParens);
                if (next) {
                  result = new tree.Condition(logical, result, next);
                } else {
                  return;
                }
              }
              return result;
            },
            negatedCondition: function(needsParens) {
              if (parserInput.$str("not")) {
                var result = this.parenthesisCondition(needsParens);
                if (result) {
                  result.negate = !result.negate;
                }
                return result;
              }
            },
            parenthesisCondition: function(needsParens) {
              function tryConditionFollowedByParenthesis(me) {
                var body2;
                parserInput.save();
                body2 = me.condition(needsParens);
                if (!body2) {
                  parserInput.restore();
                  return;
                }
                if (!parserInput.$char(")")) {
                  parserInput.restore();
                  return;
                }
                parserInput.forget();
                return body2;
              }
              var body;
              parserInput.save();
              if (!parserInput.$str("(")) {
                parserInput.restore();
                return;
              }
              body = tryConditionFollowedByParenthesis(this);
              if (body) {
                parserInput.forget();
                return body;
              }
              body = this.atomicCondition(needsParens);
              if (!body) {
                parserInput.restore();
                return;
              }
              if (!parserInput.$char(")")) {
                parserInput.restore("expected ')' got '".concat(parserInput.currentChar(), "'"));
                return;
              }
              parserInput.forget();
              return body;
            },
            atomicCondition: function(needsParens, preparsedCond) {
              var entities = this.entities;
              var index = parserInput.i;
              var a;
              var b;
              var c;
              var op;
              var cond = function() {
                return this.addition() || entities.keyword() || entities.quoted() || entities.mixinLookup();
              }.bind(this);
              if (preparsedCond) {
                a = preparsedCond;
              } else {
                a = cond();
              }
              if (a) {
                if (parserInput.$char(">")) {
                  if (parserInput.$char("=")) {
                    op = ">=";
                  } else {
                    op = ">";
                  }
                } else if (parserInput.$char("<")) {
                  if (parserInput.$char("=")) {
                    op = "<=";
                  } else {
                    op = "<";
                  }
                } else if (parserInput.$char("=")) {
                  if (parserInput.$char(">")) {
                    op = "=>";
                  } else if (parserInput.$char("<")) {
                    op = "=<";
                  } else {
                    op = "=";
                  }
                }
                if (op) {
                  b = cond();
                  if (b) {
                    c = new tree.Condition(op, a, b, index + currentIndex, false);
                  } else {
                    error("expected expression");
                  }
                } else if (!preparsedCond) {
                  c = new tree.Condition("=", a, new tree.Keyword("true"), index + currentIndex, false);
                }
                return c;
              }
            },
            //
            // An operand is anything that can be part of an operation,
            // such as a Color, or a Variable
            //
            operand: function() {
              var entities = this.entities;
              var negate;
              if (parserInput.peek(/^-[@$(]/)) {
                negate = parserInput.$char("-");
              }
              var o = this.sub() || entities.dimension() || entities.color() || entities.variable() || entities.property() || entities.call() || entities.quoted(true) || entities.colorKeyword() || this.colorOperand() || entities.mixinLookup();
              if (negate) {
                o.parensInOp = true;
                o = new tree.Negative(o);
              }
              return o;
            },
            //
            // Expressions either represent mathematical operations,
            // or white-space delimited Entities.
            //
            //     1px solid black
            //     @var * 2
            //
            expression: function() {
              var entities = [];
              var e;
              var delim;
              var index = parserInput.i;
              do {
                e = this.comment();
                if (e && !e.isLineComment) {
                  entities.push(e);
                  continue;
                }
                e = this.addition() || this.entity();
                if (e instanceof tree.Comment) {
                  e = null;
                }
                if (e) {
                  entities.push(e);
                  if (!parserInput.peek(/^\/[/*]/)) {
                    delim = parserInput.$char("/");
                    if (delim) {
                      entities.push(new tree.Anonymous(delim, index + currentIndex));
                    }
                  }
                }
              } while (e);
              if (entities.length > 0) {
                return new tree.Expression(entities);
              }
            },
            property: function() {
              var name = parserInput.$re(/^(\*?-?[_a-zA-Z0-9-]+)\s*:/);
              if (name) {
                return name[1];
              }
            },
            ruleProperty: function() {
              var name = [];
              var index = [];
              var s;
              var k;
              parserInput.save();
              var simpleProperty = parserInput.$re(/^([_a-zA-Z0-9-]+)\s*:/);
              if (simpleProperty) {
                name = [new tree.Keyword(simpleProperty[1])];
                parserInput.forget();
                return name;
              }
              function match(re) {
                var i = parserInput.i;
                var chunk = parserInput.$re(re);
                if (chunk) {
                  index.push(i);
                  return name.push(chunk[1]);
                }
              }
              match(/^(\*?)/);
              while (true) {
                if (!match(/^((?:[\w-]+)|(?:[@$]\{[\w-]+\}))/)) {
                  break;
                }
              }
              if (name.length > 1 && match(/^((?:\+_|\+)?)\s*:/)) {
                parserInput.forget();
                if (name[0] === "") {
                  name.shift();
                  index.shift();
                }
                for (k = 0; k < name.length; k++) {
                  s = name[k];
                  name[k] = s.charAt(0) !== "@" && s.charAt(0) !== "$" ? new tree.Keyword(s) : s.charAt(0) === "@" ? new tree.Variable("@".concat(s.slice(2, -1)), index[k] + currentIndex, fileInfo) : new tree.Property("$".concat(s.slice(2, -1)), index[k] + currentIndex, fileInfo);
                }
                return name;
              }
              parserInput.restore();
            }
          }
        };
      };
      Parser.serializeVars = function(vars) {
        var s = "";
        for (var name_1 in vars) {
          if (Object.hasOwnProperty.call(vars, name_1)) {
            var value = vars[name_1];
            s += "".concat((name_1[0] === "@" ? "" : "@") + name_1, ": ").concat(value).concat(String(value).slice(-1) === ";" ? "" : ";");
          }
        }
        return s;
      };
      var Selector = function(elements, extendList, condition, index, currentFileInfo, visibilityInfo) {
        this.extendList = extendList;
        this.condition = condition;
        this.evaldCondition = !condition;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.elements = this.getElements(elements);
        this.mixinElements_ = void 0;
        this.copyVisibilityInfo(visibilityInfo);
        this.setParent(this.elements, this);
      };
      Selector.prototype = Object.assign(new Node(), {
        type: "Selector",
        accept: function(visitor) {
          if (this.elements) {
            this.elements = visitor.visitArray(this.elements);
          }
          if (this.extendList) {
            this.extendList = visitor.visitArray(this.extendList);
          }
          if (this.condition) {
            this.condition = visitor.visit(this.condition);
          }
        },
        createDerived: function(elements, extendList, evaldCondition) {
          elements = this.getElements(elements);
          var newSelector = new Selector(elements, extendList || this.extendList, null, this.getIndex(), this.fileInfo(), this.visibilityInfo());
          newSelector.evaldCondition = !isNullOrUndefined(evaldCondition) ? evaldCondition : this.evaldCondition;
          newSelector.mediaEmpty = this.mediaEmpty;
          return newSelector;
        },
        getElements: function(els) {
          if (!els) {
            return [new Element("", "&", false, this._index, this._fileInfo)];
          }
          if (typeof els === "string") {
            new Parser(this.parse.context, this.parse.importManager, this._fileInfo, this._index).parseNode(els, ["selector"], function(err, result) {
              if (err) {
                throw new LessError({
                  index: err.index,
                  message: err.message
                }, this.parse.imports, this._fileInfo.filename);
              }
              els = result[0].elements;
            });
          }
          return els;
        },
        createEmptySelectors: function() {
          var el = new Element("", "&", false, this._index, this._fileInfo), sels = [new Selector([el], null, null, this._index, this._fileInfo)];
          sels[0].mediaEmpty = true;
          return sels;
        },
        match: function(other) {
          var elements = this.elements;
          var len = elements.length;
          var olen;
          var i;
          other = other.mixinElements();
          olen = other.length;
          if (olen === 0 || len < olen) {
            return 0;
          } else {
            for (i = 0; i < olen; i++) {
              if (elements[i].value !== other[i]) {
                return 0;
              }
            }
          }
          return olen;
        },
        mixinElements: function() {
          if (this.mixinElements_) {
            return this.mixinElements_;
          }
          var elements = this.elements.map(function(v) {
            return v.combinator.value + (v.value.value || v.value);
          }).join("").match(/[,&#*.\w-]([\w-]|(\\.))*/g);
          if (elements) {
            if (elements[0] === "&") {
              elements.shift();
            }
          } else {
            elements = [];
          }
          return this.mixinElements_ = elements;
        },
        isJustParentSelector: function() {
          return !this.mediaEmpty && this.elements.length === 1 && this.elements[0].value === "&" && (this.elements[0].combinator.value === " " || this.elements[0].combinator.value === "");
        },
        eval: function(context) {
          var evaldCondition = this.condition && this.condition.eval(context);
          var elements = this.elements;
          var extendList = this.extendList;
          elements = elements && elements.map(function(e) {
            return e.eval(context);
          });
          extendList = extendList && extendList.map(function(extend) {
            return extend.eval(context);
          });
          return this.createDerived(elements, extendList, evaldCondition);
        },
        genCSS: function(context, output) {
          var i, element;
          if ((!context || !context.firstSelector) && this.elements[0].combinator.value === "") {
            output.add(" ", this.fileInfo(), this.getIndex());
          }
          for (i = 0; i < this.elements.length; i++) {
            element = this.elements[i];
            element.genCSS(context, output);
          }
        },
        getIsOutput: function() {
          return this.evaldCondition;
        }
      });
      var Value = function(value) {
        if (!value) {
          throw new Error("Value requires an array argument");
        }
        if (!Array.isArray(value)) {
          this.value = [value];
        } else {
          this.value = value;
        }
      };
      Value.prototype = Object.assign(new Node(), {
        type: "Value",
        accept: function(visitor) {
          if (this.value) {
            this.value = visitor.visitArray(this.value);
          }
        },
        eval: function(context) {
          if (this.value.length === 1) {
            return this.value[0].eval(context);
          } else {
            return new Value(this.value.map(function(v) {
              return v.eval(context);
            }));
          }
        },
        genCSS: function(context, output) {
          var i;
          for (i = 0; i < this.value.length; i++) {
            this.value[i].genCSS(context, output);
            if (i + 1 < this.value.length) {
              output.add(context && context.compress ? "," : ", ");
            }
          }
        }
      });
      var Keyword = function(value) {
        this.value = value;
      };
      Keyword.prototype = Object.assign(new Node(), {
        type: "Keyword",
        genCSS: function(context, output) {
          if (this.value === "%") {
            throw { type: "Syntax", message: "Invalid % without number" };
          }
          output.add(this.value);
        }
      });
      Keyword.True = new Keyword("true");
      Keyword.False = new Keyword("false");
      var MATH$1 = Math$1;
      function evalName(context, name) {
        var value = "";
        var i;
        var n = name.length;
        var output = { add: function(s) {
          value += s;
        } };
        for (i = 0; i < n; i++) {
          name[i].eval(context).genCSS(context, output);
        }
        return value;
      }
      var Declaration = function(name, value, important, merge2, index, currentFileInfo, inline, variable) {
        this.name = name;
        this.value = value instanceof Node ? value : new Value([value ? new Anonymous(value) : null]);
        this.important = important ? " ".concat(important.trim()) : "";
        this.merge = merge2;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.inline = inline || false;
        this.variable = variable !== void 0 ? variable : name.charAt && name.charAt(0) === "@";
        this.allowRoot = true;
        this.setParent(this.value, this);
      };
      Declaration.prototype = Object.assign(new Node(), {
        type: "Declaration",
        genCSS: function(context, output) {
          output.add(this.name + (context.compress ? ":" : ": "), this.fileInfo(), this.getIndex());
          try {
            this.value.genCSS(context, output);
          } catch (e) {
            e.index = this._index;
            e.filename = this._fileInfo.filename;
            throw e;
          }
          output.add(this.important + (this.inline || context.lastRule && context.compress ? "" : ";"), this._fileInfo, this._index);
        },
        eval: function(context) {
          var mathBypass = false, prevMath, name = this.name, evaldValue, variable = this.variable;
          if (typeof name !== "string") {
            name = name.length === 1 && name[0] instanceof Keyword ? name[0].value : evalName(context, name);
            variable = false;
          }
          if (name === "font" && context.math === MATH$1.ALWAYS) {
            mathBypass = true;
            prevMath = context.math;
            context.math = MATH$1.PARENS_DIVISION;
          }
          try {
            context.importantScope.push({});
            evaldValue = this.value.eval(context);
            if (!this.variable && evaldValue.type === "DetachedRuleset") {
              throw {
                message: "Rulesets cannot be evaluated on a property.",
                index: this.getIndex(),
                filename: this.fileInfo().filename
              };
            }
            var important = this.important;
            var importantResult = context.importantScope.pop();
            if (!important && importantResult.important) {
              important = importantResult.important;
            }
            return new Declaration(name, evaldValue, important, this.merge, this.getIndex(), this.fileInfo(), this.inline, variable);
          } catch (e) {
            if (typeof e.index !== "number") {
              e.index = this.getIndex();
              e.filename = this.fileInfo().filename;
            }
            throw e;
          } finally {
            if (mathBypass) {
              context.math = prevMath;
            }
          }
        },
        makeImportant: function() {
          return new Declaration(this.name, this.value, "!important", this.merge, this.getIndex(), this.fileInfo(), this.inline);
        }
      });
      function asComment(ctx) {
        return "/* line ".concat(ctx.debugInfo.lineNumber, ", ").concat(ctx.debugInfo.fileName, " */\n");
      }
      function asMediaQuery(ctx) {
        var filenameWithProtocol = ctx.debugInfo.fileName;
        if (!/^[a-z]+:\/\//i.test(filenameWithProtocol)) {
          filenameWithProtocol = "file://".concat(filenameWithProtocol);
        }
        return "@media -sass-debug-info{filename{font-family:".concat(filenameWithProtocol.replace(/([.:/\\])/g, function(a) {
          if (a == "\\") {
            a = "/";
          }
          return "\\".concat(a);
        }), "}line{font-family:\\00003").concat(ctx.debugInfo.lineNumber, "}}\n");
      }
      function debugInfo(context, ctx, lineSeparator) {
        var result = "";
        if (context.dumpLineNumbers && !context.compress) {
          switch (context.dumpLineNumbers) {
            case "comments":
              result = asComment(ctx);
              break;
            case "mediaquery":
              result = asMediaQuery(ctx);
              break;
            case "all":
              result = asComment(ctx) + (lineSeparator || "") + asMediaQuery(ctx);
              break;
          }
        }
        return result;
      }
      var Comment = function(value, isLineComment, index, currentFileInfo) {
        this.value = value;
        this.isLineComment = isLineComment;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.allowRoot = true;
      };
      Comment.prototype = Object.assign(new Node(), {
        type: "Comment",
        genCSS: function(context, output) {
          if (this.debugInfo) {
            output.add(debugInfo(context, this), this.fileInfo(), this.getIndex());
          }
          output.add(this.value);
        },
        isSilent: function(context) {
          var isCompressed = context.compress && this.value[2] !== "!";
          return this.isLineComment || isCompressed;
        }
      });
      var defaultFunc = {
        eval: function() {
          var v = this.value_;
          var e = this.error_;
          if (e) {
            throw e;
          }
          if (!isNullOrUndefined(v)) {
            return v ? Keyword.True : Keyword.False;
          }
        },
        value: function(v) {
          this.value_ = v;
        },
        error: function(e) {
          this.error_ = e;
        },
        reset: function() {
          this.value_ = this.error_ = null;
        }
      };
      var Ruleset = function(selectors, rules, strictImports, visibilityInfo) {
        this.selectors = selectors;
        this.rules = rules;
        this._lookups = {};
        this._variables = null;
        this._properties = null;
        this.strictImports = strictImports;
        this.copyVisibilityInfo(visibilityInfo);
        this.allowRoot = true;
        this.setParent(this.selectors, this);
        this.setParent(this.rules, this);
      };
      Ruleset.prototype = Object.assign(new Node(), {
        type: "Ruleset",
        isRuleset: true,
        isRulesetLike: function() {
          return true;
        },
        accept: function(visitor) {
          if (this.paths) {
            this.paths = visitor.visitArray(this.paths, true);
          } else if (this.selectors) {
            this.selectors = visitor.visitArray(this.selectors);
          }
          if (this.rules && this.rules.length) {
            this.rules = visitor.visitArray(this.rules);
          }
        },
        eval: function(context) {
          var selectors;
          var selCnt;
          var selector;
          var i;
          var hasVariable;
          var hasOnePassingSelector = false;
          if (this.selectors && (selCnt = this.selectors.length)) {
            selectors = new Array(selCnt);
            defaultFunc.error({
              type: "Syntax",
              message: "it is currently only allowed in parametric mixin guards,"
            });
            for (i = 0; i < selCnt; i++) {
              selector = this.selectors[i].eval(context);
              for (var j = 0; j < selector.elements.length; j++) {
                if (selector.elements[j].isVariable) {
                  hasVariable = true;
                  break;
                }
              }
              selectors[i] = selector;
              if (selector.evaldCondition) {
                hasOnePassingSelector = true;
              }
            }
            if (hasVariable) {
              var toParseSelectors = new Array(selCnt);
              for (i = 0; i < selCnt; i++) {
                selector = selectors[i];
                toParseSelectors[i] = selector.toCSS(context);
              }
              var startingIndex = selectors[0].getIndex();
              var selectorFileInfo = selectors[0].fileInfo();
              new Parser(context, this.parse.importManager, selectorFileInfo, startingIndex).parseNode(toParseSelectors.join(","), ["selectors"], function(err, result) {
                if (result) {
                  selectors = flattenArray(result);
                }
              });
            }
            defaultFunc.reset();
          } else {
            hasOnePassingSelector = true;
          }
          var rules = this.rules ? copyArray(this.rules) : null;
          var ruleset = new Ruleset(selectors, rules, this.strictImports, this.visibilityInfo());
          var rule;
          var subRule;
          ruleset.originalRuleset = this;
          ruleset.root = this.root;
          ruleset.firstRoot = this.firstRoot;
          ruleset.allowImports = this.allowImports;
          if (this.debugInfo) {
            ruleset.debugInfo = this.debugInfo;
          }
          if (!hasOnePassingSelector) {
            rules.length = 0;
          }
          ruleset.functionRegistry = function(frames) {
            var i2 = 0;
            var n = frames.length;
            var found;
            for (; i2 !== n; ++i2) {
              found = frames[i2].functionRegistry;
              if (found) {
                return found;
              }
            }
            return functionRegistry;
          }(context.frames).inherit();
          var ctxFrames = context.frames;
          ctxFrames.unshift(ruleset);
          var ctxSelectors = context.selectors;
          if (!ctxSelectors) {
            context.selectors = ctxSelectors = [];
          }
          ctxSelectors.unshift(this.selectors);
          if (ruleset.root || ruleset.allowImports || !ruleset.strictImports) {
            ruleset.evalImports(context);
          }
          var rsRules = ruleset.rules;
          for (i = 0; rule = rsRules[i]; i++) {
            if (rule.evalFirst) {
              rsRules[i] = rule.eval(context);
            }
          }
          var mediaBlockCount = context.mediaBlocks && context.mediaBlocks.length || 0;
          for (i = 0; rule = rsRules[i]; i++) {
            if (rule.type === "MixinCall") {
              rules = rule.eval(context).filter(function(r) {
                if (r instanceof Declaration && r.variable) {
                  return !ruleset.variable(r.name);
                }
                return true;
              });
              rsRules.splice.apply(rsRules, [i, 1].concat(rules));
              i += rules.length - 1;
              ruleset.resetCache();
            } else if (rule.type === "VariableCall") {
              rules = rule.eval(context).rules.filter(function(r) {
                if (r instanceof Declaration && r.variable) {
                  return false;
                }
                return true;
              });
              rsRules.splice.apply(rsRules, [i, 1].concat(rules));
              i += rules.length - 1;
              ruleset.resetCache();
            }
          }
          for (i = 0; rule = rsRules[i]; i++) {
            if (!rule.evalFirst) {
              rsRules[i] = rule = rule.eval ? rule.eval(context) : rule;
            }
          }
          for (i = 0; rule = rsRules[i]; i++) {
            if (rule instanceof Ruleset && rule.selectors && rule.selectors.length === 1) {
              if (rule.selectors[0] && rule.selectors[0].isJustParentSelector()) {
                rsRules.splice(i--, 1);
                for (var j = 0; subRule = rule.rules[j]; j++) {
                  if (subRule instanceof Node) {
                    subRule.copyVisibilityInfo(rule.visibilityInfo());
                    if (!(subRule instanceof Declaration) || !subRule.variable) {
                      rsRules.splice(++i, 0, subRule);
                    }
                  }
                }
              }
            }
          }
          ctxFrames.shift();
          ctxSelectors.shift();
          if (context.mediaBlocks) {
            for (i = mediaBlockCount; i < context.mediaBlocks.length; i++) {
              context.mediaBlocks[i].bubbleSelectors(selectors);
            }
          }
          return ruleset;
        },
        evalImports: function(context) {
          var rules = this.rules;
          var i;
          var importRules;
          if (!rules) {
            return;
          }
          for (i = 0; i < rules.length; i++) {
            if (rules[i].type === "Import") {
              importRules = rules[i].eval(context);
              if (importRules && (importRules.length || importRules.length === 0)) {
                rules.splice.apply(rules, [i, 1].concat(importRules));
                i += importRules.length - 1;
              } else {
                rules.splice(i, 1, importRules);
              }
              this.resetCache();
            }
          }
        },
        makeImportant: function() {
          var result = new Ruleset(this.selectors, this.rules.map(function(r) {
            if (r.makeImportant) {
              return r.makeImportant();
            } else {
              return r;
            }
          }), this.strictImports, this.visibilityInfo());
          return result;
        },
        matchArgs: function(args) {
          return !args || args.length === 0;
        },
        // lets you call a css selector with a guard
        matchCondition: function(args, context) {
          var lastSelector = this.selectors[this.selectors.length - 1];
          if (!lastSelector.evaldCondition) {
            return false;
          }
          if (lastSelector.condition && !lastSelector.condition.eval(new contexts.Eval(context, context.frames))) {
            return false;
          }
          return true;
        },
        resetCache: function() {
          this._rulesets = null;
          this._variables = null;
          this._properties = null;
          this._lookups = {};
        },
        variables: function() {
          if (!this._variables) {
            this._variables = !this.rules ? {} : this.rules.reduce(function(hash, r) {
              if (r instanceof Declaration && r.variable === true) {
                hash[r.name] = r;
              }
              if (r.type === "Import" && r.root && r.root.variables) {
                var vars = r.root.variables();
                for (var name_1 in vars) {
                  if (vars.hasOwnProperty(name_1)) {
                    hash[name_1] = r.root.variable(name_1);
                  }
                }
              }
              return hash;
            }, {});
          }
          return this._variables;
        },
        properties: function() {
          if (!this._properties) {
            this._properties = !this.rules ? {} : this.rules.reduce(function(hash, r) {
              if (r instanceof Declaration && r.variable !== true) {
                var name_2 = r.name.length === 1 && r.name[0] instanceof Keyword ? r.name[0].value : r.name;
                if (!hash["$".concat(name_2)]) {
                  hash["$".concat(name_2)] = [r];
                } else {
                  hash["$".concat(name_2)].push(r);
                }
              }
              return hash;
            }, {});
          }
          return this._properties;
        },
        variable: function(name) {
          var decl = this.variables()[name];
          if (decl) {
            return this.parseValue(decl);
          }
        },
        property: function(name) {
          var decl = this.properties()[name];
          if (decl) {
            return this.parseValue(decl);
          }
        },
        lastDeclaration: function() {
          for (var i_1 = this.rules.length; i_1 > 0; i_1--) {
            var decl = this.rules[i_1 - 1];
            if (decl instanceof Declaration) {
              return this.parseValue(decl);
            }
          }
        },
        parseValue: function(toParse) {
          var self2 = this;
          function transformDeclaration(decl) {
            if (decl.value instanceof Anonymous && !decl.parsed) {
              if (typeof decl.value.value === "string") {
                new Parser(this.parse.context, this.parse.importManager, decl.fileInfo(), decl.value.getIndex()).parseNode(decl.value.value, ["value", "important"], function(err, result) {
                  if (err) {
                    decl.parsed = true;
                  }
                  if (result) {
                    decl.value = result[0];
                    decl.important = result[1] || "";
                    decl.parsed = true;
                  }
                });
              } else {
                decl.parsed = true;
              }
              return decl;
            } else {
              return decl;
            }
          }
          if (!Array.isArray(toParse)) {
            return transformDeclaration.call(self2, toParse);
          } else {
            var nodes_1 = [];
            toParse.forEach(function(n) {
              nodes_1.push(transformDeclaration.call(self2, n));
            });
            return nodes_1;
          }
        },
        rulesets: function() {
          if (!this.rules) {
            return [];
          }
          var filtRules = [];
          var rules = this.rules;
          var i;
          var rule;
          for (i = 0; rule = rules[i]; i++) {
            if (rule.isRuleset) {
              filtRules.push(rule);
            }
          }
          return filtRules;
        },
        prependRule: function(rule) {
          var rules = this.rules;
          if (rules) {
            rules.unshift(rule);
          } else {
            this.rules = [rule];
          }
          this.setParent(rule, this);
        },
        find: function(selector, self2, filter) {
          self2 = self2 || this;
          var rules = [];
          var match;
          var foundMixins;
          var key2 = selector.toCSS();
          if (key2 in this._lookups) {
            return this._lookups[key2];
          }
          this.rulesets().forEach(function(rule) {
            if (rule !== self2) {
              for (var j = 0; j < rule.selectors.length; j++) {
                match = selector.match(rule.selectors[j]);
                if (match) {
                  if (selector.elements.length > match) {
                    if (!filter || filter(rule)) {
                      foundMixins = rule.find(new Selector(selector.elements.slice(match)), self2, filter);
                      for (var i_2 = 0; i_2 < foundMixins.length; ++i_2) {
                        foundMixins[i_2].path.push(rule);
                      }
                      Array.prototype.push.apply(rules, foundMixins);
                    }
                  } else {
                    rules.push({ rule, path: [] });
                  }
                  break;
                }
              }
            }
          });
          this._lookups[key2] = rules;
          return rules;
        },
        genCSS: function(context, output) {
          var i;
          var j;
          var charsetRuleNodes = [];
          var ruleNodes = [];
          var debugInfo$1;
          var rule;
          var path;
          context.tabLevel = context.tabLevel || 0;
          if (!this.root) {
            context.tabLevel++;
          }
          var tabRuleStr = context.compress ? "" : Array(context.tabLevel + 1).join("  ");
          var tabSetStr = context.compress ? "" : Array(context.tabLevel).join("  ");
          var sep;
          var charsetNodeIndex = 0;
          var importNodeIndex = 0;
          for (i = 0; rule = this.rules[i]; i++) {
            if (rule instanceof Comment) {
              if (importNodeIndex === i) {
                importNodeIndex++;
              }
              ruleNodes.push(rule);
            } else if (rule.isCharset && rule.isCharset()) {
              ruleNodes.splice(charsetNodeIndex, 0, rule);
              charsetNodeIndex++;
              importNodeIndex++;
            } else if (rule.type === "Import") {
              ruleNodes.splice(importNodeIndex, 0, rule);
              importNodeIndex++;
            } else {
              ruleNodes.push(rule);
            }
          }
          ruleNodes = charsetRuleNodes.concat(ruleNodes);
          if (!this.root) {
            debugInfo$1 = debugInfo(context, this, tabSetStr);
            if (debugInfo$1) {
              output.add(debugInfo$1);
              output.add(tabSetStr);
            }
            var paths = this.paths;
            var pathCnt = paths.length;
            var pathSubCnt = void 0;
            sep = context.compress ? "," : ",\n".concat(tabSetStr);
            for (i = 0; i < pathCnt; i++) {
              path = paths[i];
              if (!(pathSubCnt = path.length)) {
                continue;
              }
              if (i > 0) {
                output.add(sep);
              }
              context.firstSelector = true;
              path[0].genCSS(context, output);
              context.firstSelector = false;
              for (j = 1; j < pathSubCnt; j++) {
                path[j].genCSS(context, output);
              }
            }
            output.add((context.compress ? "{" : " {\n") + tabRuleStr);
          }
          for (i = 0; rule = ruleNodes[i]; i++) {
            if (i + 1 === ruleNodes.length) {
              context.lastRule = true;
            }
            var currentLastRule = context.lastRule;
            if (rule.isRulesetLike(rule)) {
              context.lastRule = false;
            }
            if (rule.genCSS) {
              rule.genCSS(context, output);
            } else if (rule.value) {
              output.add(rule.value.toString());
            }
            context.lastRule = currentLastRule;
            if (!context.lastRule && rule.isVisible()) {
              output.add(context.compress ? "" : "\n".concat(tabRuleStr));
            } else {
              context.lastRule = false;
            }
          }
          if (!this.root) {
            output.add(context.compress ? "}" : "\n".concat(tabSetStr, "}"));
            context.tabLevel--;
          }
          if (!output.isEmpty() && !context.compress && this.firstRoot) {
            output.add("\n");
          }
        },
        joinSelectors: function(paths, context, selectors) {
          for (var s = 0; s < selectors.length; s++) {
            this.joinSelector(paths, context, selectors[s]);
          }
        },
        joinSelector: function(paths, context, selector) {
          function createParenthesis(elementsToPak, originalElement) {
            var replacementParen, j;
            if (elementsToPak.length === 0) {
              replacementParen = new Paren(elementsToPak[0]);
            } else {
              var insideParent = new Array(elementsToPak.length);
              for (j = 0; j < elementsToPak.length; j++) {
                insideParent[j] = new Element(null, elementsToPak[j], originalElement.isVariable, originalElement._index, originalElement._fileInfo);
              }
              replacementParen = new Paren(new Selector(insideParent));
            }
            return replacementParen;
          }
          function createSelector(containedElement, originalElement) {
            var element, selector2;
            element = new Element(null, containedElement, originalElement.isVariable, originalElement._index, originalElement._fileInfo);
            selector2 = new Selector([element]);
            return selector2;
          }
          function addReplacementIntoPath(beginningPath, addPath, replacedElement, originalSelector) {
            var newSelectorPath, lastSelector, newJoinedSelector;
            newSelectorPath = [];
            if (beginningPath.length > 0) {
              newSelectorPath = copyArray(beginningPath);
              lastSelector = newSelectorPath.pop();
              newJoinedSelector = originalSelector.createDerived(copyArray(lastSelector.elements));
            } else {
              newJoinedSelector = originalSelector.createDerived([]);
            }
            if (addPath.length > 0) {
              var combinator = replacedElement.combinator;
              var parentEl = addPath[0].elements[0];
              if (combinator.emptyOrWhitespace && !parentEl.combinator.emptyOrWhitespace) {
                combinator = parentEl.combinator;
              }
              newJoinedSelector.elements.push(new Element(combinator, parentEl.value, replacedElement.isVariable, replacedElement._index, replacedElement._fileInfo));
              newJoinedSelector.elements = newJoinedSelector.elements.concat(addPath[0].elements.slice(1));
            }
            if (newJoinedSelector.elements.length !== 0) {
              newSelectorPath.push(newJoinedSelector);
            }
            if (addPath.length > 1) {
              var restOfPath = addPath.slice(1);
              restOfPath = restOfPath.map(function(selector2) {
                return selector2.createDerived(selector2.elements, []);
              });
              newSelectorPath = newSelectorPath.concat(restOfPath);
            }
            return newSelectorPath;
          }
          function addAllReplacementsIntoPath(beginningPath, addPaths, replacedElement, originalSelector, result) {
            var j;
            for (j = 0; j < beginningPath.length; j++) {
              var newSelectorPath = addReplacementIntoPath(beginningPath[j], addPaths, replacedElement, originalSelector);
              result.push(newSelectorPath);
            }
            return result;
          }
          function mergeElementsOnToSelectors(elements, selectors) {
            var i2, sel;
            if (elements.length === 0) {
              return;
            }
            if (selectors.length === 0) {
              selectors.push([new Selector(elements)]);
              return;
            }
            for (i2 = 0; sel = selectors[i2]; i2++) {
              if (sel.length > 0) {
                sel[sel.length - 1] = sel[sel.length - 1].createDerived(sel[sel.length - 1].elements.concat(elements));
              } else {
                sel.push(new Selector(elements));
              }
            }
          }
          function replaceParentSelector(paths2, context2, inSelector) {
            var i2, j, k, currentElements, newSelectors, selectorsMultiplied, sel, el, hadParentSelector2 = false, length, lastSelector;
            function findNestedSelector(element) {
              var maybeSelector;
              if (!(element.value instanceof Paren)) {
                return null;
              }
              maybeSelector = element.value.value;
              if (!(maybeSelector instanceof Selector)) {
                return null;
              }
              return maybeSelector;
            }
            currentElements = [];
            newSelectors = [
              []
            ];
            for (i2 = 0; el = inSelector.elements[i2]; i2++) {
              if (el.value !== "&") {
                var nestedSelector = findNestedSelector(el);
                if (nestedSelector !== null) {
                  mergeElementsOnToSelectors(currentElements, newSelectors);
                  var nestedPaths = [];
                  var replaced = void 0;
                  var replacedNewSelectors = [];
                  replaced = replaceParentSelector(nestedPaths, context2, nestedSelector);
                  hadParentSelector2 = hadParentSelector2 || replaced;
                  for (k = 0; k < nestedPaths.length; k++) {
                    var replacementSelector = createSelector(createParenthesis(nestedPaths[k], el), el);
                    addAllReplacementsIntoPath(newSelectors, [replacementSelector], el, inSelector, replacedNewSelectors);
                  }
                  newSelectors = replacedNewSelectors;
                  currentElements = [];
                } else {
                  currentElements.push(el);
                }
              } else {
                hadParentSelector2 = true;
                selectorsMultiplied = [];
                mergeElementsOnToSelectors(currentElements, newSelectors);
                for (j = 0; j < newSelectors.length; j++) {
                  sel = newSelectors[j];
                  if (context2.length === 0) {
                    if (sel.length > 0) {
                      sel[0].elements.push(new Element(el.combinator, "", el.isVariable, el._index, el._fileInfo));
                    }
                    selectorsMultiplied.push(sel);
                  } else {
                    for (k = 0; k < context2.length; k++) {
                      var newSelectorPath = addReplacementIntoPath(sel, context2[k], el, inSelector);
                      selectorsMultiplied.push(newSelectorPath);
                    }
                  }
                }
                newSelectors = selectorsMultiplied;
                currentElements = [];
              }
            }
            mergeElementsOnToSelectors(currentElements, newSelectors);
            for (i2 = 0; i2 < newSelectors.length; i2++) {
              length = newSelectors[i2].length;
              if (length > 0) {
                paths2.push(newSelectors[i2]);
                lastSelector = newSelectors[i2][length - 1];
                newSelectors[i2][length - 1] = lastSelector.createDerived(lastSelector.elements, inSelector.extendList);
              }
            }
            return hadParentSelector2;
          }
          function deriveSelector(visibilityInfo, deriveFrom) {
            var newSelector = deriveFrom.createDerived(deriveFrom.elements, deriveFrom.extendList, deriveFrom.evaldCondition);
            newSelector.copyVisibilityInfo(visibilityInfo);
            return newSelector;
          }
          var i, newPaths, hadParentSelector;
          newPaths = [];
          hadParentSelector = replaceParentSelector(newPaths, context, selector);
          if (!hadParentSelector) {
            if (context.length > 0) {
              newPaths = [];
              for (i = 0; i < context.length; i++) {
                var concatenated = context[i].map(deriveSelector.bind(this, selector.visibilityInfo()));
                concatenated.push(selector);
                newPaths.push(concatenated);
              }
            } else {
              newPaths = [[selector]];
            }
          }
          for (i = 0; i < newPaths.length; i++) {
            paths.push(newPaths[i]);
          }
        }
      });
      var Unit = function(numerator, denominator, backupUnit) {
        this.numerator = numerator ? copyArray(numerator).sort() : [];
        this.denominator = denominator ? copyArray(denominator).sort() : [];
        if (backupUnit) {
          this.backupUnit = backupUnit;
        } else if (numerator && numerator.length) {
          this.backupUnit = numerator[0];
        }
      };
      Unit.prototype = Object.assign(new Node(), {
        type: "Unit",
        clone: function() {
          return new Unit(copyArray(this.numerator), copyArray(this.denominator), this.backupUnit);
        },
        genCSS: function(context, output) {
          var strictUnits = context && context.strictUnits;
          if (this.numerator.length === 1) {
            output.add(this.numerator[0]);
          } else if (!strictUnits && this.backupUnit) {
            output.add(this.backupUnit);
          } else if (!strictUnits && this.denominator.length) {
            output.add(this.denominator[0]);
          }
        },
        toString: function() {
          var i, returnStr = this.numerator.join("*");
          for (i = 0; i < this.denominator.length; i++) {
            returnStr += "/".concat(this.denominator[i]);
          }
          return returnStr;
        },
        compare: function(other) {
          return this.is(other.toString()) ? 0 : void 0;
        },
        is: function(unitString) {
          return this.toString().toUpperCase() === unitString.toUpperCase();
        },
        isLength: function() {
          return RegExp("^(px|em|ex|ch|rem|in|cm|mm|pc|pt|ex|vw|vh|vmin|vmax)$", "gi").test(this.toCSS());
        },
        isEmpty: function() {
          return this.numerator.length === 0 && this.denominator.length === 0;
        },
        isSingular: function() {
          return this.numerator.length <= 1 && this.denominator.length === 0;
        },
        map: function(callback) {
          var i;
          for (i = 0; i < this.numerator.length; i++) {
            this.numerator[i] = callback(this.numerator[i], false);
          }
          for (i = 0; i < this.denominator.length; i++) {
            this.denominator[i] = callback(this.denominator[i], true);
          }
        },
        usedUnits: function() {
          var group;
          var result = {};
          var mapUnit;
          var groupName;
          mapUnit = function(atomicUnit) {
            if (group.hasOwnProperty(atomicUnit) && !result[groupName]) {
              result[groupName] = atomicUnit;
            }
            return atomicUnit;
          };
          for (groupName in unitConversions) {
            if (unitConversions.hasOwnProperty(groupName)) {
              group = unitConversions[groupName];
              this.map(mapUnit);
            }
          }
          return result;
        },
        cancel: function() {
          var counter = {};
          var atomicUnit;
          var i;
          for (i = 0; i < this.numerator.length; i++) {
            atomicUnit = this.numerator[i];
            counter[atomicUnit] = (counter[atomicUnit] || 0) + 1;
          }
          for (i = 0; i < this.denominator.length; i++) {
            atomicUnit = this.denominator[i];
            counter[atomicUnit] = (counter[atomicUnit] || 0) - 1;
          }
          this.numerator = [];
          this.denominator = [];
          for (atomicUnit in counter) {
            if (counter.hasOwnProperty(atomicUnit)) {
              var count = counter[atomicUnit];
              if (count > 0) {
                for (i = 0; i < count; i++) {
                  this.numerator.push(atomicUnit);
                }
              } else if (count < 0) {
                for (i = 0; i < -count; i++) {
                  this.denominator.push(atomicUnit);
                }
              }
            }
          }
          this.numerator.sort();
          this.denominator.sort();
        }
      });
      var Dimension = function(value, unit) {
        this.value = parseFloat(value);
        if (isNaN(this.value)) {
          throw new Error("Dimension is not a number.");
        }
        this.unit = unit && unit instanceof Unit ? unit : new Unit(unit ? [unit] : void 0);
        this.setParent(this.unit, this);
      };
      Dimension.prototype = Object.assign(new Node(), {
        type: "Dimension",
        accept: function(visitor) {
          this.unit = visitor.visit(this.unit);
        },
        // remove when Nodes have JSDoc types
        // eslint-disable-next-line no-unused-vars
        eval: function(context) {
          return this;
        },
        toColor: function() {
          return new Color([this.value, this.value, this.value]);
        },
        genCSS: function(context, output) {
          if (context && context.strictUnits && !this.unit.isSingular()) {
            throw new Error("Multiple units in dimension. Correct the units or use the unit function. Bad unit: ".concat(this.unit.toString()));
          }
          var value = this.fround(context, this.value);
          var strValue = String(value);
          if (value !== 0 && value < 1e-6 && value > -1e-6) {
            strValue = value.toFixed(20).replace(/0+$/, "");
          }
          if (context && context.compress) {
            if (value === 0 && this.unit.isLength()) {
              output.add(strValue);
              return;
            }
            if (value > 0 && value < 1) {
              strValue = strValue.substr(1);
            }
          }
          output.add(strValue);
          this.unit.genCSS(context, output);
        },
        // In an operation between two Dimensions,
        // we default to the first Dimension's unit,
        // so `1px + 2` will yield `3px`.
        operate: function(context, op, other) {
          var value = this._operate(context, op, this.value, other.value);
          var unit = this.unit.clone();
          if (op === "+" || op === "-") {
            if (unit.numerator.length === 0 && unit.denominator.length === 0) {
              unit = other.unit.clone();
              if (this.unit.backupUnit) {
                unit.backupUnit = this.unit.backupUnit;
              }
            } else if (other.unit.numerator.length === 0 && unit.denominator.length === 0)
              ;
            else {
              other = other.convertTo(this.unit.usedUnits());
              if (context.strictUnits && other.unit.toString() !== unit.toString()) {
                throw new Error("Incompatible units. Change the units or use the unit function. " + "Bad units: '".concat(unit.toString(), "' and '").concat(other.unit.toString(), "'."));
              }
              value = this._operate(context, op, this.value, other.value);
            }
          } else if (op === "*") {
            unit.numerator = unit.numerator.concat(other.unit.numerator).sort();
            unit.denominator = unit.denominator.concat(other.unit.denominator).sort();
            unit.cancel();
          } else if (op === "/") {
            unit.numerator = unit.numerator.concat(other.unit.denominator).sort();
            unit.denominator = unit.denominator.concat(other.unit.numerator).sort();
            unit.cancel();
          }
          return new Dimension(value, unit);
        },
        compare: function(other) {
          var a, b;
          if (!(other instanceof Dimension)) {
            return void 0;
          }
          if (this.unit.isEmpty() || other.unit.isEmpty()) {
            a = this;
            b = other;
          } else {
            a = this.unify();
            b = other.unify();
            if (a.unit.compare(b.unit) !== 0) {
              return void 0;
            }
          }
          return Node.numericCompare(a.value, b.value);
        },
        unify: function() {
          return this.convertTo({ length: "px", duration: "s", angle: "rad" });
        },
        convertTo: function(conversions) {
          var value = this.value;
          var unit = this.unit.clone();
          var i;
          var groupName;
          var group;
          var targetUnit;
          var derivedConversions = {};
          var applyUnit;
          if (typeof conversions === "string") {
            for (i in unitConversions) {
              if (unitConversions[i].hasOwnProperty(conversions)) {
                derivedConversions = {};
                derivedConversions[i] = conversions;
              }
            }
            conversions = derivedConversions;
          }
          applyUnit = function(atomicUnit, denominator) {
            if (group.hasOwnProperty(atomicUnit)) {
              if (denominator) {
                value = value / (group[atomicUnit] / group[targetUnit]);
              } else {
                value = value * (group[atomicUnit] / group[targetUnit]);
              }
              return targetUnit;
            }
            return atomicUnit;
          };
          for (groupName in conversions) {
            if (conversions.hasOwnProperty(groupName)) {
              targetUnit = conversions[groupName];
              group = unitConversions[groupName];
              unit.map(applyUnit);
            }
          }
          unit.cancel();
          return new Dimension(value, unit);
        }
      });
      var Expression = function(value, noSpacing) {
        this.value = value;
        this.noSpacing = noSpacing;
        if (!value) {
          throw new Error("Expression requires an array parameter");
        }
      };
      Expression.prototype = Object.assign(new Node(), {
        type: "Expression",
        accept: function(visitor) {
          this.value = visitor.visitArray(this.value);
        },
        eval: function(context) {
          var noSpacing = this.noSpacing;
          var returnValue;
          var mathOn = context.isMathOn();
          var inParenthesis = this.parens;
          var doubleParen = false;
          if (inParenthesis) {
            context.inParenthesis();
          }
          if (this.value.length > 1) {
            returnValue = new Expression(this.value.map(function(e) {
              if (!e.eval) {
                return e;
              }
              return e.eval(context);
            }), this.noSpacing);
          } else if (this.value.length === 1) {
            if (this.value[0].parens && !this.value[0].parensInOp && !context.inCalc) {
              doubleParen = true;
            }
            returnValue = this.value[0].eval(context);
          } else {
            returnValue = this;
          }
          if (inParenthesis) {
            context.outOfParenthesis();
          }
          if (this.parens && this.parensInOp && !mathOn && !doubleParen && !(returnValue instanceof Dimension)) {
            returnValue = new Paren(returnValue);
          }
          returnValue.noSpacing = returnValue.noSpacing || noSpacing;
          return returnValue;
        },
        genCSS: function(context, output) {
          for (var i_1 = 0; i_1 < this.value.length; i_1++) {
            this.value[i_1].genCSS(context, output);
            if (!this.noSpacing && i_1 + 1 < this.value.length) {
              if (i_1 + 1 < this.value.length && !(this.value[i_1 + 1] instanceof Anonymous) || this.value[i_1 + 1] instanceof Anonymous && this.value[i_1 + 1].value !== ",") {
                output.add(" ");
              }
            }
          }
        },
        throwAwayComments: function() {
          this.value = this.value.filter(function(v) {
            return !(v instanceof Comment);
          });
        }
      });
      var NestableAtRulePrototype = {
        isRulesetLike: function() {
          return true;
        },
        accept: function(visitor) {
          if (this.features) {
            this.features = visitor.visit(this.features);
          }
          if (this.rules) {
            this.rules = visitor.visitArray(this.rules);
          }
        },
        evalFunction: function() {
          if (!this.features || !Array.isArray(this.features.value) || this.features.value.length < 1) {
            return;
          }
          var exprValues = this.features.value;
          var expr, paren;
          for (var index = 0; index < exprValues.length; ++index) {
            expr = exprValues[index];
            if (expr.type === "Keyword" && index + 1 < exprValues.length && (expr.noSpacing || expr.noSpacing == null)) {
              paren = exprValues[index + 1];
              if (paren.type === "Paren" && paren.noSpacing) {
                exprValues[index] = new Expression([expr, paren]);
                exprValues.splice(index + 1, 1);
                exprValues[index].noSpacing = true;
              }
            }
          }
        },
        evalTop: function(context) {
          this.evalFunction();
          var result = this;
          if (context.mediaBlocks.length > 1) {
            var selectors = new Selector([], null, null, this.getIndex(), this.fileInfo()).createEmptySelectors();
            result = new Ruleset(selectors, context.mediaBlocks);
            result.multiMedia = true;
            result.copyVisibilityInfo(this.visibilityInfo());
            this.setParent(result, this);
          }
          delete context.mediaBlocks;
          delete context.mediaPath;
          return result;
        },
        evalNested: function(context) {
          this.evalFunction();
          var i;
          var value;
          var path = context.mediaPath.concat([this]);
          for (i = 0; i < path.length; i++) {
            if (path[i].type !== this.type) {
              context.mediaBlocks.splice(i, 1);
              return this;
            }
            value = path[i].features instanceof Value ? path[i].features.value : path[i].features;
            path[i] = Array.isArray(value) ? value : [value];
          }
          this.features = new Value(this.permute(path).map(function(path2) {
            path2 = path2.map(function(fragment) {
              return fragment.toCSS ? fragment : new Anonymous(fragment);
            });
            for (i = path2.length - 1; i > 0; i--) {
              path2.splice(i, 0, new Anonymous("and"));
            }
            return new Expression(path2);
          }));
          this.setParent(this.features, this);
          return new Ruleset([], []);
        },
        permute: function(arr) {
          if (arr.length === 0) {
            return [];
          } else if (arr.length === 1) {
            return arr[0];
          } else {
            var result = [];
            var rest = this.permute(arr.slice(1));
            for (var i_1 = 0; i_1 < rest.length; i_1++) {
              for (var j = 0; j < arr[0].length; j++) {
                result.push([arr[0][j]].concat(rest[i_1]));
              }
            }
            return result;
          }
        },
        bubbleSelectors: function(selectors) {
          if (!selectors) {
            return;
          }
          this.rules = [new Ruleset(copyArray(selectors), [this.rules[0]])];
          this.setParent(this.rules, this);
        }
      };
      var AtRule = function(name, value, rules, index, currentFileInfo, debugInfo2, isRooted, visibilityInfo) {
        var _this = this;
        var i;
        var selectors = new Selector([], null, null, this._index, this._fileInfo).createEmptySelectors();
        this.name = name;
        this.value = value instanceof Node ? value : value ? new Anonymous(value) : value;
        if (rules) {
          if (Array.isArray(rules)) {
            var allDeclarations = this.declarationsBlock(rules);
            var allRulesetDeclarations_1 = true;
            rules.forEach(function(rule) {
              if (rule.type === "Ruleset" && rule.rules)
                allRulesetDeclarations_1 = allRulesetDeclarations_1 && _this.declarationsBlock(rule.rules, true);
            });
            if (allDeclarations && !isRooted) {
              this.simpleBlock = true;
              this.declarations = rules;
            } else if (allRulesetDeclarations_1 && rules.length === 1 && !isRooted && !value) {
              this.simpleBlock = true;
              this.declarations = rules[0].rules ? rules[0].rules : rules;
            } else {
              this.rules = rules;
            }
          } else {
            var allDeclarations = this.declarationsBlock(rules.rules);
            if (allDeclarations && !isRooted && !value) {
              this.simpleBlock = true;
              this.declarations = rules.rules;
            } else {
              this.rules = [rules];
              this.rules[0].selectors = new Selector([], null, null, index, currentFileInfo).createEmptySelectors();
            }
          }
          if (!this.simpleBlock) {
            for (i = 0; i < this.rules.length; i++) {
              this.rules[i].allowImports = true;
            }
          }
          this.setParent(selectors, this);
          this.setParent(this.rules, this);
        }
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.debugInfo = debugInfo2;
        this.isRooted = isRooted || false;
        this.copyVisibilityInfo(visibilityInfo);
        this.allowRoot = true;
      };
      AtRule.prototype = Object.assign(new Node(), __assign(__assign({ type: "AtRule" }, NestableAtRulePrototype), { declarationsBlock: function(rules, mergeable) {
        if (mergeable === void 0) {
          mergeable = false;
        }
        if (!mergeable) {
          return rules.filter(function(node) {
            return (node.type === "Declaration" || node.type === "Comment") && !node.merge;
          }).length === rules.length;
        } else {
          return rules.filter(function(node) {
            return node.type === "Declaration" || node.type === "Comment";
          }).length === rules.length;
        }
      }, keywordList: function(rules) {
        if (!Array.isArray(rules)) {
          return false;
        } else {
          return rules.filter(function(node) {
            return node.type === "Keyword" || node.type === "Comment";
          }).length === rules.length;
        }
      }, accept: function(visitor) {
        var value = this.value, rules = this.rules, declarations = this.declarations;
        if (rules) {
          this.rules = visitor.visitArray(rules);
        } else if (declarations) {
          this.declarations = visitor.visitArray(declarations);
        }
        if (value) {
          this.value = visitor.visit(value);
        }
      }, isRulesetLike: function() {
        return this.rules || !this.isCharset();
      }, isCharset: function() {
        return "@charset" === this.name;
      }, genCSS: function(context, output) {
        var value = this.value, rules = this.rules || this.declarations;
        output.add(this.name, this.fileInfo(), this.getIndex());
        if (value) {
          output.add(" ");
          value.genCSS(context, output);
        }
        if (this.simpleBlock) {
          this.outputRuleset(context, output, this.declarations);
        } else if (rules) {
          this.outputRuleset(context, output, rules);
        } else {
          output.add(";");
        }
      }, eval: function(context) {
        var mediaPathBackup, mediaBlocksBackup, value = this.value, rules = this.rules || this.declarations;
        mediaPathBackup = context.mediaPath;
        mediaBlocksBackup = context.mediaBlocks;
        context.mediaPath = [];
        context.mediaBlocks = [];
        if (value) {
          value = value.eval(context);
          if (value.value && this.keywordList(value.value)) {
            value = new Anonymous(value.value.map(function(keyword) {
              return keyword.value;
            }).join(", "), this.getIndex(), this.fileInfo());
          }
        }
        if (rules) {
          rules = this.evalRoot(context, rules);
        }
        if (Array.isArray(rules) && rules[0].rules && Array.isArray(rules[0].rules) && rules[0].rules.length) {
          var allMergeableDeclarations = this.declarationsBlock(rules[0].rules, true);
          if (allMergeableDeclarations && !this.isRooted && !value) {
            var mergeRules = context.pluginManager.less.visitors.ToCSSVisitor.prototype._mergeRules;
            mergeRules(rules[0].rules);
            rules = rules[0].rules;
            rules.forEach(function(rule) {
              return rule.merge = false;
            });
          }
        }
        if (this.simpleBlock && rules) {
          rules[0].functionRegistry = context.frames[0].functionRegistry.inherit();
          rules = rules.map(function(rule) {
            return rule.eval(context);
          });
        }
        context.mediaPath = mediaPathBackup;
        context.mediaBlocks = mediaBlocksBackup;
        return new AtRule(this.name, value, rules, this.getIndex(), this.fileInfo(), this.debugInfo, this.isRooted, this.visibilityInfo());
      }, evalRoot: function(context, rules) {
        var ampersandCount = 0;
        var noAmpersandCount = 0;
        var noAmpersands = true;
        var allAmpersands = false;
        if (!this.simpleBlock) {
          rules = [rules[0].eval(context)];
        }
        var precedingSelectors = [];
        if (context.frames.length > 0) {
          var _loop_1 = function(index2) {
            var frame = context.frames[index2];
            if (frame.type === "Ruleset" && frame.rules && frame.rules.length > 0) {
              if (frame && !frame.root && frame.selectors && frame.selectors.length > 0) {
                precedingSelectors = precedingSelectors.concat(frame.selectors);
              }
            }
            if (precedingSelectors.length > 0) {
              var value_1 = "";
              var output = { add: function(s) {
                value_1 += s;
              } };
              for (var i_1 = 0; i_1 < precedingSelectors.length; i_1++) {
                precedingSelectors[i_1].genCSS(context, output);
              }
              if (/^&+$/.test(value_1.replace(/\s+/g, ""))) {
                noAmpersands = false;
                noAmpersandCount++;
              } else {
                allAmpersands = false;
                ampersandCount++;
              }
            }
          };
          for (var index = 0; index < context.frames.length; index++) {
            _loop_1(index);
          }
        }
        var mixedAmpersands = ampersandCount > 0 && noAmpersandCount > 0 && !allAmpersands && !noAmpersands;
        if (this.isRooted && ampersandCount > 0 && noAmpersandCount === 0 && !allAmpersands && noAmpersands || !mixedAmpersands) {
          rules[0].root = true;
        }
        return rules;
      }, variable: function(name) {
        if (this.rules) {
          return Ruleset.prototype.variable.call(this.rules[0], name);
        }
      }, find: function() {
        if (this.rules) {
          return Ruleset.prototype.find.apply(this.rules[0], arguments);
        }
      }, rulesets: function() {
        if (this.rules) {
          return Ruleset.prototype.rulesets.apply(this.rules[0]);
        }
      }, outputRuleset: function(context, output, rules) {
        var ruleCnt = rules.length;
        var i;
        context.tabLevel = (context.tabLevel | 0) + 1;
        if (context.compress) {
          output.add("{");
          for (i = 0; i < ruleCnt; i++) {
            rules[i].genCSS(context, output);
          }
          output.add("}");
          context.tabLevel--;
          return;
        }
        var tabSetStr = "\n".concat(Array(context.tabLevel).join("  ")), tabRuleStr = "".concat(tabSetStr, "  ");
        if (!ruleCnt) {
          output.add(" {".concat(tabSetStr, "}"));
        } else {
          output.add(" {".concat(tabRuleStr));
          rules[0].genCSS(context, output);
          for (i = 1; i < ruleCnt; i++) {
            output.add(tabRuleStr);
            rules[i].genCSS(context, output);
          }
          output.add("".concat(tabSetStr, "}"));
        }
        context.tabLevel--;
      } }));
      var DetachedRuleset = function(ruleset, frames) {
        this.ruleset = ruleset;
        this.frames = frames;
        this.setParent(this.ruleset, this);
      };
      DetachedRuleset.prototype = Object.assign(new Node(), {
        type: "DetachedRuleset",
        evalFirst: true,
        accept: function(visitor) {
          this.ruleset = visitor.visit(this.ruleset);
        },
        eval: function(context) {
          var frames = this.frames || copyArray(context.frames);
          return new DetachedRuleset(this.ruleset, frames);
        },
        callEval: function(context) {
          return this.ruleset.eval(this.frames ? new contexts.Eval(context, this.frames.concat(context.frames)) : context);
        }
      });
      var MATH = Math$1;
      var Operation = function(op, operands, isSpaced) {
        this.op = op.trim();
        this.operands = operands;
        this.isSpaced = isSpaced;
      };
      Operation.prototype = Object.assign(new Node(), {
        type: "Operation",
        accept: function(visitor) {
          this.operands = visitor.visitArray(this.operands);
        },
        eval: function(context) {
          var a = this.operands[0].eval(context), b = this.operands[1].eval(context), op;
          if (context.isMathOn(this.op)) {
            op = this.op === "./" ? "/" : this.op;
            if (a instanceof Dimension && b instanceof Color) {
              a = a.toColor();
            }
            if (b instanceof Dimension && a instanceof Color) {
              b = b.toColor();
            }
            if (!a.operate || !b.operate) {
              if ((a instanceof Operation || b instanceof Operation) && a.op === "/" && context.math === MATH.PARENS_DIVISION) {
                return new Operation(this.op, [a, b], this.isSpaced);
              }
              throw {
                type: "Operation",
                message: "Operation on an invalid type"
              };
            }
            return a.operate(context, op, b);
          } else {
            return new Operation(this.op, [a, b], this.isSpaced);
          }
        },
        genCSS: function(context, output) {
          this.operands[0].genCSS(context, output);
          if (this.isSpaced) {
            output.add(" ");
          }
          output.add(this.op);
          if (this.isSpaced) {
            output.add(" ");
          }
          this.operands[1].genCSS(context, output);
        }
      });
      var functionCaller = (
        /** @class */
        function() {
          function functionCaller2(name, context, index, currentFileInfo) {
            this.name = name.toLowerCase();
            this.index = index;
            this.context = context;
            this.currentFileInfo = currentFileInfo;
            this.func = context.frames[0].functionRegistry.get(this.name);
          }
          functionCaller2.prototype.isValid = function() {
            return Boolean(this.func);
          };
          functionCaller2.prototype.call = function(args) {
            var _this = this;
            if (!Array.isArray(args)) {
              args = [args];
            }
            var evalArgs = this.func.evalArgs;
            if (evalArgs !== false) {
              args = args.map(function(a) {
                return a.eval(_this.context);
              });
            }
            var commentFilter = function(item) {
              return !(item.type === "Comment");
            };
            args = args.filter(commentFilter).map(function(item) {
              if (item.type === "Expression") {
                var subNodes = item.value.filter(commentFilter);
                if (subNodes.length === 1) {
                  if (item.parens && subNodes[0].op === "/") {
                    return item;
                  }
                  return subNodes[0];
                } else {
                  return new Expression(subNodes);
                }
              }
              return item;
            });
            if (evalArgs === false) {
              return this.func.apply(this, __spreadArray([this.context], args, false));
            }
            return this.func.apply(this, args);
          };
          return functionCaller2;
        }()
      );
      var Call = function(name, args, index, currentFileInfo) {
        this.name = name;
        this.args = args;
        this.calc = name === "calc";
        this._index = index;
        this._fileInfo = currentFileInfo;
      };
      Call.prototype = Object.assign(new Node(), {
        type: "Call",
        accept: function(visitor) {
          if (this.args) {
            this.args = visitor.visitArray(this.args);
          }
        },
        //
        // When evaluating a function call,
        // we either find the function in the functionRegistry,
        // in which case we call it, passing the  evaluated arguments,
        // if this returns null or we cannot find the function, we
        // simply print it out as it appeared originally [2].
        //
        // The reason why we evaluate the arguments, is in the case where
        // we try to pass a variable to a function, like: `saturate(@color)`.
        // The function should receive the value, not the variable.
        //
        eval: function(context) {
          var _this = this;
          var currentMathContext = context.mathOn;
          context.mathOn = !this.calc;
          if (this.calc || context.inCalc) {
            context.enterCalc();
          }
          var exitCalc = function() {
            if (_this.calc || context.inCalc) {
              context.exitCalc();
            }
            context.mathOn = currentMathContext;
          };
          var result;
          var funcCaller = new functionCaller(this.name, context, this.getIndex(), this.fileInfo());
          if (funcCaller.isValid()) {
            try {
              result = funcCaller.call(this.args);
              exitCalc();
            } catch (e) {
              if (e.hasOwnProperty("line") && e.hasOwnProperty("column")) {
                throw e;
              }
              throw {
                type: e.type || "Runtime",
                message: "Error evaluating function `".concat(this.name, "`").concat(e.message ? ": ".concat(e.message) : ""),
                index: this.getIndex(),
                filename: this.fileInfo().filename,
                line: e.lineNumber,
                column: e.columnNumber
              };
            }
          }
          if (result !== null && result !== void 0) {
            if (!(result instanceof Node)) {
              if (!result || result === true) {
                result = new Anonymous(null);
              } else {
                result = new Anonymous(result.toString());
              }
            }
            result._index = this._index;
            result._fileInfo = this._fileInfo;
            return result;
          }
          var args = this.args.map(function(a) {
            return a.eval(context);
          });
          exitCalc();
          return new Call(this.name, args, this.getIndex(), this.fileInfo());
        },
        genCSS: function(context, output) {
          output.add("".concat(this.name, "("), this.fileInfo(), this.getIndex());
          for (var i_1 = 0; i_1 < this.args.length; i_1++) {
            this.args[i_1].genCSS(context, output);
            if (i_1 + 1 < this.args.length) {
              output.add(", ");
            }
          }
          output.add(")");
        }
      });
      var Variable = function(name, index, currentFileInfo) {
        this.name = name;
        this._index = index;
        this._fileInfo = currentFileInfo;
      };
      Variable.prototype = Object.assign(new Node(), {
        type: "Variable",
        eval: function(context) {
          var variable, name = this.name;
          if (name.indexOf("@@") === 0) {
            name = "@".concat(new Variable(name.slice(1), this.getIndex(), this.fileInfo()).eval(context).value);
          }
          if (this.evaluating) {
            throw {
              type: "Name",
              message: "Recursive variable definition for ".concat(name),
              filename: this.fileInfo().filename,
              index: this.getIndex()
            };
          }
          this.evaluating = true;
          variable = this.find(context.frames, function(frame) {
            var v = frame.variable(name);
            if (v) {
              if (v.important) {
                var importantScope = context.importantScope[context.importantScope.length - 1];
                importantScope.important = v.important;
              }
              if (context.inCalc) {
                return new Call("_SELF", [v.value]).eval(context);
              } else {
                return v.value.eval(context);
              }
            }
          });
          if (variable) {
            this.evaluating = false;
            return variable;
          } else {
            throw {
              type: "Name",
              message: "variable ".concat(name, " is undefined"),
              filename: this.fileInfo().filename,
              index: this.getIndex()
            };
          }
        },
        find: function(obj, fun) {
          for (var i_1 = 0, r = void 0; i_1 < obj.length; i_1++) {
            r = fun.call(obj, obj[i_1]);
            if (r) {
              return r;
            }
          }
          return null;
        }
      });
      var Property = function(name, index, currentFileInfo) {
        this.name = name;
        this._index = index;
        this._fileInfo = currentFileInfo;
      };
      Property.prototype = Object.assign(new Node(), {
        type: "Property",
        eval: function(context) {
          var property;
          var name = this.name;
          var mergeRules = context.pluginManager.less.visitors.ToCSSVisitor.prototype._mergeRules;
          if (this.evaluating) {
            throw {
              type: "Name",
              message: "Recursive property reference for ".concat(name),
              filename: this.fileInfo().filename,
              index: this.getIndex()
            };
          }
          this.evaluating = true;
          property = this.find(context.frames, function(frame) {
            var v;
            var vArr = frame.property(name);
            if (vArr) {
              for (var i_1 = 0; i_1 < vArr.length; i_1++) {
                v = vArr[i_1];
                vArr[i_1] = new Declaration(v.name, v.value, v.important, v.merge, v.index, v.currentFileInfo, v.inline, v.variable);
              }
              mergeRules(vArr);
              v = vArr[vArr.length - 1];
              if (v.important) {
                var importantScope = context.importantScope[context.importantScope.length - 1];
                importantScope.important = v.important;
              }
              v = v.value.eval(context);
              return v;
            }
          });
          if (property) {
            this.evaluating = false;
            return property;
          } else {
            throw {
              type: "Name",
              message: "Property '".concat(name, "' is undefined"),
              filename: this.currentFileInfo.filename,
              index: this.index
            };
          }
        },
        find: function(obj, fun) {
          for (var i_2 = 0, r = void 0; i_2 < obj.length; i_2++) {
            r = fun.call(obj, obj[i_2]);
            if (r) {
              return r;
            }
          }
          return null;
        }
      });
      var Attribute = function(key2, op, value, cif) {
        this.key = key2;
        this.op = op;
        this.value = value;
        this.cif = cif;
      };
      Attribute.prototype = Object.assign(new Node(), {
        type: "Attribute",
        eval: function(context) {
          return new Attribute(this.key.eval ? this.key.eval(context) : this.key, this.op, this.value && this.value.eval ? this.value.eval(context) : this.value, this.cif);
        },
        genCSS: function(context, output) {
          output.add(this.toCSS(context));
        },
        toCSS: function(context) {
          var value = this.key.toCSS ? this.key.toCSS(context) : this.key;
          if (this.op) {
            value += this.op;
            value += this.value.toCSS ? this.value.toCSS(context) : this.value;
          }
          if (this.cif) {
            value = value + " " + this.cif;
          }
          return "[".concat(value, "]");
        }
      });
      var Quoted = function(str, content, escaped, index, currentFileInfo) {
        this.escaped = escaped === void 0 ? true : escaped;
        this.value = content || "";
        this.quote = str.charAt(0);
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.variableRegex = /@\{([\w-]+)\}/g;
        this.propRegex = /\$\{([\w-]+)\}/g;
        this.allowRoot = escaped;
      };
      Quoted.prototype = Object.assign(new Node(), {
        type: "Quoted",
        genCSS: function(context, output) {
          if (!this.escaped) {
            output.add(this.quote, this.fileInfo(), this.getIndex());
          }
          output.add(this.value);
          if (!this.escaped) {
            output.add(this.quote);
          }
        },
        containsVariables: function() {
          return this.value.match(this.variableRegex);
        },
        eval: function(context) {
          var that = this;
          var value = this.value;
          var variableReplacement = function(_, name1, name2) {
            var v = new Variable("@".concat(name1 !== null && name1 !== void 0 ? name1 : name2), that.getIndex(), that.fileInfo()).eval(context, true);
            return v instanceof Quoted ? v.value : v.toCSS();
          };
          var propertyReplacement = function(_, name1, name2) {
            var v = new Property("$".concat(name1 !== null && name1 !== void 0 ? name1 : name2), that.getIndex(), that.fileInfo()).eval(context, true);
            return v instanceof Quoted ? v.value : v.toCSS();
          };
          function iterativeReplace(value2, regexp, replacementFnc) {
            var evaluatedValue = value2;
            do {
              value2 = evaluatedValue.toString();
              evaluatedValue = value2.replace(regexp, replacementFnc);
            } while (value2 !== evaluatedValue);
            return evaluatedValue;
          }
          value = iterativeReplace(value, this.variableRegex, variableReplacement);
          value = iterativeReplace(value, this.propRegex, propertyReplacement);
          return new Quoted(this.quote + value + this.quote, value, this.escaped, this.getIndex(), this.fileInfo());
        },
        compare: function(other) {
          if (other.type === "Quoted" && !this.escaped && !other.escaped) {
            return Node.numericCompare(this.value, other.value);
          } else {
            return other.toCSS && this.toCSS() === other.toCSS() ? 0 : void 0;
          }
        }
      });
      function escapePath(path) {
        return path.replace(/[()'"\s]/g, function(match) {
          return "\\".concat(match);
        });
      }
      var URL = function(val, index, currentFileInfo, isEvald) {
        this.value = val;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.isEvald = isEvald;
      };
      URL.prototype = Object.assign(new Node(), {
        type: "Url",
        accept: function(visitor) {
          this.value = visitor.visit(this.value);
        },
        genCSS: function(context, output) {
          output.add("url(");
          this.value.genCSS(context, output);
          output.add(")");
        },
        eval: function(context) {
          var val = this.value.eval(context);
          var rootpath;
          if (!this.isEvald) {
            rootpath = this.fileInfo() && this.fileInfo().rootpath;
            if (typeof rootpath === "string" && typeof val.value === "string" && context.pathRequiresRewrite(val.value)) {
              if (!val.quote) {
                rootpath = escapePath(rootpath);
              }
              val.value = context.rewritePath(val.value, rootpath);
            } else {
              val.value = context.normalizePath(val.value);
            }
            if (context.urlArgs) {
              if (!val.value.match(/^\s*data:/)) {
                var delimiter = val.value.indexOf("?") === -1 ? "?" : "&";
                var urlArgs = delimiter + context.urlArgs;
                if (val.value.indexOf("#") !== -1) {
                  val.value = val.value.replace("#", "".concat(urlArgs, "#"));
                } else {
                  val.value += urlArgs;
                }
              }
            }
          }
          return new URL(val, this.getIndex(), this.fileInfo(), true);
        }
      });
      var Media = function(value, features, index, currentFileInfo, visibilityInfo) {
        this._index = index;
        this._fileInfo = currentFileInfo;
        var selectors = new Selector([], null, null, this._index, this._fileInfo).createEmptySelectors();
        this.features = new Value(features);
        this.rules = [new Ruleset(selectors, value)];
        this.rules[0].allowImports = true;
        this.copyVisibilityInfo(visibilityInfo);
        this.allowRoot = true;
        this.setParent(selectors, this);
        this.setParent(this.features, this);
        this.setParent(this.rules, this);
      };
      Media.prototype = Object.assign(new AtRule(), __assign(__assign({ type: "Media" }, NestableAtRulePrototype), { genCSS: function(context, output) {
        output.add("@media ", this._fileInfo, this._index);
        this.features.genCSS(context, output);
        this.outputRuleset(context, output, this.rules);
      }, eval: function(context) {
        if (!context.mediaBlocks) {
          context.mediaBlocks = [];
          context.mediaPath = [];
        }
        var media = new Media(null, [], this._index, this._fileInfo, this.visibilityInfo());
        if (this.debugInfo) {
          this.rules[0].debugInfo = this.debugInfo;
          media.debugInfo = this.debugInfo;
        }
        media.features = this.features.eval(context);
        context.mediaPath.push(media);
        context.mediaBlocks.push(media);
        this.rules[0].functionRegistry = context.frames[0].functionRegistry.inherit();
        context.frames.unshift(this.rules[0]);
        media.rules = [this.rules[0].eval(context)];
        context.frames.shift();
        context.mediaPath.pop();
        return context.mediaPath.length === 0 ? media.evalTop(context) : media.evalNested(context);
      } }));
      var Import = function(path, features, options2, index, currentFileInfo, visibilityInfo) {
        this.options = options2;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.path = path;
        this.features = features;
        this.allowRoot = true;
        if (this.options.less !== void 0 || this.options.inline) {
          this.css = !this.options.less || this.options.inline;
        } else {
          var pathValue = this.getPath();
          if (pathValue && /[#.&?]css([?;].*)?$/.test(pathValue)) {
            this.css = true;
          }
        }
        this.copyVisibilityInfo(visibilityInfo);
        this.setParent(this.features, this);
        this.setParent(this.path, this);
      };
      Import.prototype = Object.assign(new Node(), {
        type: "Import",
        accept: function(visitor) {
          if (this.features) {
            this.features = visitor.visit(this.features);
          }
          this.path = visitor.visit(this.path);
          if (!this.options.isPlugin && !this.options.inline && this.root) {
            this.root = visitor.visit(this.root);
          }
        },
        genCSS: function(context, output) {
          if (this.css && this.path._fileInfo.reference === void 0) {
            output.add("@import ", this._fileInfo, this._index);
            this.path.genCSS(context, output);
            if (this.features) {
              output.add(" ");
              this.features.genCSS(context, output);
            }
            output.add(";");
          }
        },
        getPath: function() {
          return this.path instanceof URL ? this.path.value.value : this.path.value;
        },
        isVariableImport: function() {
          var path = this.path;
          if (path instanceof URL) {
            path = path.value;
          }
          if (path instanceof Quoted) {
            return path.containsVariables();
          }
          return true;
        },
        evalForImport: function(context) {
          var path = this.path;
          if (path instanceof URL) {
            path = path.value;
          }
          return new Import(path.eval(context), this.features, this.options, this._index, this._fileInfo, this.visibilityInfo());
        },
        evalPath: function(context) {
          var path = this.path.eval(context);
          var fileInfo = this._fileInfo;
          if (!(path instanceof URL)) {
            var pathValue = path.value;
            if (fileInfo && pathValue && context.pathRequiresRewrite(pathValue)) {
              path.value = context.rewritePath(pathValue, fileInfo.rootpath);
            } else {
              path.value = context.normalizePath(path.value);
            }
          }
          return path;
        },
        eval: function(context) {
          var result = this.doEval(context);
          if (this.options.reference || this.blocksVisibility()) {
            if (result.length || result.length === 0) {
              result.forEach(function(node) {
                node.addVisibilityBlock();
              });
            } else {
              result.addVisibilityBlock();
            }
          }
          return result;
        },
        doEval: function(context) {
          var ruleset;
          var registry;
          var features = this.features && this.features.eval(context);
          if (this.options.isPlugin) {
            if (this.root && this.root.eval) {
              try {
                this.root.eval(context);
              } catch (e) {
                e.message = "Plugin error during evaluation";
                throw new LessError(e, this.root.imports, this.root.filename);
              }
            }
            registry = context.frames[0] && context.frames[0].functionRegistry;
            if (registry && this.root && this.root.functions) {
              registry.addMultiple(this.root.functions);
            }
            return [];
          }
          if (this.skip) {
            if (typeof this.skip === "function") {
              this.skip = this.skip();
            }
            if (this.skip) {
              return [];
            }
          }
          if (this.features) {
            var featureValue = this.features.value;
            if (Array.isArray(featureValue) && featureValue.length >= 1) {
              var expr = featureValue[0];
              if (expr.type === "Expression" && Array.isArray(expr.value) && expr.value.length >= 2) {
                featureValue = expr.value;
                var isLayer = featureValue[0].type === "Keyword" && featureValue[0].value === "layer" && featureValue[1].type === "Paren";
                if (isLayer) {
                  this.css = false;
                }
              }
            }
          }
          if (this.options.inline) {
            var contents = new Anonymous(this.root, 0, {
              filename: this.importedFilename,
              reference: this.path._fileInfo && this.path._fileInfo.reference
            }, true, true);
            return this.features ? new Media([contents], this.features.value) : [contents];
          } else if (this.css || this.layerCss) {
            var newImport = new Import(this.evalPath(context), features, this.options, this._index);
            if (this.layerCss) {
              newImport.css = this.layerCss;
              newImport.path._fileInfo = this._fileInfo;
            }
            if (!newImport.css && this.error) {
              throw this.error;
            }
            return newImport;
          } else if (this.root) {
            if (this.features) {
              var featureValue = this.features.value;
              if (Array.isArray(featureValue) && featureValue.length === 1) {
                var expr = featureValue[0];
                if (expr.type === "Expression" && Array.isArray(expr.value) && expr.value.length >= 2) {
                  featureValue = expr.value;
                  var isLayer = featureValue[0].type === "Keyword" && featureValue[0].value === "layer" && featureValue[1].type === "Paren";
                  if (isLayer) {
                    this.layerCss = true;
                    featureValue[0] = new Expression(featureValue.slice(0, 2));
                    featureValue.splice(1, 1);
                    featureValue[0].noSpacing = true;
                    return this;
                  }
                }
              }
            }
            ruleset = new Ruleset(null, copyArray(this.root.rules));
            ruleset.evalImports(context);
            return this.features ? new Media(ruleset.rules, this.features.value) : ruleset.rules;
          } else {
            if (this.features) {
              var featureValue = this.features.value;
              if (Array.isArray(featureValue) && featureValue.length >= 1) {
                featureValue = featureValue[0].value;
                if (Array.isArray(featureValue) && featureValue.length >= 2) {
                  var isLayer = featureValue[0].type === "Keyword" && featureValue[0].value === "layer" && featureValue[1].type === "Paren";
                  if (isLayer) {
                    this.css = true;
                    featureValue[0] = new Expression(featureValue.slice(0, 2));
                    featureValue.splice(1, 1);
                    featureValue[0].noSpacing = true;
                    return this;
                  }
                }
              }
            }
            return [];
          }
        }
      });
      var JsEvalNode = function() {
      };
      JsEvalNode.prototype = Object.assign(new Node(), {
        evaluateJavaScript: function(expression, context) {
          var result;
          var that = this;
          var evalContext = {};
          if (!context.javascriptEnabled) {
            throw {
              message: "Inline JavaScript is not enabled. Is it set in your options?",
              filename: this.fileInfo().filename,
              index: this.getIndex()
            };
          }
          expression = expression.replace(/@\{([\w-]+)\}/g, function(_, name) {
            return that.jsify(new Variable("@".concat(name), that.getIndex(), that.fileInfo()).eval(context));
          });
          try {
            expression = new Function("return (".concat(expression, ")"));
          } catch (e) {
            throw {
              message: "JavaScript evaluation error: ".concat(e.message, " from `").concat(expression, "`"),
              filename: this.fileInfo().filename,
              index: this.getIndex()
            };
          }
          var variables = context.frames[0].variables();
          for (var k in variables) {
            if (variables.hasOwnProperty(k)) {
              evalContext[k.slice(1)] = {
                value: variables[k].value,
                toJS: function() {
                  return this.value.eval(context).toCSS();
                }
              };
            }
          }
          try {
            result = expression.call(evalContext);
          } catch (e) {
            throw {
              message: "JavaScript evaluation error: '".concat(e.name, ": ").concat(e.message.replace(/["]/g, "'"), "'"),
              filename: this.fileInfo().filename,
              index: this.getIndex()
            };
          }
          return result;
        },
        jsify: function(obj) {
          if (Array.isArray(obj.value) && obj.value.length > 1) {
            return "[".concat(obj.value.map(function(v) {
              return v.toCSS();
            }).join(", "), "]");
          } else {
            return obj.toCSS();
          }
        }
      });
      var JavaScript = function(string2, escaped, index, currentFileInfo) {
        this.escaped = escaped;
        this.expression = string2;
        this._index = index;
        this._fileInfo = currentFileInfo;
      };
      JavaScript.prototype = Object.assign(new JsEvalNode(), {
        type: "JavaScript",
        eval: function(context) {
          var result = this.evaluateJavaScript(this.expression, context);
          var type = typeof result;
          if (type === "number" && !isNaN(result)) {
            return new Dimension(result);
          } else if (type === "string") {
            return new Quoted('"'.concat(result, '"'), result, this.escaped, this._index);
          } else if (Array.isArray(result)) {
            return new Anonymous(result.join(", "));
          } else {
            return new Anonymous(result);
          }
        }
      });
      var Assignment = function(key2, val) {
        this.key = key2;
        this.value = val;
      };
      Assignment.prototype = Object.assign(new Node(), {
        type: "Assignment",
        accept: function(visitor) {
          this.value = visitor.visit(this.value);
        },
        eval: function(context) {
          if (this.value.eval) {
            return new Assignment(this.key, this.value.eval(context));
          }
          return this;
        },
        genCSS: function(context, output) {
          output.add("".concat(this.key, "="));
          if (this.value.genCSS) {
            this.value.genCSS(context, output);
          } else {
            output.add(this.value);
          }
        }
      });
      var Condition = function(op, l, r, i, negate) {
        this.op = op.trim();
        this.lvalue = l;
        this.rvalue = r;
        this._index = i;
        this.negate = negate;
      };
      Condition.prototype = Object.assign(new Node(), {
        type: "Condition",
        accept: function(visitor) {
          this.lvalue = visitor.visit(this.lvalue);
          this.rvalue = visitor.visit(this.rvalue);
        },
        eval: function(context) {
          var result = function(op, a, b) {
            switch (op) {
              case "and":
                return a && b;
              case "or":
                return a || b;
              default:
                switch (Node.compare(a, b)) {
                  case -1:
                    return op === "<" || op === "=<" || op === "<=";
                  case 0:
                    return op === "=" || op === ">=" || op === "=<" || op === "<=";
                  case 1:
                    return op === ">" || op === ">=";
                  default:
                    return false;
                }
            }
          }(this.op, this.lvalue.eval(context), this.rvalue.eval(context));
          return this.negate ? !result : result;
        }
      });
      var QueryInParens = function(op, l, m, op2, r, i) {
        this.op = op.trim();
        this.lvalue = l;
        this.mvalue = m;
        this.op2 = op2 ? op2.trim() : null;
        this.rvalue = r;
        this._index = i;
        this.mvalues = [];
      };
      QueryInParens.prototype = Object.assign(new Node(), {
        type: "QueryInParens",
        accept: function(visitor) {
          this.lvalue = visitor.visit(this.lvalue);
          this.mvalue = visitor.visit(this.mvalue);
          if (this.rvalue) {
            this.rvalue = visitor.visit(this.rvalue);
          }
        },
        eval: function(context) {
          this.lvalue = this.lvalue.eval(context);
          var variableDeclaration;
          var rule;
          for (var i_1 = 0; rule = context.frames[i_1]; i_1++) {
            if (rule.type === "Ruleset") {
              variableDeclaration = rule.rules.find(function(r) {
                if (r instanceof Declaration && r.variable) {
                  return true;
                }
                return false;
              });
              if (variableDeclaration) {
                break;
              }
            }
          }
          if (!this.mvalueCopy) {
            this.mvalueCopy = copy(this.mvalue);
          }
          if (variableDeclaration) {
            this.mvalue = this.mvalueCopy;
            this.mvalue = this.mvalue.eval(context);
            this.mvalues.push(this.mvalue);
          } else {
            this.mvalue = this.mvalue.eval(context);
          }
          if (this.rvalue) {
            this.rvalue = this.rvalue.eval(context);
          }
          return this;
        },
        genCSS: function(context, output) {
          this.lvalue.genCSS(context, output);
          output.add(" " + this.op + " ");
          if (this.mvalues.length > 0) {
            this.mvalue = this.mvalues.shift();
          }
          this.mvalue.genCSS(context, output);
          if (this.rvalue) {
            output.add(" " + this.op2 + " ");
            this.rvalue.genCSS(context, output);
          }
        }
      });
      var Container = function(value, features, index, currentFileInfo, visibilityInfo) {
        this._index = index;
        this._fileInfo = currentFileInfo;
        var selectors = new Selector([], null, null, this._index, this._fileInfo).createEmptySelectors();
        this.features = new Value(features);
        this.rules = [new Ruleset(selectors, value)];
        this.rules[0].allowImports = true;
        this.copyVisibilityInfo(visibilityInfo);
        this.allowRoot = true;
        this.setParent(selectors, this);
        this.setParent(this.features, this);
        this.setParent(this.rules, this);
      };
      Container.prototype = Object.assign(new AtRule(), __assign(__assign({ type: "Container" }, NestableAtRulePrototype), { genCSS: function(context, output) {
        output.add("@container ", this._fileInfo, this._index);
        this.features.genCSS(context, output);
        this.outputRuleset(context, output, this.rules);
      }, eval: function(context) {
        if (!context.mediaBlocks) {
          context.mediaBlocks = [];
          context.mediaPath = [];
        }
        var media = new Container(null, [], this._index, this._fileInfo, this.visibilityInfo());
        if (this.debugInfo) {
          this.rules[0].debugInfo = this.debugInfo;
          media.debugInfo = this.debugInfo;
        }
        media.features = this.features.eval(context);
        context.mediaPath.push(media);
        context.mediaBlocks.push(media);
        this.rules[0].functionRegistry = context.frames[0].functionRegistry.inherit();
        context.frames.unshift(this.rules[0]);
        media.rules = [this.rules[0].eval(context)];
        context.frames.shift();
        context.mediaPath.pop();
        return context.mediaPath.length === 0 ? media.evalTop(context) : media.evalNested(context);
      } }));
      var UnicodeDescriptor = function(value) {
        this.value = value;
      };
      UnicodeDescriptor.prototype = Object.assign(new Node(), {
        type: "UnicodeDescriptor"
      });
      var Negative = function(node) {
        this.value = node;
      };
      Negative.prototype = Object.assign(new Node(), {
        type: "Negative",
        genCSS: function(context, output) {
          output.add("-");
          this.value.genCSS(context, output);
        },
        eval: function(context) {
          if (context.isMathOn()) {
            return new Operation("*", [new Dimension(-1), this.value]).eval(context);
          }
          return new Negative(this.value.eval(context));
        }
      });
      var Extend = function(selector, option, index, currentFileInfo, visibilityInfo) {
        this.selector = selector;
        this.option = option;
        this.object_id = Extend.next_id++;
        this.parent_ids = [this.object_id];
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.copyVisibilityInfo(visibilityInfo);
        this.allowRoot = true;
        switch (option) {
          case "!all":
          case "all":
            this.allowBefore = true;
            this.allowAfter = true;
            break;
          default:
            this.allowBefore = false;
            this.allowAfter = false;
            break;
        }
        this.setParent(this.selector, this);
      };
      Extend.prototype = Object.assign(new Node(), {
        type: "Extend",
        accept: function(visitor) {
          this.selector = visitor.visit(this.selector);
        },
        eval: function(context) {
          return new Extend(this.selector.eval(context), this.option, this.getIndex(), this.fileInfo(), this.visibilityInfo());
        },
        // remove when Nodes have JSDoc types
        // eslint-disable-next-line no-unused-vars
        clone: function(context) {
          return new Extend(this.selector, this.option, this.getIndex(), this.fileInfo(), this.visibilityInfo());
        },
        // it concatenates (joins) all selectors in selector array
        findSelfSelectors: function(selectors) {
          var selfElements = [], i, selectorElements;
          for (i = 0; i < selectors.length; i++) {
            selectorElements = selectors[i].elements;
            if (i > 0 && selectorElements.length && selectorElements[0].combinator.value === "") {
              selectorElements[0].combinator.value = " ";
            }
            selfElements = selfElements.concat(selectors[i].elements);
          }
          this.selfSelectors = [new Selector(selfElements)];
          this.selfSelectors[0].copyVisibilityInfo(this.visibilityInfo());
        }
      });
      Extend.next_id = 0;
      var VariableCall = function(variable, index, currentFileInfo) {
        this.variable = variable;
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.allowRoot = true;
      };
      VariableCall.prototype = Object.assign(new Node(), {
        type: "VariableCall",
        eval: function(context) {
          var rules;
          var detachedRuleset = new Variable(this.variable, this.getIndex(), this.fileInfo()).eval(context);
          var error = new LessError({ message: "Could not evaluate variable call ".concat(this.variable) });
          if (!detachedRuleset.ruleset) {
            if (detachedRuleset.rules) {
              rules = detachedRuleset;
            } else if (Array.isArray(detachedRuleset)) {
              rules = new Ruleset("", detachedRuleset);
            } else if (Array.isArray(detachedRuleset.value)) {
              rules = new Ruleset("", detachedRuleset.value);
            } else {
              throw error;
            }
            detachedRuleset = new DetachedRuleset(rules);
          }
          if (detachedRuleset.ruleset) {
            return detachedRuleset.callEval(context);
          }
          throw error;
        }
      });
      var NamespaceValue = function(ruleCall, lookups, index, fileInfo) {
        this.value = ruleCall;
        this.lookups = lookups;
        this._index = index;
        this._fileInfo = fileInfo;
      };
      NamespaceValue.prototype = Object.assign(new Node(), {
        type: "NamespaceValue",
        eval: function(context) {
          var i, name, rules = this.value.eval(context);
          for (i = 0; i < this.lookups.length; i++) {
            name = this.lookups[i];
            if (Array.isArray(rules)) {
              rules = new Ruleset([new Selector()], rules);
            }
            if (name === "") {
              rules = rules.lastDeclaration();
            } else if (name.charAt(0) === "@") {
              if (name.charAt(1) === "@") {
                name = "@".concat(new Variable(name.substr(1)).eval(context).value);
              }
              if (rules.variables) {
                rules = rules.variable(name);
              }
              if (!rules) {
                throw {
                  type: "Name",
                  message: "variable ".concat(name, " not found"),
                  filename: this.fileInfo().filename,
                  index: this.getIndex()
                };
              }
            } else {
              if (name.substring(0, 2) === "$@") {
                name = "$".concat(new Variable(name.substr(1)).eval(context).value);
              } else {
                name = name.charAt(0) === "$" ? name : "$".concat(name);
              }
              if (rules.properties) {
                rules = rules.property(name);
              }
              if (!rules) {
                throw {
                  type: "Name",
                  message: 'property "'.concat(name.substr(1), '" not found'),
                  filename: this.fileInfo().filename,
                  index: this.getIndex()
                };
              }
              rules = rules[rules.length - 1];
            }
            if (rules.value) {
              rules = rules.eval(context).value;
            }
            if (rules.ruleset) {
              rules = rules.ruleset.eval(context);
            }
          }
          return rules;
        }
      });
      var Definition = function(name, params, rules, condition, variadic, frames, visibilityInfo) {
        this.name = name || "anonymous mixin";
        this.selectors = [new Selector([new Element(null, name, false, this._index, this._fileInfo)])];
        this.params = params;
        this.condition = condition;
        this.variadic = variadic;
        this.arity = params.length;
        this.rules = rules;
        this._lookups = {};
        var optionalParameters = [];
        this.required = params.reduce(function(count, p) {
          if (!p.name || p.name && !p.value) {
            return count + 1;
          } else {
            optionalParameters.push(p.name);
            return count;
          }
        }, 0);
        this.optionalParameters = optionalParameters;
        this.frames = frames;
        this.copyVisibilityInfo(visibilityInfo);
        this.allowRoot = true;
      };
      Definition.prototype = Object.assign(new Ruleset(), {
        type: "MixinDefinition",
        evalFirst: true,
        accept: function(visitor) {
          if (this.params && this.params.length) {
            this.params = visitor.visitArray(this.params);
          }
          this.rules = visitor.visitArray(this.rules);
          if (this.condition) {
            this.condition = visitor.visit(this.condition);
          }
        },
        evalParams: function(context, mixinEnv, args, evaldArguments) {
          var frame = new Ruleset(null, null);
          var varargs;
          var arg;
          var params = copyArray(this.params);
          var i;
          var j;
          var val;
          var name;
          var isNamedFound;
          var argIndex;
          var argsLength = 0;
          if (mixinEnv.frames && mixinEnv.frames[0] && mixinEnv.frames[0].functionRegistry) {
            frame.functionRegistry = mixinEnv.frames[0].functionRegistry.inherit();
          }
          mixinEnv = new contexts.Eval(mixinEnv, [frame].concat(mixinEnv.frames));
          if (args) {
            args = copyArray(args);
            argsLength = args.length;
            for (i = 0; i < argsLength; i++) {
              arg = args[i];
              if (name = arg && arg.name) {
                isNamedFound = false;
                for (j = 0; j < params.length; j++) {
                  if (!evaldArguments[j] && name === params[j].name) {
                    evaldArguments[j] = arg.value.eval(context);
                    frame.prependRule(new Declaration(name, arg.value.eval(context)));
                    isNamedFound = true;
                    break;
                  }
                }
                if (isNamedFound) {
                  args.splice(i, 1);
                  i--;
                  continue;
                } else {
                  throw { type: "Runtime", message: "Named argument for ".concat(this.name, " ").concat(args[i].name, " not found") };
                }
              }
            }
          }
          argIndex = 0;
          for (i = 0; i < params.length; i++) {
            if (evaldArguments[i]) {
              continue;
            }
            arg = args && args[argIndex];
            if (name = params[i].name) {
              if (params[i].variadic) {
                varargs = [];
                for (j = argIndex; j < argsLength; j++) {
                  varargs.push(args[j].value.eval(context));
                }
                frame.prependRule(new Declaration(name, new Expression(varargs).eval(context)));
              } else {
                val = arg && arg.value;
                if (val) {
                  if (Array.isArray(val)) {
                    val = new DetachedRuleset(new Ruleset("", val));
                  } else {
                    val = val.eval(context);
                  }
                } else if (params[i].value) {
                  val = params[i].value.eval(mixinEnv);
                  frame.resetCache();
                } else {
                  throw { type: "Runtime", message: "wrong number of arguments for ".concat(this.name, " (").concat(argsLength, " for ").concat(this.arity, ")") };
                }
                frame.prependRule(new Declaration(name, val));
                evaldArguments[i] = val;
              }
            }
            if (params[i].variadic && args) {
              for (j = argIndex; j < argsLength; j++) {
                evaldArguments[j] = args[j].value.eval(context);
              }
            }
            argIndex++;
          }
          return frame;
        },
        makeImportant: function() {
          var rules = !this.rules ? this.rules : this.rules.map(function(r) {
            if (r.makeImportant) {
              return r.makeImportant(true);
            } else {
              return r;
            }
          });
          var result = new Definition(this.name, this.params, rules, this.condition, this.variadic, this.frames);
          return result;
        },
        eval: function(context) {
          return new Definition(this.name, this.params, this.rules, this.condition, this.variadic, this.frames || copyArray(context.frames));
        },
        evalCall: function(context, args, important) {
          var _arguments = [];
          var mixinFrames = this.frames ? this.frames.concat(context.frames) : context.frames;
          var frame = this.evalParams(context, new contexts.Eval(context, mixinFrames), args, _arguments);
          var rules;
          var ruleset;
          frame.prependRule(new Declaration("@arguments", new Expression(_arguments).eval(context)));
          rules = copyArray(this.rules);
          ruleset = new Ruleset(null, rules);
          ruleset.originalRuleset = this;
          ruleset = ruleset.eval(new contexts.Eval(context, [this, frame].concat(mixinFrames)));
          if (important) {
            ruleset = ruleset.makeImportant();
          }
          return ruleset;
        },
        matchCondition: function(args, context) {
          if (this.condition && !this.condition.eval(new contexts.Eval(context, [this.evalParams(
            context,
            /* the parameter variables */
            new contexts.Eval(context, this.frames ? this.frames.concat(context.frames) : context.frames),
            args,
            []
          )].concat(this.frames || []).concat(context.frames)))) {
            return false;
          }
          return true;
        },
        matchArgs: function(args, context) {
          var allArgsCnt = args && args.length || 0;
          var len;
          var optionalParameters = this.optionalParameters;
          var requiredArgsCnt = !args ? 0 : args.reduce(function(count, p) {
            if (optionalParameters.indexOf(p.name) < 0) {
              return count + 1;
            } else {
              return count;
            }
          }, 0);
          if (!this.variadic) {
            if (requiredArgsCnt < this.required) {
              return false;
            }
            if (allArgsCnt > this.params.length) {
              return false;
            }
          } else {
            if (requiredArgsCnt < this.required - 1) {
              return false;
            }
          }
          len = Math.min(requiredArgsCnt, this.arity);
          for (var i_1 = 0; i_1 < len; i_1++) {
            if (!this.params[i_1].name && !this.params[i_1].variadic) {
              if (args[i_1].value.eval(context).toCSS() != this.params[i_1].value.eval(context).toCSS()) {
                return false;
              }
            }
          }
          return true;
        }
      });
      var MixinCall = function(elements, args, index, currentFileInfo, important) {
        this.selector = new Selector(elements);
        this.arguments = args || [];
        this._index = index;
        this._fileInfo = currentFileInfo;
        this.important = important;
        this.allowRoot = true;
        this.setParent(this.selector, this);
      };
      MixinCall.prototype = Object.assign(new Node(), {
        type: "MixinCall",
        accept: function(visitor) {
          if (this.selector) {
            this.selector = visitor.visit(this.selector);
          }
          if (this.arguments.length) {
            this.arguments = visitor.visitArray(this.arguments);
          }
        },
        eval: function(context) {
          var mixins;
          var mixin;
          var mixinPath;
          var args = [];
          var arg;
          var argValue;
          var rules = [];
          var match = false;
          var i;
          var m;
          var f2;
          var isRecursive;
          var isOneFound;
          var candidates = [];
          var candidate;
          var conditionResult = [];
          var defaultResult;
          var defFalseEitherCase = -1;
          var defNone = 0;
          var defTrue = 1;
          var defFalse = 2;
          var count;
          var originalRuleset;
          var noArgumentsFilter;
          this.selector = this.selector.eval(context);
          function calcDefGroup(mixin2, mixinPath2) {
            var f3, p, namespace;
            for (f3 = 0; f3 < 2; f3++) {
              conditionResult[f3] = true;
              defaultFunc.value(f3);
              for (p = 0; p < mixinPath2.length && conditionResult[f3]; p++) {
                namespace = mixinPath2[p];
                if (namespace.matchCondition) {
                  conditionResult[f3] = conditionResult[f3] && namespace.matchCondition(null, context);
                }
              }
              if (mixin2.matchCondition) {
                conditionResult[f3] = conditionResult[f3] && mixin2.matchCondition(args, context);
              }
            }
            if (conditionResult[0] || conditionResult[1]) {
              if (conditionResult[0] != conditionResult[1]) {
                return conditionResult[1] ? defTrue : defFalse;
              }
              return defNone;
            }
            return defFalseEitherCase;
          }
          for (i = 0; i < this.arguments.length; i++) {
            arg = this.arguments[i];
            argValue = arg.value.eval(context);
            if (arg.expand && Array.isArray(argValue.value)) {
              argValue = argValue.value;
              for (m = 0; m < argValue.length; m++) {
                args.push({ value: argValue[m] });
              }
            } else {
              args.push({ name: arg.name, value: argValue });
            }
          }
          noArgumentsFilter = function(rule) {
            return rule.matchArgs(null, context);
          };
          for (i = 0; i < context.frames.length; i++) {
            if ((mixins = context.frames[i].find(this.selector, null, noArgumentsFilter)).length > 0) {
              isOneFound = true;
              for (m = 0; m < mixins.length; m++) {
                mixin = mixins[m].rule;
                mixinPath = mixins[m].path;
                isRecursive = false;
                for (f2 = 0; f2 < context.frames.length; f2++) {
                  if (!(mixin instanceof Definition) && mixin === (context.frames[f2].originalRuleset || context.frames[f2])) {
                    isRecursive = true;
                    break;
                  }
                }
                if (isRecursive) {
                  continue;
                }
                if (mixin.matchArgs(args, context)) {
                  candidate = { mixin, group: calcDefGroup(mixin, mixinPath) };
                  if (candidate.group !== defFalseEitherCase) {
                    candidates.push(candidate);
                  }
                  match = true;
                }
              }
              defaultFunc.reset();
              count = [0, 0, 0];
              for (m = 0; m < candidates.length; m++) {
                count[candidates[m].group]++;
              }
              if (count[defNone] > 0) {
                defaultResult = defFalse;
              } else {
                defaultResult = defTrue;
                if (count[defTrue] + count[defFalse] > 1) {
                  throw {
                    type: "Runtime",
                    message: "Ambiguous use of `default()` found when matching for `".concat(this.format(args), "`"),
                    index: this.getIndex(),
                    filename: this.fileInfo().filename
                  };
                }
              }
              for (m = 0; m < candidates.length; m++) {
                candidate = candidates[m].group;
                if (candidate === defNone || candidate === defaultResult) {
                  try {
                    mixin = candidates[m].mixin;
                    if (!(mixin instanceof Definition)) {
                      originalRuleset = mixin.originalRuleset || mixin;
                      mixin = new Definition("", [], mixin.rules, null, false, null, originalRuleset.visibilityInfo());
                      mixin.originalRuleset = originalRuleset;
                    }
                    var newRules = mixin.evalCall(context, args, this.important).rules;
                    this._setVisibilityToReplacement(newRules);
                    Array.prototype.push.apply(rules, newRules);
                  } catch (e) {
                    throw { message: e.message, index: this.getIndex(), filename: this.fileInfo().filename, stack: e.stack };
                  }
                }
              }
              if (match) {
                return rules;
              }
            }
          }
          if (isOneFound) {
            throw {
              type: "Runtime",
              message: "No matching definition was found for `".concat(this.format(args), "`"),
              index: this.getIndex(),
              filename: this.fileInfo().filename
            };
          } else {
            throw {
              type: "Name",
              message: "".concat(this.selector.toCSS().trim(), " is undefined"),
              index: this.getIndex(),
              filename: this.fileInfo().filename
            };
          }
        },
        _setVisibilityToReplacement: function(replacement) {
          var i, rule;
          if (this.blocksVisibility()) {
            for (i = 0; i < replacement.length; i++) {
              rule = replacement[i];
              rule.addVisibilityBlock();
            }
          }
        },
        format: function(args) {
          return "".concat(this.selector.toCSS().trim(), "(").concat(args ? args.map(function(a) {
            var argValue = "";
            if (a.name) {
              argValue += "".concat(a.name, ":");
            }
            if (a.value.toCSS) {
              argValue += a.value.toCSS();
            } else {
              argValue += "???";
            }
            return argValue;
          }).join(", ") : "", ")");
        }
      });
      var tree = {
        Node,
        Color,
        AtRule,
        DetachedRuleset,
        Operation,
        Dimension,
        Unit,
        Keyword,
        Variable,
        Property,
        Ruleset,
        Element,
        Attribute,
        Combinator,
        Selector,
        Quoted,
        Expression,
        Declaration,
        Call,
        URL,
        Import,
        Comment,
        Anonymous,
        Value,
        JavaScript,
        Assignment,
        Condition,
        Paren,
        Media,
        Container,
        QueryInParens,
        UnicodeDescriptor,
        Negative,
        Extend,
        VariableCall,
        NamespaceValue,
        mixin: {
          Call: MixinCall,
          Definition
        }
      };
      var AbstractFileManager = (
        /** @class */
        function() {
          function AbstractFileManager2() {
          }
          AbstractFileManager2.prototype.getPath = function(filename) {
            var j = filename.lastIndexOf("?");
            if (j > 0) {
              filename = filename.slice(0, j);
            }
            j = filename.lastIndexOf("/");
            if (j < 0) {
              j = filename.lastIndexOf("\\");
            }
            if (j < 0) {
              return "";
            }
            return filename.slice(0, j + 1);
          };
          AbstractFileManager2.prototype.tryAppendExtension = function(path, ext) {
            return /(\.[a-z]*$)|([?;].*)$/.test(path) ? path : path + ext;
          };
          AbstractFileManager2.prototype.tryAppendLessExtension = function(path) {
            return this.tryAppendExtension(path, ".less");
          };
          AbstractFileManager2.prototype.supportsSync = function() {
            return false;
          };
          AbstractFileManager2.prototype.alwaysMakePathsAbsolute = function() {
            return false;
          };
          AbstractFileManager2.prototype.isPathAbsolute = function(filename) {
            return /^(?:[a-z-]+:|\/|\\|#)/i.test(filename);
          };
          AbstractFileManager2.prototype.join = function(basePath, laterPath) {
            if (!basePath) {
              return laterPath;
            }
            return basePath + laterPath;
          };
          AbstractFileManager2.prototype.pathDiff = function(url, baseUrl) {
            var urlParts = this.extractUrlParts(url);
            var baseUrlParts = this.extractUrlParts(baseUrl);
            var i;
            var max;
            var urlDirectories;
            var baseUrlDirectories;
            var diff = "";
            if (urlParts.hostPart !== baseUrlParts.hostPart) {
              return "";
            }
            max = Math.max(baseUrlParts.directories.length, urlParts.directories.length);
            for (i = 0; i < max; i++) {
              if (baseUrlParts.directories[i] !== urlParts.directories[i]) {
                break;
              }
            }
            baseUrlDirectories = baseUrlParts.directories.slice(i);
            urlDirectories = urlParts.directories.slice(i);
            for (i = 0; i < baseUrlDirectories.length - 1; i++) {
              diff += "../";
            }
            for (i = 0; i < urlDirectories.length - 1; i++) {
              diff += "".concat(urlDirectories[i], "/");
            }
            return diff;
          };
          AbstractFileManager2.prototype.extractUrlParts = function(url, baseUrl) {
            var urlPartsRegex = /^((?:[a-z-]+:)?\/{2}(?:[^/?#]*\/)|([/\\]))?((?:[^/\\?#]*[/\\])*)([^/\\?#]*)([#?].*)?$/i;
            var urlParts = url.match(urlPartsRegex);
            var returner = {};
            var rawDirectories = [];
            var directories = [];
            var i;
            var baseUrlParts;
            if (!urlParts) {
              throw new Error("Could not parse sheet href - '".concat(url, "'"));
            }
            if (baseUrl && (!urlParts[1] || urlParts[2])) {
              baseUrlParts = baseUrl.match(urlPartsRegex);
              if (!baseUrlParts) {
                throw new Error("Could not parse page url - '".concat(baseUrl, "'"));
              }
              urlParts[1] = urlParts[1] || baseUrlParts[1] || "";
              if (!urlParts[2]) {
                urlParts[3] = baseUrlParts[3] + urlParts[3];
              }
            }
            if (urlParts[3]) {
              rawDirectories = urlParts[3].replace(/\\/g, "/").split("/");
              for (i = 0; i < rawDirectories.length; i++) {
                if (rawDirectories[i] === "..") {
                  directories.pop();
                } else if (rawDirectories[i] !== ".") {
                  directories.push(rawDirectories[i]);
                }
              }
            }
            returner.hostPart = urlParts[1];
            returner.directories = directories;
            returner.rawPath = (urlParts[1] || "") + rawDirectories.join("/");
            returner.path = (urlParts[1] || "") + directories.join("/");
            returner.filename = urlParts[4];
            returner.fileUrl = returner.path + (urlParts[4] || "");
            returner.url = returner.fileUrl + (urlParts[5] || "");
            return returner;
          };
          return AbstractFileManager2;
        }()
      );
      var AbstractPluginLoader = (
        /** @class */
        function() {
          function AbstractPluginLoader2() {
            this.require = function() {
              return null;
            };
          }
          AbstractPluginLoader2.prototype.evalPlugin = function(contents, context, imports, pluginOptions, fileInfo) {
            var loader, registry, pluginObj, localModule, pluginManager, filename, result;
            pluginManager = context.pluginManager;
            if (fileInfo) {
              if (typeof fileInfo === "string") {
                filename = fileInfo;
              } else {
                filename = fileInfo.filename;
              }
            }
            var shortname = new this.less.FileManager().extractUrlParts(filename).filename;
            if (filename) {
              pluginObj = pluginManager.get(filename);
              if (pluginObj) {
                result = this.trySetOptions(pluginObj, filename, shortname, pluginOptions);
                if (result) {
                  return result;
                }
                try {
                  if (pluginObj.use) {
                    pluginObj.use.call(this.context, pluginObj);
                  }
                } catch (e) {
                  e.message = e.message || "Error during @plugin call";
                  return new LessError(e, imports, filename);
                }
                return pluginObj;
              }
            }
            localModule = {
              exports: {},
              pluginManager,
              fileInfo
            };
            registry = functionRegistry.create();
            var registerPlugin = function(obj) {
              pluginObj = obj;
            };
            try {
              loader = new Function("module", "require", "registerPlugin", "functions", "tree", "less", "fileInfo", contents);
              loader(localModule, this.require(filename), registerPlugin, registry, this.less.tree, this.less, fileInfo);
            } catch (e) {
              return new LessError(e, imports, filename);
            }
            if (!pluginObj) {
              pluginObj = localModule.exports;
            }
            pluginObj = this.validatePlugin(pluginObj, filename, shortname);
            if (pluginObj instanceof LessError) {
              return pluginObj;
            }
            if (pluginObj) {
              pluginObj.imports = imports;
              pluginObj.filename = filename;
              if (!pluginObj.minVersion || this.compareVersion("3.0.0", pluginObj.minVersion) < 0) {
                result = this.trySetOptions(pluginObj, filename, shortname, pluginOptions);
                if (result) {
                  return result;
                }
              }
              pluginManager.addPlugin(pluginObj, fileInfo.filename, registry);
              pluginObj.functions = registry.getLocalFunctions();
              result = this.trySetOptions(pluginObj, filename, shortname, pluginOptions);
              if (result) {
                return result;
              }
              try {
                if (pluginObj.use) {
                  pluginObj.use.call(this.context, pluginObj);
                }
              } catch (e) {
                e.message = e.message || "Error during @plugin call";
                return new LessError(e, imports, filename);
              }
            } else {
              return new LessError({ message: "Not a valid plugin" }, imports, filename);
            }
            return pluginObj;
          };
          AbstractPluginLoader2.prototype.trySetOptions = function(plugin, filename, name, options2) {
            if (options2 && !plugin.setOptions) {
              return new LessError({
                message: "Options have been provided but the plugin ".concat(name, " does not support any options.")
              });
            }
            try {
              plugin.setOptions && plugin.setOptions(options2);
            } catch (e) {
              return new LessError(e);
            }
          };
          AbstractPluginLoader2.prototype.validatePlugin = function(plugin, filename, name) {
            if (plugin) {
              if (typeof plugin === "function") {
                plugin = new plugin();
              }
              if (plugin.minVersion) {
                if (this.compareVersion(plugin.minVersion, this.less.version) < 0) {
                  return new LessError({
                    message: "Plugin ".concat(name, " requires version ").concat(this.versionToString(plugin.minVersion))
                  });
                }
              }
              return plugin;
            }
            return null;
          };
          AbstractPluginLoader2.prototype.compareVersion = function(aVersion, bVersion) {
            if (typeof aVersion === "string") {
              aVersion = aVersion.match(/^(\d+)\.?(\d+)?\.?(\d+)?/);
              aVersion.shift();
            }
            for (var i_1 = 0; i_1 < aVersion.length; i_1++) {
              if (aVersion[i_1] !== bVersion[i_1]) {
                return parseInt(aVersion[i_1]) > parseInt(bVersion[i_1]) ? -1 : 1;
              }
            }
            return 0;
          };
          AbstractPluginLoader2.prototype.versionToString = function(version2) {
            var versionString = "";
            for (var i_2 = 0; i_2 < version2.length; i_2++) {
              versionString += (versionString ? "." : "") + version2[i_2];
            }
            return versionString;
          };
          AbstractPluginLoader2.prototype.printUsage = function(plugins) {
            for (var i_3 = 0; i_3 < plugins.length; i_3++) {
              var plugin = plugins[i_3];
              if (plugin.printUsage) {
                plugin.printUsage();
              }
            }
          };
          return AbstractPluginLoader2;
        }()
      );
      function boolean(condition) {
        return condition ? Keyword.True : Keyword.False;
      }
      function If(context, condition, trueValue, falseValue) {
        return condition.eval(context) ? trueValue.eval(context) : falseValue ? falseValue.eval(context) : new Anonymous();
      }
      If.evalArgs = false;
      function isdefined(context, variable) {
        try {
          variable.eval(context);
          return Keyword.True;
        } catch (e) {
          return Keyword.False;
        }
      }
      isdefined.evalArgs = false;
      var boolean$1 = { isdefined, boolean, "if": If };
      var colorFunctions;
      function clamp(val) {
        return Math.min(1, Math.max(0, val));
      }
      function hsla(origColor, hsl) {
        var color2 = colorFunctions.hsla(hsl.h, hsl.s, hsl.l, hsl.a);
        if (color2) {
          if (origColor.value && /^(rgb|hsl)/.test(origColor.value)) {
            color2.value = origColor.value;
          } else {
            color2.value = "rgb";
          }
          return color2;
        }
      }
      function toHSL(color2) {
        if (color2.toHSL) {
          return color2.toHSL();
        } else {
          throw new Error("Argument cannot be evaluated to a color");
        }
      }
      function toHSV(color2) {
        if (color2.toHSV) {
          return color2.toHSV();
        } else {
          throw new Error("Argument cannot be evaluated to a color");
        }
      }
      function number$1(n) {
        if (n instanceof Dimension) {
          return parseFloat(n.unit.is("%") ? n.value / 100 : n.value);
        } else if (typeof n === "number") {
          return n;
        } else {
          throw {
            type: "Argument",
            message: "color functions take numbers as parameters"
          };
        }
      }
      function scaled(n, size) {
        if (n instanceof Dimension && n.unit.is("%")) {
          return parseFloat(n.value * size / 100);
        } else {
          return number$1(n);
        }
      }
      colorFunctions = {
        rgb: function(r, g, b) {
          var a = 1;
          if (r instanceof Expression) {
            var val = r.value;
            r = val[0];
            g = val[1];
            b = val[2];
            if (b instanceof Operation) {
              var op = b;
              b = op.operands[0];
              a = op.operands[1];
            }
          }
          var color2 = colorFunctions.rgba(r, g, b, a);
          if (color2) {
            color2.value = "rgb";
            return color2;
          }
        },
        rgba: function(r, g, b, a) {
          try {
            if (r instanceof Color) {
              if (g) {
                a = number$1(g);
              } else {
                a = r.alpha;
              }
              return new Color(r.rgb, a, "rgba");
            }
            var rgb = [r, g, b].map(function(c) {
              return scaled(c, 255);
            });
            a = number$1(a);
            return new Color(rgb, a, "rgba");
          } catch (e) {
          }
        },
        hsl: function(h, s, l) {
          var a = 1;
          if (h instanceof Expression) {
            var val = h.value;
            h = val[0];
            s = val[1];
            l = val[2];
            if (l instanceof Operation) {
              var op = l;
              l = op.operands[0];
              a = op.operands[1];
            }
          }
          var color2 = colorFunctions.hsla(h, s, l, a);
          if (color2) {
            color2.value = "hsl";
            return color2;
          }
        },
        hsla: function(h, s, l, a) {
          var m1;
          var m2;
          function hue(h2) {
            h2 = h2 < 0 ? h2 + 1 : h2 > 1 ? h2 - 1 : h2;
            if (h2 * 6 < 1) {
              return m1 + (m2 - m1) * h2 * 6;
            } else if (h2 * 2 < 1) {
              return m2;
            } else if (h2 * 3 < 2) {
              return m1 + (m2 - m1) * (2 / 3 - h2) * 6;
            } else {
              return m1;
            }
          }
          try {
            if (h instanceof Color) {
              if (s) {
                a = number$1(s);
              } else {
                a = h.alpha;
              }
              return new Color(h.rgb, a, "hsla");
            }
            h = number$1(h) % 360 / 360;
            s = clamp(number$1(s));
            l = clamp(number$1(l));
            a = clamp(number$1(a));
            m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
            m1 = l * 2 - m2;
            var rgb = [
              hue(h + 1 / 3) * 255,
              hue(h) * 255,
              hue(h - 1 / 3) * 255
            ];
            a = number$1(a);
            return new Color(rgb, a, "hsla");
          } catch (e) {
          }
        },
        hsv: function(h, s, v) {
          return colorFunctions.hsva(h, s, v, 1);
        },
        hsva: function(h, s, v, a) {
          h = number$1(h) % 360 / 360 * 360;
          s = number$1(s);
          v = number$1(v);
          a = number$1(a);
          var i;
          var f2;
          i = Math.floor(h / 60 % 6);
          f2 = h / 60 - i;
          var vs = [
            v,
            v * (1 - s),
            v * (1 - f2 * s),
            v * (1 - (1 - f2) * s)
          ];
          var perm = [
            [0, 3, 1],
            [2, 0, 1],
            [1, 0, 3],
            [1, 2, 0],
            [3, 1, 0],
            [0, 1, 2]
          ];
          return colorFunctions.rgba(vs[perm[i][0]] * 255, vs[perm[i][1]] * 255, vs[perm[i][2]] * 255, a);
        },
        hue: function(color2) {
          return new Dimension(toHSL(color2).h);
        },
        saturation: function(color2) {
          return new Dimension(toHSL(color2).s * 100, "%");
        },
        lightness: function(color2) {
          return new Dimension(toHSL(color2).l * 100, "%");
        },
        hsvhue: function(color2) {
          return new Dimension(toHSV(color2).h);
        },
        hsvsaturation: function(color2) {
          return new Dimension(toHSV(color2).s * 100, "%");
        },
        hsvvalue: function(color2) {
          return new Dimension(toHSV(color2).v * 100, "%");
        },
        red: function(color2) {
          return new Dimension(color2.rgb[0]);
        },
        green: function(color2) {
          return new Dimension(color2.rgb[1]);
        },
        blue: function(color2) {
          return new Dimension(color2.rgb[2]);
        },
        alpha: function(color2) {
          return new Dimension(toHSL(color2).a);
        },
        luma: function(color2) {
          return new Dimension(color2.luma() * color2.alpha * 100, "%");
        },
        luminance: function(color2) {
          var luminance = 0.2126 * color2.rgb[0] / 255 + 0.7152 * color2.rgb[1] / 255 + 0.0722 * color2.rgb[2] / 255;
          return new Dimension(luminance * color2.alpha * 100, "%");
        },
        saturate: function(color2, amount, method) {
          if (!color2.rgb) {
            return null;
          }
          var hsl = toHSL(color2);
          if (typeof method !== "undefined" && method.value === "relative") {
            hsl.s += hsl.s * amount.value / 100;
          } else {
            hsl.s += amount.value / 100;
          }
          hsl.s = clamp(hsl.s);
          return hsla(color2, hsl);
        },
        desaturate: function(color2, amount, method) {
          var hsl = toHSL(color2);
          if (typeof method !== "undefined" && method.value === "relative") {
            hsl.s -= hsl.s * amount.value / 100;
          } else {
            hsl.s -= amount.value / 100;
          }
          hsl.s = clamp(hsl.s);
          return hsla(color2, hsl);
        },
        lighten: function(color2, amount, method) {
          var hsl = toHSL(color2);
          if (typeof method !== "undefined" && method.value === "relative") {
            hsl.l += hsl.l * amount.value / 100;
          } else {
            hsl.l += amount.value / 100;
          }
          hsl.l = clamp(hsl.l);
          return hsla(color2, hsl);
        },
        darken: function(color2, amount, method) {
          var hsl = toHSL(color2);
          if (typeof method !== "undefined" && method.value === "relative") {
            hsl.l -= hsl.l * amount.value / 100;
          } else {
            hsl.l -= amount.value / 100;
          }
          hsl.l = clamp(hsl.l);
          return hsla(color2, hsl);
        },
        fadein: function(color2, amount, method) {
          var hsl = toHSL(color2);
          if (typeof method !== "undefined" && method.value === "relative") {
            hsl.a += hsl.a * amount.value / 100;
          } else {
            hsl.a += amount.value / 100;
          }
          hsl.a = clamp(hsl.a);
          return hsla(color2, hsl);
        },
        fadeout: function(color2, amount, method) {
          var hsl = toHSL(color2);
          if (typeof method !== "undefined" && method.value === "relative") {
            hsl.a -= hsl.a * amount.value / 100;
          } else {
            hsl.a -= amount.value / 100;
          }
          hsl.a = clamp(hsl.a);
          return hsla(color2, hsl);
        },
        fade: function(color2, amount) {
          var hsl = toHSL(color2);
          hsl.a = amount.value / 100;
          hsl.a = clamp(hsl.a);
          return hsla(color2, hsl);
        },
        spin: function(color2, amount) {
          var hsl = toHSL(color2);
          var hue = (hsl.h + amount.value) % 360;
          hsl.h = hue < 0 ? 360 + hue : hue;
          return hsla(color2, hsl);
        },
        //
        // Copyright (c) 2006-2009 Hampton Catlin, Natalie Weizenbaum, and Chris Eppstein
        // http://sass-lang.com
        //
        mix: function(color1, color2, weight) {
          if (!weight) {
            weight = new Dimension(50);
          }
          var p = weight.value / 100;
          var w = p * 2 - 1;
          var a = toHSL(color1).a - toHSL(color2).a;
          var w1 = ((w * a == -1 ? w : (w + a) / (1 + w * a)) + 1) / 2;
          var w2 = 1 - w1;
          var rgb = [
            color1.rgb[0] * w1 + color2.rgb[0] * w2,
            color1.rgb[1] * w1 + color2.rgb[1] * w2,
            color1.rgb[2] * w1 + color2.rgb[2] * w2
          ];
          var alpha = color1.alpha * p + color2.alpha * (1 - p);
          return new Color(rgb, alpha);
        },
        greyscale: function(color2) {
          return colorFunctions.desaturate(color2, new Dimension(100));
        },
        contrast: function(color2, dark, light, threshold) {
          if (!color2.rgb) {
            return null;
          }
          if (typeof light === "undefined") {
            light = colorFunctions.rgba(255, 255, 255, 1);
          }
          if (typeof dark === "undefined") {
            dark = colorFunctions.rgba(0, 0, 0, 1);
          }
          if (dark.luma() > light.luma()) {
            var t = light;
            light = dark;
            dark = t;
          }
          if (typeof threshold === "undefined") {
            threshold = 0.43;
          } else {
            threshold = number$1(threshold);
          }
          if (color2.luma() < threshold) {
            return light;
          } else {
            return dark;
          }
        },
        // Changes made in 2.7.0 - Reverted in 3.0.0
        // contrast: function (color, color1, color2, threshold) {
        //     // Return which of `color1` and `color2` has the greatest contrast with `color`
        //     // according to the standard WCAG contrast ratio calculation.
        //     // http://www.w3.org/TR/WCAG20/#contrast-ratiodef
        //     // The threshold param is no longer used, in line with SASS.
        //     // filter: contrast(3.2);
        //     // should be kept as is, so check for color
        //     if (!color.rgb) {
        //         return null;
        //     }
        //     if (typeof color1 === 'undefined') {
        //         color1 = colorFunctions.rgba(0, 0, 0, 1.0);
        //     }
        //     if (typeof color2 === 'undefined') {
        //         color2 = colorFunctions.rgba(255, 255, 255, 1.0);
        //     }
        //     var contrast1, contrast2;
        //     var luma = color.luma();
        //     var luma1 = color1.luma();
        //     var luma2 = color2.luma();
        //     // Calculate contrast ratios for each color
        //     if (luma > luma1) {
        //         contrast1 = (luma + 0.05) / (luma1 + 0.05);
        //     } else {
        //         contrast1 = (luma1 + 0.05) / (luma + 0.05);
        //     }
        //     if (luma > luma2) {
        //         contrast2 = (luma + 0.05) / (luma2 + 0.05);
        //     } else {
        //         contrast2 = (luma2 + 0.05) / (luma + 0.05);
        //     }
        //     if (contrast1 > contrast2) {
        //         return color1;
        //     } else {
        //         return color2;
        //     }
        // },
        argb: function(color2) {
          return new Anonymous(color2.toARGB());
        },
        color: function(c) {
          if (c instanceof Quoted && /^#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3,4})$/i.test(c.value)) {
            var val = c.value.slice(1);
            return new Color(val, void 0, "#".concat(val));
          }
          if (c instanceof Color || (c = Color.fromKeyword(c.value))) {
            c.value = void 0;
            return c;
          }
          throw {
            type: "Argument",
            message: "argument must be a color keyword or 3|4|6|8 digit hex e.g. #FFF"
          };
        },
        tint: function(color2, amount) {
          return colorFunctions.mix(colorFunctions.rgb(255, 255, 255), color2, amount);
        },
        shade: function(color2, amount) {
          return colorFunctions.mix(colorFunctions.rgb(0, 0, 0), color2, amount);
        }
      };
      var color = colorFunctions;
      function colorBlend(mode, color1, color2) {
        var ab = color1.alpha;
        var cb;
        var as = color2.alpha;
        var cs;
        var ar;
        var cr;
        var r = [];
        ar = as + ab * (1 - as);
        for (var i_1 = 0; i_1 < 3; i_1++) {
          cb = color1.rgb[i_1] / 255;
          cs = color2.rgb[i_1] / 255;
          cr = mode(cb, cs);
          if (ar) {
            cr = (as * cs + ab * (cb - as * (cb + cs - cr))) / ar;
          }
          r[i_1] = cr * 255;
        }
        return new Color(r, ar);
      }
      var colorBlendModeFunctions = {
        multiply: function(cb, cs) {
          return cb * cs;
        },
        screen: function(cb, cs) {
          return cb + cs - cb * cs;
        },
        overlay: function(cb, cs) {
          cb *= 2;
          return cb <= 1 ? colorBlendModeFunctions.multiply(cb, cs) : colorBlendModeFunctions.screen(cb - 1, cs);
        },
        softlight: function(cb, cs) {
          var d = 1;
          var e = cb;
          if (cs > 0.5) {
            e = 1;
            d = cb > 0.25 ? Math.sqrt(cb) : ((16 * cb - 12) * cb + 4) * cb;
          }
          return cb - (1 - 2 * cs) * e * (d - cb);
        },
        hardlight: function(cb, cs) {
          return colorBlendModeFunctions.overlay(cs, cb);
        },
        difference: function(cb, cs) {
          return Math.abs(cb - cs);
        },
        exclusion: function(cb, cs) {
          return cb + cs - 2 * cb * cs;
        },
        // non-w3c functions:
        average: function(cb, cs) {
          return (cb + cs) / 2;
        },
        negation: function(cb, cs) {
          return 1 - Math.abs(cb + cs - 1);
        }
      };
      for (var f$1 in colorBlendModeFunctions) {
        if (colorBlendModeFunctions.hasOwnProperty(f$1)) {
          colorBlend[f$1] = colorBlend.bind(null, colorBlendModeFunctions[f$1]);
        }
      }
      var dataUri = function(environment) {
        var fallback = function(functionThis, node) {
          return new URL(node, functionThis.index, functionThis.currentFileInfo).eval(functionThis.context);
        };
        return { "data-uri": function(mimetypeNode, filePathNode) {
          if (!filePathNode) {
            filePathNode = mimetypeNode;
            mimetypeNode = null;
          }
          var mimetype = mimetypeNode && mimetypeNode.value;
          var filePath = filePathNode.value;
          var currentFileInfo = this.currentFileInfo;
          var currentDirectory = currentFileInfo.rewriteUrls ? currentFileInfo.currentDirectory : currentFileInfo.entryPath;
          var fragmentStart = filePath.indexOf("#");
          var fragment = "";
          if (fragmentStart !== -1) {
            fragment = filePath.slice(fragmentStart);
            filePath = filePath.slice(0, fragmentStart);
          }
          var context = clone(this.context);
          context.rawBuffer = true;
          var fileManager = environment.getFileManager(filePath, currentDirectory, context, environment, true);
          if (!fileManager) {
            return fallback(this, filePathNode);
          }
          var useBase64 = false;
          if (!mimetypeNode) {
            mimetype = environment.mimeLookup(filePath);
            if (mimetype === "image/svg+xml") {
              useBase64 = false;
            } else {
              var charset = environment.charsetLookup(mimetype);
              useBase64 = ["US-ASCII", "UTF-8"].indexOf(charset) < 0;
            }
            if (useBase64) {
              mimetype += ";base64";
            }
          } else {
            useBase64 = /;base64$/.test(mimetype);
          }
          var fileSync = fileManager.loadFileSync(filePath, currentDirectory, context, environment);
          if (!fileSync.contents) {
            logger$1.warn("Skipped data-uri embedding of ".concat(filePath, " because file not found"));
            return fallback(this, filePathNode || mimetypeNode);
          }
          var buf = fileSync.contents;
          if (useBase64 && !environment.encodeBase64) {
            return fallback(this, filePathNode);
          }
          buf = useBase64 ? environment.encodeBase64(buf) : encodeURIComponent(buf);
          var uri = "data:".concat(mimetype, ",").concat(buf).concat(fragment);
          return new URL(new Quoted('"'.concat(uri, '"'), uri, false, this.index, this.currentFileInfo), this.index, this.currentFileInfo);
        } };
      };
      var getItemsFromNode = function(node) {
        var items = Array.isArray(node.value) ? node.value : Array(node);
        return items;
      };
      var list = {
        _SELF: function(n) {
          return n;
        },
        "~": function() {
          var expr = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            expr[_i] = arguments[_i];
          }
          if (expr.length === 1) {
            return expr[0];
          }
          return new Value(expr);
        },
        extract: function(values, index) {
          index = index.value - 1;
          return getItemsFromNode(values)[index];
        },
        length: function(values) {
          return new Dimension(getItemsFromNode(values).length);
        },
        /**
         * Creates a Less list of incremental values.
         * Modeled after Lodash's range function, also exists natively in PHP
         *
         * @param {Dimension} [start=1]
         * @param {Dimension} end  - e.g. 10 or 10px - unit is added to output
         * @param {Dimension} [step=1]
         */
        range: function(start, end, step) {
          var from;
          var to;
          var stepValue = 1;
          var list2 = [];
          if (end) {
            to = end;
            from = start.value;
            if (step) {
              stepValue = step.value;
            }
          } else {
            from = 1;
            to = start;
          }
          for (var i_1 = from; i_1 <= to.value; i_1 += stepValue) {
            list2.push(new Dimension(i_1, to.unit));
          }
          return new Expression(list2);
        },
        each: function(list2, rs) {
          var _this = this;
          var rules = [];
          var newRules;
          var iterator;
          var tryEval = function(val) {
            if (val instanceof Node) {
              return val.eval(_this.context);
            }
            return val;
          };
          if (list2.value && !(list2 instanceof Quoted)) {
            if (Array.isArray(list2.value)) {
              iterator = list2.value.map(tryEval);
            } else {
              iterator = [tryEval(list2.value)];
            }
          } else if (list2.ruleset) {
            iterator = tryEval(list2.ruleset).rules;
          } else if (list2.rules) {
            iterator = list2.rules.map(tryEval);
          } else if (Array.isArray(list2)) {
            iterator = list2.map(tryEval);
          } else {
            iterator = [tryEval(list2)];
          }
          var valueName = "@value";
          var keyName = "@key";
          var indexName = "@index";
          if (rs.params) {
            valueName = rs.params[0] && rs.params[0].name;
            keyName = rs.params[1] && rs.params[1].name;
            indexName = rs.params[2] && rs.params[2].name;
            rs = rs.rules;
          } else {
            rs = rs.ruleset;
          }
          for (var i_2 = 0; i_2 < iterator.length; i_2++) {
            var key2 = void 0;
            var value = void 0;
            var item = iterator[i_2];
            if (item instanceof Declaration) {
              key2 = typeof item.name === "string" ? item.name : item.name[0].value;
              value = item.value;
            } else {
              key2 = new Dimension(i_2 + 1);
              value = item;
            }
            if (item instanceof Comment) {
              continue;
            }
            newRules = rs.rules.slice(0);
            if (valueName) {
              newRules.push(new Declaration(valueName, value, false, false, this.index, this.currentFileInfo));
            }
            if (indexName) {
              newRules.push(new Declaration(indexName, new Dimension(i_2 + 1), false, false, this.index, this.currentFileInfo));
            }
            if (keyName) {
              newRules.push(new Declaration(keyName, key2, false, false, this.index, this.currentFileInfo));
            }
            rules.push(new Ruleset([new Selector([new Element("", "&")])], newRules, rs.strictImports, rs.visibilityInfo()));
          }
          return new Ruleset([new Selector([new Element("", "&")])], rules, rs.strictImports, rs.visibilityInfo()).eval(this.context);
        }
      };
      var MathHelper = function(fn, unit, n) {
        if (!(n instanceof Dimension)) {
          throw { type: "Argument", message: "argument must be a number" };
        }
        if (unit === null) {
          unit = n.unit;
        } else {
          n = n.unify();
        }
        return new Dimension(fn(parseFloat(n.value)), unit);
      };
      var mathFunctions = {
        // name,  unit
        ceil: null,
        floor: null,
        sqrt: null,
        abs: null,
        tan: "",
        sin: "",
        cos: "",
        atan: "rad",
        asin: "rad",
        acos: "rad"
      };
      for (var f in mathFunctions) {
        if (mathFunctions.hasOwnProperty(f)) {
          mathFunctions[f] = MathHelper.bind(null, Math[f], mathFunctions[f]);
        }
      }
      mathFunctions.round = function(n, f2) {
        var fraction = typeof f2 === "undefined" ? 0 : f2.value;
        return MathHelper(function(num) {
          return num.toFixed(fraction);
        }, null, n);
      };
      var minMax = function(isMin, args) {
        var _this = this;
        args = Array.prototype.slice.call(args);
        switch (args.length) {
          case 0:
            throw { type: "Argument", message: "one or more arguments required" };
        }
        var i;
        var j;
        var current;
        var currentUnified;
        var referenceUnified;
        var unit;
        var unitStatic;
        var unitClone;
        var order = [];
        var values = {};
        for (i = 0; i < args.length; i++) {
          current = args[i];
          if (!(current instanceof Dimension)) {
            if (Array.isArray(args[i].value)) {
              Array.prototype.push.apply(args, Array.prototype.slice.call(args[i].value));
              continue;
            } else {
              throw { type: "Argument", message: "incompatible types" };
            }
          }
          currentUnified = current.unit.toString() === "" && unitClone !== void 0 ? new Dimension(current.value, unitClone).unify() : current.unify();
          unit = currentUnified.unit.toString() === "" && unitStatic !== void 0 ? unitStatic : currentUnified.unit.toString();
          unitStatic = unit !== "" && unitStatic === void 0 || unit !== "" && order[0].unify().unit.toString() === "" ? unit : unitStatic;
          unitClone = unit !== "" && unitClone === void 0 ? current.unit.toString() : unitClone;
          j = values[""] !== void 0 && unit !== "" && unit === unitStatic ? values[""] : values[unit];
          if (j === void 0) {
            if (unitStatic !== void 0 && unit !== unitStatic) {
              throw { type: "Argument", message: "incompatible types" };
            }
            values[unit] = order.length;
            order.push(current);
            continue;
          }
          referenceUnified = order[j].unit.toString() === "" && unitClone !== void 0 ? new Dimension(order[j].value, unitClone).unify() : order[j].unify();
          if (isMin && currentUnified.value < referenceUnified.value || !isMin && currentUnified.value > referenceUnified.value) {
            order[j] = current;
          }
        }
        if (order.length == 1) {
          return order[0];
        }
        args = order.map(function(a) {
          return a.toCSS(_this.context);
        }).join(this.context.compress ? "," : ", ");
        return new Anonymous("".concat(isMin ? "min" : "max", "(").concat(args, ")"));
      };
      var number = {
        min: function() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          try {
            return minMax.call(this, true, args);
          } catch (e) {
          }
        },
        max: function() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          try {
            return minMax.call(this, false, args);
          } catch (e) {
          }
        },
        convert: function(val, unit) {
          return val.convertTo(unit.value);
        },
        pi: function() {
          return new Dimension(Math.PI);
        },
        mod: function(a, b) {
          return new Dimension(a.value % b.value, a.unit);
        },
        pow: function(x, y) {
          if (typeof x === "number" && typeof y === "number") {
            x = new Dimension(x);
            y = new Dimension(y);
          } else if (!(x instanceof Dimension) || !(y instanceof Dimension)) {
            throw { type: "Argument", message: "arguments must be numbers" };
          }
          return new Dimension(Math.pow(x.value, y.value), x.unit);
        },
        percentage: function(n) {
          var result = MathHelper(function(num) {
            return num * 100;
          }, "%", n);
          return result;
        }
      };
      var string = {
        e: function(str) {
          return new Quoted('"', str instanceof JavaScript ? str.evaluated : str.value, true);
        },
        escape: function(str) {
          return new Anonymous(encodeURI(str.value).replace(/=/g, "%3D").replace(/:/g, "%3A").replace(/#/g, "%23").replace(/;/g, "%3B").replace(/\(/g, "%28").replace(/\)/g, "%29"));
        },
        replace: function(string2, pattern, replacement, flags) {
          var result = string2.value;
          replacement = replacement.type === "Quoted" ? replacement.value : replacement.toCSS();
          result = result.replace(new RegExp(pattern.value, flags ? flags.value : ""), replacement);
          return new Quoted(string2.quote || "", result, string2.escaped);
        },
        "%": function(string2) {
          var args = Array.prototype.slice.call(arguments, 1);
          var result = string2.value;
          var _loop_1 = function(i_12) {
            result = result.replace(/%[sda]/i, function(token) {
              var value = args[i_12].type === "Quoted" && token.match(/s/i) ? args[i_12].value : args[i_12].toCSS();
              return token.match(/[A-Z]$/) ? encodeURIComponent(value) : value;
            });
          };
          for (var i_1 = 0; i_1 < args.length; i_1++) {
            _loop_1(i_1);
          }
          result = result.replace(/%%/g, "%");
          return new Quoted(string2.quote || "", result, string2.escaped);
        }
      };
      var svg = function() {
        return { "svg-gradient": function(direction) {
          var stops;
          var gradientDirectionSvg;
          var gradientType = "linear";
          var rectangleDimension = 'x="0" y="0" width="1" height="1"';
          var renderEnv = { compress: false };
          var returner;
          var directionValue = direction.toCSS(renderEnv);
          var i;
          var color2;
          var position;
          var positionValue;
          var alpha;
          function throwArgumentDescriptor() {
            throw {
              type: "Argument",
              message: "svg-gradient expects direction, start_color [start_position], [color position,]..., end_color [end_position] or direction, color list"
            };
          }
          if (arguments.length == 2) {
            if (arguments[1].value.length < 2) {
              throwArgumentDescriptor();
            }
            stops = arguments[1].value;
          } else if (arguments.length < 3) {
            throwArgumentDescriptor();
          } else {
            stops = Array.prototype.slice.call(arguments, 1);
          }
          switch (directionValue) {
            case "to bottom":
              gradientDirectionSvg = 'x1="0%" y1="0%" x2="0%" y2="100%"';
              break;
            case "to right":
              gradientDirectionSvg = 'x1="0%" y1="0%" x2="100%" y2="0%"';
              break;
            case "to bottom right":
              gradientDirectionSvg = 'x1="0%" y1="0%" x2="100%" y2="100%"';
              break;
            case "to top right":
              gradientDirectionSvg = 'x1="0%" y1="100%" x2="100%" y2="0%"';
              break;
            case "ellipse":
            case "ellipse at center":
              gradientType = "radial";
              gradientDirectionSvg = 'cx="50%" cy="50%" r="75%"';
              rectangleDimension = 'x="-50" y="-50" width="101" height="101"';
              break;
            default:
              throw { type: "Argument", message: "svg-gradient direction must be 'to bottom', 'to right', 'to bottom right', 'to top right' or 'ellipse at center'" };
          }
          returner = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><'.concat(gradientType, 'Gradient id="g" ').concat(gradientDirectionSvg, ">");
          for (i = 0; i < stops.length; i += 1) {
            if (stops[i] instanceof Expression) {
              color2 = stops[i].value[0];
              position = stops[i].value[1];
            } else {
              color2 = stops[i];
              position = void 0;
            }
            if (!(color2 instanceof Color) || !((i === 0 || i + 1 === stops.length) && position === void 0) && !(position instanceof Dimension)) {
              throwArgumentDescriptor();
            }
            positionValue = position ? position.toCSS(renderEnv) : i === 0 ? "0%" : "100%";
            alpha = color2.alpha;
            returner += '<stop offset="'.concat(positionValue, '" stop-color="').concat(color2.toRGB(), '"').concat(alpha < 1 ? ' stop-opacity="'.concat(alpha, '"') : "", "/>");
          }
          returner += "</".concat(gradientType, "Gradient><rect ").concat(rectangleDimension, ' fill="url(#g)" /></svg>');
          returner = encodeURIComponent(returner);
          returner = "data:image/svg+xml,".concat(returner);
          return new URL(new Quoted("'".concat(returner, "'"), returner, false, this.index, this.currentFileInfo), this.index, this.currentFileInfo);
        } };
      };
      var isa = function(n, Type) {
        return n instanceof Type ? Keyword.True : Keyword.False;
      };
      var isunit = function(n, unit) {
        if (unit === void 0) {
          throw { type: "Argument", message: "missing the required second argument to isunit." };
        }
        unit = typeof unit.value === "string" ? unit.value : unit;
        if (typeof unit !== "string") {
          throw { type: "Argument", message: "Second argument to isunit should be a unit or a string." };
        }
        return n instanceof Dimension && n.unit.is(unit) ? Keyword.True : Keyword.False;
      };
      var types = {
        isruleset: function(n) {
          return isa(n, DetachedRuleset);
        },
        iscolor: function(n) {
          return isa(n, Color);
        },
        isnumber: function(n) {
          return isa(n, Dimension);
        },
        isstring: function(n) {
          return isa(n, Quoted);
        },
        iskeyword: function(n) {
          return isa(n, Keyword);
        },
        isurl: function(n) {
          return isa(n, URL);
        },
        ispixel: function(n) {
          return isunit(n, "px");
        },
        ispercentage: function(n) {
          return isunit(n, "%");
        },
        isem: function(n) {
          return isunit(n, "em");
        },
        isunit,
        unit: function(val, unit) {
          if (!(val instanceof Dimension)) {
            throw {
              type: "Argument",
              message: "the first argument to unit must be a number".concat(val instanceof Operation ? ". Have you forgotten parenthesis?" : "")
            };
          }
          if (unit) {
            if (unit instanceof Keyword) {
              unit = unit.value;
            } else {
              unit = unit.toCSS();
            }
          } else {
            unit = "";
          }
          return new Dimension(val.value, unit);
        },
        "get-unit": function(n) {
          return new Anonymous(n.unit);
        }
      };
      var styleExpression = function(args) {
        var _this = this;
        args = Array.prototype.slice.call(args);
        switch (args.length) {
          case 0:
            throw { type: "Argument", message: "one or more arguments required" };
        }
        var entityList = [new Variable(args[0].value, this.index, this.currentFileInfo).eval(this.context)];
        args = entityList.map(function(a) {
          return a.toCSS(_this.context);
        }).join(this.context.compress ? "," : ", ");
        return new Variable("style(".concat(args, ")"));
      };
      var style$1 = {
        style: function() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          try {
            return styleExpression.call(this, args);
          } catch (e) {
          }
        }
      };
      var functions = function(environment) {
        var functions2 = { functionRegistry, functionCaller };
        functionRegistry.addMultiple(boolean$1);
        functionRegistry.add("default", defaultFunc.eval.bind(defaultFunc));
        functionRegistry.addMultiple(color);
        functionRegistry.addMultiple(colorBlend);
        functionRegistry.addMultiple(dataUri(environment));
        functionRegistry.addMultiple(list);
        functionRegistry.addMultiple(mathFunctions);
        functionRegistry.addMultiple(number);
        functionRegistry.addMultiple(string);
        functionRegistry.addMultiple(svg());
        functionRegistry.addMultiple(types);
        functionRegistry.addMultiple(style$1);
        return functions2;
      };
      function transformTree(root2, options2) {
        options2 = options2 || {};
        var evaldRoot;
        var variables = options2.variables;
        var evalEnv = new contexts.Eval(options2);
        if (typeof variables === "object" && !Array.isArray(variables)) {
          variables = Object.keys(variables).map(function(k) {
            var value = variables[k];
            if (!(value instanceof tree.Value)) {
              if (!(value instanceof tree.Expression)) {
                value = new tree.Expression([value]);
              }
              value = new tree.Value([value]);
            }
            return new tree.Declaration("@".concat(k), value, false, null, 0);
          });
          evalEnv.frames = [new tree.Ruleset(null, variables)];
        }
        var visitors$1 = [
          new visitors.JoinSelectorVisitor(),
          new visitors.MarkVisibleSelectorsVisitor(true),
          new visitors.ExtendVisitor(),
          new visitors.ToCSSVisitor({ compress: Boolean(options2.compress) })
        ];
        var preEvalVisitors = [];
        var v;
        var visitorIterator;
        if (options2.pluginManager) {
          visitorIterator = options2.pluginManager.visitor();
          for (var i_1 = 0; i_1 < 2; i_1++) {
            visitorIterator.first();
            while (v = visitorIterator.get()) {
              if (v.isPreEvalVisitor) {
                if (i_1 === 0 || preEvalVisitors.indexOf(v) === -1) {
                  preEvalVisitors.push(v);
                  v.run(root2);
                }
              } else {
                if (i_1 === 0 || visitors$1.indexOf(v) === -1) {
                  if (v.isPreVisitor) {
                    visitors$1.unshift(v);
                  } else {
                    visitors$1.push(v);
                  }
                }
              }
            }
          }
        }
        evaldRoot = root2.eval(evalEnv);
        for (var i_2 = 0; i_2 < visitors$1.length; i_2++) {
          visitors$1[i_2].run(evaldRoot);
        }
        if (options2.pluginManager) {
          visitorIterator.first();
          while (v = visitorIterator.get()) {
            if (visitors$1.indexOf(v) === -1 && preEvalVisitors.indexOf(v) === -1) {
              v.run(evaldRoot);
            }
          }
        }
        return evaldRoot;
      }
      var PluginManager = (
        /** @class */
        function() {
          function PluginManager2(less2) {
            this.less = less2;
            this.visitors = [];
            this.preProcessors = [];
            this.postProcessors = [];
            this.installedPlugins = [];
            this.fileManagers = [];
            this.iterator = -1;
            this.pluginCache = {};
            this.Loader = new less2.PluginLoader(less2);
          }
          PluginManager2.prototype.addPlugins = function(plugins) {
            if (plugins) {
              for (var i_1 = 0; i_1 < plugins.length; i_1++) {
                this.addPlugin(plugins[i_1]);
              }
            }
          };
          PluginManager2.prototype.addPlugin = function(plugin, filename, functionRegistry2) {
            this.installedPlugins.push(plugin);
            if (filename) {
              this.pluginCache[filename] = plugin;
            }
            if (plugin.install) {
              plugin.install(this.less, this, functionRegistry2 || this.less.functions.functionRegistry);
            }
          };
          PluginManager2.prototype.get = function(filename) {
            return this.pluginCache[filename];
          };
          PluginManager2.prototype.addVisitor = function(visitor) {
            this.visitors.push(visitor);
          };
          PluginManager2.prototype.addPreProcessor = function(preProcessor, priority) {
            var indexToInsertAt;
            for (indexToInsertAt = 0; indexToInsertAt < this.preProcessors.length; indexToInsertAt++) {
              if (this.preProcessors[indexToInsertAt].priority >= priority) {
                break;
              }
            }
            this.preProcessors.splice(indexToInsertAt, 0, { preProcessor, priority });
          };
          PluginManager2.prototype.addPostProcessor = function(postProcessor, priority) {
            var indexToInsertAt;
            for (indexToInsertAt = 0; indexToInsertAt < this.postProcessors.length; indexToInsertAt++) {
              if (this.postProcessors[indexToInsertAt].priority >= priority) {
                break;
              }
            }
            this.postProcessors.splice(indexToInsertAt, 0, { postProcessor, priority });
          };
          PluginManager2.prototype.addFileManager = function(manager) {
            this.fileManagers.push(manager);
          };
          PluginManager2.prototype.getPreProcessors = function() {
            var preProcessors = [];
            for (var i_2 = 0; i_2 < this.preProcessors.length; i_2++) {
              preProcessors.push(this.preProcessors[i_2].preProcessor);
            }
            return preProcessors;
          };
          PluginManager2.prototype.getPostProcessors = function() {
            var postProcessors = [];
            for (var i_3 = 0; i_3 < this.postProcessors.length; i_3++) {
              postProcessors.push(this.postProcessors[i_3].postProcessor);
            }
            return postProcessors;
          };
          PluginManager2.prototype.getVisitors = function() {
            return this.visitors;
          };
          PluginManager2.prototype.visitor = function() {
            var self2 = this;
            return {
              first: function() {
                self2.iterator = -1;
                return self2.visitors[self2.iterator];
              },
              get: function() {
                self2.iterator += 1;
                return self2.visitors[self2.iterator];
              }
            };
          };
          PluginManager2.prototype.getFileManagers = function() {
            return this.fileManagers;
          };
          return PluginManager2;
        }()
      );
      var pm;
      var PluginManagerFactory = function(less2, newFactory) {
        if (newFactory || !pm) {
          pm = new PluginManager(less2);
        }
        return pm;
      };
      function SourceMapOutput(environment) {
        var SourceMapOutput2 = (
          /** @class */
          function() {
            function SourceMapOutput3(options2) {
              this._css = [];
              this._rootNode = options2.rootNode;
              this._contentsMap = options2.contentsMap;
              this._contentsIgnoredCharsMap = options2.contentsIgnoredCharsMap;
              if (options2.sourceMapFilename) {
                this._sourceMapFilename = options2.sourceMapFilename.replace(/\\/g, "/");
              }
              this._outputFilename = options2.outputFilename ? options2.outputFilename.replace(/\\/g, "/") : options2.outputFilename;
              this.sourceMapURL = options2.sourceMapURL;
              if (options2.sourceMapBasepath) {
                this._sourceMapBasepath = options2.sourceMapBasepath.replace(/\\/g, "/");
              }
              if (options2.sourceMapRootpath) {
                this._sourceMapRootpath = options2.sourceMapRootpath.replace(/\\/g, "/");
                if (this._sourceMapRootpath.charAt(this._sourceMapRootpath.length - 1) !== "/") {
                  this._sourceMapRootpath += "/";
                }
              } else {
                this._sourceMapRootpath = "";
              }
              this._outputSourceFiles = options2.outputSourceFiles;
              this._sourceMapGeneratorConstructor = environment.getSourceMapGenerator();
              this._lineNumber = 0;
              this._column = 0;
            }
            SourceMapOutput3.prototype.removeBasepath = function(path) {
              if (this._sourceMapBasepath && path.indexOf(this._sourceMapBasepath) === 0) {
                path = path.substring(this._sourceMapBasepath.length);
                if (path.charAt(0) === "\\" || path.charAt(0) === "/") {
                  path = path.substring(1);
                }
              }
              return path;
            };
            SourceMapOutput3.prototype.normalizeFilename = function(filename) {
              filename = filename.replace(/\\/g, "/");
              filename = this.removeBasepath(filename);
              return (this._sourceMapRootpath || "") + filename;
            };
            SourceMapOutput3.prototype.add = function(chunk, fileInfo, index, mapLines) {
              if (!chunk) {
                return;
              }
              var lines, sourceLines, columns, sourceColumns, i;
              if (fileInfo && fileInfo.filename) {
                var inputSource = this._contentsMap[fileInfo.filename];
                if (this._contentsIgnoredCharsMap[fileInfo.filename]) {
                  index -= this._contentsIgnoredCharsMap[fileInfo.filename];
                  if (index < 0) {
                    index = 0;
                  }
                  inputSource = inputSource.slice(this._contentsIgnoredCharsMap[fileInfo.filename]);
                }
                if (inputSource === void 0) {
                  this._css.push(chunk);
                  return;
                }
                inputSource = inputSource.substring(0, index);
                sourceLines = inputSource.split("\n");
                sourceColumns = sourceLines[sourceLines.length - 1];
              }
              lines = chunk.split("\n");
              columns = lines[lines.length - 1];
              if (fileInfo && fileInfo.filename) {
                if (!mapLines) {
                  this._sourceMapGenerator.addMapping({
                    generated: { line: this._lineNumber + 1, column: this._column },
                    original: { line: sourceLines.length, column: sourceColumns.length },
                    source: this.normalizeFilename(fileInfo.filename)
                  });
                } else {
                  for (i = 0; i < lines.length; i++) {
                    this._sourceMapGenerator.addMapping({
                      generated: { line: this._lineNumber + i + 1, column: i === 0 ? this._column : 0 },
                      original: { line: sourceLines.length + i, column: i === 0 ? sourceColumns.length : 0 },
                      source: this.normalizeFilename(fileInfo.filename)
                    });
                  }
                }
              }
              if (lines.length === 1) {
                this._column += columns.length;
              } else {
                this._lineNumber += lines.length - 1;
                this._column = columns.length;
              }
              this._css.push(chunk);
            };
            SourceMapOutput3.prototype.isEmpty = function() {
              return this._css.length === 0;
            };
            SourceMapOutput3.prototype.toCSS = function(context) {
              this._sourceMapGenerator = new this._sourceMapGeneratorConstructor({ file: this._outputFilename, sourceRoot: null });
              if (this._outputSourceFiles) {
                for (var filename in this._contentsMap) {
                  if (this._contentsMap.hasOwnProperty(filename)) {
                    var source = this._contentsMap[filename];
                    if (this._contentsIgnoredCharsMap[filename]) {
                      source = source.slice(this._contentsIgnoredCharsMap[filename]);
                    }
                    this._sourceMapGenerator.setSourceContent(this.normalizeFilename(filename), source);
                  }
                }
              }
              this._rootNode.genCSS(context, this);
              if (this._css.length > 0) {
                var sourceMapURL = void 0;
                var sourceMapContent = JSON.stringify(this._sourceMapGenerator.toJSON());
                if (this.sourceMapURL) {
                  sourceMapURL = this.sourceMapURL;
                } else if (this._sourceMapFilename) {
                  sourceMapURL = this._sourceMapFilename;
                }
                this.sourceMapURL = sourceMapURL;
                this.sourceMap = sourceMapContent;
              }
              return this._css.join("");
            };
            return SourceMapOutput3;
          }()
        );
        return SourceMapOutput2;
      }
      function SourceMapBuilder(SourceMapOutput2, environment) {
        var SourceMapBuilder2 = (
          /** @class */
          function() {
            function SourceMapBuilder3(options2) {
              this.options = options2;
            }
            SourceMapBuilder3.prototype.toCSS = function(rootNode, options2, imports) {
              var sourceMapOutput = new SourceMapOutput2({
                contentsIgnoredCharsMap: imports.contentsIgnoredChars,
                rootNode,
                contentsMap: imports.contents,
                sourceMapFilename: this.options.sourceMapFilename,
                sourceMapURL: this.options.sourceMapURL,
                outputFilename: this.options.sourceMapOutputFilename,
                sourceMapBasepath: this.options.sourceMapBasepath,
                sourceMapRootpath: this.options.sourceMapRootpath,
                outputSourceFiles: this.options.outputSourceFiles,
                sourceMapGenerator: this.options.sourceMapGenerator,
                sourceMapFileInline: this.options.sourceMapFileInline,
                disableSourcemapAnnotation: this.options.disableSourcemapAnnotation
              });
              var css2 = sourceMapOutput.toCSS(options2);
              this.sourceMap = sourceMapOutput.sourceMap;
              this.sourceMapURL = sourceMapOutput.sourceMapURL;
              if (this.options.sourceMapInputFilename) {
                this.sourceMapInputFilename = sourceMapOutput.normalizeFilename(this.options.sourceMapInputFilename);
              }
              if (this.options.sourceMapBasepath !== void 0 && this.sourceMapURL !== void 0) {
                this.sourceMapURL = sourceMapOutput.removeBasepath(this.sourceMapURL);
              }
              return css2 + this.getCSSAppendage();
            };
            SourceMapBuilder3.prototype.getCSSAppendage = function() {
              var sourceMapURL = this.sourceMapURL;
              if (this.options.sourceMapFileInline) {
                if (this.sourceMap === void 0) {
                  return "";
                }
                sourceMapURL = "data:application/json;base64,".concat(environment.encodeBase64(this.sourceMap));
              }
              if (this.options.disableSourcemapAnnotation) {
                return "";
              }
              if (sourceMapURL) {
                return "/*# sourceMappingURL=".concat(sourceMapURL, " */");
              }
              return "";
            };
            SourceMapBuilder3.prototype.getExternalSourceMap = function() {
              return this.sourceMap;
            };
            SourceMapBuilder3.prototype.setExternalSourceMap = function(sourceMap) {
              this.sourceMap = sourceMap;
            };
            SourceMapBuilder3.prototype.isInline = function() {
              return this.options.sourceMapFileInline;
            };
            SourceMapBuilder3.prototype.getSourceMapURL = function() {
              return this.sourceMapURL;
            };
            SourceMapBuilder3.prototype.getOutputFilename = function() {
              return this.options.sourceMapOutputFilename;
            };
            SourceMapBuilder3.prototype.getInputFilename = function() {
              return this.sourceMapInputFilename;
            };
            return SourceMapBuilder3;
          }()
        );
        return SourceMapBuilder2;
      }
      function ParseTree(SourceMapBuilder2) {
        var ParseTree2 = (
          /** @class */
          function() {
            function ParseTree3(root2, imports) {
              this.root = root2;
              this.imports = imports;
            }
            ParseTree3.prototype.toCSS = function(options2) {
              var evaldRoot;
              var result = {};
              var sourceMapBuilder;
              try {
                evaldRoot = transformTree(this.root, options2);
              } catch (e) {
                throw new LessError(e, this.imports);
              }
              try {
                var compress = Boolean(options2.compress);
                if (compress) {
                  logger$1.warn("The compress option has been deprecated. We recommend you use a dedicated css minifier, for instance see less-plugin-clean-css.");
                }
                var toCSSOptions = {
                  compress,
                  // @deprecated The dumpLineNumbers option is deprecated. Use sourcemaps instead. All modes will be removed in a future version.
                  dumpLineNumbers: options2.dumpLineNumbers,
                  strictUnits: Boolean(options2.strictUnits),
                  numPrecision: 8
                };
                if (options2.sourceMap) {
                  if (options2.sourceMap === true) {
                    options2.sourceMap = {};
                  }
                  var sourceMapOpts = options2.sourceMap;
                  if (!sourceMapOpts.sourceMapInputFilename && options2.filename) {
                    sourceMapOpts.sourceMapInputFilename = options2.filename;
                  }
                  if (sourceMapOpts.sourceMapBasepath === void 0 && options2.filename) {
                    var lastSlash = Math.max(options2.filename.lastIndexOf("/"), options2.filename.lastIndexOf("\\"));
                    if (lastSlash >= 0) {
                      sourceMapOpts.sourceMapBasepath = options2.filename.substring(0, lastSlash);
                    } else {
                      sourceMapOpts.sourceMapBasepath = ".";
                    }
                  }
                  if (sourceMapOpts.sourceMapFullFilename && !sourceMapOpts.sourceMapFileInline) {
                    if (!sourceMapOpts.sourceMapFilename && !sourceMapOpts.sourceMapURL) {
                      var mapBase = sourceMapOpts.sourceMapFullFilename.split(/[/\\]/).pop();
                      sourceMapOpts.sourceMapFilename = mapBase;
                    }
                  } else if (!sourceMapOpts.sourceMapFilename && !sourceMapOpts.sourceMapURL) {
                    if (sourceMapOpts.sourceMapOutputFilename) {
                      sourceMapOpts.sourceMapFilename = sourceMapOpts.sourceMapOutputFilename + ".map";
                    } else if (options2.filename) {
                      var inputBase = options2.filename.replace(/\.[^/.]+$/, "");
                      sourceMapOpts.sourceMapFilename = inputBase + ".css.map";
                    }
                  }
                  if (!sourceMapOpts.sourceMapOutputFilename) {
                    if (options2.filename) {
                      var inputBase = options2.filename.replace(/\.[^/.]+$/, "");
                      sourceMapOpts.sourceMapOutputFilename = inputBase + ".css";
                    } else {
                      sourceMapOpts.sourceMapOutputFilename = "output.css";
                    }
                  }
                  sourceMapBuilder = new SourceMapBuilder2(sourceMapOpts);
                  result.css = sourceMapBuilder.toCSS(evaldRoot, toCSSOptions, this.imports);
                } else {
                  result.css = evaldRoot.toCSS(toCSSOptions);
                }
              } catch (e) {
                throw new LessError(e, this.imports);
              }
              if (options2.pluginManager) {
                var postProcessors = options2.pluginManager.getPostProcessors();
                for (var i_1 = 0; i_1 < postProcessors.length; i_1++) {
                  result.css = postProcessors[i_1].process(result.css, { sourceMap: sourceMapBuilder, options: options2, imports: this.imports });
                }
              }
              if (options2.sourceMap) {
                result.map = sourceMapBuilder.getExternalSourceMap();
              }
              result.imports = [];
              for (var file_1 in this.imports.files) {
                if (Object.prototype.hasOwnProperty.call(this.imports.files, file_1) && file_1 !== this.imports.rootFilename) {
                  result.imports.push(file_1);
                }
              }
              return result;
            };
            return ParseTree3;
          }()
        );
        return ParseTree2;
      }
      function ImportManager(environment) {
        var ImportManager2 = (
          /** @class */
          function() {
            function ImportManager3(less2, context, rootFileInfo) {
              this.less = less2;
              this.rootFilename = rootFileInfo.filename;
              this.paths = context.paths || [];
              this.contents = {};
              this.contentsIgnoredChars = {};
              this.mime = context.mime;
              this.error = null;
              this.context = context;
              this.queue = [];
              this.files = {};
            }
            ImportManager3.prototype.push = function(path, tryAppendExtension, currentFileInfo, importOptions, callback) {
              var importManager = this, pluginLoader = this.context.pluginManager.Loader;
              this.queue.push(path);
              var fileParsedFunc = function(e, root2, fullPath) {
                importManager.queue.splice(importManager.queue.indexOf(path), 1);
                var importedEqualsRoot = fullPath === importManager.rootFilename;
                if (importOptions.optional && e) {
                  callback(null, { rules: [] }, false, null);
                  logger$1.info("The file ".concat(fullPath, " was skipped because it was not found and the import was marked optional."));
                } else {
                  if (!importManager.files[fullPath] && !importOptions.inline) {
                    importManager.files[fullPath] = { root: root2, options: importOptions };
                  }
                  if (e && !importManager.error) {
                    importManager.error = e;
                  }
                  callback(e, root2, importedEqualsRoot, fullPath);
                }
              };
              var newFileInfo = {
                rewriteUrls: this.context.rewriteUrls,
                entryPath: currentFileInfo.entryPath,
                rootpath: currentFileInfo.rootpath,
                rootFilename: currentFileInfo.rootFilename
              };
              var fileManager = environment.getFileManager(path, currentFileInfo.currentDirectory, this.context, environment);
              if (!fileManager) {
                fileParsedFunc({ message: "Could not find a file-manager for ".concat(path) });
                return;
              }
              var loadFileCallback = function(loadedFile2) {
                var plugin;
                var resolvedFilename = loadedFile2.filename;
                var contents = loadedFile2.contents.replace(/^\uFEFF/, "");
                newFileInfo.currentDirectory = fileManager.getPath(resolvedFilename);
                if (newFileInfo.rewriteUrls) {
                  newFileInfo.rootpath = fileManager.join(importManager.context.rootpath || "", fileManager.pathDiff(newFileInfo.currentDirectory, newFileInfo.entryPath));
                  if (!fileManager.isPathAbsolute(newFileInfo.rootpath) && fileManager.alwaysMakePathsAbsolute()) {
                    newFileInfo.rootpath = fileManager.join(newFileInfo.entryPath, newFileInfo.rootpath);
                  }
                }
                newFileInfo.filename = resolvedFilename;
                var newEnv = new contexts.Parse(importManager.context);
                newEnv.processImports = false;
                importManager.contents[resolvedFilename] = contents;
                if (currentFileInfo.reference || importOptions.reference) {
                  newFileInfo.reference = true;
                }
                if (importOptions.isPlugin) {
                  plugin = pluginLoader.evalPlugin(contents, newEnv, importManager, importOptions.pluginArgs, newFileInfo);
                  if (plugin instanceof LessError) {
                    fileParsedFunc(plugin, null, resolvedFilename);
                  } else {
                    fileParsedFunc(null, plugin, resolvedFilename);
                  }
                } else if (importOptions.inline) {
                  fileParsedFunc(null, contents, resolvedFilename);
                } else {
                  if (importManager.files[resolvedFilename] && !importManager.files[resolvedFilename].options.multiple && !importOptions.multiple) {
                    fileParsedFunc(null, importManager.files[resolvedFilename].root, resolvedFilename);
                  } else {
                    new Parser(newEnv, importManager, newFileInfo).parse(contents, function(e, root2) {
                      fileParsedFunc(e, root2, resolvedFilename);
                    });
                  }
                }
              };
              var loadedFile;
              var promise;
              var context = clone(this.context);
              if (tryAppendExtension) {
                context.ext = importOptions.isPlugin ? ".js" : ".less";
              }
              if (importOptions.isPlugin) {
                context.mime = "application/javascript";
                if (context.syncImport) {
                  loadedFile = pluginLoader.loadPluginSync(path, currentFileInfo.currentDirectory, context, environment, fileManager);
                } else {
                  promise = pluginLoader.loadPlugin(path, currentFileInfo.currentDirectory, context, environment, fileManager);
                }
              } else {
                if (context.syncImport) {
                  loadedFile = fileManager.loadFileSync(path, currentFileInfo.currentDirectory, context, environment);
                } else {
                  promise = fileManager.loadFile(path, currentFileInfo.currentDirectory, context, environment, function(err, loadedFile2) {
                    if (err) {
                      fileParsedFunc(err);
                    } else {
                      loadFileCallback(loadedFile2);
                    }
                  });
                }
              }
              if (loadedFile) {
                if (!loadedFile.filename) {
                  fileParsedFunc(loadedFile);
                } else {
                  loadFileCallback(loadedFile);
                }
              } else if (promise) {
                promise.then(loadFileCallback, fileParsedFunc);
              }
            };
            return ImportManager3;
          }()
        );
        return ImportManager2;
      }
      function Parse(environment, ParseTree2, ImportManager2) {
        var parse = function(input, options2, callback) {
          if (typeof options2 === "function") {
            callback = options2;
            options2 = copyOptions(this.options, {});
          } else {
            options2 = copyOptions(this.options, options2 || {});
          }
          if (!callback) {
            var self_1 = this;
            return new Promise(function(resolve, reject) {
              parse.call(self_1, input, options2, function(err, output) {
                if (err) {
                  reject(err);
                } else {
                  resolve(output);
                }
              });
            });
          } else {
            var context_1;
            var rootFileInfo = void 0;
            var pluginManager_1 = new PluginManagerFactory(this, !options2.reUsePluginManager);
            options2.pluginManager = pluginManager_1;
            context_1 = new contexts.Parse(options2);
            if (options2.rootFileInfo) {
              rootFileInfo = options2.rootFileInfo;
            } else {
              var filename = options2.filename || "input";
              var entryPath = filename.replace(/[^/\\]*$/, "");
              rootFileInfo = {
                filename,
                rewriteUrls: context_1.rewriteUrls,
                rootpath: context_1.rootpath || "",
                currentDirectory: entryPath,
                entryPath,
                rootFilename: filename
              };
              if (rootFileInfo.rootpath && rootFileInfo.rootpath.slice(-1) !== "/") {
                rootFileInfo.rootpath += "/";
              }
            }
            var imports_1 = new ImportManager2(this, context_1, rootFileInfo);
            this.importManager = imports_1;
            if (options2.plugins) {
              options2.plugins.forEach(function(plugin) {
                var evalResult, contents;
                if (plugin.fileContent) {
                  contents = plugin.fileContent.replace(/^\uFEFF/, "");
                  evalResult = pluginManager_1.Loader.evalPlugin(contents, context_1, imports_1, plugin.options, plugin.filename);
                  if (evalResult instanceof LessError) {
                    return callback(evalResult);
                  }
                } else {
                  pluginManager_1.addPlugin(plugin);
                }
              });
            }
            new Parser(context_1, imports_1, rootFileInfo).parse(input, function(e, root2) {
              if (e) {
                return callback(e);
              }
              callback(null, root2, imports_1, options2);
            }, options2);
          }
        };
        return parse;
      }
      function Render(environment, ParseTree2) {
        var render = function(input, options2, callback) {
          if (typeof options2 === "function") {
            callback = options2;
            options2 = copyOptions(this.options, {});
          } else {
            options2 = copyOptions(this.options, options2 || {});
          }
          if (!callback) {
            var self_1 = this;
            return new Promise(function(resolve, reject) {
              render.call(self_1, input, options2, function(err, output) {
                if (err) {
                  reject(err);
                } else {
                  resolve(output);
                }
              });
            });
          } else {
            this.parse(input, options2, function(err, root2, imports, options3) {
              if (err) {
                return callback(err);
              }
              var result;
              try {
                var parseTree = new ParseTree2(root2, imports);
                result = parseTree.toCSS(options3);
              } catch (err2) {
                return callback(err2);
              }
              callback(null, result);
            });
          }
        };
        return render;
      }
      var version = "4.5.1";
      function parseNodeVersion(version2) {
        var match = version2.match(/^v(\d{1,2})\.(\d{1,2})\.(\d{1,2})(?:-([0-9A-Za-z-.]+))?(?:\+([0-9A-Za-z-.]+))?$/);
        if (!match) {
          throw new Error("Unable to parse: " + version2);
        }
        var res = {
          major: parseInt(match[1], 10),
          minor: parseInt(match[2], 10),
          patch: parseInt(match[3], 10),
          pre: match[4] || "",
          build: match[5] || ""
        };
        return res;
      }
      var parseNodeVersion_1 = parseNodeVersion;
      function lessRoot(environment, fileManagers) {
        var sourceMapOutput, sourceMapBuilder, parseTree, importManager;
        environment = new Environment(environment, fileManagers);
        sourceMapOutput = SourceMapOutput(environment);
        sourceMapBuilder = SourceMapBuilder(sourceMapOutput, environment);
        parseTree = ParseTree(sourceMapBuilder);
        importManager = ImportManager(environment);
        var render = Render(environment, parseTree);
        var parse = Parse(environment, parseTree, importManager);
        var v = parseNodeVersion_1("v".concat(version));
        var initial = {
          version: [v.major, v.minor, v.patch],
          data,
          tree,
          Environment,
          AbstractFileManager,
          AbstractPluginLoader,
          environment,
          visitors,
          Parser,
          functions: functions(environment),
          contexts,
          SourceMapOutput: sourceMapOutput,
          SourceMapBuilder: sourceMapBuilder,
          ParseTree: parseTree,
          ImportManager: importManager,
          render,
          parse,
          LessError,
          transformTree,
          utils,
          PluginManager: PluginManagerFactory,
          logger: logger$1
        };
        var ctor = function(t2) {
          return function() {
            var obj = Object.create(t2.prototype);
            t2.apply(obj, Array.prototype.slice.call(arguments, 0));
            return obj;
          };
        };
        var t;
        var api = Object.create(initial);
        for (var n in initial.tree) {
          t = initial.tree[n];
          if (typeof t === "function") {
            api[n.toLowerCase()] = ctor(t);
          } else {
            api[n] = /* @__PURE__ */ Object.create(null);
            for (var o in t) {
              api[n][o.toLowerCase()] = ctor(t[o]);
            }
          }
        }
        initial.parse = initial.parse.bind(api);
        initial.render = initial.render.bind(api);
        return api;
      }
      var options$1;
      var logger;
      var fileCache = {};
      var FileManager = function() {
      };
      FileManager.prototype = Object.assign(new AbstractFileManager(), {
        alwaysMakePathsAbsolute: function() {
          return true;
        },
        join: function(basePath, laterPath) {
          if (!basePath) {
            return laterPath;
          }
          return this.extractUrlParts(laterPath, basePath).path;
        },
        doXHR: function(url, type, callback, errback) {
          var xhr = new XMLHttpRequest();
          var async = options$1.isFileProtocol ? options$1.fileAsync : true;
          if (typeof xhr.overrideMimeType === "function") {
            xhr.overrideMimeType("text/css");
          }
          logger.debug("XHR: Getting '".concat(url, "'"));
          xhr.open("GET", url, async);
          xhr.setRequestHeader("Accept", type || "text/x-less, text/css; q=0.9, */*; q=0.5");
          xhr.send(null);
          function handleResponse(xhr2, callback2, errback2) {
            if (xhr2.status >= 200 && xhr2.status < 300) {
              callback2(xhr2.responseText, xhr2.getResponseHeader("Last-Modified"));
            } else if (typeof errback2 === "function") {
              errback2(xhr2.status, url);
            }
          }
          if (options$1.isFileProtocol && !options$1.fileAsync) {
            if (xhr.status === 0 || xhr.status >= 200 && xhr.status < 300) {
              callback(xhr.responseText);
            } else {
              errback(xhr.status, url);
            }
          } else if (async) {
            xhr.onreadystatechange = function() {
              if (xhr.readyState == 4) {
                handleResponse(xhr, callback, errback);
              }
            };
          } else {
            handleResponse(xhr, callback, errback);
          }
        },
        supports: function() {
          return true;
        },
        clearFileCache: function() {
          fileCache = {};
        },
        loadFile: function(filename, currentDirectory, options2) {
          if (currentDirectory && !this.isPathAbsolute(filename)) {
            filename = currentDirectory + filename;
          }
          filename = options2.ext ? this.tryAppendExtension(filename, options2.ext) : filename;
          options2 = options2 || {};
          var hrefParts = this.extractUrlParts(filename, window.location.href);
          var href = hrefParts.url;
          var self2 = this;
          return new Promise(function(resolve, reject) {
            if (options2.useFileCache && fileCache[href]) {
              try {
                var lessText_1 = fileCache[href];
                return resolve({ contents: lessText_1, filename: href, webInfo: { lastModified: /* @__PURE__ */ new Date() } });
              } catch (e) {
                return reject({ filename: href, message: "Error loading file ".concat(href, " error was ").concat(e.message) });
              }
            }
            self2.doXHR(href, options2.mime, function doXHRCallback(data2, lastModified) {
              fileCache[href] = data2;
              resolve({ contents: data2, filename: href, webInfo: { lastModified } });
            }, function doXHRError(status, url) {
              reject({ type: "File", message: "'".concat(url, "' wasn't found (").concat(status, ")"), href });
            });
          });
        }
      });
      var FM = function(opts, log) {
        options$1 = opts;
        logger = log;
        return FileManager;
      };
      var PluginLoader = function(less2) {
        this.less = less2;
      };
      PluginLoader.prototype = Object.assign(new AbstractPluginLoader(), {
        loadPlugin: function(filename, basePath, context, environment, fileManager) {
          return new Promise(function(fulfill, reject) {
            fileManager.loadFile(filename, basePath, context, environment).then(fulfill).catch(reject);
          });
        }
      });
      var LogListener = function(less2, options2) {
        var logLevel_debug = 4;
        var logLevel_info = 3;
        var logLevel_warn = 2;
        var logLevel_error = 1;
        options2.logLevel = typeof options2.logLevel !== "undefined" ? options2.logLevel : options2.env === "development" ? logLevel_info : logLevel_error;
        if (!options2.loggers) {
          options2.loggers = [{
            debug: function(msg) {
              if (options2.logLevel >= logLevel_debug) {
                console.log(msg);
              }
            },
            info: function(msg) {
              if (options2.logLevel >= logLevel_info) {
                console.log(msg);
              }
            },
            warn: function(msg) {
              if (options2.logLevel >= logLevel_warn) {
                console.warn(msg);
              }
            },
            error: function(msg) {
              if (options2.logLevel >= logLevel_error) {
                console.error(msg);
              }
            }
          }];
        }
        for (var i_1 = 0; i_1 < options2.loggers.length; i_1++) {
          less2.logger.addListener(options2.loggers[i_1]);
        }
      };
      var ErrorReporting = function(window2, less2, options2) {
        function errorHTML(e, rootHref) {
          var id = "less-error-message:".concat(extractId(rootHref || ""));
          var template = '<li><label>{line}</label><pre class="{class}">{content}</pre></li>';
          var elem = window2.document.createElement("div");
          var timer;
          var content;
          var errors = [];
          var filename = e.filename || rootHref;
          var filenameNoPath = filename.match(/([^/]+(\?.*)?)$/)[1];
          elem.id = id;
          elem.className = "less-error-message";
          content = "<h3>".concat(e.type || "Syntax", "Error: ").concat(e.message || "There is an error in your .less file") + '</h3><p>in <a href="'.concat(filename, '">').concat(filenameNoPath, "</a> ");
          var errorline = function(e2, i, classname) {
            if (e2.extract[i] !== void 0) {
              errors.push(template.replace(/\{line\}/, (parseInt(e2.line, 10) || 0) + (i - 1)).replace(/\{class\}/, classname).replace(/\{content\}/, e2.extract[i]));
            }
          };
          if (e.line) {
            errorline(e, 0, "");
            errorline(e, 1, "line");
            errorline(e, 2, "");
            content += "on line ".concat(e.line, ", column ").concat(e.column + 1, ":</p><ul>").concat(errors.join(""), "</ul>");
          }
          if (e.stack && (e.extract || options2.logLevel >= 4)) {
            content += "<br/>Stack Trace</br />".concat(e.stack.split("\n").slice(1).join("<br/>"));
          }
          elem.innerHTML = content;
          browser.createCSS(window2.document, [
            ".less-error-message ul, .less-error-message li {",
            "list-style-type: none;",
            "margin-right: 15px;",
            "padding: 4px 0;",
            "margin: 0;",
            "}",
            ".less-error-message label {",
            "font-size: 12px;",
            "margin-right: 15px;",
            "padding: 4px 0;",
            "color: #cc7777;",
            "}",
            ".less-error-message pre {",
            "color: #dd6666;",
            "padding: 4px 0;",
            "margin: 0;",
            "display: inline-block;",
            "}",
            ".less-error-message pre.line {",
            "color: #ff0000;",
            "}",
            ".less-error-message h3 {",
            "font-size: 20px;",
            "font-weight: bold;",
            "padding: 15px 0 5px 0;",
            "margin: 0;",
            "}",
            ".less-error-message a {",
            "color: #10a",
            "}",
            ".less-error-message .error {",
            "color: red;",
            "font-weight: bold;",
            "padding-bottom: 2px;",
            "border-bottom: 1px dashed red;",
            "}"
          ].join("\n"), { title: "error-message" });
          elem.style.cssText = [
            "font-family: Arial, sans-serif",
            "border: 1px solid #e00",
            "background-color: #eee",
            "border-radius: 5px",
            "-webkit-border-radius: 5px",
            "-moz-border-radius: 5px",
            "color: #e00",
            "padding: 15px",
            "margin-bottom: 15px"
          ].join(";");
          if (options2.env === "development") {
            timer = setInterval(function() {
              var document2 = window2.document;
              var body = document2.body;
              if (body) {
                if (document2.getElementById(id)) {
                  body.replaceChild(elem, document2.getElementById(id));
                } else {
                  body.insertBefore(elem, body.firstChild);
                }
                clearInterval(timer);
              }
            }, 10);
          }
        }
        function removeErrorHTML(path) {
          var node = window2.document.getElementById("less-error-message:".concat(extractId(path)));
          if (node) {
            node.parentNode.removeChild(node);
          }
        }
        function removeError(path) {
          if (!options2.errorReporting || options2.errorReporting === "html") {
            removeErrorHTML(path);
          } else if (options2.errorReporting === "console")
            ;
          else if (typeof options2.errorReporting === "function") {
            options2.errorReporting("remove", path);
          }
        }
        function errorConsole(e, rootHref) {
          var template = "{line} {content}";
          var filename = e.filename || rootHref;
          var errors = [];
          var content = "".concat(e.type || "Syntax", "Error: ").concat(e.message || "There is an error in your .less file", " in ").concat(filename);
          var errorline = function(e2, i, classname) {
            if (e2.extract[i] !== void 0) {
              errors.push(template.replace(/\{line\}/, (parseInt(e2.line, 10) || 0) + (i - 1)).replace(/\{class\}/, classname).replace(/\{content\}/, e2.extract[i]));
            }
          };
          if (e.line) {
            errorline(e, 0, "");
            errorline(e, 1, "line");
            errorline(e, 2, "");
            content += " on line ".concat(e.line, ", column ").concat(e.column + 1, ":\n").concat(errors.join("\n"));
          }
          if (e.stack && (e.extract || options2.logLevel >= 4)) {
            content += "\nStack Trace\n".concat(e.stack);
          }
          less2.logger.error(content);
        }
        function error(e, rootHref) {
          if (!options2.errorReporting || options2.errorReporting === "html") {
            errorHTML(e, rootHref);
          } else if (options2.errorReporting === "console") {
            errorConsole(e, rootHref);
          } else if (typeof options2.errorReporting === "function") {
            options2.errorReporting("add", e, rootHref);
          }
        }
        return {
          add: error,
          remove: removeError
        };
      };
      var Cache = function(window2, options2, logger2) {
        var cache = null;
        if (options2.env !== "development") {
          try {
            cache = typeof window2.localStorage === "undefined" ? null : window2.localStorage;
          } catch (_) {
          }
        }
        return {
          setCSS: function(path, lastModified, modifyVars, styles) {
            if (cache) {
              logger2.info("saving ".concat(path, " to cache."));
              try {
                cache.setItem(path, styles);
                cache.setItem("".concat(path, ":timestamp"), lastModified);
                if (modifyVars) {
                  cache.setItem("".concat(path, ":vars"), JSON.stringify(modifyVars));
                }
              } catch (e) {
                logger2.error('failed to save "'.concat(path, '" to local storage for caching.'));
              }
            }
          },
          getCSS: function(path, webInfo, modifyVars) {
            var css2 = cache && cache.getItem(path);
            var timestamp = cache && cache.getItem("".concat(path, ":timestamp"));
            var vars = cache && cache.getItem("".concat(path, ":vars"));
            modifyVars = modifyVars || {};
            vars = vars || "{}";
            if (timestamp && webInfo.lastModified && new Date(webInfo.lastModified).valueOf() === new Date(timestamp).valueOf() && JSON.stringify(modifyVars) === vars) {
              return css2;
            }
          }
        };
      };
      var ImageSize = function() {
        function imageSize() {
          throw {
            type: "Runtime",
            message: "Image size functions are not supported in browser version of less"
          };
        }
        var imageFunctions = {
          "image-size": function(filePathNode) {
            imageSize();
            return -1;
          },
          "image-width": function(filePathNode) {
            imageSize();
            return -1;
          },
          "image-height": function(filePathNode) {
            imageSize();
            return -1;
          }
        };
        functionRegistry.addMultiple(imageFunctions);
      };
      var root = function(window2, options2) {
        var document2 = window2.document;
        var less2 = lessRoot();
        less2.options = options2;
        var environment = less2.environment;
        var FileManager2 = FM(options2, less2.logger);
        var fileManager = new FileManager2();
        environment.addFileManager(fileManager);
        less2.FileManager = FileManager2;
        less2.PluginLoader = PluginLoader;
        LogListener(less2, options2);
        var errors = ErrorReporting(window2, less2, options2);
        var cache = less2.cache = options2.cache || Cache(window2, options2, less2.logger);
        ImageSize(less2.environment);
        if (options2.functions) {
          less2.functions.functionRegistry.addMultiple(options2.functions);
        }
        var typePattern = /^text\/(x-)?less$/;
        function clone2(obj) {
          var cloned = {};
          for (var prop in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, prop)) {
              cloned[prop] = obj[prop];
            }
          }
          return cloned;
        }
        function bind(func, thisArg) {
          var curryArgs = Array.prototype.slice.call(arguments, 2);
          return function() {
            var args = curryArgs.concat(Array.prototype.slice.call(arguments, 0));
            return func.apply(thisArg, args);
          };
        }
        function loadStyles(modifyVars) {
          var styles = document2.getElementsByTagName("style");
          var style2;
          for (var i_1 = 0; i_1 < styles.length; i_1++) {
            style2 = styles[i_1];
            if (style2.type.match(typePattern)) {
              var instanceOptions = clone2(options2);
              instanceOptions.modifyVars = modifyVars;
              var lessText_1 = style2.innerHTML || "";
              instanceOptions.filename = document2.location.href.replace(/#.*$/, "");
              less2.render(lessText_1, instanceOptions, bind(function(style3, e, result) {
                if (e) {
                  errors.add(e, "inline");
                } else {
                  style3.type = "text/css";
                  if (style3.styleSheet) {
                    style3.styleSheet.cssText = result.css;
                  } else {
                    style3.innerHTML = result.css;
                  }
                }
              }, null, style2));
            }
          }
        }
        function loadStyleSheet(sheet, callback, reload, remaining, modifyVars) {
          var instanceOptions = clone2(options2);
          addDataAttr(instanceOptions, sheet);
          instanceOptions.mime = sheet.type;
          if (modifyVars) {
            instanceOptions.modifyVars = modifyVars;
          }
          function loadInitialFileCallback(loadedFile) {
            var data2 = loadedFile.contents;
            var path = loadedFile.filename;
            var webInfo = loadedFile.webInfo;
            var newFileInfo = {
              currentDirectory: fileManager.getPath(path),
              filename: path,
              rootFilename: path,
              rewriteUrls: instanceOptions.rewriteUrls
            };
            newFileInfo.entryPath = newFileInfo.currentDirectory;
            newFileInfo.rootpath = instanceOptions.rootpath || newFileInfo.currentDirectory;
            if (webInfo) {
              webInfo.remaining = remaining;
              var css2 = cache.getCSS(path, webInfo, instanceOptions.modifyVars);
              if (!reload && css2) {
                webInfo.local = true;
                callback(null, css2, data2, sheet, webInfo, path);
                return;
              }
            }
            errors.remove(path);
            instanceOptions.rootFileInfo = newFileInfo;
            less2.render(data2, instanceOptions, function(e, result) {
              if (e) {
                e.href = path;
                callback(e);
              } else {
                cache.setCSS(sheet.href, webInfo.lastModified, instanceOptions.modifyVars, result.css);
                callback(null, result.css, data2, sheet, webInfo, path);
              }
            });
          }
          fileManager.loadFile(sheet.href, null, instanceOptions, environment).then(function(loadedFile) {
            loadInitialFileCallback(loadedFile);
          }).catch(function(err) {
            console.log(err);
            callback(err);
          });
        }
        function loadStyleSheets(callback, reload, modifyVars) {
          for (var i_2 = 0; i_2 < less2.sheets.length; i_2++) {
            loadStyleSheet(less2.sheets[i_2], callback, reload, less2.sheets.length - (i_2 + 1), modifyVars);
          }
        }
        function initRunningMode() {
          if (less2.env === "development") {
            less2.watchTimer = setInterval(function() {
              if (less2.watchMode) {
                fileManager.clearFileCache();
                loadStyleSheets(function(e, css2, _, sheet, webInfo) {
                  if (e) {
                    errors.add(e, e.href || sheet.href);
                  } else if (css2) {
                    browser.createCSS(window2.document, css2, sheet);
                  }
                });
              }
            }, options2.poll);
          }
        }
        less2.watch = function() {
          if (!less2.watchMode) {
            less2.env = "development";
            initRunningMode();
          }
          this.watchMode = true;
          return true;
        };
        less2.unwatch = function() {
          clearInterval(less2.watchTimer);
          this.watchMode = false;
          return false;
        };
        less2.registerStylesheetsImmediately = function() {
          var links = document2.getElementsByTagName("link");
          less2.sheets = [];
          for (var i_3 = 0; i_3 < links.length; i_3++) {
            if (links[i_3].rel === "stylesheet/less" || links[i_3].rel.match(/stylesheet/) && links[i_3].type.match(typePattern)) {
              less2.sheets.push(links[i_3]);
            }
          }
        };
        less2.registerStylesheets = function() {
          return new Promise(function(resolve) {
            less2.registerStylesheetsImmediately();
            resolve();
          });
        };
        less2.modifyVars = function(record) {
          return less2.refresh(true, record, false);
        };
        less2.refresh = function(reload, modifyVars, clearFileCache) {
          if ((reload || clearFileCache) && clearFileCache !== false) {
            fileManager.clearFileCache();
          }
          return new Promise(function(resolve, reject) {
            var startTime;
            var endTime;
            var totalMilliseconds;
            var remainingSheets;
            startTime = endTime = /* @__PURE__ */ new Date();
            remainingSheets = less2.sheets.length;
            if (remainingSheets === 0) {
              endTime = /* @__PURE__ */ new Date();
              totalMilliseconds = endTime - startTime;
              less2.logger.info("Less has finished and no sheets were loaded.");
              resolve({
                startTime,
                endTime,
                totalMilliseconds,
                sheets: less2.sheets.length
              });
            } else {
              loadStyleSheets(function(e, css2, _, sheet, webInfo) {
                if (e) {
                  errors.add(e, e.href || sheet.href);
                  reject(e);
                  return;
                }
                if (webInfo.local) {
                  less2.logger.info("Loading ".concat(sheet.href, " from cache."));
                } else {
                  less2.logger.info("Rendered ".concat(sheet.href, " successfully."));
                }
                browser.createCSS(window2.document, css2, sheet);
                less2.logger.info("CSS for ".concat(sheet.href, " generated in ").concat(/* @__PURE__ */ new Date() - endTime, "ms"));
                remainingSheets--;
                if (remainingSheets === 0) {
                  totalMilliseconds = /* @__PURE__ */ new Date() - startTime;
                  less2.logger.info("Less has finished. CSS generated in ".concat(totalMilliseconds, "ms"));
                  resolve({
                    startTime,
                    endTime,
                    totalMilliseconds,
                    sheets: less2.sheets.length
                  });
                }
                endTime = /* @__PURE__ */ new Date();
              }, reload, modifyVars);
            }
            loadStyles(modifyVars);
          });
        };
        less2.refreshStyles = loadStyles;
        return less2;
      };
      var options = defaultOptions();
      if (window.less) {
        for (var key in window.less) {
          if (Object.prototype.hasOwnProperty.call(window.less, key)) {
            options[key] = window.less[key];
          }
        }
      }
      addDefaultOptions(window, options);
      options.plugins = options.plugins || [];
      if (window.LESS_PLUGINS) {
        options.plugins = options.plugins.concat(window.LESS_PLUGINS);
      }
      var less = root(window, options);
      window.less = less;
      var css;
      var head;
      var style;
      function resolveOrReject(data2) {
        if (data2.filename) {
          console.warn(data2);
        }
        if (!options.async) {
          head.removeChild(style);
        }
      }
      if (options.onReady) {
        if (/!watch/.test(window.location.hash)) {
          less.watch();
        }
        if (!options.async) {
          css = "body { display: none !important }";
          head = document.head || document.getElementsByTagName("head")[0];
          style = document.createElement("style");
          style.type = "text/css";
          if (style.styleSheet) {
            style.styleSheet.cssText = css;
          } else {
            style.appendChild(document.createTextNode(css));
          }
          head.appendChild(style);
        }
        less.registerStylesheetsImmediately();
        less.pageLoadFinished = less.refresh(less.env === "development").then(resolveOrReject, resolveOrReject);
      }
      return less;
    });
  }
});
export default require_less();
/*! Bundled license information:

less/dist/less.js:
  (**
   * Less - Leaner CSS v4.5.1
   * http://lesscss.org
   * 
   * Copyright (c) 2009-2025, Alexis Sellier <self@cloudhead.net>
   * Licensed under the Apache-2.0 License.
   *
   * @license Apache-2.0
   *)
*/
