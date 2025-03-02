// _______ ___ ___ _______ _______ ___     ___ _______        ___ ___ ___ ___
// |   _   |   Y   |   _   |   _   |   |   |   |   _   |      |   Y   |   Y   |
// |.  1___|.  1   |.  1   |.  l   |.  |   |.  |.  1___|      |.  |   |.      |
// |.  |___|.  _   |.  _   |.  _   |.  |___|.  |.  __)_ ______|.  |   |. \_/  |
// |:  1   |:  |   |:  |   |:  |   |:  1   |:  |:  1   |______|:  1   |:  |   |
// |::.. . |::.|:. |::.|:. |::.|:. |::.. . |::.|::.. . |       \:.. ./|::.|:. |
// `-------`--- ---`--- ---`--- ---`-------`---`-------'        `---' `--- ---'
//
// (c) 2015 - 2025 Karsten Schmidt // MIT licensed

import type { Fn } from "@thi.ng/api";
import { exposeGlobal } from "@thi.ng/expose";
import type { IVM, Stack } from "./vm.js";

const MAX_HISTORY = 50;
const MAX_SHOW = 200;
const MAX_SHOW_STACK = 20;

const replInput = <HTMLTextAreaElement>document.getElementById("repl-input")!;
const btEval = document.getElementById("bt-eval");
const replOutput = document.getElementById("repl-out");
const dsItems = document.getElementById("ds-items");
const rsItems = document.getElementById("rs-items");

const removeAllChildren = (elm: HTMLElement) => {
	while (elm.firstChild) {
		elm.removeChild(elm.firstChild);
	}
};

export class REPL {
	history: string[] = [];
	historySel: number;
	wordStart: number;
	wordCache: string[];
	wordCandidates: string[];
	nextCandidate: number;
	edited: boolean;
	codePrinter: Fn<string, void>;
	helpPrinter: Fn<string, void>;
	textPrinter: Fn<string, void>;
	errorPrinter: Fn<string, void>;

	constructor(public vm: IVM) {}

	replPush(elm) {
		replOutput.appendChild(elm);
		if (replOutput.children.length > MAX_SHOW) {
			replOutput.removeChild(replOutput.firstChild);
		}
		elm.scrollIntoView();
		replInput.focus();
	}

	defPrinter(class_name, prefix = "") {
		return (str: string) => {
			const elm = document.createElement("pre");
			elm.textContent = prefix + str;
			elm.className = class_name;
			if (class_name == "repl-out-code") {
				elm.addEventListener("click", () => {
					(<HTMLTextAreaElement>replInput).value = str;
					replInput.focus();
				});
			}
			this.replPush(elm);
		};
	}

	repl(code: string) {
		this.codePrinter(code);
		this.vm.interpreter(code);
		this.showDS();
		this.showRS();
		this.updateWordCache();
	}

	pushHistory(code) {
		const history = this.history;
		if (history[history.length - 1] === code) {
			return;
		}
		history.push(code);
		if (history.length > MAX_HISTORY) {
			history.shift();
		}
	}

	clearInput() {
		replInput.value = "";
		replInput.focus();
		this.historySel = undefined;
	}

	restoreHistory() {
		replInput.value = this.history[this.historySel];
	}

	historyBack() {
		if (!history.length) {
			return;
		}
		if (this.historySel === undefined || this.historySel === 0) {
			this.historySel = this.history.length - 1;
		} else {
			this.historySel--;
		}
		this.restoreHistory();
	}

	historyForward() {
		if (!history.length) {
			return;
		}
		if (
			this.historySel === undefined ||
			this.historySel === this.history.length - 1
		) {
			this.historySel = 0;
		} else {
			this.historySel++;
		}
		this.restoreHistory();
	}

	clearReplOut() {
		removeAllChildren(replOutput);
	}

	clearStackView(stack: HTMLElement) {
		removeAllChildren(stack);
	}

	showStackItem(stack: HTMLElement, val: any) {
		val = JSON.stringify(val).substr(0, 256);
		const el = document.createElement("pre");
		el.textContent = val;
		el.className = "stack-item";
		stack.appendChild(el);
	}

	showStack(sp: number, stack: Stack, el: HTMLElement) {
		this.clearStackView(el);
		for (var i = 0; sp >= 0 && i < MAX_SHOW_STACK; sp--, i++) {
			this.showStackItem(el, stack[sp]);
		}
	}

	showDS() {
		this.showStack(this.vm.DSP(), this.vm.DS, dsItems);
	}

	showRS() {
		this.showStack(this.vm.RSP(), this.vm.RS, rsItems);
	}

	evalInput() {
		this.pushHistory(replInput.value);
		this.repl(replInput.value);
		this.clearInput();
	}

	updateWordCache() {
		this.wordCache = this.vm.allWords();
	}

