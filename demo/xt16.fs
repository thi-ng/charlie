( beauty sphere )
glsl>
x 2 * 1 - dup * y 2 * 1 - dup * + x y
;; gl init

( liquid paint )
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

( particles )

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
