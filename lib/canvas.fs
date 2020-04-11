: get-context ^( ctx-type canvas -- gl )
  dup "getContext" js@ js-call-1-with ;

: make-canvas
  ^( w h ctx-type -- canvas ctx )
  { w h ctx }
  ctx "canvas" js-create-element
  dup w swap "width" js-attr!
  dup h swap "height" js-attr!
  tuck get-context ;

: fill-style! ^( col ctx -- ) "fillStyle" js! ;

: rect ^( x y w h ctx -- )
  { x y w h ctx }
  x y w h ctx dup "fillRect" js@ 4 js-call-n-with drop ;

: gl-context ^( canvas -- gl )
  "webgl" swap dup "getContext" js@ js-call-1-with ;

*js-window* "WebGLRenderingContext" js@ val> *gl*

: gl-compile-shader { src type gl -- shader status }
  gl dup type js@ swap dup "createShader" js@ js-call-1-with { shader }
  shader src gl dup "shaderSource" js@ js-call-2-with drop
  shader gl dup "compileShader" js@ js-call-1-with drop
  shader dup gl dup "COMPILE_STATUS" js@ swap dup "getShaderParameter" js@ js-call-2-with ;

: gl-attach-shader ^( program shader gl -- )
  dup "attachShader" js@ js-call-2-with drop ;

: gl-program { vs fs gl -- program status }
  gl dup "createProgram" js@ js-call-with dump-ds { program }
  program vs gl gl-attach-shader
  program fs gl gl-attach-shader
  program gl dup "linkProgram" js@ js-call-1-with drop
  program dup gl dup "LINK_STATUS" js@ swap dup "getProgramParameter" js@ js-call-2-with ;

: gl-use-program ^( program gl )
  dup "useProgram" js@ js-call-1-with drop ;

: gl-attribute-loc ^( program att gl -- loc )
  dup "getAttribLocation" js@ js-call-2-with ;

: gl-uniform-loc ^( program uni gl -- loc )
  dup "getUniformLocation" js@ js-call-2-with ;

: gl-uniform1f! ^( uni x gl -- )
  dup "uniform1f" js@ js-call-2-with drop ;

: gl-uniform2f! ^( uni x y gl -- )
  dup "uniform2f" js@ 3 js-call-n-with drop ;

: gl-buffer ^( gl -- vbo ) dup "createBuffer" js@ js-call-with ;

: gl-bind-buffer ^( vbo gl -- )
  dup "ARRAY_BUFFER" js@ -rot dup "bindBuffer" js@ js-call-2-with drop ;

: gl-buffer-data ^( data gl -- )
  dup "ARRAY_BUFFER" js@ -rot
  dup "STATIC_DRAW" js@ swap
  dup "bufferData" js@ 3 js-call-n-with drop ;

: gl-vertex-attrib-pointer { loc stride gl }
  loc stride gl "FLOAT" js@ false 0 0 gl dup "vertexAttribPointer" js@ 6 js-call-n-with drop ;

: gl-enable-vertex-attrib ^( vattr gl -- )
  dup "enableVertexAttribArray" js@ js-call-1-with drop ;

: gl-draw-arrays ^( type n gl -- )
  0 -rot dup "drawArrays" js@ 3 js-call-n-with drop ;
