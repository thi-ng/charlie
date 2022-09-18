1 var> *glsl-comments*

: make-var-table { prefix n }
  n [ n swap - prefix swap + ] <dotimes> n dup heap-allot ds->heap ;

"s" 64 make-var-table val> *ds* -1 dup var> *dsp* var> *max-dsp*
"r" 64 make-var-table val> *rs* -1 dup var> *rsp* var> *max-rsp*

: stack! ^( sp n ) over @ + swap ! ;
: ds@ ^( n ) *dsp* @ + *ds* + @ ;
: rs@ ^( n ) *rsp* @ + *rs* + @ ;
: ds! ^( n ) *dsp* swap stack! ;
: rs! ^( n ) *rsp* swap stack! ;

: reset-stack
  -1 dup *dsp* ! *max-dsp* !
  -1 dup *rsp* ! *max-rsp* ! ;

: update-max-stack
  *dsp* @ *max-dsp* @ max *max-dsp* !
  *rsp* @ *max-rsp* @ max *max-rsp* ! ;

js-obj var> *glsl-dict*

( GLSL preamble )

"#version 300 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp int;
precision highp float;
#else
precision mediump int;
precision mediump float;
#endif
uniform vec2  resolution;
uniform float time;
layout(location=0) out vec4 fragColor;

float random(in vec2 p, inout float seed) {
  seed = fract(sin(mod(seed + dot(p.xy, vec2(12.9898, 78.233)), 3.14)) * 43758.5453);
  return seed;
}
" val> *glsl-preamble*

( main function header )

"void main() {
float seed = time;
float _x = gl_FragCoord.x / resolution.x;
float _y = gl_FragCoord.y / resolution.y;
float tmp;
" val> *glsl-header*

: cast      "(" + swap + ")" + ;
: vec4      { r g b a } r ", " g ", " b ", " a + + + + + + "vec4" cast ;
: tos=      0 ds@ " = " + swap + ;
: rtos=     0 rs@ " = " + swap + ;
: math-op   -1 ds! 0 ds@ swap 1 ds@ + + tos= ;
: math-fn1  "(" 0 ds@ ")" + + + tos= ;
: math-fn2  -1 ds! "(" 0 ds@ ", " 1 ds@ ")" + + + + + tos= ;
: math-fn3  -2 ds! "(" 0 ds@ ", " 1 ds@ ", " 2 ds@ ")" + + + + + + + tos= ;
: logic-op  -1 ds! 0 ds@ swap 1 ds@ " ? 1.0 : 0.0" + + + tos= ;
: logic-op* -1 ds! 0 ds@ "bool" cast swap 1 ds@ "bool" cast " ? 1.0 : 0.0" + + + tos= ;
: int-op2   -1 ds! 0 ds@ "int" cast swap 1 ds@ "int" cast + + "float" cast tos= ;

: ->x       1 ds! "_x" tos= ;
: ->y       1 ds! "_y" tos= ;
: ->t       1 ds! "time" tos= ;
: ->pi      1 ds! 3.14159265358979 tos= ;
: ->half-pi 1 ds! 1.5707963267949 tos= ;
: ->tau     1 ds! 6.28318530717959 tos= ;
: ->random  1 ds! "random(gl_FragCoord.xy / resolution.xy, seed)" tos= ;
: ->dup     1 ds! -1 ds@ tos= ;
: ->2dup    2 ds! -2 ds@ "; " -1 ds@ " = " -3 ds@ + + + + tos= ;
: ->over    1 ds! -2 ds@ tos= ;
: ->drop    -1 ds! "" ;
: ->>r      -1 ds! 1 rs! 1 ds@ rtos= ;
: ->r>      1 ds! -1 rs! 1 rs@ tos= ;
: ->@r      1 rs! 0 ds@ rtos= ;
: ->r@      1 ds! 0 rs@ tos= ;
: ->swap    "tmp = " -1 ds@ "; " over " = " 0 ds@ "; " over " = tmp" + + + + + + + + ;
: ->rswap   "tmp = " -1 rs@ "; " over " = " 0 rs@ "; " over " = tmp" + + + + + + + + ;
: ->rot     "tmp = " -2 ds@ "; " over " = " -1 ds@ "; "
            over " = " 0 ds@ "; " over " = tmp" + + + + + + + + + + + + ;
: ->-rot    "tmp = " -2 ds@ "; " over " = " 0 ds@ "; "
            over " = " -1 ds@ "; " over " = tmp" + + + + + + + + + + + + ;
: ->madd    -2 ds! 0 ds@ " * " 1 ds@ " + " 2 ds@ + + + + tos= ;
: ->z+      -2 ds! -1 ds@ " = " over " + " 1 ds@ "; " 0 ds@ " = " over " + " 2 ds@ + + + + + + + + + + ;
: ->z*      -2 ds! "tmp = " -1 ds@ " * " 1 ds@ " - " 0 ds@ " * " 2 ds@ "; " + + + + + + + +
            -1 ds@ " * " 2 ds@ " + " 0 ds@ " * " 1 ds@ + + + + + + tos=
            "; " -1 ds@ " = tmp" + + + + ;
