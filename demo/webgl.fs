(
webgl demo including forth -> glsl transpiler (all written in charlie forth)
inspired by, though not based on:
forthsalon.appspot.com
06bacb42fe3bdfbd.paste.se
)

"lib/glsl.fs"
"lib/canvas.fs"
"lib/swizzle.fs"
"lib/bench.fs"
include*

"#version 300 es

in vec2 position;
uniform vec2  resolution;
uniform float time;

void main(void) {
  gl_Position = vec4(position, 0.0, 1.0);
}" val> vs-src

nil val> gl
nil val> canvas
nil var> *shader*
nil var> *vbo*
nil var> *time*
nil var> *resolution*

: init { fs-src gl }
  vs-src "VERTEX_SHADER" gl gl-compile-shader   "vs-status: "   swap + . { vs }
  fs-src "FRAGMENT_SHADER" gl gl-compile-shader "fs-status: "   swap + . { fs }
  vs fs gl gl-program                           "prog status: " swap + . { shader }
  shader "position" gl gl-attribute-loc dup gl gl-enable-vertex-attrib   { vattr } 
  gl gl-buffer dup gl gl-bind-buffer                                     { vbo }
  -1 -1  1 -1  1 1  -1 -1  1 1  -1 1  12 dup float32 ds->array
  gl gl-buffer-data
  vattr 2 gl gl-vertex-attrib-pointer
  shader "time" gl gl-uniform-loc *time* !
  shader "resolution" gl gl-uniform-loc *resolution* !
  shader *shader* !
  vbo *vbo* !
  canvas add-to-repl ;

: reset gl init clear-repl-out canvas add-to-repl ;

: update
  *shader* @ gl gl-use-program
  *time* @ now 0.001 * 86400 mod gl gl-uniform1f!
  *resolution* @ 600 600 gl gl-uniform2f!
  gl "TRIANGLES" js@ 6 gl gl-draw-arrays ;

: repeatedly { word }
  [ drop word apply rdrop ] quot->js-callback 16
  *js-window* "setInterval" js@ js-call-2 drop ;


600 600 "webgl2" make-canvas set> gl set> canvas

glsl> x y t fract ;; dup .

gl init [ update ] repeatedly

