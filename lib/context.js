var find = require('./env').find;

module.exports = create;
function create() {

	var CONTINUE		= 1;
	var WAIT 			= 2;
	var EXIT 			= 3;

	var state 			= 'idle';
	var thunk 			= null;
	var thunkArg		= null;
	var exitCb			= null;
	var exitError		= null;

	function go() {
		do {
			var res = thunk(thunkArg)
		} while (res === CONTINUE);
		if (res === WAIT) {
			state = 'wait';
		} else if (res === EXIT) {
			state = 'done';
			if (exitCb) {
				exitCb(exitError);
			}
		}
	}

	var ctx = {
		lookup: function(receiver, message) {
			return receiver[message.method];
		},

		wait: function(promise, cont, error) {
			promise.then(function(res) {
				_resume(cont, res);
			}, function(err) {
				_resume(error, err);
			});
			return WAIT;
			function _resume(fn, arg) {
				thunk = fn;
				thunkArg = arg;
				state = 'running';
				go();
			}
		},

		thunk: function(fn, arg) {
			thunk = fn;
			thunkArg = arg;
			return CONTINUE;
		},

		run: function(env, self, program, cb) {
			if (state !== 'idle') {
				throw new Error("state error: run() can only be called when idle");
			}
			exitCb = cb;
			state = 'starting';
			thunk = function() {
				return evaluate(
					ctx, env, self, program,
					function() {
						return EXIT;
					},
					function(err) {
						exitError = err;
						return EXIT;
					}
				)
			}
			thunkArg = null;
			setTimeout(function() {
				state = 'running';
				go();
			}, 0);
		}
	};

	return ctx;

};

function evaluate(ctx, env, self, program, cont, error) {

	function evalSend(ctx, env, receiver, message, args, cont, error) {
    	var method = ctx.lookup(receiver, message);
        if (typeof method === 'function') {
            try {
                var result = method.apply(receiver, args);  
                if (isPromise(result)) {
                	return ctx.wait(result, cont, error);
                } else {
                	return ctx.thunk(cont, result);
                }
            } catch (err) {
            	return ctx.thunk(error, err);
            }
        } else {
        	return ctx.thunk(error, new Error("selector does not resolve to function: " + message.selector));
        }
    }

    function evalExpressionList(ctx, env, self, exps, cont, error) {
        var lst = [];
        return (function _next(ix) {
            if (ix === exps.length) {
            	return ctx.thunk(cont, lst);
            } else {
                return evalExpression(ctx, env, self, exps[ix], function(val) {
                    lst.push(val);
                    return _next(ix + 1);
                }, error);
            }
        })(0);
    }

    function evalExpression(ctx, env, self, exp, cont, error) {
        if (typeof exp === 'number' || typeof exp === 'string') {
        	return ctx.thunk(cont, exp);
        } else if (exp.type === 'send') {
            return evalExpressionList(ctx, env, self, exp.args, function(args) {
                return evalExpression(ctx, env, self, exp.receiver, function(receiver) {
                    return evalSend(ctx, env, receiver, exp, args, cont, error);
                }, error);
            }, error);
        } else if (exp.type === 'self-send') {
            return evalExpressionList(ctx, env, self, exp.args, function(args) {
                return evalSend(ctx, env, self, exp, args, cont, error);
            }, error);
        } else if (exp.type === 'ident') {
            var sourceEnv = find(env, exp.name);
            if (!sourceEnv) {
            	return ctx.thunk(error, new Error("undefined identifier: " + exp.name));
            } else {
            	return ctx.thunk(cont, sourceEnv[exp.name]);
            }
        } else {
        	return ctx.thunk(error, new Error("unknown expression type: " + exp.type));
        }
    }

    var evalStatement = evalExpression;

    function evalSequence(ctx, env, self, list, cont, error) {
        return (function _next(ix) {
            if (ix === list.length) {
            	return ctx.thunk(cont, null);
            } else {
                return evalStatement(ctx, env, self, list[ix], function() {
                    return _next(ix+1);
                }, error); 
            }
        })(0);
    }

    return evalSequence(ctx, env, self, program, cont, error);

}

function isPromise(thing) {
    return thing && (typeof thing.then === 'function');
}
