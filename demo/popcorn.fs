"lib/synth.fs" include*

"waiting for libs..." .
2000 sleep

1  softy instr-osc1 !
10 softy instr-detune2 !
80 softy instr-env-release !

180      val> 1/8
1/8 2 *  val> 1/4

: play swap softy play sleep ;

: popcorn-a ( offset -- )
  C6  over + 1/8 play
  A#5 over + 1/8 play
  C6  over + 1/8 play
  G5  over + 1/8 play
  D#5 over + 1/8 play
  G5  over + 1/8 play
  C5  swap + 1/4 play ;

: popcorn-b ( offset -- )
  C6  over + 1/8 play
  D6  over + 1/8 play
  D#6 over + 1/8 play
  D6  over + 1/8 play
  D#6 over + 1/8 play
  C6  over + 1/8 play
  D6  over + 1/8 play
  C6  over + 1/8 play
  D6  over + 1/8 play
  A#5 over + 1/8 play
  C6  over + 1/8 play
  A#5 over + 1/8 play
  C6  over + 1/8 play
  G#5 over + 1/8 play
  C6  swap + 1/4 play ;

: popcorn ( -- )
  0  popcorn-a
  0  popcorn-a
  0  popcorn-b
  12 popcorn-a
  12 popcorn-a
  12 popcorn-b ;

"ok" .