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
