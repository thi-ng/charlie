// _______ ___ ___ _______ _______ ___     ___ _______        ___ ___ ___ ___
// |   _   |   Y   |   _   |   _   |   |   |   |   _   |      |   Y   |   Y   |
// |.  1___|.  1   |.  1   |.  l   |.  |   |.  |.  1___|      |.  |   |.      |
// |.  |___|.  _   |.  _   |.  _   |.  |___|.  |.  __)_ ______|.  |   |. \_/  |
// |:  1   |:  |   |:  |   |:  |   |:  1   |:  |:  1   |______|:  1   |:  |   |
// |::.. . |::.|:. |::.|:. |::.|:. |::.. . |::.|::.. . |       \:.. ./|::.|:. |
// `-------`--- ---`--- ---`--- ---`-------`---`-------'        `---' `--- ---'
//
// (c) 2015 - 2025 Karsten Schmidt // MIT licensed

import type { Fn0, Fn } from "@thi.ng/api";

const VERSION = "1.0.2";

const BASE_DICT_ADDR = 0;
const BASE_HEAP_ADDR = 0x10000;
const MODE_IMMEDIATE = 0;
const MODE_COMPILE = 1;

const REGEXP_LIT_NUMBER = /^-?[0-9]*(\.[0-9]+)?$/;
const REGEXP_LIT_NUMBER_HEX = /^0x[0-9a-fA-F]{1,8}?$/;
const REGEXP_LIT_STRING = /^"(.*)$/;

// VM state

const PRIMS = {};
const MEM: any[] = [0];
const DS = [];
const RS = [];
let DSP = -1;
let RSP = -1;
let DP = BASE_DICT_ADDR + 1;
let IP = 0;
let NP = 0;
let HP = BASE_HEAP_ADDR;
let LATEST = 0;
let ERROR = false;
let SUSPEND = false;
let MODE = MODE_IMMEDIATE;

let TIB;
let READER: Reader;
let TOKEN_READER;

export type Stack = any[];
export type Memory = any[];
export type GetPtr = Fn0<number>;
export type Reader = (prior?: boolean) => string;
export type TokenReader = Fn0<string>;

export interface VMState {
	IP: number;
	NP: number;
	TIB: string;
	READER: Reader;
	TOKEN_READER: TokenReader;
}

export interface IVM {
	DS: Stack;
	DSP: GetPtr;
	RS: Stack;
	RSP: GetPtr;
	MEM: Memory;
	PRIMS: Record<string, number>;
	LATEST: GetPtr;
	IP: GetPtr;
	NP: GetPtr;
	VERSION: string;
	stdout: Fn<any, void>;
	stderr: Fn<any, void>;
	throwError: Fn<any, void>;
	isError: Fn0<boolean>;
	isSuspended: Fn0<boolean>;
	popD: typeof popD;
	pushD: typeof pushD;
	popR: typeof popR;
	pushR: typeof pushR;
	pushDict: typeof pushDict;
	next: typeof next;
	doColon: typeof doColon;
	defWord: typeof defWord;
	defColon: typeof defColon;
	defConst: typeof defConst;
	doWord: typeof doWord;
	doContinue: typeof doContinue;
	allWords: typeof allWords;
	interpreter: typeof interpreter;
}

export const Charlie = <IVM>{
	DS: DS,
	DSP: () => DSP,
	RS: RS,
	RSP: () => RSP,
	MEM: MEM,
	PRIMS: PRIMS,
	LATEST: () => LATEST,
	IP: () => IP,
	NP: () => NP,
	VERSION: VERSION,
	stdout(out) {
		console.log(out);
	},
	stderr(out) {
		console.error(out);
	},
	throwError(err) {
		this.stderr(err);
		ERROR = true;
	},
	isError: () => ERROR,
	isSuspended: () => SUSPEND,
};

const getVMState = (): VMState => ({
	IP: IP,
	NP: NP,
	TIB: TIB,
	READER: READER,
	TOKEN_READER: TOKEN_READER,
});

const setVMState = (state: VMState) => {
	IP = state.IP;
	NP = state.NP;
	TIB = state.TIB;
	READER = state.READER;
	TOKEN_READER = state.TOKEN_READER;
};

