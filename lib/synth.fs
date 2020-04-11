"lib/audio.fs"
"lib/math.fs"
"lib/bench.fs"
"lib/swizzle.fs"
include*

44100                  val> *rate*
*rate* 44100 /         val> *rate-scale*
*rate-scale* 4 *       val> *ctrl-rate-scale*
174.614115728 *rate* / val> *freq-scale*
0x20000                val> *max-delay*
*max-delay* float32    val> *delay-buffer-left*
*max-delay* float32    val> *delay-buffer-right*
27                     val> *instr-size*
19                     val> *note-size*
8                      val> *max-poly*
*note-size* *max-poly*
* heap-allot           val> *note-buf*
*max-poly* heap-allot
dup                    val> *active-notes* *max-poly* clear-mem!

Math. two-pi           val> tau
Math. *sin*            val> sin

"C" "C#" "D" "D#" "E" "F" "F#" "G" "G#" "A" "A#" "B"
12 dup heap-allot ds->heap val> *raw-note-names*

\ C3 = 99, C4 = 111, C5 = 123
: note->freq ( n ) 128 - 12 / 2 swap Math. pow *freq-scale* * ;

: -make-note-word ^( name note )
  swap create-word compile> lit >dict compile> exit ;

: make-notes
  0 begin dup 60 < while
    dup 12 mod *raw-note-names* + @ ( i name )
    over 12 / 0 bit-or 3 + +        ( i name )
    over 99 +                       ( i name note )
    -make-note-word
    1+ repeat drop ;

make-notes

: note> read-token> read-token> -make-note-word ;

: osc-sin ^( f ) tau * sin js-call-1 ;
: osc-saw ^( f ) 1 mod 2 * 1- ;
: osc-sq  ^( f ) 1 mod 0.5 < if 1 else -1 then ;
: osc-tri ^( f ) 1 mod 4 * dup 2 < if 1- else 3 swap - then ;

[ osc-sin osc-saw osc-sq osc-tri ] val> *osc-table*

: get-osc ( id ) *osc-table* + @ ;

\ \\\\\\\\\\\\\\\\\\\\ instrument parameters

: instr-osc1           ;
: instr-osc1@          @ get-osc ;
: instr-vol1           1+ ;
: instr-semi1          2 + ;
: instr-xenv1          3 + ;
: instr-osc2           4 + ;
: instr-osc2@          4 + @ get-osc ;
: instr-vol2           5 + ;
: instr-semi2          6 + ;
: instr-detune2        7 + ;
: instr-xenv2          8 + ;
: instr-noise-vol      9 + ;
: instr-env-attack    10 + ;
: instr-env-sustain   11 + ;
: instr-env-release   12 + ;
: instr-lfo-osc       13 + ;
: instr-lfo-osc@      13 + @ get-osc ;
: instr-lfo-amp       14 + ;
: instr-lfo-freq      15 + ;
: instr-lfo-osc-freq  16 + ;
: instr-lfo-fx-freq   17 + ;
: instr-fx-filter     18 + ;
: instr-fx-freq       19 + ;
: instr-fx-res        20 + ;
: instr-fx-dist       21 + ;
: instr-fx-drive      22 + ;
: instr-fx-pan        23 + ;
: instr-fx-pan-freq   24 + ;
: instr-fx-delay-amp  25 + ;
: instr-fx-delay-time 26 + ;

\ \\\\\\\\\\\\\\\\\\\\ instrument definition

: instrument> *instr-size* dup heap-allot ds->heap val> ;