	injectNextCandidate() {
		const candidate = this.wordCandidates[this.nextCandidate];
		const src = replInput.value;
		replInput.value =
			src.substr(0, this.wordStart) +
			candidate +
			src.substr(replInput.selectionStart);
		replInput.selectionStart = replInput.selectionEnd =
			this.wordStart + candidate.length;
		this.nextCandidate =
			(this.nextCandidate + 1) % this.wordCandidates.length;
	}

	updateCandidates() {
		this.wordStart = replInput.selectionStart - 1;
		while (
			this.wordStart >= 0 &&
			replInput.value.charAt(this.wordStart) != " "
		) {
			this.wordStart--;
		}
		this.wordStart++;
		const word = replInput.value.substr(
			this.wordStart,
			replInput.selectionStart
		);
		this.wordCandidates = [];
		if (word.length) {
			for (let i = 0, n = this.wordCache.length; i < n; i++) {
				const w = this.wordCache[i];
				if (w.indexOf(word) === 0) {
					this.wordCandidates.push(w);
				}
			}
		}
		this.nextCandidate = 0;
	}

	autoComplete() {
		if (this.edited) {
			this.updateCandidates();
		}
		if (this.wordCandidates.length > 0) {
			this.injectNextCandidate();
		}
	}

	includeURI(url) {
		const req = new XMLHttpRequest();
		req.open("GET", url, true);
		req.responseType = "text";
		req.onload = () => this.repl(req.response);
		req.onerror = () => this.errorPrinter(`failed to load URL: ${url}`);
		req.send();
	}

	start() {
		replInput.addEventListener("keydown", (e) => {
			//console.log(e.which);
			if (e.metaKey) {
				switch (e.which) {
					case 13: // ENTER
						this.evalInput();
						break;
					case 38: // UP
						this.historyBack();
						break;
					case 40: // DOWN
						this.historyForward();
						break;
					case 75:
						this.clearReplOut();
						break;
					case 82:
						e.preventDefault();
						this.updateWordCache();
						this.helpPrinter(
							`word cache refreshed (${this.wordCache.length} words)`
						);
						break;
				}
			}
			if (e.which == 9) {
				e.preventDefault();
				this.autoComplete();
				this.edited = false;
			} else {
				this.edited = true;
			}
		});

		this.codePrinter = this.defPrinter("repl-out-code");
		this.helpPrinter = this.defPrinter("repl-out-help");
		this.vm.stdout = this.textPrinter = this.defPrinter("repl-out-text");
		this.vm.stderr = this.errorPrinter = this.defPrinter(
			"repl-out-error",
			"[ERROR] "
		);

		btEval.addEventListener("click", this.evalInput.bind(this));

		exposeGlobal("REPL", this, true);

		this.vm.interpreter(
			[
				'*js-window* "REPL" js@ val> *repl*',
				"500 val> *include-delay*",
				'"REPL JS class" set-doc-latest!',
				'"repl-out" js-element-by-id val> *repl-out*',
				'"REPL\'s output DOM element" set-doc-latest!',
				": add-to-repl ^( elm -- ) *repl-out* js-append-child ;",
				': include ^( url -- ) *repl* dup "includeURI" js@ js-call-1-with drop ;',
				": include* dsp@ 1+ >r begin dsp@ 0 >= while include repeat r> *include-delay* * sleep ;",
				": clear-repl-out ^( -- )",
				'  *repl* dup "clearReplOut" js@ js-call-with drop ;',
			].join("\n")
		);

		this.updateWordCache();

		this.helpPrinter(
			[
				"  _______   ___ ___   _______   _______   ___       ___   _______ ",
				" |   _   | |   Y   | |   _   | |   _   \\ |   |     |   | |   _   |",
				" |.  1___| |.  1   | |.  1   | |.  l   / |.  |     |.  | |.  1___|",
				" |.  |___  |.  _   | |.  _   | |.  _   1 |.  |___  |.  | |.  __)_ ",
				" |:  1   | |:  |   | |:  |   | |:  |   | |:  1   | |:  | |:  1   |",
				" |::.. . | |::.|:. | |::.|:. | |::.|:. | |::.. . | |::.| |::.. . |",
				" `-------' `--- ---' `--- ---' `--- ---' `-------' `---' `-------'",
				"                   ---=== thi.ng/charlie ===---                   ",
				"",
				" Command + Enter .................... evaluate",
				" Command + up/down .................. cycle history",
				" Command + R ........................ refresh autocomplete cache",
				" TAB ................................ autocomplete (repeat for alts)",
				" `show-words` / `show-public-words` . display known word list",
				" `doc> word` ........................ display word documentation",
				" `see> word` ........................ disassemble word definition",
			].join("\n")
		);

		replInput.focus();
	}
}
