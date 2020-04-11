vocab/ HList
  : node ^( n -- addr ) 2 heap-allot @r ! -1 r@ 1+ ! r> ;
  : next ^( addr -- addr ) 1+ @ ;
  : proceed? ^( addr -- addr' flag ) dup pos? if next dup 0 >= else false then ;
  : cons ^( n addr -- addr ) swap node @r 1+ ! r> ;
  : rcons ^( n addr -- addr ) swap node @r swap 1+ ! r> ;
  : find-node ^( n addr -- addr ) begin dup pos? if 2dup @ not= else false then while 1+ @ repeat nip ;
  : contains? ^( n addr -- flag ) find-node pos? ;
  : list ^( a b .. n -- addr ) dup pos? if >r node r> 1- [ drop cons ] <dotimes> else drop then ;
  : list/ 0 begin read-token> dup "/list" not= while swap 1+ repeat drop list ;
  : map ^( quote addr -- ) 2dup swap apply begin proceed? while 2dup swap apply repeat 2drop ;
  : first ^( addr -- n ) dup pos? if @ else drop nil then ;
  : second ^( addr -- n ) proceed? if @ else drop nil then ;
  : third ^( addr -- n ) proceed? if second else drop nil then ;
  : length ^( addr -- len ) 1 >r begin proceed? while r> 1+ >r repeat drop r> ;
  : nth ^( addr n -- n' ) [ drop next ] <dotimes> @ ;
/vocab

\ HList. list/ 10 20 30 /list val> a