: clone-instrument ^( addr -- addr' ) *instr-size* heap-allot @r *instr-size* mem-copy r> ;

2 100 128 0 3 201 133 10 0 0 5 6 160 0 195 6 0.1 1 2 135 0 0 32 147 6 121 6 instrument> softy

\ \\\\\\\\\\\\\\\\\\\\ note structure

: note-start@ @ ;
: note-progress 1+  ;
: note-osc1-time 2 + ;
: note-osc2-time 3 + ;
: note-osc1-freq 4 + ;
: note-osc2-freq 5 + ;
: note-instr 6 + ; \ 13 entries
: note-age ^( t idx -- age ) *note-size* * *note-buf* + @ - ;

: init-note { addr note inst }
  addr now addr !
  note inst instr-semi1 @ + 128 - note->freq
       over note-osc1-freq !
  note inst instr-semi2 @ + 128 - note->freq
       inst instr-detune2 @ 0.0008 * 1+ *
       over note-osc2-freq !
  0 over 2dup 2dup note-progress ! note-osc1-time ! note-osc2-time !
  inst over note-instr 13 mem-copy ;

( check if note slot is active )
: free-note? ^( idx -- addr flag ) *active-notes* + @ zero? ;

( returns 1st free note slot or else oldest )
: find-free-note ( -- idx )
  now { t } -1 { idx } 0 { oldest-idx } -100 { max-age }
  *max-poly* 1-
  begin
    dup 0 >= idx neg? and while
    dup free-note?
    if dup set> idx
    else t over note-age dup max-age >
      if set> max-age dup set> oldest-idx else drop then
    then 1-
  repeat
  drop idx neg?
  if oldest-idx else idx then ;

: note-address ^( id ) *note-size* * *note-buf* + ;
: note-active? *active-notes* + @ 1 = ;

: clear-buffer! { buf start end } 0 buf end 1- begin dup start >= while js!! 1- repeat 2drop drop ;

: free-note-slot ^( id -- ) 0 swap *active-notes* + ! ;

: scaled-env-param ^( param -- param' ) dup *ctrl-rate-scale* * * ;

: note-env-params ^( noteaddr -- a s r invr )
  note-instr
  dup instr-env-attack @ scaled-env-param swap
  dup instr-env-sustain @ scaled-env-param swap
  instr-env-release @ scaled-env-param
  dup -1 swap / ;

: generate-note { lbuf rbuf size id instr }
  id note-active?
  if
  1 { e }
  id note-address dup { note }
  note-env-params 4dup { attack sustain release inv-release } drop
  note note-progress @ dup { progress } - + + { remaining }
  attack sustain + { sustain-end }
  remaining size <=
  if id free-note-slot else size set> remaining then
  note dup 2dup 2dup
  note-osc1-freq @ { osc1f } note-osc1-time @ { osc1t }
  note-osc2-freq @ { osc2f } note-osc2-time @ { osc2t }
  note-instr dup 2dup 2dup
  instr-osc1@ { osc1 } instr-vol1 @ { osc1vol } instr-xenv1 @ { xenv1 }
  instr-osc2@ { osc2 } instr-vol2 @ { osc2vol } instr-xenv2 @ { xenv2 }
  rbuf 0 begin dup remaining < while
    progress dup attack < if
      attack / set> e
    else
      sustain-end >=
      if progress sustain-end - inv-release * 1+ set> e then
    then
    osc1f xenv1 if e dup * * then osc1t + dup set> osc1t osc1 call osc1vol *
    osc2f xenv2 if e dup * * then osc2t + dup set> osc2t osc2 call osc2vol * +
    e 0.002441481 * *
    >r 2dup 2dup js@ r> + -rot js! ( update rbuf )
    progress 1+ set> progress
    1+
 repeat
 2drop
 ( note )
 osc1t over note-osc1-time !
 osc2t over note-osc2-time !
 progress swap note-progress !
 then ;

\ *note-buf* 135 softy init-note 1 *active-notes* ! drop

\ 2048 float32 val> buf

\ *note-buf* 7 *note-size* * + 99 softy init-note 1 *active-notes* 7 + !

\ *note-buf* *note-size* 8 * dump

: render-slice { frames }
  [ dup 0 frames clear-buffer!
    nil swap frames 0 softy generate-note
    rdrop rdrop ] ;

: play { note instr } *note-buf* note instr init-note drop 1 *active-notes* ! ;

Audio. new-context val> ctx
2048 render-slice 2048 1 ctx Audio. new-script val> script

(

*note-buf* C6 softy init-note drop
250 sleep
*note-buf* D#6 softy init-note drop
375 sleep
*note-buf* A6 softy init-note drop

)