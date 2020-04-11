*js-window* "Date" js@ val> Date

: now Date js-new dup "getTime" js@ js-call-with ;
: timed { [timed-part] } now { t0 } [timed-part] apply "" now t0 - + "ms" + . ;

: timed-n ^( n block -- )
  { n block }
  n dup pos? if block timed 1- block tail-recur then drop ;
