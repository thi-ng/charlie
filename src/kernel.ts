// _______ ___ ___ _______ _______ ___     ___ _______        ___ ___ ___ ___
// |   _   |   Y   |   _   |   _   |   |   |   |   _   |      |   Y   |   Y   |
// |.  1___|.  1   |.  1   |.  l   |.  |   |.  |.  1___|      |.  |   |.      |
// |.  |___|.  _   |.  _   |.  _   |.  |___|.  |.  __)_ ______|.  |   |. \_/  |
// |:  1   |:  |   |:  |   |:  |   |:  1   |:  |:  1   |______|:  1   |:  |   |
// |::.. . |::.|:. |::.|:. |::.|:. |::.. . |::.|::.. . |       \:.. ./|::.|:. |
// `-------`--- ---`--- ---`--- ---`-------`---`-------'        `---' `--- ---'
//
// (c) 2015 - 2025 Karsten Schmidt // MIT licensed

/**
 * Partially based on:
 * https://github.com/phaendal/mkforth4-js/blob/master/builtin.fs
 */
export const KERNEL = [
	": find> read-token> find ;",
	": xt->dfa xt->cfa cfa->dfa ;",
	": vm-mode? vm-mode@ = ;",
	": compile-mode? *vm-mode-compile* vm-mode? ;",
	": immediate-mode? *vm-mode-immediate* vm-mode? ;",
	": ^immediate immediate! ; immediate!",
	": postpone ^immediate find> >dict ;",
	": 'lit lit lit >dict ;",
	": '>dict lit >dict >dict ;",
	": compile> ^immediate 'lit find> >dict '>dict ;",
	": recur ^immediate latest@ >dict ;",
	": latest-start latest@ xt->dfa ;",
	": tail-recur ^immediate compile> branch latest-start >dict ;",

	// control flow
	// if

	": <temp-flow> dict-here@ 0 >dict ;",
	": if ^immediate compile> alt-branch <temp-flow> ;",
	": <real-flow> dict-here@ swap ! ;",
	": then ^immediate <real-flow> ;",
	": else ^immediate compile> branch <temp-flow> swap <real-flow> ;",

	// loop

	": begin ^immediate dict-here@ ;",
	": until ^immediate compile> alt-branch >dict ;",
	": again ^immediate compile> branch >dict ;",
	": while ^immediate compile> alt-branch dict-here@ 0 >dict ;",
	": repeat ^immediate compile> branch swap >dict dict-here@ swap ! ;",

	// comments

	': l-paren? dup dup "(" = swap "^(" = or ;',
	': r-paren? dup ")" = ;',
	": -proc-r-paren r-paren? if drop 1- else drop then ;",
	": -proc-l-paren l-paren? if drop 1+ else -proc-r-paren then ;",
	": -proc-comment read-token> -proc-l-paren ;",
	": ( ^immediate 1 begin -proc-comment dup zero? until drop ;",

	// define word

	": create-word ( name -- ) new-word-header latest@ set-word-name! ;",

	// values

	": create-value create-word compile> lit >dict compile> exit ;",
	": val> ( x -- ) read-token> create-value ;",
	": value-addr ( xt -- addr ) xt->dfa 1+ ;",
	": set-when-compile ( addr -- ) compile> lit >dict compile> ! ;",
	": set> ( ?n -- ) ^immediate find> value-addr compile-mode? if set-when-compile else ! then ;",

	// doc comments

	"0 val> *doc-string*",
	": -doc-proc-r-paren r-paren? if drop 1-",
	'  else *doc-string* swap + " " + set> *doc-string* then ;',
	": -doc-proc-l-paren l-paren? if drop 1+ else -doc-proc-r-paren then ;",
	": -doc-proc-comment read-token> -doc-proc-l-paren ;",

	': ^( ^immediate "" set> *doc-string* 1 begin',
	"  -doc-proc-comment dup zero? until drop",
	"  compile-mode?",
	"  if *doc-string* latest@ set-word-doc! then ;",

	": get-word-name ^( xt -- name ) @ 0 js@ ;",
	": get-word-doc  ^( xt -- doc )  @ 4 js@ ;",
	": hidden?       ^( xt -- bool ) @ 2 js@ ;",
	": immediate?    ^( xt -- bool ) @ 1 js@ ;",

	": doc> find>",
	"  dup undefined = if",
	'    "Word not found" .',
	"  else",
	'    dup get-word-name " ( " + swap get-word-doc',
	'    dup undefined = if drop "no doc" then',
	'    + " )" + .',
	"  then ;",

	// post-add doc strings

	": set-word-doc> ^( doc -- ) find> set-word-doc! ;",
	": set-doc-latest! ^( doc -- ) latest@ set-word-doc! ;",
	'"name --" set-word-doc> create-word',
	'"x --" set-word-doc> val>',
	'"x --" set-word-doc> set>',

	// vars

	": cells-after ( n -- addr after-addr ) dict-here@ dup rot + ;",
	": allot ( n -- addr ) cells-after dict-here! ;",
	": create-variable ( name -- addr ) 1 allot swap create-word compile> lit >dict compile> exit ;",
	": var> ( n -- ) read-token> create-variable latest@ call ! ;",
	": ready-value ( n addr - addr value n ) dup @ rot ;",
	": +! ( n addr -- ) ready-value + swap ! ;", // FIXME: really need those?
	": -! ( n addr -- ) ready-value - swap ! ;", // FIXME:
	": inc! ( addr -- ) dup @ 1+ swap ! ;",
	": dec! ( addr -- ) dup @ 1- swap ! ;",

	// local variables

	"0 val> *locals-target-word*",
	": -clear-target-word-addr 0 set> *locals-target-word* ;",
	": -save-target-word latest@ set> *locals-target-word* ;",

	"0 val> *locals-true-prev*",
	": -save-true-prev latest@ prev-word@ set> *locals-true-prev* ;",
	": -restore-true-prev *locals-true-prev* latest@ prev-word! ;",

	": -2prev-chain ^( xt -- xt prev1 prev2 ) dup prev-word@ ( xt prev1 ) dup prev-word@ ;",

	": -swap-prev-chain",
	"    ^( var -> word -> prev => word -> var -> prev )",
	"    latest@ -2prev-chain  ( -- &var &word &prev )",
	"    rot tuck             ( -- &word &var &prev &var )",
	"    prev-word! swap tuck ( -- &word &var &word )",
	"    prev-word!           ( -- &word )",
	"    latest! ;",

	"0 val> *local-var-name*",
	"0 val> *local-var-addr*",

	": -allot-var-space ^( -- addr ) compile> branch dict-here@ 0 >dict ;",
	": -jump-to-here ^( addr -- ) dict-here@ swap ! ;",
	": create-local-var ^( name -- ) 0 swap create-value ;",
	": -save-local-var-addr latest@ set> *local-var-addr* ;",
	": -save-target-word *locals-target-word* zero? if -save-target-word -save-true-prev then ;",
	": -restore-target-word *locals-target-word* zero? not if -restore-true-prev then ;",
	": -compile-set-local compile> lit *local-var-addr* value-addr >dict compile> ! ;",

	": -compile-local-variable-definition ^( name -- addr )",
	"  set> *local-var-name*",
	"  -save-target-word",
	"  -allot-var-space",
	"  *local-var-name* create-local-var",
	"  -save-local-var-addr",
	"  -swap-prev-chain",
	"  -jump-to-here",
	"  -compile-set-local ;",

	': -close-local-variable? ^( token -- bool ) dup "}" = ;',
	': -close-stack-input?    ^( token -- bool ) dup "--" = ;',
	": -close-local-definition read-token> -close-local-variable? not if drop tail-recur then ;",

	": -read-local-definitions",
	"  read-token>",
	"  -close-local-variable? not if",
	"    -close-stack-input? not if",
	"      tail-recur",
	"    then drop -close-local-definition",
	"  then drop ;",

	": { ^immediate",
	"  0 -read-local-definitions",
	"  begin dup zero? not while",
	"    -compile-local-variable-definition",
	"  repeat drop ;",

	": : -clear-target-word-addr : ;",

	": ; ^immediate -restore-target-word postpone ; ;",

	// quotation

	": -open-quote-compile ( -- addr2 )",
	"  compile> lit      dict-here@ 0 >dict ( -- addr1 )",
	"  compile> branch dict-here@ 0 >dict ( -- addr1 addr2 )",
	"  swap                                 ( -- addr2 addr1 )",
	"  dict-here@                           ( -- addr2 addr1 start-quotation )",
	"  swap ! ;                             ( -- addr2 )",

	": -open-quote-immediate ( -- addr ) dict-here@ postpone compile-mode! ;",
	": -close-quote-compile ( addr2 -- ) dict-here@ swap ! ;",

	": [ ^immediate ( -- vm-mode addr2|addr1 )",
	"  vm-mode@ compile-mode? if -open-quote-compile else -open-quote-immediate then ;",

	": ] ^immediate ( vm-mode addr2|addr1 -- )",
	"  compile> exit swap vm-mode! compile-mode? if -close-quote-compile then ;",

	": apply ^immediate",
	"  compile-mode? if",
	"    compile> lit",
	"    dict-here@ 0 >dict",
	"    compile> >r",
	"    compile> jump",
	"    dict-here@ swap !",
	"  else",
	"    0 >r jump",
	"  then ;",

	": quote> ^immediate ( -- dfa )",
	"  compile-mode? if",
	"    compile> lit find> >dict compile> xt->dfa",
	"  else",
	"    find> xt->dfa",
	"  then ;",

	// stack ops

	": 2over 3 pick 3 pick ;",
	": 3dup dup 2over rot ;",
	": 4dup 2over 2over ;",

	// combinators

	"\\ https://gist.github.com/crcx/8060687",
	"\\ >r ... r>",
	": dip  swap >r apply r> ;",
	"\\ dup >r ... r>",
	": sip  over >r apply r> ;",
	"\\ 12 [ 3 * ] [ 4 * ] bi => 12 3 * 12 4 *",
	": bi >r sip r> apply ;",
	"\\ 2 4 [ 3 * ] [ 5 * ] bi* => 2 3 * 4 5 *",
	": bi* >r dip r> apply ;",
	"\\ 2 4 [ 3 * ] bi@ => 2 3 * 4 3 *",
	": bi@ dup bi* ;",

	// control flow w/ quotation

	": <if> { cond [true-part] [false-part] -- ... }",
	"  cond if [true-part] else [false-part] then apply ;",

	": <when> ^( cond quot ) [ ] <if> ;",

	": <unless> ^( cond quot ) [ ] swap <if> ;",

	": <while> ^( [cond-part] [loop-part] -- )",
	"  { [cond-part] [loop-part] }",
	"  begin [cond-part] apply while [loop-part] apply repeat ;",

	": <dotimes>",
	"  ^( counter [loop-part] -- ? )",
	"  { counter [loop-part] }",
	"  [ counter 0 > ]",
	"  [ counter [loop-part] apply counter 1- set> counter ]",
	"  <while> ;",

	": <dotimes2> { cin cout [loop-part] }",
	"  cin { cin' }",
	"  [ cout 0 >= ]",
	"  [ cin cout [loop-part] apply",
	"    cin 1- dup neg? if drop cin' then dup set> cin",
	"    cin' = if cout 1- set> cout then ]",
	"  <while> ;",

	// Case / switch

	": case/ ^immediate 0 ;",
	": of ^immediate",
	"  compile> swap",
	"  compile> tuck",
	"  compile> =",
	"  postpone if",
	"  compile> drop ;",
	": endof ^immediate postpone else ;",
	": default ^immediate compile> drop ;",
	": /case ^immediate",
	"  begin dup zero? not while postpone then repeat drop ;",

	// debug

	'*js-window* "String" js@ dup val> String "fromCharCode" js@ val> *charcode->str*',
	": [char] *charcode->str* js-call-1 ;",
	": hexdigit dup 10 < if 48 else 87 then + [char] ;",
	": hex8 dup 4 >> 15 bit-and hexdigit swap 15 bit-and hexdigit + ;",
	': hex16 "0x" swap dup 8 >> hex8 swap 255 bit-and hex8 + + ;',
	': hex24 "0x" swap dup 16 >> hex8 swap dup 8 >> hex8 swap 255 bit-and hex8 + + + ;',

	": hide! ( xt ) true set-hidden! ;",
	": forget { xt -- } xt prev-word@ latest! xt dict-here! ;",
	": forget> find> forget ;",
	': dump-memory dup hex24 " " + swap @ + . ;',
	": dump { addr len i -- } addr i + dump-memory len 1- pos? [ addr len 1- i 1+ tail-recur ] <when> ;",
	": dump ( addr len -- ) 0 dump ;",

	': dump-ds dsp@ 0 begin 2dup >= while dup "" swap + ": " + over 3 + pick + . 1+ repeat 2drop ;',
	': spy> "entering: " find> @r get-word-name + . dump-ds r> call ;',

	': show-rsp { rsp -- } rsp ": " + rsp rpick @ get-word-name + . ;',
	": dump-rs { rsp -- }  rsp 0 >= [ rsp show-rsp rsp 1- tail-recur ] <when> ;",
	": dump-rs rsp@ 1- dump-rs ;",

	": show-words",
	"  latest@ { adr }",
	'  ""',
	"  [ adr pos? ]",
	'  [ adr get-word-name + " " + adr prev-word@ set> adr ]',
	"  <while> . ;",

	': starts-with? ^( str pre -- flag ) swap dup "startsWith" js@ js-call-1-with ;',
	': public-word? "-" starts-with? not ;',

	": show-public-words",
	"  latest@ { adr }",
	'  ""',
	"  [ adr pos? ]",
	'  [ adr get-word-name dup public-word? if + " " + else drop then adr prev-word@ set> adr ]',
	"  <while> . ;",

	": count-words",
	"  latest@ { adr }",
	"  0",
	"  [ adr pos? ]",
	"  [ 1+ adr prev-word@ set> adr ]",
	"  <while> ;",

	// see

	": word-length { now-addr word-addr -- }",
	"  now-addr prev-word@ word-addr =",
	"  [ now-addr word-addr - ]",
	"  [ now-addr prev-word@ word-addr tail-recur ] <if> ;",

	": word-length { word-addr } latest@ word-addr word-length ;",

	": latest-word-length ( -- len ) dict-here@ latest@ - ;",

	": word-length { word-addr -- }",
	"  latest@ word-addr = [ latest-word-length ] [ word-addr word-length ] <if> ;",

	": ' ^immediate compile> lit find> >dict ;",

	": -see-1-addr { addr name -- str addr-inc }",
	'  "\n" addr hex24 +',
	'  " " + name + " " +',
	"  addr 1+ @ hex24 +",
	"  2 ;",

	': -see-mem-else { obj -- str } " " obj get-word-name + ;',

	": -see-mem-else { obj -- str }",
	'  obj js-fn? [ " [js-fn]" ] [ obj -see-mem-else ] <if> ;',

	": -see-mem-else { obj -- str }",
	'  obj js-array? [ " [js-array]" ] [ obj -see-mem-else ] <if> ;',

	": -see-mem-else { obj -- str }",
	'  obj js-obj? [ " [js-obj]" ] [ obj -see-mem-else ] <if> ;',

	": see-mem { addr -- str addr-inc }",
	"  addr @ case/",
	'    \' lit          of addr "lit"          -see-1-addr endof',
	'    \' branch     of addr "branch"     -see-1-addr endof',
	'    \' alt-branch of addr "alt-branch" -see-1-addr endof',
	'    \' exit         of "" 1                            endof',
	'    default "\n" addr hex24 + addr @ -see-mem-else + 1',
	"  /case ;",

	": -see-memory { str addr i -- str i }",
	"  addr i + see-mem ( str addr-inc )",
	"  i + set> i",
	"  str swap + i ;",

	": see { str addr len i -- code(str) }",
	"  i len >=",
	'  [ str " ;" + ]',
	"  [ str addr i -see-memory ( str i )",
	"    set> i set> str",
	"    str addr len i tail-recur ] <if> ;",

	": see { name addr len -- code(str) }",
	'  addr hex24 " : " + name +',
	"  addr 2 + len 2 -",
	"  0 see ;",

	": see { addr -- code(str) }",
	"  addr get-word-name",
	"  addr",
	"  addr word-length",
	"  see ;",

	": see> find>",
	"  dup undefined =",
	'  [ drop "word not found" . ]',
	"  [ see . ] <if> ;",

	// heap
	": heap-allot ^( n -- addr ) heap-here@ dup rot + heap-here! ;",

	": mem-copy ^( addr addr2 n -- )",
	"  { n } 0 begin dup n < while >r over @ over ! 1+ swap 1+ swap r> 1+ repeat",
	"  2drop drop ;",

	": clear-mem! { addr len }",
	"  0 len 1- begin dup 0 >= while 2dup addr + ! 1- repeat 2drop ;",

	": ds->heap ^( ... n addr )",
	"  over + 1-",
	"  swap 1- begin dup 0 >= while >r tuck ! 1- r> 1- repeat",
	"  drop 1+ ;",

	// arrays

	": array/ js-array begin",
	'  read-token> dup "/array" not= while',
	"  js-apush",
	"  repeat drop ;",

	": ds->array ^( a b c .. n array -- array )",
	"  { n array }",
	"  n [ dup pick array rot n swap - js! ] <dotimes>",
	"  n begin dup 0 > while swap drop 1- repeat drop array ;",

	// private

	': -create-priv-anchor "*private-anchor*" create-word ;',
	": compile-prev-to-latest-code ( this-addr -- )",
	"  compile> lit",
	"  prev-word@ >dict",
	"  compile> latest!",
	"  compile> exit ;",

	": -compile-first-anchor",
	"  dict-here@ { this-addr }",
	"  -create-priv-anchor",
	"  this-addr compile-prev-to-latest-code ;",

	': -get-priv-anchor-prev ( -- addr ) "*private-anchor*" find prev-word@ ;',

	': -hide-priv-anchor ( -- ) "*private-anchor*" find hide! ;',

	": -compile-prev-to-prev-code ( this-addr prev -- )",
	"  compile> lit >dict",
	"  compile> lit >dict",
	"  compile> prev-word! ;",

	": -compile-hide-self-code ( this-addr ) compile> lit >dict compile> hide! ;",

	": -compile-reveal-anchor-code { prev this-addr -- }",
	"  prev this-addr -compile-prev-to-prev-code",
	"  compile> exit ;",

	": -compile-reveal-anchor",
	"  -get-priv-anchor-prev { prev }",
	"  -hide-priv-anchor",
	"  dict-here@ { this-addr }",
	"  -create-priv-anchor",
	"  this-addr prev -compile-reveal-anchor-code ;",

	": private/ ^immediate -compile-first-anchor ;",
	': /private ^immediate "*private-anchor*" find call ;',
	": reveal>> ^immediate -compile-reveal-anchor ;",

	// exceptions

	"0 val> *no-exception-sign*",
	": exception-marker ( -- no-exception-sign ) rdrop *no-exception-sign* ;",
	"quote> exception-marker val> *exception-marker-dfa*",

	": catch ( dfa -- exception-code )",
	"  dsp@ 1- >r",
	"  *exception-marker-dfa* >r",
	"  apply ;",

	": exception-marker? ( rsp -- ) rpick *exception-marker-dfa* = ;",

	": continue-search-emarker? { rsp -- bool }",
	"  rsp -1 > rsp exception-marker? not and ;",

	": throw-exception { code rsp -- }",
	"  rsp 1- set> rsp",
	"  rsp rsp!",
	"  r> dsp!",
	"  code ;",

	": aborted-or-uncaught-throw ( code -- )",
	"  case/",
	'    -1 of "[ABORTED!]" . endof',
	'    "[UNCAUGHT THROW] " swap + .',
	"  /case",
	"  -1 rsp!",
	"  0 >r ;",

	": throw { exception-code -- }",
	"  rsp@ { rsp }",
	"  [ rsp continue-search-emarker? ]",
	"  [ rsp 1- set> rsp ] <while>",
	"  rsp -1 >",
	"  [ exception-code rsp throw-exception ]",
	"  [ exception-code aborted-or-uncaught-throw ] <if> ;",

	": throw { exception-code -- }",
	"  exception-code 0 not= [ exception-code throw ] <when> ;",

	": abort -1 throw ;",

	// vocabs
	"0 val> *vocab*",
	": vocab->anchor-addr ( addr -- addr ) 5 + ;",
	": vocab->latest-addr ( addr -- addr ) 6 + ;",
	": vocab->prevoc-addr ( addr -- addr ) 7 + ;",
	": vocab->prev ( addr -- addr )",
	"  vocab->anchor-addr @ prev-word@ ;",

	": prev-vocab@ ( addr -- addr ) vocab->prevoc-addr @ ;",
	": prev-vocab! ( addr voc-addr -- ) vocab->prevoc-addr ! ;",

	": -set-anchor-prev  { latest vocab-addr -- }",
	"  latest vocab-addr vocab->anchor-addr @ ( latest anchor-addr )",
	"  prev-word! ;",

	": -set-vocab-anchor ( anchor-addr vocab-addr -- ) vocab->anchor-addr ! ;",
	": -set-vocab-latest ( latest-addr vocab-addr -- ) vocab->latest-addr ! ;",

	": -create-vocab-header { name -- }",
	"  dict-here@",
	"  name create-word",
	"  compile> lit",
	"  >dict",
	"  compile> exit ;",

	": -allot-vocab-addrs",
	"  0 >dict   ( anchor-addr )",
	"  0 >dict   ( latest-addr )",
	"  0 >dict   ( prevoc-addr )",
	"  ;",

	": -create-anchor-word ( -- addr ) new-word-header latest@ ;",

	": search-in { vocab name -- addr }",
	"  latest@ { latest }",
	"  vocab vocab->latest-addr @ latest!",
	"  name find",
	"  latest latest! ;",

	": access-word-in ( vocab name -- )",
	"  search-in { word }",
	"  word immediate? not compile-mode? and",
	"  [ word >dict ]",
	"  [ word call ] <if> ;",

	": -create-accessor ( name -- addr )",
	'  "." + create-word',
	"  postpone ^immediate",
	"  compile> lit",
	"  dict-here@ 0 >dict",
	"  compile> read-token>",
	"  compile> access-word-in",
	"  compile> exit ;",

	": create-vocab { name -- }",
	"  name -create-accessor { accessor }",
	"  name -create-vocab-header",
	"  latest@ accessor !",
	"  -allot-vocab-addrs",
	"  latest@            { vaddr }",
	"  -create-anchor-word { aaddr }",
	"  aaddr vaddr -set-vocab-anchor",
	"  aaddr vaddr -set-vocab-latest",
	"  vaddr latest! ;",

	": open-vocab { addr -- }",
	"  latest@ addr -set-anchor-prev",
	"  addr vocab->latest-addr @ latest!",
	"  *vocab* addr prev-vocab!",
	"  addr set> *vocab* ;",

	": does-not-exist? ( name ) find undefined = ;",

	": create-vocab { name -- }",
	"  name does-not-exist?",
	"  [ name create-vocab ] <when> ;",

	": vocab/",
	"  read-token> { name }",
	"  name create-vocab",
	"  name find open-vocab ;",

	": /vocab",
	"  latest@ *vocab* -set-vocab-latest",
	"  *vocab* vocab->prev latest!",
	"  *vocab* prev-vocab@ set> *vocab* ;",

	// Core vocab

	"0 val> *kernel-latest*",
	'"Core" create-vocab',
	": -set-prev-to-now-prev { addr -- }",
	"  *vocab* vocab->prev addr -set-anchor-prev ;",

	": -set-now-prev-to-latest ( addr -- )",
	"  vocab->latest-addr @ *vocab* -set-anchor-prev ;",

	": with { addr -- }",
	"  addr -set-prev-to-now-prev ",
	"  addr -set-now-prev-to-latest ;",

	": with> find> with ;",

	": <<without>>",
	"  /vocab",
	"  *kernel-latest* latest!",
	"  Core open-vocab ;",

	"latest@ set> *kernel-latest*",
	"Core open-vocab",

	// List

	': -mark-as-cons-list { list -- } true list "cons?" js! ;',
	": list? { obj -- bool }",
	'  obj js-obj? [ obj "cons?" js@ true = ] [ obj nil? ] <if> ;',

	': set-first ( value list -- ) "first" js! ;',
	': set-rest  ( value list -- ) "rest"  js! ;',

	": cons { rest first -- list }",
	"  js-obj { list }",
	"  list -mark-as-cons-list",
	"  first list set-first",
	"  rest  list set-rest",
	"  list ;",

	': first ^( list -- value ) dup nil? [ "first" js@ ] <unless> ;',
	': rest  ^( list -- xs ) dup nil? [ "rest"  js@ ] <unless> ;',
	": second ^( list -- value ) rest first ;",
	": third  ^( list -- value ) rest rest first ;",

	": list> nil read-token> create-value ;",

	": reverse { xs acc -- xs }",
	"  xs nil? [ acc ] [ xs rest acc xs first cons tail-recur ] <if> ;",
	": reverse ( xs ) nil reverse ;",

	": length { xs acc -- len }",
	"  xs nil? [ acc ] [ xs rest acc 1+ tail-recur ] <if> ;",
	": length ( xs -- len ) 0 length ;",

	"private/",
	"  : push-when-compile",
	"    find> { vaddr }",
	"    vaddr >dict",
	"    compile> swap",
	"    compile> cons",
	"    compile> lit",
	"    vaddr value-addr >dict",
	"    compile> ! ;",

	"  : push-when-immediate",
	"    find> { vaddr }",
	"    vaddr call swap cons",
	"    vaddr value-addr ! ;",

	"  : pop-when-compile",
	"    find> { vaddr }",
	"    vaddr >dict",
	"    compile> first",
	"    vaddr >dict",
	"    compile> rest",
	"    compile> lit",
	"    vaddr value-addr >dict",
	"    compile> ! ;",

	"  : pop-when-immediate",
	"    find> { vaddr }",
	"    vaddr call first",
	"    vaddr call rest",
	"    vaddr value-addr ! ;",

	"  reveal>>",
	"  : push> ^immediate compile-mode? [ push-when-compile ] [ push-when-immediate ] <if> ;",
	"  : pop>  ^immediate compile-mode? [ pop-when-compile ]  [ pop-when-immediate ] <if> ;",
	"/private",

	"list> *list-expr-dsp*",

	"private/",
	"  : accum-list-fin  ( -- ) pop> *list-expr-dsp* drop ;",
	"  : accum-list-end? ( -- bool ) dsp@ *list-expr-dsp* first = ;",
	"  : accum-list { acc -- xs }",
	"    accum-list-end? [ accum-list-fin acc ] [ acc swap cons tail-recur ] <if> ;",
	"  reveal>>",
	"  : list/ ( -- ) dsp@ push> *list-expr-dsp* ;",
	"  : /list ( -- list ) nil accum-list ;",
	"/private",

	// DOM

	" vocab/ DOM private/",
	"  reveal>>",
	'  : create-div  ^( -- elm ) "div" js-create-element ;',
	'  : create-span ^( -- elm ) "span" js-create-element ;',

	"  : set-style { name value elm -- }",
	'    elm "style" js@ { style }',
	"    value style name js! ;",

	"  : first-second-rest { xs -- f s r }",
	"    xs first",
	"    xs second",
	"    xs rest rest ;",

	"  : set-styles { css-list elm -- }",
	"    css-list nil?",
	"    [ css-list first-second-rest { name value rest-list }",
	"      name value elm set-style",
	"      rest-list elm tail-recur ] <unless> ;",

	'  : hide { elm -- } "display" "none" elm set-style ;',
	'  : show { elm -- } "display" ""     elm set-style ;',

	"  : delete { elm -- }",
	"    elm js-parent-node { parent }",
	"    elm parent js-remove-child ;",

	"  : add-event-listener { quot elm event -- }",
	'    elm "addEventListener" js@ { adder }',
	"    quot quot->js-callback { callback }",
	"    callback event elm adder js-call-2-with drop ;",
	"/private /vocab",
].join("\n");
