var find = require('./env').find;

module.exports = evaluate;
function evaluate(env, self, program, cb) {

	function evalSend(env, receiver, message, args, cb) {
		var method = receiver[message.method];
		if (typeof method === 'function') {
			try {
				var result = method.apply(receiver, args);	
				if (isPromise(result)) {
					result.then(
						function(val) { cb(null, val); },
						function(err) { cb(err); }
					);
				} else {
					cb(null, result);
				}
			} catch (err) {
				return cb(err);
			}
		} else {
			cb(new Error("selector does not resolve to function: " + message.selector));
		}
	}

	function evalExpressionList(env, self, exps, cb) {
		var lst = [];
		(function _next(ix) {
			if (ix === exps.length) {
				cb(null, lst);
			} else {
				evalExpression(env, self, exps[ix], function(err, val) {
					if (err) return cb(err);
					lst.push(val);
					_next(ix + 1);
				});
			}
		})(0);
	}

	function evalExpression(env, self, exp, cb) {
		if (typeof exp === 'number' || typeof exp === 'string') {
			cb(null, exp);
		} else if (exp.type === 'send') {
			evalExpressionList(env, self, exp.args, function(err, args) {
				if (err) return cb(err);
				evalExpression(env, self, exp.receiver, function(err, receiver) {
					if (err) return cb(err);
					evalSend(env, receiver, exp, args, cb);
				});
			});
		} else if (exp.type === 'self-send') {
			evalExpressionList(env, self, exp.args, function(err, args) {
				if (err) return cb(err);
				evalSend(env, self, exp, args, cb);
			});
		} else if (exp.type === 'ident') {
			var sourceEnv = find(env, exp.name);
			if (!sourceEnv) {
				cb(new Error("undefined identifier: " + exp.name));
			} else {
				cb(null, sourceEnv[exp.name]);
			}
		} else {
			cb(new Error("unknown expression type: " + exp.type));
		}
	}

	var evalStatement = evalExpression;

	function evalSequence(env, self, list, cb) {
		(function _next(ix) {
			if (ix === list.length) {
				return cb(null);
			} else {
				evalStatement(env, self, list[ix], function(err) {
					if (err) return cb(err);
					_next(ix+1);
				});	
			}
		})(0);
	}

	evalSequence(env, self, program, cb);

}

function isPromise(thing) {
	return thing && (typeof thing.then === 'function');
}
