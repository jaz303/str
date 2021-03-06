var getPrototypeOf = Object.getPrototypeOf;
var hasOwnProperty = Object.prototype.hasOwnProperty;

exports.create = create;
function create(initial) {
    var env = Object.create(null);
    if (initial) {
        for (var k in initial) {
            env[k] = initial[k];
        }   
    }
    return env;
}

exports.find = find;
function find(env, key) {
    while (env) {
        if (hasOwnProperty.call(env, key)) {
            return env;
        }
        env = getPrototypeOf(env);
    }
    return null;
}
