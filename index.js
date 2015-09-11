var parser = require('./lib/parser');
var evaluate = require('./lib/evaluate');

module.exports = function() {
    return {
        compile: function(source) {
            return parser.parse(source);
        },
        evaluate: evaluate,
        createEnvironment: require('./lib/env').create
    }
};