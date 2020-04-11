vocab/ Math
*js-window* "Math" js@ val> *math*
*math*   "sin"    js@ val> *sin*
*math*   "cos"    js@ val> *cos*
*math*   "floor"  js@ val> *floor*
*math*   "ceil"   js@ val> *ceil*
*math*   "pow"    js@ val> *pow*
*math*   "random" js@ val> *random*
*math*   "sqrt"   js@ val> *sqrt*
*math*   "min"    js@ val> *min*
*math*   "max"    js@ val> *max*
*math*   "PI"     js@ val> pi
pi 2 /            val> half-pi
pi 2 *            val> two-pi
: sin    *sin*    js-call-1 ;
: cos    *cos*    js-call-1 ;
: floor  *floor*  js-call-1 ;
: ceil   *ceil*   js-call-1 ;
: sqrt   *sqrt*   js-call-1 ;
: pow    *pow*    js-call-2 ;
: min    *min*    js-call-2 ;
: max    *max*    js-call-2 ;
: random *random* js-call 2 * 1- ;
/vocab