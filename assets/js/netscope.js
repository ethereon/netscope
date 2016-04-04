(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var AppController, Editor, Renderer,
  slice = [].slice;

Renderer = require('./renderer.coffee');

Editor = require('./editor.coffee');

module.exports = AppController = (function() {
  function AppController() {
    this.inProgress = false;
    this.$spinner = $('#net-spinner');
    this.$netBox = $('#net-container');
    this.$netError = $('#net-error');
    this.svg = '#net-svg';
    this.setupErrorHandler();
  }

  AppController.prototype.startLoading = function() {
    var args, loader;
    loader = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    if (this.inProgress) {
      return;
    }
    this.$netError.hide();
    this.$netBox.hide();
    this.$spinner.show();
    return loader.apply(null, slice.call(args).concat([(function(_this) {
      return function(net) {
        return _this.completeLoading(net);
      };
    })(this)]));
  };

  AppController.prototype.completeLoading = function(net) {
    var renderer;
    this.$spinner.hide();
    $('#net-title').html(net.name.replace(/_/g, ' '));
    this.$netBox.show();
    $(this.svg).empty();
    $('.qtip').remove();
    renderer = new Renderer(net, this.svg);
    return this.inProgress = false;
  };

  AppController.prototype.makeLoader = function(loader) {
    return (function(_this) {
      return function() {
        var args;
        args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
        return _this.startLoading.apply(_this, [loader].concat(slice.call(args)));
      };
    })(this);
  };

  AppController.prototype.showEditor = function(loader) {
    if (_.isUndefined(window.CodeMirror)) {
      return $.getScript('assets/js/lib/codemirror.min.js', (function(_this) {
        return function() {
          return _this.netEditor = new Editor(_this.makeLoader(loader.load));
        };
      })(this));
    }
  };

  AppController.prototype.setupErrorHandler = function() {
    return window.onerror = (function(_this) {
      return function(message, filename, lineno, colno, e) {
        var msg;
        msg = message;
        if (!(_.isUndefined(e) || _.isUndefined(e.line) || _.isUndefined(e.column))) {
          msg = _.template('Line ${line}, Column ${column}: ${message}')(e);
        }
        _this.$spinner.hide();
        $('.msg', _this.$netError).html(msg);
        _this.$netError.show();
        return _this.inProgress = false;
      };
    })(this);
  };

  return AppController;

})();


},{"./editor.coffee":4,"./renderer.coffee":8}],2:[function(require,module,exports){
var CaffeParser, Network, Parser, generateLayers, generateNetwork,
  hasProp = {}.hasOwnProperty;

Parser = require('./parser');

Network = require('../network.coffee');

generateLayers = function(descriptors, phase) {
  var entry, headerKeys, j, layer, layerDesc, layers, len;
  if (phase == null) {
    phase = 'train';
  }
  layers = [];
  for (j = 0, len = descriptors.length; j < len; j++) {
    entry = descriptors[j];
    layerDesc = entry.layer || entry.layers;
    if (layerDesc != null) {
      layer = {};
      headerKeys = ['name', 'type', 'top', 'bottom'];
      _.extend(layer, _.pick(layerDesc, headerKeys));
      layer.attribs = _.omit(layerDesc, headerKeys);
      layers.push(layer);
    } else {
      console.log('Unidentified entry ignored: ', entry);
    }
  }
  layers = _.filter(layers, function(layer) {
    var layerPhase, ref;
    layerPhase = (ref = layer.attribs.include) != null ? ref.phase : void 0;
    return !((layerPhase != null) && layerPhase !== phase);
  });
  return layers;
};

generateNetwork = function(layers, header) {
  var children, curNode, dataNode, dims, getNodes, getSingleNode, i, implicitLayers, inplaceChild, inplaceOps, inplaceTable, input, inputs, j, k, l, layer, len, len1, len2, len3, m, n, net, node, nodeTable;
  nodeTable = {};
  implicitLayers = [];
  net = new Network(header.name);
  getSingleNode = (function(_this) {
    return function(name) {
      var node;
      node = nodeTable[name];
      if (node == null) {
        node = net.createNode(name, 'implicit');
        nodeTable[name] = node;
      }
      return node;
    };
  })(this);
  getNodes = (function(_this) {
    return function(names, exclude) {
      names = [].concat(names);
      if (exclude != null) {
        _.pullAll(names, exclude);
      }
      return _.map(names, getSingleNode);
    };
  })(this);
  for (j = 0, len = layers.length; j < len; j++) {
    layer = layers[j];
    nodeTable[layer.name] = net.createNode(layer.name, layer.type, layer.attribs);
  }
  inplaceTable = {};
  for (l = 0, len1 = layers.length; l < len1; l++) {
    layer = layers[l];
    node = nodeTable[layer.name];
    if (layer.top != null) {
      if (layer.top === layer.bottom) {
        if (inplaceTable[layer.top] == null) {
          inplaceTable[layer.top] = [];
        }
        inplaceTable[layer.top].push(node);
        continue;
      } else {
        node.addChildren(getNodes(layer.top, [layer.name]));
      }
    }
    if (layer.bottom != null) {
      node.addParents(getNodes(layer.bottom, [].concat(layer.top)));
    }
  }
  for (k in inplaceTable) {
    if (!hasProp.call(inplaceTable, k)) continue;
    inplaceOps = inplaceTable[k];
    curNode = nodeTable[k];
    curNode.coalesce = inplaceOps;
    children = curNode.detachChildren();
    for (m = 0, len2 = inplaceOps.length; m < len2; m++) {
      inplaceChild = inplaceOps[m];
      inplaceChild.annotation = 'InPlace';
      curNode.addChild(inplaceChild);
      curNode = inplaceChild;
    }
    curNode.addChildren(children);
  }
  if (((header != null ? header.input : void 0) != null) && ((header != null ? header.input_dim : void 0) != null)) {
    inputs = [].concat(header.input);
    dims = header.input_dim;
    if (inputs.length === (dims.length / 4)) {
      for (i = n = 0, len3 = inputs.length; n < len3; i = ++n) {
        input = inputs[i];
        dataNode = nodeTable[input];
        dataNode.type = 'data';
        dataNode.attribs.shape = dims.slice(i * 4, (i + 1) * 4);
      }
    } else {
      console.log('Inconsistent input dimensions.');
    }
  }
  return net;
};

module.exports = CaffeParser = (function() {
  function CaffeParser() {}

  CaffeParser.parse = function(txt, phase) {
    var header, layerDesc, layers, ref;
    ref = Parser.parse(txt), header = ref[0], layerDesc = ref[1];
    layers = generateLayers(layerDesc, phase);
    return generateNetwork(layers, header);
  };

  return CaffeParser;

})();


},{"../network.coffee":7,"./parser":3}],3:[function(require,module,exports){
module.exports = (function() {
  "use strict";

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function peg$SyntaxError(message, expected, found, location) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.location = location;
    this.name     = "SyntaxError";

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, peg$SyntaxError);
    }
  }

  peg$subclass(peg$SyntaxError, Error);

  function peg$parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},
        parser  = this,

        peg$FAILED = {},

        peg$startRuleFunctions = { Proto_text: peg$parseProto_text },
        peg$startRuleFunction  = peg$parseProto_text,

        peg$c0 = function(doc) { return doc; },
        peg$c1 = { type: "other", description: "whitespace" },
        peg$c2 = /^[ \t\n\r]/,
        peg$c3 = { type: "class", value: "[ \\t\\n\\r]", description: "[ \\t\\n\\r]" },
        peg$c4 = { type: "other", description: "whitespace or comment" },
        peg$c5 = function(first, v) { return v; },
        peg$c6 = { type: "other", description: "comment" },
        peg$c7 = "#",
        peg$c8 = { type: "literal", value: "#", description: "\"#\"" },
        peg$c9 = { type: "any", description: "any character" },
        peg$c10 = function(first, m) { return m; },
        peg$c11 = function(first, rest) {
              var result = {};
              var kvPairs = [first].concat(rest);
              for (var i = 0; i < kvPairs.length; i++)
              {
                var k = kvPairs[i].key;
                var v = kvPairs[i].value;
                if(k in result)
                {
                  result[k] = [].concat(result[k]);
                  result[k].push(v);
              }
                else
                {
                  result[k] = v;
                }
              }
              return result;
          },
        peg$c12 = ":",
        peg$c13 = { type: "literal", value: ":", description: "\":\"" },
        peg$c14 = function(key, value) {
            return {key: key, value: value};
          },
        peg$c15 = "[",
        peg$c16 = { type: "literal", value: "[", description: "\"[\"" },
        peg$c17 = ",",
        peg$c18 = { type: "literal", value: ",", description: "\",\"" },
        peg$c19 = function(v) { return v; },
        peg$c20 = "]",
        peg$c21 = { type: "literal", value: "]", description: "\"]\"" },
        peg$c22 = function(entries) {
              return entries;
            },
        peg$c23 = "{",
        peg$c24 = { type: "literal", value: "{", description: "\"{\"" },
        peg$c25 = function(key, first, m) { return m; },
        peg$c26 = "}",
        peg$c27 = { type: "literal", value: "}", description: "\"}\"" },
        peg$c28 = function(key, first, rest) {
              var elems = [first].concat(rest);
              var merged = {};
              for (var i = 0; i < elems.length; ++i)
              {
                  for(var k in elems[i])
                  {
                      merged[k] = elems[i][k];
                  }
              }
              var result = {};
              result[key] = merged;
              return result;
            },
        peg$c29 = { type: "other", description: "number" },
        peg$c30 = function() { return parseFloat(text()); },
        peg$c31 = /^[eE]/,
        peg$c32 = { type: "class", value: "[eE]", description: "[eE]" },
        peg$c33 = ".",
        peg$c34 = { type: "literal", value: ".", description: "\".\"" },
        peg$c35 = "0",
        peg$c36 = { type: "literal", value: "0", description: "\"0\"" },
        peg$c37 = /^[1-9]/,
        peg$c38 = { type: "class", value: "[1-9]", description: "[1-9]" },
        peg$c39 = "-",
        peg$c40 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c41 = "+",
        peg$c42 = { type: "literal", value: "+", description: "\"+\"" },
        peg$c43 = "'",
        peg$c44 = { type: "literal", value: "'", description: "\"'\"" },
        peg$c45 = function(chars) { return chars.join(""); },
        peg$c46 = "\"",
        peg$c47 = { type: "literal", value: "\"", description: "\"\\\"\"" },
        peg$c48 = { type: "other", description: "key" },
        peg$c49 = /^[a-zA-Z0-9_\-]/,
        peg$c50 = { type: "class", value: "[a-zA-Z0-9_-]", description: "[a-zA-Z0-9_-]" },
        peg$c51 = function(chars) { return chars.join("").toLowerCase(); },
        peg$c52 = { type: "other", description: "double-quoted string character" },
        peg$c53 = /^[ -!#-[\]-\u10FFFF]/,
        peg$c54 = { type: "class", value: "[\\x20-\\x21\\x23-\\x5B\\x5D-\\u10FFFF]", description: "[\\x20-\\x21\\x23-\\x5B\\x5D-\\u10FFFF]" },
        peg$c55 = { type: "other", description: "single-quoted string character" },
        peg$c56 = /^[ -&(-[\]-\u10FFFF]/,
        peg$c57 = { type: "class", value: "[\\x20-\\x26\\x28-\\x5B\\x5D-\\u10FFFF]", description: "[\\x20-\\x26\\x28-\\x5B\\x5D-\\u10FFFF]" },
        peg$c58 = { type: "other", description: "escaped character sequence" },
        peg$c59 = "\\",
        peg$c60 = { type: "literal", value: "\\", description: "\"\\\\\"" },
        peg$c61 = "/",
        peg$c62 = { type: "literal", value: "/", description: "\"/\"" },
        peg$c63 = "b",
        peg$c64 = { type: "literal", value: "b", description: "\"b\"" },
        peg$c65 = function() { return "\b"; },
        peg$c66 = "f",
        peg$c67 = { type: "literal", value: "f", description: "\"f\"" },
        peg$c68 = function() { return "\f"; },
        peg$c69 = "n",
        peg$c70 = { type: "literal", value: "n", description: "\"n\"" },
        peg$c71 = function() { return "\n"; },
        peg$c72 = "r",
        peg$c73 = { type: "literal", value: "r", description: "\"r\"" },
        peg$c74 = function() { return "\r"; },
        peg$c75 = "t",
        peg$c76 = { type: "literal", value: "t", description: "\"t\"" },
        peg$c77 = function() { return "\t"; },
        peg$c78 = "u",
        peg$c79 = { type: "literal", value: "u", description: "\"u\"" },
        peg$c80 = function(digits) {
                return String.fromCharCode(parseInt(digits, 16));
              },
        peg$c81 = function(sequence) {
            return sequence;
          },
        peg$c82 = /^[0-9]/,
        peg$c83 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c84 = /^[0-9a-f]/i,
        peg$c85 = { type: "class", value: "[0-9a-f]i", description: "[0-9a-f]i" },
        peg$c86 = /^[\n\r\u2028\u2029]/,
        peg$c87 = { type: "class", value: "[\\n\\r\\u2028\\u2029]", description: "[\\n\\r\\u2028\\u2029]" },

        peg$currPos          = 0,
        peg$savedPos         = 0,
        peg$posDetailsCache  = [{ line: 1, column: 1, seenCR: false }],
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$savedPos, peg$currPos);
    }

    function location() {
      return peg$computeLocation(peg$savedPos, peg$currPos);
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        input.substring(peg$savedPos, peg$currPos),
        peg$computeLocation(peg$savedPos, peg$currPos)
      );
    }

    function error(message) {
      throw peg$buildException(
        message,
        null,
        input.substring(peg$savedPos, peg$currPos),
        peg$computeLocation(peg$savedPos, peg$currPos)
      );
    }

    function peg$computePosDetails(pos) {
      var details = peg$posDetailsCache[pos],
          p, ch;

      if (details) {
        return details;
      } else {
        p = pos - 1;
        while (!peg$posDetailsCache[p]) {
          p--;
        }

        details = peg$posDetailsCache[p];
        details = {
          line:   details.line,
          column: details.column,
          seenCR: details.seenCR
        };

        while (p < pos) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }

          p++;
        }

        peg$posDetailsCache[pos] = details;
        return details;
      }
    }

    function peg$computeLocation(startPos, endPos) {
      var startPosDetails = peg$computePosDetails(startPos),
          endPosDetails   = peg$computePosDetails(endPos);

      return {
        start: {
          offset: startPos,
          line:   startPosDetails.line,
          column: startPosDetails.column
        },
        end: {
          offset: endPos,
          line:   endPosDetails.line,
          column: endPosDetails.column
        }
      };
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, found, location) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0100-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1000-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new peg$SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        location
      );
    }

    function peg$parseProto_text() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parsewsc();
      if (s1 !== peg$FAILED) {
        s2 = peg$parsedoc();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsewsc();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c0(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsews() {
      var s0, s1;

      peg$silentFails++;
      s0 = [];
      if (peg$c2.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c3); }
      }
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (peg$c2.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c3); }
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c1); }
      }

      return s0;
    }

    function peg$parsewsc() {
      var s0, s1, s2, s3;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$parsews();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsecomment();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsecomment();
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parsews();
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c4); }
      }

      return s0;
    }

    function peg$parsedoc() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parsevalue();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parsewsc();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsevalue();
          if (s5 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c5(s1, s5);
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parsewsc();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsevalue();
            if (s5 !== peg$FAILED) {
              peg$savedPos = s3;
              s4 = peg$c5(s1, s5);
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsevalue() {
      var s0;

      s0 = peg$parseobject();
      if (s0 === peg$FAILED) {
        s0 = peg$parsepairs();
      }

      return s0;
    }

    function peg$parsecomment() {
      var s0, s1, s2, s3, s4, s5, s6;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$parsews();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 35) {
          s2 = peg$c7;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c8); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$currPos;
          s5 = peg$currPos;
          peg$silentFails++;
          s6 = peg$parseLineTerminator();
          peg$silentFails--;
          if (s6 === peg$FAILED) {
            s5 = void 0;
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          if (s5 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s6 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c9); }
            }
            if (s6 !== peg$FAILED) {
              s5 = [s5, s6];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$currPos;
            s5 = peg$currPos;
            peg$silentFails++;
            s6 = peg$parseLineTerminator();
            peg$silentFails--;
            if (s6 === peg$FAILED) {
              s5 = void 0;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 !== peg$FAILED) {
              if (input.length > peg$currPos) {
                s6 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c9); }
              }
              if (s6 !== peg$FAILED) {
                s5 = [s5, s6];
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          }
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c6); }
      }

      return s0;
    }

    function peg$parsepairs() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parsepair();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parsewsc();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsepair();
          if (s5 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c10(s1, s5);
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parsewsc();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsepair();
            if (s5 !== peg$FAILED) {
              peg$savedPos = s3;
              s4 = peg$c10(s1, s5);
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c11(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsepair() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parsekey();
      if (s1 !== peg$FAILED) {
        s2 = peg$parsews();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 58) {
            s3 = peg$c12;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c13); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parsews();
            if (s4 !== peg$FAILED) {
              s5 = peg$parsestring();
              if (s5 === peg$FAILED) {
                s5 = peg$parsenumber();
                if (s5 === peg$FAILED) {
                  s5 = peg$parsekey();
                  if (s5 === peg$FAILED) {
                    s5 = peg$parselist();
                  }
                }
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c14(s1, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parselist() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 91) {
        s1 = peg$c15;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c16); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parsews();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsestring();
          if (s5 === peg$FAILED) {
            s5 = peg$parsenumber();
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parsews();
            if (s6 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 44) {
                s7 = peg$c17;
                peg$currPos++;
              } else {
                s7 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c18); }
              }
              if (s7 === peg$FAILED) {
                s7 = null;
              }
              if (s7 !== peg$FAILED) {
                peg$savedPos = s3;
                s4 = peg$c19(s5);
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parsews();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsestring();
            if (s5 === peg$FAILED) {
              s5 = peg$parsenumber();
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parsews();
              if (s6 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 44) {
                  s7 = peg$c17;
                  peg$currPos++;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c18); }
                }
                if (s7 === peg$FAILED) {
                  s7 = null;
                }
                if (s7 !== peg$FAILED) {
                  peg$savedPos = s3;
                  s4 = peg$c19(s5);
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parsews();
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 93) {
              s4 = peg$c20;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c21); }
            }
            if (s4 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c22(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseobject() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;

      s0 = peg$currPos;
      s1 = peg$parsekey();
      if (s1 !== peg$FAILED) {
        s2 = peg$parsews();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 58) {
            s3 = peg$c12;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c13); }
          }
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parsews();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 123) {
                s5 = peg$c23;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c24); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parsewsc();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parsemember();
                  if (s7 === peg$FAILED) {
                    s7 = null;
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = [];
                    s9 = peg$currPos;
                    s10 = peg$parsewsc();
                    if (s10 !== peg$FAILED) {
                      s11 = peg$parsemember();
                      if (s11 !== peg$FAILED) {
                        peg$savedPos = s9;
                        s10 = peg$c25(s1, s7, s11);
                        s9 = s10;
                      } else {
                        peg$currPos = s9;
                        s9 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s9;
                      s9 = peg$FAILED;
                    }
                    while (s9 !== peg$FAILED) {
                      s8.push(s9);
                      s9 = peg$currPos;
                      s10 = peg$parsewsc();
                      if (s10 !== peg$FAILED) {
                        s11 = peg$parsemember();
                        if (s11 !== peg$FAILED) {
                          peg$savedPos = s9;
                          s10 = peg$c25(s1, s7, s11);
                          s9 = s10;
                        } else {
                          peg$currPos = s9;
                          s9 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s9;
                        s9 = peg$FAILED;
                      }
                    }
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parsewsc();
                      if (s9 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 125) {
                          s10 = peg$c26;
                          peg$currPos++;
                        } else {
                          s10 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c27); }
                        }
                        if (s10 !== peg$FAILED) {
                          s11 = peg$parsewsc();
                          if (s11 !== peg$FAILED) {
                            peg$savedPos = s0;
                            s1 = peg$c28(s1, s7, s8);
                            s0 = s1;
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsemember() {
      var s0;

      s0 = peg$parsecomment();
      if (s0 === peg$FAILED) {
        s0 = peg$parsepairs();
        if (s0 === peg$FAILED) {
          s0 = peg$parseobject();
        }
      }

      return s0;
    }

    function peg$parsenumber() {
      var s0, s1, s2, s3, s4;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$parseminus();
      if (s1 === peg$FAILED) {
        s1 = null;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseint();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsefrac();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseexp();
            if (s4 === peg$FAILED) {
              s4 = null;
            }
            if (s4 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c30();
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c29); }
      }

      return s0;
    }

    function peg$parseexp() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (peg$c31.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c32); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseminus();
        if (s2 === peg$FAILED) {
          s2 = peg$parseplus();
        }
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseDigit();
          if (s4 !== peg$FAILED) {
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parseDigit();
            }
          } else {
            s3 = peg$FAILED;
          }
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsefrac() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 46) {
        s1 = peg$c33;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c34); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseDigit();
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parseDigit();
          }
        } else {
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseint() {
      var s0, s1, s2, s3;

      if (input.charCodeAt(peg$currPos) === 48) {
        s0 = peg$c35;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c36); }
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (peg$c37.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c38); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parseDigit();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parseDigit();
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }

      return s0;
    }

    function peg$parseminus() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 45) {
        s0 = peg$c39;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c40); }
      }

      return s0;
    }

    function peg$parseplus() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 43) {
        s0 = peg$c41;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c42); }
      }

      return s0;
    }

    function peg$parsestring() {
      var s0;

      s0 = peg$parsesstring();
      if (s0 === peg$FAILED) {
        s0 = peg$parsedstring();
      }

      return s0;
    }

    function peg$parsesstring() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 39) {
        s1 = peg$c43;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c44); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseschar();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parseschar();
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 39) {
            s3 = peg$c43;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c44); }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c45(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsedstring() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 34) {
        s1 = peg$c46;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c47); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsedchar();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsedchar();
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 34) {
            s3 = peg$c46;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c47); }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c45(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsekey() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c49.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c50); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c49.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c50); }
          }
        }
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c51(s1);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c48); }
      }

      return s0;
    }

    function peg$parsedchar() {
      var s0, s1;

      peg$silentFails++;
      if (peg$c53.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c54); }
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseechar();
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c52); }
      }

      return s0;
    }

    function peg$parseschar() {
      var s0, s1;

      peg$silentFails++;
      if (peg$c56.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c57); }
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseechar();
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c55); }
      }

      return s0;
    }

    function peg$parseechar() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 92) {
        s1 = peg$c59;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c60); }
      }
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 34) {
          s2 = peg$c46;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c47); }
        }
        if (s2 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 39) {
            s2 = peg$c43;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c44); }
          }
          if (s2 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 92) {
              s2 = peg$c59;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c60); }
            }
            if (s2 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 47) {
                s2 = peg$c61;
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c62); }
              }
              if (s2 === peg$FAILED) {
                s2 = peg$currPos;
                if (input.charCodeAt(peg$currPos) === 98) {
                  s3 = peg$c63;
                  peg$currPos++;
                } else {
                  s3 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c64); }
                }
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s2;
                  s3 = peg$c65();
                }
                s2 = s3;
                if (s2 === peg$FAILED) {
                  s2 = peg$currPos;
                  if (input.charCodeAt(peg$currPos) === 102) {
                    s3 = peg$c66;
                    peg$currPos++;
                  } else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c67); }
                  }
                  if (s3 !== peg$FAILED) {
                    peg$savedPos = s2;
                    s3 = peg$c68();
                  }
                  s2 = s3;
                  if (s2 === peg$FAILED) {
                    s2 = peg$currPos;
                    if (input.charCodeAt(peg$currPos) === 110) {
                      s3 = peg$c69;
                      peg$currPos++;
                    } else {
                      s3 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c70); }
                    }
                    if (s3 !== peg$FAILED) {
                      peg$savedPos = s2;
                      s3 = peg$c71();
                    }
                    s2 = s3;
                    if (s2 === peg$FAILED) {
                      s2 = peg$currPos;
                      if (input.charCodeAt(peg$currPos) === 114) {
                        s3 = peg$c72;
                        peg$currPos++;
                      } else {
                        s3 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c73); }
                      }
                      if (s3 !== peg$FAILED) {
                        peg$savedPos = s2;
                        s3 = peg$c74();
                      }
                      s2 = s3;
                      if (s2 === peg$FAILED) {
                        s2 = peg$currPos;
                        if (input.charCodeAt(peg$currPos) === 116) {
                          s3 = peg$c75;
                          peg$currPos++;
                        } else {
                          s3 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c76); }
                        }
                        if (s3 !== peg$FAILED) {
                          peg$savedPos = s2;
                          s3 = peg$c77();
                        }
                        s2 = s3;
                        if (s2 === peg$FAILED) {
                          s2 = peg$currPos;
                          if (input.charCodeAt(peg$currPos) === 117) {
                            s3 = peg$c78;
                            peg$currPos++;
                          } else {
                            s3 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c79); }
                          }
                          if (s3 !== peg$FAILED) {
                            s4 = peg$currPos;
                            s5 = peg$currPos;
                            s6 = peg$parseHexDigit();
                            if (s6 !== peg$FAILED) {
                              s7 = peg$parseHexDigit();
                              if (s7 !== peg$FAILED) {
                                s8 = peg$parseHexDigit();
                                if (s8 !== peg$FAILED) {
                                  s9 = peg$parseHexDigit();
                                  if (s9 !== peg$FAILED) {
                                    s6 = [s6, s7, s8, s9];
                                    s5 = s6;
                                  } else {
                                    peg$currPos = s5;
                                    s5 = peg$FAILED;
                                  }
                                } else {
                                  peg$currPos = s5;
                                  s5 = peg$FAILED;
                                }
                              } else {
                                peg$currPos = s5;
                                s5 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s5;
                              s5 = peg$FAILED;
                            }
                            if (s5 !== peg$FAILED) {
                              s4 = input.substring(s4, peg$currPos);
                            } else {
                              s4 = s5;
                            }
                            if (s4 !== peg$FAILED) {
                              peg$savedPos = s2;
                              s3 = peg$c80(s4);
                              s2 = s3;
                            } else {
                              peg$currPos = s2;
                              s2 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s2;
                            s2 = peg$FAILED;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c81(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c58); }
      }

      return s0;
    }

    function peg$parseDigit() {
      var s0;

      if (peg$c82.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c83); }
      }

      return s0;
    }

    function peg$parseHexDigit() {
      var s0;

      if (peg$c84.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c85); }
      }

      return s0;
    }

    function peg$parseLineTerminator() {
      var s0;

      if (peg$c86.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c87); }
      }

      return s0;
    }

    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(
        null,
        peg$maxFailExpected,
        peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
        peg$maxFailPos < input.length
          ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
          : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
      );
    }
  }

  return {
    SyntaxError: peg$SyntaxError,
    parse:       peg$parse
  };
})();

},{}],4:[function(require,module,exports){
var Editor;

module.exports = Editor = (function() {
  function Editor(loader) {
    var $editorBox, editorWidthPercentage;
    this.loader = loader;
    editorWidthPercentage = 30;
    $editorBox = $($.parseHTML('<div class="column"></div>'));
    $editorBox.width(editorWidthPercentage + '%');
    $('#net-column').width((100 - editorWidthPercentage) + '%');
    $('#master-container').prepend($editorBox);
    this.editor = CodeMirror($editorBox[0], {
      value: '# Enter your network definition here.\n# Use Shift+Enter to update the visualization.',
      lineNumbers: true,
      lineWrapping: true
    });
    this.editor.on('keydown', (function(_this) {
      return function(cm, e) {
        return _this.onKeyDown(e);
      };
    })(this));
  }

  Editor.prototype.onKeyDown = function(e) {
    if (e.shiftKey && e.keyCode === 13) {
      e.preventDefault();
      return this.loader(this.editor.getValue());
    }
  };

  return Editor;

})();


},{}],5:[function(require,module,exports){
var Loader,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

module.exports = Loader = (function() {
  function Loader(parser) {
    this.parser = parser;
    this.load = bind(this.load, this);
    this.fromPreset = bind(this.fromPreset, this);
    this.fromURL = bind(this.fromURL, this);
    this.fromGist = bind(this.fromGist, this);
  }

  Loader.prototype.fromGist = function(gistID, callback) {
    var url;
    url = 'https://api.github.com/gists/' + gistID;
    return $.getJSON(url, (function(_this) {
      return function(data) {
        var fileInfo, fileKey, fileSet, filename, isProto, isSolitaryFile, isSolver;
        fileSet = data['files'];
        isSolitaryFile = Object.keys(fileSet).length === 1;
        for (fileKey in fileSet) {
          fileInfo = fileSet[fileKey];
          filename = fileInfo['filename'].toLowerCase();
          isProto = _.endsWith(filename, '.prototxt');
          isSolver = _.startsWith(filename, 'solver');
          if ((isProto && !isSolver) || isSolitaryFile) {
            _this.load(fileInfo['content'], callback);
            return;
          }
        }
        return console.log('No prototxt found in the given GIST.');
      };
    })(this));
  };

  Loader.prototype.fromURL = function(url, callback) {
    return $.ajax({
      url: url,
      success: (function(_this) {
        return function() {
          return _this.load(data, callback);
        };
      })(this)
    });
  };

  Loader.prototype.fromPreset = function(name, callback) {
    return $.get('./presets/' + name + '.prototxt', (function(_this) {
      return function(data) {
        return _this.load(data, callback);
      };
    })(this));
  };

  Loader.prototype.load = function(data, callback) {
    var net;
    net = this.parser.parse(data);
    if (!_.isUndefined(callback)) {
      callback(net);
    }
    return net;
  };

  return Loader;

})();


},{}],6:[function(require,module,exports){
var AppController, CaffeNetwork, Loader, showDocumentation,
  slice = [].slice;

AppController = require('./app.coffee');

CaffeNetwork = require('./caffe/caffe.coffee');

Loader = require('./loader.coffee');

showDocumentation = function() {
  return window.location.href = 'quickstart.html';
};

$(document).ready(function() {
  var app, loader, makeLoader, router, routes;
  app = new AppController();
  loader = new Loader(CaffeNetwork);
  makeLoader = function(loadingFunc) {
    return function() {
      var args;
      args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return app.startLoading.apply(app, [loadingFunc].concat(slice.call(args)));
    };
  };
  routes = {
    '/gist/:gistID': makeLoader(loader.fromGist),
    '/url/(.+)': makeLoader(loader.fromURL),
    '/preset/:name': makeLoader(loader.fromPreset),
    '/editor(/?)': (function(_this) {
      return function() {
        return app.showEditor(loader);
      };
    })(this),
    '/doc': (function(_this) {
      return function() {
        return showDocumentation();
      };
    })(this)
  };
  router = Router(routes);
  return router.init('/doc');
});


},{"./app.coffee":1,"./caffe/caffe.coffee":2,"./loader.coffee":5}],7:[function(require,module,exports){
var Network, Node,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Node = (function() {
  function Node(name, type1, attribs1) {
    this.name = name;
    this.type = type1;
    this.attribs = attribs1 != null ? attribs1 : {};
    this.detachChildren = bind(this.detachChildren, this);
    this.detachChild = bind(this.detachChild, this);
    this.addParents = bind(this.addParents, this);
    this.addParent = bind(this.addParent, this);
    this.addChildren = bind(this.addChildren, this);
    this.addChild = bind(this.addChild, this);
    this.parents = [];
    this.children = [];
    this.coalesce = [];
  }

  Node.prototype.addChild = function(child) {
    if (indexOf.call(this.children, child) < 0) {
      this.children.push(child);
      if (indexOf.call(child.parents, this) < 0) {
        return child.parents.push(this);
      }
    }
  };

  Node.prototype.addChildren = function(children) {
    return _.forEach(children, (function(_this) {
      return function(c) {
        return _this.addChild(c);
      };
    })(this));
  };

  Node.prototype.addParent = function(parent) {
    return parent.addChild(this);
  };

  Node.prototype.addParents = function(parents) {
    return _.forEach(parents, (function(_this) {
      return function(p) {
        return _this.addParent(p);
      };
    })(this));
  };

  Node.prototype.detachChild = function(child) {
    _.pull(this.children, child);
    return _.pull(child.parents, this);
  };

  Node.prototype.detachChildren = function() {
    var children;
    children = _.clone(this.children);
    _.forEach(children, (function(_this) {
      return function(c) {
        return _this.detachChild(c);
      };
    })(this));
    return children;
  };

  return Node;

})();

module.exports = Network = (function() {
  function Network(name) {
    this.name = name != null ? name : 'Untitled Network';
    this.sortTopologically = bind(this.sortTopologically, this);
    this.nodes = [];
  }

  Network.prototype.createNode = function(label, type, attribs) {
    var node;
    node = new Node(label, type, attribs);
    this.nodes.push(node);
    return node;
  };

  Network.prototype.sortTopologically = function() {
    var i, j, len, len1, node, sortedNodes, unsortedNodes, visit;
    sortedNodes = [];
    unsortedNodes = _.clone(this.nodes);
    for (i = 0, len = unsortedNodes.length; i < len; i++) {
      node = unsortedNodes[i];
      node.sort_ = {
        temp: false,
        perm: false
      };
    }
    visit = function(node) {
      var child, j, len1, ref;
      if (node.sort_.temp === true) {
        throw 'Graph is not a DAG. Complicit node: ' + node.name;
      }
      if (node.sort_.perm) {
        return;
      }
      node.sort_.temp = true;
      ref = node.children;
      for (j = 0, len1 = ref.length; j < len1; j++) {
        child = ref[j];
        visit(child);
      }
      node.sort_.perm = true;
      node.sort_.temp = false;
      return sortedNodes.unshift(node);
    };
    while (unsortedNodes.length !== 0) {
      visit(unsortedNodes.pop());
    }
    for (j = 0, len1 = sortedNodes.length; j < len1; j++) {
      node = sortedNodes[j];
      delete node.sort_;
    }
    return sortedNodes;
  };

  return Network;

})();


},{}],8:[function(require,module,exports){
var Renderer,
  hasProp = {}.hasOwnProperty;

module.exports = Renderer = (function() {
  function Renderer(net, parent1) {
    this.net = net;
    this.parent = parent1;
    this.iconify = false;
    this.layoutDirection = 'tb';
    this.generateGraph();
  }

  Renderer.prototype.setupGraph = function() {
    this.graph = new dagreD3.graphlib.Graph();
    this.graph.setDefaultEdgeLabel((function() {
      return {};
    }));
    return this.graph.setGraph({
      rankdir: this.layoutDirection,
      ranksep: 30,
      nodesep: 10,
      edgesep: 20,
      marginx: 0,
      marginy: 0
    });
  };

  Renderer.prototype.generateGraph = function() {
    var child, i, j, k, l, lastCoalesed, layers, len, len1, len2, len3, len4, m, node, nodes, parent, ref, ref1, ref2, ref3, sink, source, uberParents;
    this.setupGraph();
    nodes = this.net.sortTopologically();
    for (i = 0, len = nodes.length; i < len; i++) {
      node = nodes[i];
      if (node.isInGraph) {
        continue;
      }
      layers = [node].concat(node.coalesce);
      if (layers.length > 1) {
        lastCoalesed = layers[layers.length - 1];
        ref = lastCoalesed.children;
        for (j = 0, len1 = ref.length; j < len1; j++) {
          child = ref[j];
          uberParents = _.clone(child.parents);
          uberParents[uberParents.indexOf(lastCoalesed)] = node;
          child.parents = uberParents;
        }
      }
      this.insertNode(layers);
      ref1 = node.parents;
      for (k = 0, len2 = ref1.length; k < len2; k++) {
        parent = ref1[k];
        this.insertLink(parent, node);
      }
    }
    ref2 = this.graph.sources();
    for (l = 0, len3 = ref2.length; l < len3; l++) {
      source = ref2[l];
      (this.graph.node(source))["class"] = 'node-type-source';
    }
    ref3 = this.graph.sinks();
    for (m = 0, len4 = ref3.length; m < len4; m++) {
      sink = ref3[m];
      (this.graph.node(sink))["class"] = 'node-type-sink';
    }
    return this.render();
  };

  Renderer.prototype.insertNode = function(layers) {
    var baseNode, i, layer, len, nodeClass, nodeDesc, nodeLabel;
    baseNode = layers[0];
    nodeClass = 'node-type-' + baseNode.type.replace(/_/g, '-').toLowerCase();
    nodeLabel = '';
    for (i = 0, len = layers.length; i < len; i++) {
      layer = layers[i];
      layer.isInGraph = true;
      nodeLabel += this.generateLabel(layer);
    }
    nodeDesc = {
      labelType: 'html',
      label: nodeLabel,
      "class": nodeClass,
      layers: layers,
      rx: 5,
      ry: 5
    };
    if (this.iconify) {
      _.extend(nodeDesc, {
        shape: 'circle'
      });
    }
    return this.graph.setNode(baseNode.name, nodeDesc);
  };

  Renderer.prototype.generateLabel = function(layer) {
    if (!this.iconify) {
      return '<div class="node-label">' + layer.name + '</div>';
    } else {
      return '';
    }
  };

  Renderer.prototype.insertLink = function(src, dst) {
    return this.graph.setEdge(src.name, dst.name, {
      arrowhead: 'vee'
    });
  };

  Renderer.prototype.renderKey = function(key) {
    return key.replace(/_/g, ' ');
  };

  Renderer.prototype.renderValue = function(value) {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return value;
  };

  Renderer.prototype.renderSection = function(section) {
    var isSection, key, s, val;
    s = '';
    for (key in section) {
      if (!hasProp.call(section, key)) continue;
      val = section[key];
      isSection = (typeof val === 'object') && !Array.isArray(val);
      if (isSection) {
        s += '<div class="node-param-section-title node-param-key">' + this.renderKey(key) + '</div>';
        s += '<div class="node-param-section">';
        s += this.renderSection(val);
      } else {
        s += '<div class="node-param-row">';
        s += '<span class="node-param-key">' + this.renderKey(key) + ': </span>';
        s += '<span class="node-param-value">' + this.renderValue(val) + '</span>';
      }
      s += '</div>';
    }
    return s;
  };

  Renderer.prototype.tipForNode = function(nodeKey) {
    var i, layer, len, node, ref, s;
    node = this.graph.node(nodeKey);
    s = '';
    ref = node.layers;
    for (i = 0, len = ref.length; i < len; i++) {
      layer = ref[i];
      s += '<div class="node-info-group">';
      s += '<div class="node-info-header">';
      s += '<span class="node-info-title">' + layer.name + '</span>';
      s += ' &middot; ';
      s += '<span class="node-info-type">' + this.renderKey(layer.type) + '</span>';
      if (layer.annotation != null) {
        s += ' &middot; <span class="node-info-annotation">' + layer.annotation + '</span>';
      }
      s += '</div>';
      s += this.renderSection(layer.attribs);
    }
    return s;
  };

  Renderer.prototype.render = function() {
    var bbox, graphRender, margin, svg, svgGroup, that, tipPositions;
    svg = d3.select(this.parent);
    svgGroup = svg.append('g');
    graphRender = new dagreD3.render();
    graphRender(svgGroup, this.graph);
    bbox = svgGroup.node().getBoundingClientRect();
    margin = 2;
    svg.attr('width', Math.ceil(bbox.width) + margin);
    svg.attr('height', Math.ceil(bbox.height) + margin);
    tipPositions = {
      tb: {
        my: 'left center',
        at: 'right center'
      },
      lr: {
        my: 'top center',
        at: 'bottom center'
      }
    };
    that = this;
    return svgGroup.selectAll("g.node").each(function(nodeKey) {
      var position;
      position = tipPositions[that.layoutDirection];
      position.viewport = $(window);
      return $(this).qtip({
        content: {
          text: that.tipForNode(nodeKey)
        },
        position: position,
        show: {
          delay: 0,
          effect: false
        },
        hide: {
          effect: false
        }
      });
    });
  };

  return Renderer;

})();


},{}]},{},[6]);
