Proto_text
    = wsc doc:doc wsc { return doc; }

ws "whitespace" = [ \t\n\r]*
wsc "whitespace or comment"
  = ws (comment)* ws

doc
    = first:value
      rest:(wsc v:value { return v; })*

value
    = object
    / pairs

comment "comment"
  = ws "#" (!LineTerminator .)*

pairs
  = first:pair
    rest:(wsc m:pair { return m; })*
    {
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
    }

pair = key:key ws ":" ws value:(string / number / key)
{
    return {key: key, value: value};
}

object
  = key:key ws ":"? ws "{" wsc
    first:(member)?
    rest:(wsc m:member { return m; })*
    wsc "}" wsc
    {
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
    }

member
    = (comment / pairs / object )

number "number"
    = minus? int frac? exp? { return parseFloat(text()); }

decimal_point = "."
digit1_9      = [1-9]
e             = [eE]
exp           = e (minus / plus)? DIGIT+
frac          = decimal_point DIGIT+
int           = zero / (digit1_9 DIGIT*)
minus         = "-"
plus          = "+"
zero          = "0"

string
  = sstring
  / dstring

sstring
    = "'" chars:schar* "'" { return chars.join(""); }

dstring
    = '"' chars:dchar* '"' { return chars.join(""); }

key "key"
    = chars:[a-zA-Z0-9_-]+ { return chars.join("").toLowerCase(); }

dchar "double-quoted string character"
    = [\x20-\x21\x23-\x5B\x5D-\u10FFFF]
    / echar

schar "single-quoted string character"
    = [\x20-\x26\x28-\x5B\x5D-\u10FFFF]
    / echar

echar = escape
      sequence:(
          '"'
        / "'"
        / "\\"
        / "/"
        / "b" { return "\b"; }
        / "f" { return "\f"; }
        / "n" { return "\n"; }
        / "r" { return "\r"; }
        / "t" { return "\t"; }
        / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG)
        {
            return String.fromCharCode(parseInt(digits, 16));
        }
      )
      {
          return sequence;
      }

escape         = "\\"
DIGIT          = [0-9]
HEXDIG         = [0-9a-f]i
LineTerminator
  = [\n\r\u2028\u2029]