: ->**      0 ds@ " * " over + + tos= ;

: ->+          " + "        math-op ;
: ->-          " - "        math-op ;
: ->*          " * "        math-op ;
: ->/          " / "        math-op ;
: ->=          " == "       logic-op ;
: ->>          " > "        logic-op ;
: -><          " < "        logic-op ;
: ->>=         " >= "       logic-op ;
: -><=         " <= "       logic-op ;
: ->not=       " != "       logic-op ;
: ->and        " && "       logic-op* ;
: ->or         " || "       logic-op* ;
: ->bitand     " & "        int-op2 ;
: ->bitor      " | "        int-op2 ;
: ->bitxor     " ^ "        int-op2 ;
: ->mod        "mod"        math-fn2 ;
: ->pow        "pow"        math-fn2 ;
: ->min        "min"        math-fn2 ;
: ->max        "max"        math-fn2 ;
: ->atan2      "atan"       math-fn2 ;
: ->step       "step"       math-fn2 ;
: ->sin        "sin"        math-fn1 ;
: ->cos        "cos"        math-fn1 ;
: ->tan        "tan"        math-fn1 ;
: ->log        "log"        math-fn1 ;
: ->exp        "exp"        math-fn1 ;
: ->sqrt       "sqrt"       math-fn1 ;
: ->floor      "floor"      math-fn1 ;
: ->ceil       "ceil"       math-fn1 ;
: ->abs        "abs"        math-fn1 ;
: ->fract      "fract"      math-fn1 ;
: ->negate     "-"          math-fn1 ;
: ->mix        "mix"        math-fn3 ;
: ->clamp      "clamp"      math-fn3 ;
: ->smoothstep "smoothstep" math-fn3 ;

: ?float "." over dup "indexOf" js@ js-call-1-with -1 = if ".0" + then ;
: push-literal 1 ds! ?float tos= ;

: glsl-stack-vars { addr n }
  n 0 >= if
  "float " 0 begin
  dup n <= while
  @r addr + @ + r@ n = if ";\n" else ", " then + r> 1+
  repeat drop
  else "" then ;

: glsl-frag-color
  "fragColor = "
  *dsp* @ 1+
  case/
    0 of      "0.0"   dup    dup "1.0" endof
    1 of     0 ds@    dup    dup "1.0" endof
    2 of    -1 ds@  0 ds@  "0.0" "1.0" endof
    3 of    -2 ds@ -1 ds@  0 ds@ "1.0" endof
    default -3 ds@ -2 ds@ -1 ds@ 0 ds@
  /case
  vec4 + ";\n" + ;

: glsl-word-comment ^( acc word -- acc' word )
  *glsl-comments* @
  if dup ":" not= if dup "// " swap + "\n" + rot swap + swap then then ;

: glsl-slurp-comment drop 1 begin -proc-comment dup zero? until drop ;

: glsl-end-line dup "length" js@ pos? if ";\n" + then ;

: glsl-continue? dup dup "" not= swap ";;" not= and ;

: glsl-lookup-word ^( word -- def ) *glsl-dict* @ swap js@ ;

: glsl-define-word
  read-token> { word }
  ( "// define word : " word + ) ""
  js-array
  begin read-token> dup dup "" not= swap ";" not= and while
  dup "(" = if glsl-slurp-comment else js-apush then
  repeat drop
  *glsl-dict* @ word js! ;

: glsl-custom-word?
  dup glsl-lookup-word js-array? ;

0  var> *inline-recur*

: glsl-inline-word { word }
  *glsl-comments* @ if "// inline word: " word "\n" + + else "" then
  word glsl-lookup-word dup "length" js@ { def n }
  0 dup { i } begin i n < while
    def over js@
    ( acc i word )
    rot swap glsl-word-comment rot swap
    glsl-custom-word? not
    ( acc i word flag )
    if dup "->" swap + find ( acc i word addr )
       dup undefined =
       if drop push-literal else nip call then
       rot swap glsl-end-line + swap
       update-max-stack
    else ( recursive expansion )
       swap >r n >r def >r word >r
       *inline-recur* @ call +
       r> set> word r> set> def r> set> n r> dup set> i
    then
    1+ dup set> i
  repeat drop
  *glsl-comments* @ if "// end inline" "\n" + + then ;

find> glsl-inline-word *inline-recur* !

: glsl-compile-word ^( token -- glsl )
  dup ":" =
  if drop glsl-define-word
  else glsl-custom-word?
    if glsl-inline-word
    else dup "->" swap + find dup undefined =
      if drop push-literal else nip call then
    then
 then ;

: glsl>
  reset-stack
  "" begin
     read-token> glsl-continue? while
     dup "(" =
     if glsl-slurp-comment
     else
       glsl-word-comment glsl-compile-word glsl-end-line +
       update-max-stack
     then
  repeat drop
  *glsl-preamble* *glsl-header* +
  *ds* *max-dsp* @ glsl-stack-vars +
  *rs* *max-rsp* @ glsl-stack-vars +
  swap + glsl-frag-color + "}" + ;