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
  var children, curNode, dataNode, dims, getNodes, getSingleNode, i, implicitLayers, inplaceChild, inplaceTable, input, inputs, j, k, l, layer, len, len1, len2, len3, m, n, net, node, nodeTable, v;
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
    v = inplaceTable[k];
    curNode = nodeTable[k];
    children = curNode.detachChildren();
    for (m = 0, len2 = v.length; m < len2; m++) {
      inplaceChild = v[m];
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

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleFunctions = { Proto_text: peg$parseProto_text },
        peg$startRuleFunction  = peg$parseProto_text,

        peg$c0 = peg$FAILED,
        peg$c1 = function(doc) { return doc; },
        peg$c2 = { type: "other", description: "whitespace" },
        peg$c3 = [],
        peg$c4 = /^[ \t\n\r]/,
        peg$c5 = { type: "class", value: "[ \\t\\n\\r]", description: "[ \\t\\n\\r]" },
        peg$c6 = { type: "other", description: "whitespace or comment" },
        peg$c7 = function(v) { return v; },
        peg$c8 = { type: "other", description: "comment" },
        peg$c9 = "#",
        peg$c10 = { type: "literal", value: "#", description: "\"#\"" },
        peg$c11 = void 0,
        peg$c12 = { type: "any", description: "any character" },
        peg$c13 = function(m) { return m; },
        peg$c14 = function(first, rest) {
                var result = {};
                var kvPairs = [first].concat(rest);
                for (i = 0; i < kvPairs.length; i++)
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
        peg$c15 = ":",
        peg$c16 = { type: "literal", value: ":", description: "\":\"" },
        peg$c17 = function(key, value) {
            return {key: key, value: value};
        },
        peg$c18 = null,
        peg$c19 = "{",
        peg$c20 = { type: "literal", value: "{", description: "\"{\"" },
        peg$c21 = "}",
        peg$c22 = { type: "literal", value: "}", description: "\"}\"" },
        peg$c23 = function(key, first, rest) {
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
        peg$c24 = { type: "other", description: "number" },
        peg$c25 = function() { return parseFloat(text()); },
        peg$c26 = ".",
        peg$c27 = { type: "literal", value: ".", description: "\".\"" },
        peg$c28 = /^[1-9]/,
        peg$c29 = { type: "class", value: "[1-9]", description: "[1-9]" },
        peg$c30 = /^[eE]/,
        peg$c31 = { type: "class", value: "[eE]", description: "[eE]" },
        peg$c32 = "-",
        peg$c33 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c34 = "+",
        peg$c35 = { type: "literal", value: "+", description: "\"+\"" },
        peg$c36 = "0",
        peg$c37 = { type: "literal", value: "0", description: "\"0\"" },
        peg$c38 = "'",
        peg$c39 = { type: "literal", value: "'", description: "\"'\"" },
        peg$c40 = function(chars) { return chars.join(""); },
        peg$c41 = "\"",
        peg$c42 = { type: "literal", value: "\"", description: "\"\\\"\"" },
        peg$c43 = { type: "other", description: "key" },
        peg$c44 = /^[a-zA-Z0-9_\-]/,
        peg$c45 = { type: "class", value: "[a-zA-Z0-9_\\-]", description: "[a-zA-Z0-9_\\-]" },
        peg$c46 = function(chars) { return chars.join("").toLowerCase(); },
        peg$c47 = { type: "other", description: "double-quoted string character" },
        peg$c48 = /^[ -!#-[\]-\u10FFFF]/,
        peg$c49 = { type: "class", value: "[ -!#-[\\]-\\u10FFFF]", description: "[ -!#-[\\]-\\u10FFFF]" },
        peg$c50 = { type: "other", description: "single-quoted string character" },
        peg$c51 = /^[ -&(-[\]-\u10FFFF]/,
        peg$c52 = { type: "class", value: "[ -&(-[\\]-\\u10FFFF]", description: "[ -&(-[\\]-\\u10FFFF]" },
        peg$c53 = "\\",
        peg$c54 = { type: "literal", value: "\\", description: "\"\\\\\"" },
        peg$c55 = "/",
        peg$c56 = { type: "literal", value: "/", description: "\"/\"" },
        peg$c57 = "b",
        peg$c58 = { type: "literal", value: "b", description: "\"b\"" },
        peg$c59 = function() { return "\b"; },
        peg$c60 = "f",
        peg$c61 = { type: "literal", value: "f", description: "\"f\"" },
        peg$c62 = function() { return "\f"; },
        peg$c63 = "n",
        peg$c64 = { type: "literal", value: "n", description: "\"n\"" },
        peg$c65 = function() { return "\n"; },
        peg$c66 = "r",
        peg$c67 = { type: "literal", value: "r", description: "\"r\"" },
        peg$c68 = function() { return "\r"; },
        peg$c69 = "t",
        peg$c70 = { type: "literal", value: "t", description: "\"t\"" },
        peg$c71 = function() { return "\t"; },
        peg$c72 = "u",
        peg$c73 = { type: "literal", value: "u", description: "\"u\"" },
        peg$c74 = function(digits) {
                    return String.fromCharCode(parseInt(digits, 16));
                },
        peg$c75 = function(sequence) {
                  return sequence;
              },
        peg$c76 = /^[0-9]/,
        peg$c77 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c78 = /^[0-9a-f]/i,
        peg$c79 = { type: "class", value: "[0-9a-f]i", description: "[0-9a-f]i" },
        peg$c80 = /^[\n\r\u2028\u2029]/,
        peg$c81 = { type: "class", value: "[\\n\\r\\u2028\\u2029]", description: "[\\n\\r\\u2028\\u2029]" },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
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
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
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
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
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
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
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

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
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
            peg$reportedPos = s0;
            s1 = peg$c1(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsews() {
      var s0, s1;

      peg$silentFails++;
      s0 = [];
      if (peg$c4.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c5); }
      }
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (peg$c4.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c5); }
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c2); }
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
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c6); }
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
            peg$reportedPos = s3;
            s4 = peg$c7(s5);
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$c0;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parsewsc();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsevalue();
            if (s5 !== peg$FAILED) {
              peg$reportedPos = s3;
              s4 = peg$c7(s5);
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
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
          s2 = peg$c9;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c10); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$currPos;
          s5 = peg$currPos;
          peg$silentFails++;
          s6 = peg$parseLineTerminator();
          peg$silentFails--;
          if (s6 === peg$FAILED) {
            s5 = peg$c11;
          } else {
            peg$currPos = s5;
            s5 = peg$c0;
          }
          if (s5 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s6 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c12); }
            }
            if (s6 !== peg$FAILED) {
              s5 = [s5, s6];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$c0;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$c0;
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$currPos;
            s5 = peg$currPos;
            peg$silentFails++;
            s6 = peg$parseLineTerminator();
            peg$silentFails--;
            if (s6 === peg$FAILED) {
              s5 = peg$c11;
            } else {
              peg$currPos = s5;
              s5 = peg$c0;
            }
            if (s5 !== peg$FAILED) {
              if (input.length > peg$currPos) {
                s6 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c12); }
              }
              if (s6 !== peg$FAILED) {
                s5 = [s5, s6];
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$c0;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$c0;
            }
          }
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c8); }
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
            peg$reportedPos = s3;
            s4 = peg$c13(s5);
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$c0;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parsewsc();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsepair();
            if (s5 !== peg$FAILED) {
              peg$reportedPos = s3;
              s4 = peg$c13(s5);
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c14(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
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
            s3 = peg$c15;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c16); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parsews();
            if (s4 !== peg$FAILED) {
              s5 = peg$parsestring();
              if (s5 === peg$FAILED) {
                s5 = peg$parsenumber();
                if (s5 === peg$FAILED) {
                  s5 = peg$parsekey();
                }
              }
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c17(s1, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
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
            s3 = peg$c15;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c16); }
          }
          if (s3 === peg$FAILED) {
            s3 = peg$c18;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parsews();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 123) {
                s5 = peg$c19;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c20); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parsewsc();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parsemember();
                  if (s7 === peg$FAILED) {
                    s7 = peg$c18;
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = [];
                    s9 = peg$currPos;
                    s10 = peg$parsewsc();
                    if (s10 !== peg$FAILED) {
                      s11 = peg$parsemember();
                      if (s11 !== peg$FAILED) {
                        peg$reportedPos = s9;
                        s10 = peg$c13(s11);
                        s9 = s10;
                      } else {
                        peg$currPos = s9;
                        s9 = peg$c0;
                      }
                    } else {
                      peg$currPos = s9;
                      s9 = peg$c0;
                    }
                    while (s9 !== peg$FAILED) {
                      s8.push(s9);
                      s9 = peg$currPos;
                      s10 = peg$parsewsc();
                      if (s10 !== peg$FAILED) {
                        s11 = peg$parsemember();
                        if (s11 !== peg$FAILED) {
                          peg$reportedPos = s9;
                          s10 = peg$c13(s11);
                          s9 = s10;
                        } else {
                          peg$currPos = s9;
                          s9 = peg$c0;
                        }
                      } else {
                        peg$currPos = s9;
                        s9 = peg$c0;
                      }
                    }
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parsewsc();
                      if (s9 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 125) {
                          s10 = peg$c21;
                          peg$currPos++;
                        } else {
                          s10 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c22); }
                        }
                        if (s10 !== peg$FAILED) {
                          s11 = peg$parsewsc();
                          if (s11 !== peg$FAILED) {
                            peg$reportedPos = s0;
                            s1 = peg$c23(s1, s7, s8);
                            s0 = s1;
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c0;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c0;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
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
        s1 = peg$c18;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseint();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsefrac();
          if (s3 === peg$FAILED) {
            s3 = peg$c18;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseexp();
            if (s4 === peg$FAILED) {
              s4 = peg$c18;
            }
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c25();
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c24); }
      }

      return s0;
    }

    function peg$parsedecimal_point() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 46) {
        s0 = peg$c26;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c27); }
      }

      return s0;
    }

    function peg$parsedigit1_9() {
      var s0;

      if (peg$c28.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c29); }
      }

      return s0;
    }

    function peg$parsee() {
      var s0;

      if (peg$c30.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c31); }
      }

      return s0;
    }

    function peg$parseexp() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parsee();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseminus();
        if (s2 === peg$FAILED) {
          s2 = peg$parseplus();
        }
        if (s2 === peg$FAILED) {
          s2 = peg$c18;
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseDIGIT();
          if (s4 !== peg$FAILED) {
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parseDIGIT();
            }
          } else {
            s3 = peg$c0;
          }
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsefrac() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parsedecimal_point();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseDIGIT();
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parseDIGIT();
          }
        } else {
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseint() {
      var s0, s1, s2, s3;

      s0 = peg$parsezero();
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsedigit1_9();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parseDIGIT();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parseDIGIT();
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parseminus() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 45) {
        s0 = peg$c32;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c33); }
      }

      return s0;
    }

    function peg$parseplus() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 43) {
        s0 = peg$c34;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c35); }
      }

      return s0;
    }

    function peg$parsezero() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 48) {
        s0 = peg$c36;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c37); }
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
        s1 = peg$c38;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c39); }
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
            s3 = peg$c38;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c39); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c40(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsedstring() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 34) {
        s1 = peg$c41;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c42); }
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
            s3 = peg$c41;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c42); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c40(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsekey() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c44.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c45); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c44.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c45); }
          }
        }
      } else {
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c46(s1);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c43); }
      }

      return s0;
    }

    function peg$parsedchar() {
      var s0, s1;

      peg$silentFails++;
      if (peg$c48.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c49); }
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseechar();
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c47); }
      }

      return s0;
    }

    function peg$parseschar() {
      var s0, s1;

      peg$silentFails++;
      if (peg$c51.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c52); }
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseechar();
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c50); }
      }

      return s0;
    }

    function peg$parseechar() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

      s0 = peg$currPos;
      s1 = peg$parseescape();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 34) {
          s2 = peg$c41;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c42); }
        }
        if (s2 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 39) {
            s2 = peg$c38;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c39); }
          }
          if (s2 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 92) {
              s2 = peg$c53;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c54); }
            }
            if (s2 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 47) {
                s2 = peg$c55;
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c56); }
              }
              if (s2 === peg$FAILED) {
                s2 = peg$currPos;
                if (input.charCodeAt(peg$currPos) === 98) {
                  s3 = peg$c57;
                  peg$currPos++;
                } else {
                  s3 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c58); }
                }
                if (s3 !== peg$FAILED) {
                  peg$reportedPos = s2;
                  s3 = peg$c59();
                }
                s2 = s3;
                if (s2 === peg$FAILED) {
                  s2 = peg$currPos;
                  if (input.charCodeAt(peg$currPos) === 102) {
                    s3 = peg$c60;
                    peg$currPos++;
                  } else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c61); }
                  }
                  if (s3 !== peg$FAILED) {
                    peg$reportedPos = s2;
                    s3 = peg$c62();
                  }
                  s2 = s3;
                  if (s2 === peg$FAILED) {
                    s2 = peg$currPos;
                    if (input.charCodeAt(peg$currPos) === 110) {
                      s3 = peg$c63;
                      peg$currPos++;
                    } else {
                      s3 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c64); }
                    }
                    if (s3 !== peg$FAILED) {
                      peg$reportedPos = s2;
                      s3 = peg$c65();
                    }
                    s2 = s3;
                    if (s2 === peg$FAILED) {
                      s2 = peg$currPos;
                      if (input.charCodeAt(peg$currPos) === 114) {
                        s3 = peg$c66;
                        peg$currPos++;
                      } else {
                        s3 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c67); }
                      }
                      if (s3 !== peg$FAILED) {
                        peg$reportedPos = s2;
                        s3 = peg$c68();
                      }
                      s2 = s3;
                      if (s2 === peg$FAILED) {
                        s2 = peg$currPos;
                        if (input.charCodeAt(peg$currPos) === 116) {
                          s3 = peg$c69;
                          peg$currPos++;
                        } else {
                          s3 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c70); }
                        }
                        if (s3 !== peg$FAILED) {
                          peg$reportedPos = s2;
                          s3 = peg$c71();
                        }
                        s2 = s3;
                        if (s2 === peg$FAILED) {
                          s2 = peg$currPos;
                          if (input.charCodeAt(peg$currPos) === 117) {
                            s3 = peg$c72;
                            peg$currPos++;
                          } else {
                            s3 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c73); }
                          }
                          if (s3 !== peg$FAILED) {
                            s4 = peg$currPos;
                            s5 = peg$currPos;
                            s6 = peg$parseHEXDIG();
                            if (s6 !== peg$FAILED) {
                              s7 = peg$parseHEXDIG();
                              if (s7 !== peg$FAILED) {
                                s8 = peg$parseHEXDIG();
                                if (s8 !== peg$FAILED) {
                                  s9 = peg$parseHEXDIG();
                                  if (s9 !== peg$FAILED) {
                                    s6 = [s6, s7, s8, s9];
                                    s5 = s6;
                                  } else {
                                    peg$currPos = s5;
                                    s5 = peg$c0;
                                  }
                                } else {
                                  peg$currPos = s5;
                                  s5 = peg$c0;
                                }
                              } else {
                                peg$currPos = s5;
                                s5 = peg$c0;
                              }
                            } else {
                              peg$currPos = s5;
                              s5 = peg$c0;
                            }
                            if (s5 !== peg$FAILED) {
                              s5 = input.substring(s4, peg$currPos);
                            }
                            s4 = s5;
                            if (s4 !== peg$FAILED) {
                              peg$reportedPos = s2;
                              s3 = peg$c74(s4);
                              s2 = s3;
                            } else {
                              peg$currPos = s2;
                              s2 = peg$c0;
                            }
                          } else {
                            peg$currPos = s2;
                            s2 = peg$c0;
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
          peg$reportedPos = s0;
          s1 = peg$c75(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseescape() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 92) {
        s0 = peg$c53;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c54); }
      }

      return s0;
    }

    function peg$parseDIGIT() {
      var s0;

      if (peg$c76.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c77); }
      }

      return s0;
    }

    function peg$parseHEXDIG() {
      var s0;

      if (peg$c78.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c79); }
      }

      return s0;
    }

    function peg$parseLineTerminator() {
      var s0;

      if (peg$c80.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c81); }
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

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
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
    this.nodes = [];
  }

  Network.prototype.createNode = function(label, type, attribs) {
    var node;
    node = new Node(label, type, attribs);
    this.nodes.push(node);
    return node;
  };

  return Network;

})();


},{}],8:[function(require,module,exports){
var INPLACE_FUSE, INPLACE_HIDE, INPLACE_NONE, Renderer,
  hasProp = {}.hasOwnProperty;

INPLACE_FUSE = 1;

INPLACE_HIDE = 2;

INPLACE_NONE = 3;

module.exports = Renderer = (function() {
  function Renderer(net, parent1) {
    this.net = net;
    this.parent = parent1;
    this.iconify = false;
    this.inplaceMode = INPLACE_FUSE;
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
      ranksep: 50,
      nodesep: 10,
      edgesep: 30,
      marginx: 0,
      marginy: 0
    });
  };

  Renderer.prototype.generateGraph = function() {
    var i, j, k, l, len, len1, len2, len3, node, parent, ref, ref1, ref2, ref3, sink, source;
    this.setupGraph();
    ref = this.net.nodes;
    for (i = 0, len = ref.length; i < len; i++) {
      node = ref[i];
      this.insertNode(node);
      ref1 = node.parents;
      for (j = 0, len1 = ref1.length; j < len1; j++) {
        parent = ref1[j];
        this.insertLink(parent, node);
      }
    }
    ref2 = this.graph.sources();
    for (k = 0, len2 = ref2.length; k < len2; k++) {
      source = ref2[k];
      (this.graph.node(source))["class"] = 'node-type-source';
    }
    ref3 = this.graph.sinks();
    for (l = 0, len3 = ref3.length; l < len3; l++) {
      sink = ref3[l];
      (this.graph.node(sink))["class"] = 'node-type-sink';
    }
    return this.render();
  };

  Renderer.prototype.insertNode = function(node) {
    var nodeClass, nodeDesc;
    nodeClass = 'node-type-' + node.type.replace(/_/g, '-').toLowerCase();
    nodeDesc = {
      labelType: 'html',
      label: this.generateLabel(node),
      "class": nodeClass,
      name: node.name,
      type: node.type,
      attribs: node.attribs,
      rx: 5,
      ry: 5
    };
    if (this.iconify) {
      _.extend(nodeDesc, {
        shape: 'circle'
      });
    }
    return this.graph.setNode(node.name, nodeDesc);
  };

  Renderer.prototype.generateLabel = function(node) {
    if (!this.iconify) {
      return '<div class="node-label">' + node.name + '</div>';
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
    var node, s;
    node = this.graph.node(nodeKey);
    s = '';
    s += '<div class="node-header">';
    s += '<span class="node-title">' + node.name + '</span>';
    s += ' &middot; ';
    s += '<span class="node-type">' + this.renderKey(node.type) + '</span>';
    s += '</div>';
    s += this.renderSection(node.attribs);
    return s;
  };

  Renderer.prototype.render = function() {
    var bbox, graphRender, svg, svgGroup, that, tipPositions;
    svg = d3.select(this.parent);
    svgGroup = svg.append('g');
    graphRender = new dagreD3.render();
    graphRender(svgGroup, this.graph);
    bbox = svgGroup.node().getBoundingClientRect();
    svg.attr('width', bbox.width);
    svg.attr('height', bbox.height);
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
