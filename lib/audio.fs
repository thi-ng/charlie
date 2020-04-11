vocab/ Audio

: new-context
  *js-window* "AudioContext" js@ js-new ;

: new-buffer ^( chan len rate ctx )
  dup "createBuffer" js@ 3 js-call-n-with ;

: buffer-channel-data ^( buf ch -- array )
  swap dup "getChannelData" js@ js-call-1-with ;

: fill-buffer!
  { buf from n [osc] }
  n [ dup [osc] apply buf rot from + js! ] <dotimes> ;

: connect! ^( ctx node -- )
  swap "destination" js@ swap dup "connect" js@ js-call-1-with drop ;

: disconnect! ^( ctx node -- )
  swap "destination" js@ swap dup "disconnect" js@ js-call-1-with drop ;

: new-source ^( buf loop? ctx )
  { buf loop? ctx }
  ctx dup "createBufferSource" js@ js-call-with { src }
  loop? src "loop" js!
  buf src "buffer" js!
  ctx src connect!
  src ;

: new-script ^( quot frames ch ctx )
  { quote frames ch ctx }
  frames 0 ch ctx dup "createScriptProcessor" js@ 3 js-call-n-with { proc }
  ch 1 = if
    [ "outputBuffer" js@ dup "getChannelData" js@ 0 -rot js-call-1-with quote apply ]
  else
    [ dup "outputBuffer" js@ dup "getChannelData" js@ 0 -rot js-call-1-with
      swap "outputBuffer" js@ dup "getChannelData" js@ 1 -rot js-call-1-with
      quote apply ]
  then
  quot->js-callback proc "onaudioprocess" js!
  ctx proc connect!
  proc ;

: start-source ^( src -- )
  dup "start" js@ js-call-with drop ;

: stop-source ^( src -- )
  dup "stop" js@ js-call-with drop ;

: new-track ^( ctx frames rate -- buf bdata src )
  { ctx frames rate }
  1 frames rate ctx new-buffer { buf }
  buf 0 buffer-channel-data { bdata }
  buf true ctx new-source { src }
  buf bdata src ;

: regular-beat { note off n len }
  0 begin dup n < while dup len * off + note apply 1+ repeat drop ;

: apply-regular { off len n }
  0 begin dup n < while dup len * off + rot apply 1+ repeat drop ;

: replicate { x n } 0 begin dup n < while x swap 1+ repeat drop ;

: wrap { t frames -- t' } t dup neg? if frames + then ;

: echo { bdata frames delay dry wet }
  0 begin
    dup frames < while
    bdata over              ( t bd t )
    js@ dry *               ( t dv )
    over bdata swap         ( t dv bd t )
    delay - frames wrap     ( t dv bd t' )
    js@ wet * +             ( t dw )
    over bdata swap js!
    1+ repeat drop ;

: reverse { buf len }
  len 1 >> { max }
  len 1- set> len
  0 begin
    dup max <= while
    { i } buf i js@
    buf len i - dup { j } js@
    buf i js!
    buf j js!
    i 1+ repeat drop ;

/vocab