var tiny = require('../lib/tiny');

exports.cliVersion = '>=3.2';
exports.title = 'TiNy';
exports.desc = 'TiNy Smart CLI for Titanium';
exports.extendedDesc = 'Fork me at http://github.com/fokkezb/tn';

exports.config = function (logger, config, cli) {
	return {
		noAuth: true
	}
};

exports.run = function (logger, config, cli) {
	tiny.run(cli.argv._);
};