: float32 *js-window* "Float32Array" js@ js-new-1 ;

: sw2@ ^( i1 i2 v -- v1 v2 ) @r swap js@ r> rot js@ swap ;
: sw4@ ^( i1 i2 i3 i4 v -- v1 v2 v3 v4 ) @r sw2@ r> -rot sw2@ 2r> ;

: swxx@ ^( v -- x x ) 0 js@ dup ;
: swxy@ ^( v -- x y ) dup 0 js@ swap 1 js@ ;
: swxz@ ^( v -- x z ) dup 0 js@ swap 2 js@ ;

: sw2xy! ^( x y v -- ) dup -rot 1 js! 0 js! ;
: sw2xz! ^( x z v -- ) dup -rot 2 js! 0 js! ;
: sw2yz! ^( y z v -- ) dup -rot 2 js! 1 js! ;
: sw1xy! ^( n v -- ) 2dup 0 js! 1 js! ;
: sw1xz! ^( n v -- ) 2dup 0 js! 2 js! ;
: sw1xw! ^( n v -- ) 2dup 0 js! 3 js! ;
: sw1yz! ^( n v -- ) 2dup 1 js! 2 js! ;
: sw1yw! ^( n v -- ) 2dup 1 js! 3 js! ;
: sw1zw! ^( n v -- ) 2dup 2 js! 3 js! ;

: sw-add-xy ^( a b c -- )
  -rot
  2dup 0 js@ swap 0 js@ + >r
  1 js@ swap 1 js@ +
  over 1 js!
  r> swap 0 js! ;

: sw-add-xyz ^( a b c -- )
  -rot
  2dup 0 js@ swap 0 js@ + >r
  2dup 1 js@ swap 1 js@ + >r
  2 js@ swap 2 js@ + over 2 js!
  r> over 1 js!
  r> swap 0 js! ;

: mat4-identity ^( addr ) 1 over 0 js! 1 over 5 js! 1 over 10 js! 1 swap 15 js! ;

: madd2 ^( a1 a2 b1 b2 -- prodsum ) * >r * r> + ;

: madd4 ^( a1 a2 b1 b2 c1 c2 d1 d2 -- prodsum ) madd2 >r madd2 r> + ;

: mat4@ { addr } 0 begin dup 4 < while addr over js@ swap 1+ repeat drop ;
: mat16@ { addr } 0 begin dup 16 < while addr over js@ swap 1+ repeat drop ;

: mul4x4 ^( m1addr m2addr )
  >r mat16@ { m00 m01 m02 m03  m10 m11 m12 m13  m20 m21 m22 m23  m30 m31 m32 m33 }
  r> mat16@ { n00 n01 n02 n03  n10 n11 n12 n13  n20 n21 n22 n23  n30 n31 n32 n33 }
  m00 n00 m10 n01 m20 n02 m30 n03 madd4
  m01 n00 m11 n01 m21 n02 m31 n03 madd4
  m02 n00 m12 n01 m22 n02 m32 n03 madd4
  m03 n00 m13 n01 m23 n02 m33 n03 madd4

  m00 n10 m10 n11 m20 n12 m30 n13 madd4
  m01 n10 m11 n11 m21 n12 m31 n13 madd4
  m02 n10 m12 n11 m22 n12 m32 n13 madd4
  m03 n10 m13 n11 m23 n12 m33 n13 madd4

  m00 n20 m10 n21 m20 n22 m30 n23 madd4
  m01 n20 m11 n21 m21 n22 m31 n23 madd4
  m02 n20 m12 n21 m22 n22 m32 n23 madd4
  m03 n20 m13 n21 m23 n22 m33 n23 madd4

  m00 n30 m10 n31 m20 n32 m30 n33 madd4
  m01 n30 m11 n31 m21 n32 m31 n33 madd4
  m02 n30 m12 n31 m22 n32 m32 n33 madd4
  m03 n30 m13 n31 m23 n32 m33 n33 madd4 ;

: trace4 { a b c d } a " " + b + " " + c + " " + d + . ;

: trace16 { m00 m01 m02 m03  m10 m11 m12 m13  m20 m21 m22 m23  m30 m31 m32 m33 }
  m00 m01 m02 m03 trace4
  m10 m11 m12 m13 trace4
  m20 m21 m22 m23 trace4
  m30 m31 m32 m33 trace4 ;