var parser = require('./lib/parser');
var createContext = require('./lib/context');

module.exports = function() {
    return {
        compile: function(source) {
            return parser.parse(source);
        },
        context: createContext(),
        createEnvironment: require('./lib/env').create
    }
};