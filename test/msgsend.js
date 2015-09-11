require('es6-promise').polyfill();

var test = require('tape');
var machine = require('../')();

function run(source, opts, cb) {

	program = machine.compile(source.join("\n") + "\n");

	var self = opts.self;
	if (!self) self = {};

	var env = opts.env;
	if (!env) env = {};
	env = machine.createEnvironment(env);

	machine.evaluate(env, self, program, function(err, res) {
		if (err) {
			console.log(err);
			throw err;
		} else {
			cb(res);
		}
	});

}

test("simple send", function(assert) {

	var x = 0;

	var myObj = {
		'$foo': function() { x = 1; }
	};

	assert.plan(1);
	run([
		"myObj foo"
	], {
		env: { myObj: myObj }
	}, function() {
		assert.equal(x, 1);
	});

});

test("self send", function(assert) {

	var x = 0;

	var myObj = {
		'$foo': function() { x = 1; }
	};

	assert.plan(1);
	run([
		"foo"
	], {
		self: myObj
	}, function() {
		assert.equal(x, 1);
	});

});

test("args", function(assert) {

	var x = 0;

	var myObj = {
		'$addThis$AndThat$': function(l, r) {
			x = l + r;
		}
	};

	assert.plan(1);
	run([
		"myObj addThis:10 AndThat: 20"
	], {
		env: { myObj: myObj }
	}, function() {
		assert.equal(x, 30);
	});

});

test("sequential send", function(assert) {
	
	var x = '';

	var obj1 = { '$a': function() { x += 'a'; } };
	var obj2 = { '$b': function() { x += 'b'; } };
	var self = { '$c': function() { x += 'c'; } };

	assert.plan(1);
	run([
		"obj1 a",
		"obj2 b",
		"c"
	], {
		env: { obj1: obj1, obj2: obj2 },
		self: self
	}, function() {
		assert.equal(x, 'abc');
	});

});

test("async send", function(assert) {

	function d(val) {
		return new Promise(function(resolve) {
			setTimeout(resolve.bind(null, val), 100);
		});
	}

	var res;
	var obj1 = { '$foo$': function(x) { res = x * 3; } };
	var obj2 = { '$bar$': function(x) { return d(x + 5); } };
	var obj3 = { '$baz$': function(x) { return d(x * 2); } };

	assert.plan(1);
	run([
		"obj1 foo:(obj2 bar: (obj3 baz: 10))",
	], {
		env: { obj1: obj1, obj2: obj2, obj3: obj3 }
	}, function() {
		assert.equal(res, 75);
	});

});