const popD = () => {
	if (DSP !== -1) {
		return DS[DSP--];
	} else {
		Charlie.throwError("DS underflow");
		return undefined;
	}
};

const pushD = (x) => {
	DS[++DSP] = x;
};

const popR = () => {
	if (RSP !== -1) {
		return RS[RSP--];
	} else {
		Charlie.throwError("RS underflow");
		return undefined;
	}
};

const pushR = (x: any) => {
	RS[++RSP] = x;
};

const pushDict = (x: any) => {
	MEM[DP++] = x;
	return (DP - 1) | 0;
};

const next = () => {
	IP = MEM[NP];
	NP++;
};

const doColon = () => {
	pushR(NP);
	IP++;
	NP = (IP + 1) | 0;
	IP = MEM[IP];
};

function defWord(name: string, fn: Fn0<void>): number;
function defWord(name: string, immediate: boolean, fn: Fn0<void>): number;
function defWord(name: string, immediate, fn?) {
	if (!fn) {
		fn = immediate;
		immediate = false;
	}
	const hd = [name || "", !!immediate, false, LATEST];
	LATEST = DP;
	pushDict(hd);
	pushDict(fn);
	PRIMS[name] = LATEST;
	return LATEST;
}

function defColon(name: string, words: string): number;
function defColon(name: string, immediate: boolean, words?: string): number;
function defColon(name: string, immediate: any, words?) {
	if (!words) {
		words = immediate;
		immediate = false;
	}
	if (typeof words === "string") {
		words = words.split(/[ \n]+/);
	}
	defWord(name, immediate, doColon);
	words.forEach(function (w) {
		pushDict(PRIMS[w]);
	});
	pushDict(PRIMS["exit"]);
	return LATEST;
}

const defConst = (name: string, val: any) =>
	defWord(name, false, () => {
		pushD(val);
		next();
	});

const findWord = (name: string) => {
	let curr = LATEST;
	while (true) {
		const currMem = MEM[curr];
		if (currMem[2] || currMem[0] !== name) {
			curr = currMem[3]; // prev
			if (curr === 0) {
				curr = undefined;
				break;
			}
		} else {
			break;
		}
	}
	return curr;
};

const allWords = (): string[] => {
	const words = [];
	let curr = LATEST;
	while (curr > 0) {
		const currMem = MEM[curr];
		if (!currMem[2]) {
			if (words.indexOf(currMem[0]) == -1) {
				words.push(currMem[0]);
			}
		}
		curr = currMem[3];
	}
	return words;
};

const setWordFlag = (flag) => () => {
	const f = popD();
	MEM[popD()][flag] = f;
	next();
};

const doWord = (addr: number, np: number) => {
	IP = addr;
	NP = np;
	try {
		do {
			MEM[++IP]();
		} while (!ERROR && !SUSPEND && IP !== 0);
	} catch (e) {
		Charlie.throwError(e);
	}
};

const doContinue = (state: VMState) => {
	console.log("state:", state);
	SUSPEND = false;
	setVMState(state);
	if (IP > 0) {
		doWord(IP, NP);
	}
	return doInterpreter();
};

const makeReader = (str: string) => {
	let i = 0;
	let ch: string;
	TIB = str;
	return (isPrior = false) => {
		if (isPrior) {
			return ch;
		}
		if (TIB === undefined) {
			return undefined;
		}
		ch = TIB[i++];
		return ch;
	};
};

const isTokenSeparator = (ch: string) => ch === " " || ch === "\n";

const isEOS = (ch: string) => ch === undefined;

const makeTokenReader = (read: Reader) => () => {
	let ch: string;
	let token = "";
	while (true) {
		ch = read();
		if (isTokenSeparator(ch)) {
			if (token === "") {
				continue;
			} else {
				break;
			}
		}
		if (isEOS(ch)) {
			break;
		}
		token += ch;
	}
	return token;
};