(

glsl> x 2 pi * * t + y t 2 * + cos 10 * + sin ;; gl init

( -------------  )
glsl>
x 2 * y 3 * t + sin + 3 * 1 mod .5 <
y 2 * x 2 * y 3 * t + sin + t + cos + 3 * 1 mod .5 < and ;;
gl init

glsl>
x 2 * y 3 * t + sin + 3 * 1 mod
y 2 * x 2 * y 3 * t + sin + t + cos + 3 * 1 mod max
;;
gl init

glsl>
x 2 * y 3 * t + sin + 3 * 1 mod
y 2 * x 2 * y 3 * t + sin + t + cos + 3 * 1 mod 2dup max
;;
gl init

( ---------------- )

glsl>
y 0.5 - 5 * @r ** ** x 0.5 - 5 * @r ** ** - r> r> * -
t 1.5 * sin 14 * - abs t 3 / cos pow
3 * dup 1 + sin swap dup sin swap 5 + sin
;;
gl init

glsl>
: ^2 dup * ;
: x' x .5 - 5 * ;
: y' y .5 - 5 * ;
: rollettcurve y' ^2 ^2 x' ^2 ^2 - x' y' * - ;
: rainbow
dup 3 * 1 + sin swap
dup 3 * 0 + sin swap
dup 3 * 5 + sin swap drop ;

rollettcurve t 1.5 * sin 14 * - abs t 3 / cos pow rainbow
;; .


( based on shader by Manwe )
glsl>
: j t 0.12 * sin 0.02 * 0.6666 + ;
: i 2dup z* 0.04 t 0.5 * tau mod cos * j z+ ;
: f i i i i i i i i i ;
: rainbow 3 * dup 1 + sin swap dup sin swap 5 + sin ;
t 0.1 * fract tau * sin 0.5 * 1 + dup y 0.5 - * swap 0.5 x - *
f f f f f f f swap drop rainbow ;; gl init


( pacman )
glsl>
: d dup ;
: m 1 min ;
: f d floor - ;
: c cos abs ;
: j t 4 + 2 * x 8 * floor 8 / + 4 * c 2 / t 4 + 2 / c 4 pow * - ;
: a 1 x x 8 * floor 0.5 + 8 / - d * y ;
: b - d * + sqrt 50 * 8 pow ;
: p x t 4 + pi / f 1.6 * - 0.2 + ;
: v t 4 + pi 2 * / f ;
a j 0.5 b -
v d 0.5 < * 4 * m *
1 p d * y 0.5 - d * + 36 * 30 pow m -
y 0.5 - p atan2 abs t 10 * c 0.8 * - 16 * m * 0 max
a 0.5 b - 0 max d p 16 * < * +
p d * y 0.58 b m *
v 0.5 >= *
+ d 0.2 ;; gl init

( tunnel )
glsl>
: x' x 0.5 - t sin 0.2 * + ;
: y' y 0.5 - t 1.5 * cos 0.2 * + ;
: dist x' x' + y' y' + * sqrt ;
: xor + abs 2 mod ;
: b / floor 2 mod ;
: m 256 * floor ;
: a dup rot swap b -rot b xor ;
: w dup

x' y' atan2 pi / 512 * t 100 * + 256 mod
128 dist / t 500 * + 256 mod

rot a * ;
1 w 2 w 4 w 8 w 16 w 32 w 64 w 128 w
+ + + + + + + 256 / dist * dup dup ;; gl init

( fractal2 )
glsl>
: x' x .5 - 2.4 * ;
: y' y .7 - 2.4 * ;
: dot dup * swap dup * + ;
: l dup -0.04 * r> r>
  2dup * 2 * x' + >r 2dup z* drop y' + r>
  2dup >r >r dot + abs
  rot min swap rot over 1.32457 * t +
  r> r> 2dup >r >r
  rot dup cos -2 * swap sin -2 *
  z+ dot min -rot 1 + ;
  
y' x' >r >r 4 4 0 l l l l l l l l l drop
log 8 / negate
swap log 8 / negate
swap dup >r 2 pow
over 3 pow + r> 3 pow
r> r> drop drop ;;
gl init

( checker board )
glsl> : xor + 2 mod ; : tile 8 * floor ; x tile y tile xor ;; gl init

( x-checkers )
x 25 * cos y 25 * cos <

( binary )
: d ( x n - d ) 2 swap ** * floor 2 mod ;
x y 8 * floor d

( bit clock )
: h 0.66 t 3600 / floor ; 
: m 0.50 t 60 / floor 60 mod ; 
: s 0.34 t floor 60 mod ; 
: x5 0.10 32 ;
: x4 0.26 16 ;
: x3 0.42 8 ;
: x2 0.58 4 ;
: x1 0.74 2 ;
: x0 0.90 1 ;
: circle y - 2.5 pow swap x - 2.5 pow + sqrt 0.04 < ;
: bit ( x0 b y0 n -- bool ) rot / floor 2 mod -rot circle and ; 
: hb h bit + ;
: mb m bit + ;
: sb s bit + ;
x5 h bit 
x4 hb
x3 hb
x2 hb
x1 hb
x0 hb
x5 m bit 
x4 mb
x3 mb 
x2 mb 
x1 mb 
x0 mb 
x5 s bit 
x4 sb
x3 sb 
x2 sb 
x1 sb 
x0 sb

( 10 PRINT ... 20 GOTO 10 )
( https://forthsalon.appspot.com/haiku-view/ahBzfmZvcnRoc2Fsb24taHJkchILEgVIYWlrdRiAgICApaaHCgw )
: ' 20 * 1 mod ;
: l dup -0.2 >= swap 0.2 < * ;
: x x 2 * ;
: y t 2 * floor 10 mod y - 2 * ;
: _ 20 * floor 5 + ;
x _ y _ ( t 8 * floor - ) 7 + cos x
_ sin / * 1 mod 0.5 >= dup x '
y ' - l * swap 1 swap - 1 x '
- y ' - l * + dup dup 0.22 *
0.2 + swap 0.22 * 0.15 + rot
0.24 * 0.47 +

( beauty basic sphere )
x 2 * 1 - dup * y 2 * 1 - dup * + x y

( amiga ball )
: q dup * ;
: d2 q swap q + ;
: acos dup q 1 - negate sqrt swap 1 + atan2 2 * ;

: r 0.5 ;
: r2 r q ;
: tl 1.58 t sin 5 / + ;

: ' 0.5 - ;
: 's ' tl cos * ;
: 'c ' tl sin * ;
: x' x 'c y 's - ;
: y' y 'c x 's + ;
: l2 x ' y ' d2 ;

: in? l2 r2 < ;
: z r2 l2 - sqrt ;

: th y' acos 2 * pi / ;
: ph z x' atan2 pi / t 9 / + ;

: txtr 25 25 z* cos >r cos r> < ;

z in? * 1.5 *
ph th txtr
over * dup rot

( basic operations on a complex numbers )

: z x .5 - y .5 - ; ( a complex number stored as a pair of numbers )

: z- swap -rot - push - pop ; ( difference between two complex numbers )
: z1/ over dup * over dup * + rot over / -rot / ; ( 1 divided by a complex number )
: zmodule ( module of a complex number ) dup * swap dup * + sqrt ;
: zarg ( arg of a complex number ) swap atan2 ;
: e^ ( e raised to a complex power ) over exp over cos * -rot sin swap exp * ;
: zln ( logarithm of a complex number ) 2dup zmodule log -rot zarg ;
: z^ ( complex number raised to a complex power ) push push zln pop pop z* e^ ;

: a 2 1.4 ;
: b 1 -4 ;
: c -2 t 2 / sin 4 * 1 + ;
: d 0 1 ;

a z z* b z+
c z z* d z+ c z^
z1/ e^
z* zln

2dup zmodule 4 /
swap


( cellular texture )
: s - 2 pow ;
: d y s swap x s + sqrt ;
: h 158 * tan tan tan 1 mod ;
: r r> 1 + dup >r h ;
: i r r d min ;
: 8i i i i i i i i i ;
1 0 >r 8i 8i r> drop
0.5 swap - 2 *
dup dup

( cellular anim toxi )
glsl>
: s - 2 pow ;
: d y s swap x s + sqrt ;
: h t 0.01 * * sin 1 mod ;
: r r> 1 + dup >r h ;
: i r r d min ;
: 8i i i i i i i i i i i ;
1 0 >r 8i 8i r> drop
0.5 swap - 2 * 0.2 over 3 * -1 + sin 0.2 * 0.8 + ;; gl init

( mode7 rotation )
( https://forthsalon.appspot.com/haiku-view/ahBzfmZvcnRoc2Fsb24taHJkcg0LEgVIYWlrdRiWlRMM )
: h .5 - * ; : z 1 1 y h / -1 * ; 
: s h t sin ; : d x z * z 2 / - ;
t cos y z * s d h - t - 2 *
floor t cos d s y z * h +
2 * + 2 mod floor z .2 * /

( xor tunnel )
( https://forthsalon.appspot.com/haiku-view/ahBzfmZvcnRoc2Fsb24taHJkcg0LEgVIYWlrdRiDxxIM )
glsl>
: p 2 * pi * cos 0.5 * 0.5 + ;
: col dup dup p swap 1 3 / + p rot 2 3 / + p ;
: x' x 0.5 - t sin 0.2 * + ;
: y' y 0.5 - t 1.5 * cos 0.2 * + ;
: dist x' x' * y' y' * + sqrt ;
: b / floor 2 mod ;
: w dup x' y' atan2 pi / 512 * t 100 * + 256 mod 128 dist / t 500 * + 256 mod rot dup rot swap b -rot b + abs 2 mod * + ;
0 4 w 8 w 16 w 32 w 64 w 128 w 256 / t + col
dist 2 * * swap dist 2 * * rot dist 2 * *
;; gl init

( http://www.thesands.ru/forth-demotool/ )
glsl>
: q dup * ;
: sincos ( t - s c ) dup sin swap cos ;
: l
1 x .5 - r@ 1 + *
r@ 3 - t cos t sin z*
y .5 - r@ 1 + *
swap
t 2.7 / cos t 2.7 / sin z* -rot
q swap q +
dup 8 * swap rot
q + 1.8 + q
- abs 1 min .03 - - 15 pow
r@ / r> .2 - >r
max ;
: j l l l l ;
0 0 4.2 >r j j j j r> drop 1.5 * dup q swap
;; gl init


( 2d rotation )
glsl>
: sincos ( x theta -- sin cos ) @r sin over * swap r> cos * ;
: abs2d ( x y -- x y ) abs swap abs swap ;
: add2d ( x y n -- x y ) @r + r> rot + swap ;
: rot2x ( x y theta -- x y ) @r sincos rot r> sincos -rot + -rot swap - swap ;

x y -0.5 add2d t 2 * rot2x abs2d
;; gl init

( light tunnel // http://glslsandbox.com/e#35712.0 )

glsl>
: add2d ( x y n -- x y ) @r + r> rot + swap ;
: mul2d ( x y n -- x y ) @r * r> rot * swap ;
: len2d ( x y -- l ) dup * swap dup * + sqrt ;

t 0.14 * sin 0.2 * t 4 * 3 mod + ( f )

x y -0.5 add2d 2 mul2d over over ( f x y x y )
atan2 30 * t 16 * - sin 0.02 * 0.5 + ( f x y a ) 1 swap /
mul2d ( f x y )
len2d ( f l )
- abs 10 * ( d )

0.8 over / swap ( r d )
0.2 over / swap ( r g d )
2.2 swap /

;; gl init

( particles // http://glslsandbox.com/e#35609.0 )

: mix ( a b t -- x ) >r over - r> * + ;

glsl>
: add2n ( x y n -- x y ) @r + r> rot + swap ;
: add2d ( x y x' y' -- x y ) rot + ( x x' y ) -rot + swap ;
: mul2n ( x y n -- x y ) @r * r> rot * swap ;
: len2d ( x y -- l ) dup * swap dup * + sqrt ;
: dup2d over over ;

: speed t 0.075 * ;

: bfx ( ax fx -- x' ) speed 0.9 / * sin * 10 * ;
: bfy ( ay fy -- y' fy ) @r speed 2.0 / * cos * 10 * r> ;

: ball ( x y ax fx ay fy -- c x y )
    bfy t 0.01 * * sin 1 swap / >r -rot
    bfx swap add2d r> mul2n len2d 0.05 swap / -rot ;

x 2 * 1 - y 2 * 1 - dup2d ( x y x y )

0.03 31   0.09 22   ball dup2d ( c x y x y )
0.04 22.5 0.04 22.5 ball dup2d ( c c2 x y x y )
0.05 12   0.03 23   ball dup2d
0.06 32.5 0.04 33.5 ball dup2d
0.07 23   0.03 24   ball dup2d
0.08 21.5 0.02 22.5 ball dup2d
0.09 33.1 0.07 21.5 ball
drop drop
+ + + + + +
1.6 *
dup 0.22 * swap
dup 0.34 * swap
0.9 t sin * *
;; gl init


( http://glslsandbox.com/e#8067.3 // liquid paint )
glsl>
: ti  0.3 * t + ;
: amp 0.6 swap / * ;
: col 3 * sin 0.5 * 0.5 + ;
: i ( x y i -- x' y' i' )
    >r over over r@ * r@ ti + sin r@ amp + 1 + -rot
    swap r@ * r@ 10 + ti + sin r@ amp + 1.4 - r> 1 + ;
: i5 i i i i i ;
: i10 i5 i5 ;

x 2 * y 2 *
1 i10 i10 i10
drop over over
+ sin -rot col swap col
;; gl init

( laser lines )

glsl>
: trunc 1 * fract ;
: x' x trunc ;
: y' y trunc ;
: w t sin 0.49 * 0.5 + 20 * ;
: line
  x' - rot x' swap - rot
  y' - * -rot y' rot - *
  - abs 2 * 1 min 1 swap - ;

0.5 0 t sin 1 line
1 0.5 0.2 t 1.5 * sin line
0.25 1 t cos 0.25 line
;; gl init

( disco floor )
glsl>
x 9.4 * sin
y 9.4 * sin
t 4 * sin
* *
dup t 2 * sin *
dup t 3 * sin *
;; gl init

( pattern )
glsl>
x 1280 * 640 - dup * y 1280 * 640 - dup * + t 1 / -
2 * dup
2 * dup
2 *
sin rot sin rot sin
;;
gl init


( sun in the sky )

glsl>
( sun )
0.6 0.85 1
0.8 x y 10 * 2 t * + sin 0.005 * + - abs dup *
0.5 y x 10 * 3 t * + cos 0.005 * + - abs dup * + sqrt
- smoothstep
dup y 2 * * swap
dup y 1 * * rot ( r g m )
( sky )
1 swap -
dup 0.8 y 0.5 * - * swap ( r g r m )
dup 1 y 0.5 * - * swap ( r g r g b )
>r ( r g r g )
rot max ( r r g )
-rot max swap ( r g )
r>
;; gl init

)
