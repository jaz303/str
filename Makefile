lib/parser.js: lib/grammar.peg
	./node_modules/pegjs/bin/pegjs $< $@