const readString = (str: string) => {
	const first = str.match(/(.*)"$/);
	if (first) {
		return first[1];
	}
	str += READER(true);
	let ch = "";
	while (ch !== undefined) {
		ch = READER();
		if (ch === "\\") {
			str += READER();
			continue;
		}
		if (ch === '"') {
			break;
		}
		str += ch;
	}
	return str;
};

const tokenValue = (token: string) => {
	if (token.match(REGEXP_LIT_NUMBER)) {
		return parseFloat(token);
	}
	if (token.match(REGEXP_LIT_NUMBER_HEX)) {
		return parseInt(token.substr(2), 16);
	}
	const str = token.match(REGEXP_LIT_STRING);
	if (str) {
		return readString(str[1]).replace(/\\n/g, "\n");
	}
	Charlie.throwError("Unknown word: " + token);
};

const compileToken = (token: string) => {
	const word = findWord(token);
	if (word === undefined) {
		const literal = tokenValue(token);
		if (literal !== undefined) {
			pushDict(PRIMS["lit"]);
			pushDict(literal);
		}
		return;
	}
	if (MEM[word] && MEM[word][1]) {
		// immediate mode
		doWord(word, 0);
		return;
	}
	pushDict(word);
};

const executeToken = (token: string) => {
	const word = findWord(token);
	if (word === undefined) {
		const literal = tokenValue(token);
		if (literal !== undefined) {
			pushD(literal);
		}
		return;
	}
	//console.log("exec: "+word);
	doWord(word, 0);
};

const INTERPRETER = [];
INTERPRETER[MODE_COMPILE] = compileToken;
INTERPRETER[MODE_IMMEDIATE] = executeToken;

const doInterpreter = () => {
	ERROR = false;
	SUSPEND = false;

	let token;

	while (!ERROR && !SUSPEND) {
		token = TOKEN_READER();
		if (token === "") {
			break;
		}
		INTERPRETER[MODE](token);
	}
	return DS;
};

const interpreter = (code: string) => {
	READER = makeReader(code);
	TOKEN_READER = makeTokenReader(READER);
	return doInterpreter();
};

// primitives

defWord("exit", () => {
	NP = popR();
	next();
});

defWord("suspend!", () => {
	SUSPEND = true;
	next();
});

defWord("sleep", () => {
	const pause = popD();
	next();
	const state = getVMState();
	setTimeout(() => {
		doContinue(state);
	}, pause);
	SUSPEND = true;
});

defConst("true", true);
defConst("false", false);
defConst("nil", null);
defConst("undefined", undefined);
defConst("*version*", VERSION);
defConst("*vm-mode-immediate*", MODE_IMMEDIATE);
defConst("*vm-mode-compile*", MODE_COMPILE);
defWord("compile-mode!", true, () => {
	MODE = MODE_COMPILE;
	next();
});
defWord("immediate-mode!", true, () => {
	MODE = MODE_IMMEDIATE;
	next();
});

defWord("\\", () => {
	let ch = "";
	while (ch !== undefined && ch !== "\n") {
		ch = READER();
	}
	next();
});

defWord("latest@", () => {
	pushD(LATEST);
	next();
});
defWord("latest!", () => {
	LATEST = popD();
	next();
});
defWord("heap-here@", () => {
	pushD(HP);
	next();
});
defWord("heap-here!", () => {
	HP = popD();
	next();
});
defWord("dict-here@", () => {
	pushD(DP);
	next();
});
defWord("dict-here!", () => {
	DP = popD();
	next();
});
defWord(">dict", () => {
	pushDict(popD());
	next();
});
defWord("dsp@", () => {
	pushD(DSP);
	next();
});
defWord("dsp!", () => {
	DSP = popD();
	next();
});
defWord("pick", () => {
	pushD(DS[DSP - popD() - 1]);
	next();
});
defWord("rsp@", () => {
	pushD(RSP);
	next();
});
defWord("rsp!", () => {
	RSP = popD();
	next();
});
defWord("rpick", () => {
	pushD(RS[RSP - popD() - 1]);
	next();
});
defWord("vm-mode@", () => {
	pushD(MODE);
	next();
});
defWord("vm-mode!", () => {
	MODE = popD();
	next();
});
defWord("vm-state@", () => {
	pushD(getVMState());
	next();
});
defWord("vm-state!", () => {
	doContinue(popD());
});
defWord("tib@", () => {
	pushD(TIB);
	next();
});
defWord("tib!", () => {
	next();
	const state = getVMState();
	interpreter(popD());
	doContinue(state);
});

defWord("find", () => {
	pushD(findWord(popD()));
	next();
});
defWord("call", () => {
	IP = popD();
});
defWord("jump", () => {
	NP = popD();
	next();
});
defWord("lit", () => {
	pushD(MEM[NP++]);
	next();
});
defWord("prev-word@", () => {
	pushD(MEM[popD()][3]);
	next();
});
defWord("prev-word!", () => {
	const w = popD();
	MEM[w][3] = popD();
	next();
});
defWord("xt->cfa", () => {
	pushD(popD() + 1);
	next();
});
defWord("cfa->dfa", () => {
	pushD(popD() + 1);
	next();
});

defWord("read-token>", () => {
	pushD(TOKEN_READER());
	next();
});
defWord("new-word-header", () => {
	defWord("", false, doColon);
	next();
});
defWord("set-word-name!", () => {
	const w = popD();
	MEM[w][0] = popD();
	next();
});
defWord("set-word-doc!", () => {
	const w = popD();
	MEM[w][4] = popD();
	next();
});
defWord("set-immediate!", setWordFlag(1));
defWord("set-hidden!", setWordFlag(2));

defColon("hide-latest!", "latest@ true set-hidden!");
defColon("show-latest!", "latest@ false set-hidden!");
defColon("immediate!", "latest@ true set-immediate!");
defColon(
	"new-word-header>",
	"read-token> new-word-header latest@ set-word-name!"
);
defColon(":", "new-word-header> hide-latest! compile-mode!");
defColon(";", true, "lit exit >dict immediate-mode! show-latest!");

defWord(".", () => {
	Charlie.stdout(popD());
	next();
});

// logic
defWord("and", () => {
	const a = !!popD();
	const b = !!popD();
	pushD(a && b);
	next();
});
defWord("or", () => {
	const a = !!popD();
	const b = !!popD();
	pushD(a || b);
	next();
});
defWord("not", () => {
	pushD(!popD());
	next();
});
defWord("=", () => {
	pushD(popD() === popD());
	next();
});
defWord("not=", () => {
	pushD(popD() !== popD());
	next();
});
defWord("<", () => {
	pushD(popD() > popD());
	next();
});
defWord(">", () => {
	pushD(popD() < popD());
	next();
});
defWord("<=", () => {
	pushD(popD() >= popD());
	next();
});
defWord(">=", () => {
	pushD(popD() <= popD());
	next();
});
defWord("zero?", () => {
	pushD(popD() === 0);
	next();
});
defWord("pos?", () => {
	pushD(popD() > 0);
	next();
});
defWord("neg?", () => {
	pushD(popD() < 0);
	next();
});
defWord("nil?", () => {
	pushD(popD() === null);
	next();
});

// maths

defWord("+", () => {
	const x = popD();
	pushD(popD() + x);
	next();
});
defWord("*", () => {
	pushD(popD() * popD());
	next();
});
defWord("-", () => {
	const x = popD();
	pushD(popD() - x);
	next();
});
defWord("/", () => {
	const x = popD();
	pushD(popD() / x);
	next();
});
defWord("mod", () => {
	const x = popD();
	pushD(popD() % x);
	next();
});
defWord("1+", () => {
	pushD(popD() + 1);
	next();
});
defWord("1-", () => {
	pushD(popD() - 1);
	next();
});
defWord("min", () => {
	const x = popD();
	pushD(Math.min(popD(), x));
	next();
});
defWord("max", () => {
	const x = popD();
	pushD(Math.max(popD(), x));
	next();
});
defWord("bit-and", () => {
	const b = popD();
	pushD(popD() & b);
	next();
});
defWord("bit-or", () => {
	const b = popD();
	pushD(popD() | b);
	next();
});
defWord("bit-xor", () => {
	const b = popD();
	pushD(popD() ^ b);
	next();
});
defWord("<<", () => {
	const b = popD();
	pushD(popD() << b);
	next();
});
defWord(">>", () => {
	const b = popD();
	pushD(popD() >> b);
	next();
});
defWord(">>>", () => {
	const b = popD();
	pushD(popD() >>> b);
	next();
});

// binary
defWord("bit-and", () => {
	pushD(popD() & popD());
	next();
});
defWord("bit-or", () => {
	pushD(popD() | popD());
	next();
});
defWord("bit-xor", () => {
	pushD(popD() ^ popD());
	next();
});

// data stack ops

defWord("drop", () => {
	popD();
	next();
});
defWord("dup", () => {
	pushD(DS[DSP]);
	next();
});
defWord("?dup", () => {
	const x = DS[DSP];
	if (x !== 0) {
		pushD(x);
	}
	next();
});
defWord("swap", () => {
	const b = DS[DSP];
	const a = DS[DSP - 1];
	DS[DSP - 1] = b;
	DS[DSP] = a;
	next();
});
defWord("nip", () => {
	const x = popD();
	popD();
	pushD(x);
	next();
});
defWord("tuck", () => {
	const b = popD();
	const a = popD();
	pushD(b);
	pushD(a);
	pushD(b);
	next();
});
defWord("over", () => {
	pushD(DS[DSP - 1]);
	next();
});
defWord("rot", () => {
	const c = DS[DSP];
	const b = DS[DSP - 1];
	const a = DS[DSP - 2];
	DS[DSP - 2] = b;
	DS[DSP - 1] = c;
	DS[DSP] = a;
	next();
});
defWord("-rot", () => {
	const c = DS[DSP];
	const b = DS[DSP - 1];
	const a = DS[DSP - 2];
	DS[DSP - 2] = c;
	DS[DSP - 1] = a;
	DS[DSP] = b;
	next();
});
defWord("2dup", () => {
	const b = DS[DSP];
	const a = DS[DSP - 1];
	pushD(a);
	pushD(b);
	next();
});
defWord("2drop", () => {
	popD();
	popD();
	next();
});
defWord("2swap", () => {
	const d = popD();
	const c = popD();
	const b = popD();
	const a = popD();
	pushD(c);
	pushD(d);
	pushD(a);
	pushD(b);
	next();
});

// return stack ops

defWord(">r", () => {
	pushR(popD());
	next();
});
defWord("r>", () => {
	pushD(popR());
	next();
});
defWord("@r", () => {
	pushR(DS[DSP]);
	next();
});
defWord("r@", () => {
	pushD(RS[RSP]);
	next();
});
defWord("rdrop", () => {
	popR();
	next();
});
defWord("rdup", () => {
	pushR(RS[RSP]);
	next();
});
defWord("rswap", () => {
	const b = popR(),
		a = popR();
	pushR(b);
	pushR(a);
	next();
});
defWord("2>r", () => {
	const b = popD(),
		a = popD();
	pushR(a);
	pushR(b);
	next();
});
defWord("2r>", () => {
	const b = popR(),
		a = popR();
	pushD(a);
	pushD(b);
	next();
});

// memory

defWord("@", () => {
	pushD(MEM[popD()]);
	next();
});
defWord("!", () => {
	MEM[popD()] = popD();
	next();
});
defWord("+!", () => {
	MEM[popD()] += popD();
	next();
});
defWord("-!", () => {
	MEM[popD()] -= popD();
	next();
});

// branching

defWord("branch", () => {
	NP = MEM[NP];
	next();
});
defWord("alt-branch", () => {
	popD() ? NP++ : (NP = MEM[NP]);
	next();
});

// JS

defWord("js-call", () => {
	pushD(popD()());
	next();
});
defWord("js-call-1", () => {
	pushD(popD()(popD()));
	next();
});
defWord("js-call-2", () => {
	const fn = popD();
	const b = popD();
	pushD(fn(popD(), b));
	next();
});
defWord("js-call-n", () => {
	const n = popD() - 1;
	const fn = popD();
	const args = [];
	let m = n;
	// TODO refactor
	for (; m >= 0; m--) {
		args.push(DS[DSP - m]);
	}
	for (m = n; m >= 0; m--) {
		popD();
	}
	pushD(fn.apply(window, args));
	next();
});
defWord("js-call-with", () => {
	const fn = popD();
	pushD(fn.call(popD()));
	next();
});
defWord("js-call-1-with", () => {
	const fn = popD();
	const obj = popD();
	pushD(fn.call(obj, popD()));
	next();
});
defWord("js-call-2-with", () => {
	const fn = popD();
	const obj = popD();
	const b = popD();
	pushD(fn.call(obj, popD(), b));
	next();
});
defWord("js-call-n-with", () => {
	const n = popD() - 1;
	const fn = popD();
	const obj = popD();
	const args = [];
	let m = n;
	// TODO refactor
	for (; m >= 0; m--) {
		args.push(DS[DSP - m]);
	}
	for (m = n; m >= 0; m--) {
		popD();
	}
	pushD(fn.apply(obj, args));
	next();
});
defWord("js-new", () => {
	const obj = popD();
	pushD(new obj());
	next();
});
defWord("js-new-1", () => {
	const obj = popD();
	pushD(new obj(popD()));
	next();
});
defWord("js-new-2", () => {
	const obj = popD();
	const b = popD();
	pushD(new obj(popD(), b));
	next();
});
defWord("js-new-n", () => {
	const n = popD();
	const obj = popD();
	const args = [];
	const inst = Object.create(obj.prototype);
	let m = n;
	// TODO refactor
	for (; m >= 0; m--) {
		args.push(DS[DSP - m]);
	}
	for (m = n; m >= 0; m--) {
		popD();
	}
	pushD(obj.apply(inst, args) || inst);
	next();
});
defWord("js-apply", () => {
	pushD(popD().apply(window, popD()));
	next();
});
defWord("js-apply-with", () => {
	pushD(popD().apply(popD(), popD()));
	next();
});
defWord("js-obj", () => {
	pushD({});
	next();
});
defWord("js-array", () => {
	pushD([]);
	next();
});
defWord("js@", () => {
	const key = popD();
	const obj = popD();
	pushD(obj === undefined || obj === null ? obj : obj[key]);
	next();
});
defWord("js!", () => {
	const key = popD();
	const obj = popD();
	obj[key] = popD();
	next();
});
defWord("js!!", () => {
	const key = DS[DSP];
	const obj = DS[DSP - 1];
	obj[key] = DS[DSP - 2];
	next();
});
defWord("js-apush", () => {
	DS[DSP - 1].push(popD());
	next();
});
defWord("typeof", () => {
	pushD(typeof popD());
	next();
});
defWord("js-fn?", () => {
	pushD(typeof popD() === "function");
	next();
});
defWord("js-obj?", () => {
	const obj = popD();
	pushD(obj !== null && typeof obj === "object" && !Array.isArray(obj));
	next();
});
defWord("js-array?", () => {
	pushD(Array.isArray(popD()));
	next();
});
defWord("quot->js-callback", () => {
	const qaddr = popD();
	pushD((e) => {
		pushD(e);
		interpreter(qaddr + " apply");
	});
	next();
});
defWord("quot->js-fn", () => {
	const qaddr = popD();
	pushD(() => {
		pushR(NP);
		NP = qaddr;
	});
	next();
});
defWord("*js-window*", () => {
	pushD(window);
	next();
});
defWord("*js-document*", () => {
	pushD(document);
	next();
});
defWord("js-create-element", () => {
	pushD(document.createElement(popD()));
	next();
});
defWord("js-element-by-id", () => {
	pushD(document.getElementById(popD()));
	next();
});
defWord("js-text!", () => {
	const elm = popD();
	elm.textContent = popD();
	next();
});
defWord("js-append-child", () => {
	const parent = popD();
	parent.appendChild(popD());
	next();
});
defWord("js-remove-child", () => {
	const parent = popD();
	parent.removeChild(popD());
	next();
});
defWord("js-parent-node", () => {
	pushD(popD().parentNode);
	next();
});
defWord("js-attr!", () => {
	const attr = popD();
	const elm = popD();
	elm.setAttribute(attr, popD());
	next();
});
defWord("js-console-log", () => {
	console.log(popD());
	next();
});
defWord("js-add-event-listener", () => {
	const elm = popD();
	const event = popD();
	const fn = popD();
	elm.addEventListener(event, fn);
	next();
});

Charlie.popD = popD;
Charlie.pushD = pushD;
Charlie.popR = popR;
Charlie.pushR = pushR;
Charlie.pushDict = pushDict;
Charlie.next = next;
Charlie.doColon = doColon;
Charlie.defWord = defWord;
Charlie.defColon = defColon;
Charlie.defConst = defConst;
Charlie.doWord = doWord;
Charlie.doContinue = doContinue;
Charlie.allWords = allWords;
Charlie.interpreter = interpreter;
