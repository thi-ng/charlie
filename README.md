# @thi.ng/charlie

## About

This is a slightly updated version of my first
[Forth](http://thinking-forth.sourceforge.net/) VM implementation from
2015, originally written in JavaScript, now updated to TypeScript. Charlie is named in honour of Charles Moore, inventor of Forth.

Several parts of the VM and core vocabulary are based on @phaendal's
[mkforth4-js](https://github.com/phaendal/mkforth4-js), which evolved in
parallel at roughly the same time span and was highly educational. Other
parts are inspired by [Factor](http://factorcode.org),
[Popr](https://github.com/HackerFoo/poprc) and other [concatenative
languages](http://concatenative.org/).

The VM & REPL (10KB total) are available online via
[forth.thi.ng](http://forth.thi.ng). The project has been online since
2015, but was semi-broken due to CSS layout issues (now fixed).

Related projects resulting from this experiment:

-   [@thi.ng/pointfree-lang](https://github.com/thi-ng/umbrella/tree/develop/packages/pointfree-lang)
-   [thi.ng/synstack](https://github.com/thi-ng/synstack/)

## Videos / screencasts

-   [WebAudio multi-track synth & fx livecoding (from scratch)](https://youtu.be/NU4PSkA3pAE?t=130)
-   [Forth-to-GLSL shader transpiler](https://youtu.be/30s3mgrkzQ0?t=123)
-   [Mini text adventure (directed graph)](https://twitter.com/forthcharlie/status/618463324473303040)
-   [Closures & destructuring](https://twitter.com/forthcharlie/status/618090661137522688)
-   [Vector algebra](https://twitter.com/forthcharlie/status/616465114871504896)
-   [Lisp style cons](https://twitter.com/forthcharlie/status/616429574331744256)
-   [Prime numbers](https://twitter.com/forthcharlie/status/616296680225435649)
-   [Unit conversion](https://twitter.com/forthcharlie/status/616292997261598720)
-   [ASCII art](https://twitter.com/forthcharlie/status/616290572706430977)
-   [FizzBuzz](https://twitter.com/forthcharlie/status/616281804866211840)

## Libraries & demos

The following libraries and demos are included (also available in the
online REPL):

-   [lib/audio.fs](https://github.com/thi-ng/charlie/tree/master/lib/audio.fs)
-   [lib/bench.fs](https://github.com/thi-ng/charlie/tree/master/lib/bench.fs)
-   [lib/canvas.fs](https://github.com/thi-ng/charlie/tree/master/lib/canvas.fs)
-   [lib/glsl.fs](https://github.com/thi-ng/charlie/tree/master/lib/glsl.fs)
-   [lib/list.fs](https://github.com/thi-ng/charlie/tree/master/lib/list.fs)
-   [lib/math.fs](https://github.com/thi-ng/charlie/tree/master/lib/math.fs)
-   [lib/swizzle.fs](https://github.com/thi-ng/charlie/tree/master/lib/swizzle.fs)
-   [lib/synth.fs](https://github.com/thi-ng/charlie/tree/master/lib/synth.fs)

### GLSL live coding & cross-compiler

The above
[lib/glsl.fs](https://github.com/thi-ng/charlie/tree/master/lib/glsl.fs)
library contains a Forth -> GLSL cross-compiler, based on word inlining
and emulating a stack machine via multiple variables.

The concept was inspired by [Brad Nelson](https://flagxor.com/)'s [Forth
Haiku](https://forthsalon.appspot.com/), however here (as an exercise)
the cross-compiler is entirely written in Forth itself...

Demo source: [demo/webgl.fs](https://github.com/thi-ng/charlie/tree/master/demo/webgl.fs)

Usage in the REPL:

```
( this includes the cross-compiler automatically )
"demo/webgl.fs" include*
```

Some small examples (more are included in the demo source, also see
lib/glsl for available functions):

**IMPORTANT:** All shader code must be wrapped by `glsl> ... ;;`

#### Liquid paint (ported from [GLSL](http://glslsandbox.com/e#8067.3))

![screenshot](https://raw.githubusercontent.com/thi-ng/charlie/master/assets/liquid.jpg)

```
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

;; reset
```

#### Disco floor (based on [Forth Haiku](https://forthsalon.appspot.com/haiku-view/ahBzfmZvcnRoc2Fsb24taHJkcg0LEgVIYWlrdRim4xMM)):

![screenshot](https://raw.githubusercontent.com/thi-ng/charlie/master/assets/disco.jpg)

```
glsl>
: stripes 9.5 * sin ;
: fade t * sin * ;

x stripes y stripes *
2 fade
dup 2 fade
dup 3 fade

;; reset
```

#### Bump mapping (based on [Forth Haiku](https://forthsalon.appspot.com/haiku-view/ag5mb3J0aHNhbG9uLWhyZHINCxIFSGFpa3UY-OkWDA)):

![screenshot](https://raw.githubusercontent.com/thi-ng/charlie/master/assets/bump.jpg)

```
glsl>
: d dup ;
: ' .5 - ;
: r x ' d * y ' d * + sqrt ;
: lx t 7 + 1.9 * sin 2 / ;
: ly t 7 + 1.7 * sin 2 / ;
: lr lx d * ly d * + .16 + sqrt ;
: z r 80 * sin .7 * ;
: m lr / * 0 max ;
x ' r / z * lx m
y ' r / z * ly m
r 80 * cos .15 * .85 +
.4 r 40 * cos 1 + 6 / + m
+ +
1
x ' lx - d *
y ' ly - d *
+ sqrt
- 0 max *
d d * 2 /

;; reset
```

#### XOR tunnel (based on [Forth Haiku](https://forthsalon.appspot.com/haiku-view/ag5mb3J0aHNhbG9uLWhyZHINCxIFSGFpa3UY09wQDA)):

![screenshot](https://raw.githubusercontent.com/thi-ng/charlie/master/assets/xortunnel.jpg)

```
glsl>
: x' x 0.5 - t sin 0.2 * + ;
: y' y 0.5 - t 1.5 * cos 0.2 * + ;
: dist x' x' * y' y' * + sqrt ;
: xor + abs 2 mod ;
: b / floor 2 mod ;
: m 256 * floor ;
: a dup rot swap b -rot b xor ;
: w dup

x' y' atan2 pi / 512 * t 100 * + 256 mod
128 dist / t 500 * + 256 mod

rot a * ;
1 w 2 w 4 w 8 w 16 w 32 w 64 w 128 w
+ + + + + + + 256 / dup dup

;; reset
```

#### Twister (based on [Forth Haiku](https://forthsalon.appspot.com/haiku-view/ag5mb3J0aHNhbG9uLWhyZHISCxIFSGFpa3UYgICAgLXVgwsM)):

![screenshot](https://raw.githubusercontent.com/thi-ng/charlie/master/assets/twister.jpg)

```
glsl>
: l * + sin ;
: r t 1 y t + 4 l + 1.57 ;
: x' x 4 * 2 - t y 3 l + ;
: v 2dup x' >= swap x' < * -rot swap - l ;
: a r 4 l ; : b r 1 l ;
: c r 2 l ; : d r 3 l ;
0 d a v a b v b c v c d v
;; reset
```

### Web audio demo

Source: [demo/popcorn.fs](https://github.com/thi-ng/charlie/tree/master/demo/popcorn.fs)

Usage in the REPL:

```text
"demo/popcorn.fs" include*
```

Once all lib files are loaded (give it a few seconds to be sure)...

```
popcorn
```

## Building

```bash
git clone https://github.com/thi-ng/charlie.git
cd charlie

yarn start # start dev server

yarn build # production build (written to /out)
```
