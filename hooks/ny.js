var _ = require('underscore');

exports.cliVersion = '>=3.X';

exports.init = function(logger, config, cli) {

	_.each(['cli:command-not-found', 'cli:command-loaded', 'cli:pre-validate', 'cli:post-validate', 'cli:pre-execute', 'cli:post-execute'], function(hook) {

		cli.on(hook, function(e, next) {
			console.log(hook);

			next();
		});

	});
};