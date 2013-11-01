var fs = require("fs"),
	path = require("path"),
	logger = require("./logger"),
	colors = require('colors'),
	lb = require('os').EOL,
	_ = require("underscore");

var path_home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var path_user = path.join(path_home, '.tn.json');

var aliases_system = require('./../tn.json'),
	aliases_user = fs.existsSync(path_user) ? require(path_user) : {},
	aliases_combined = _.extend({}, aliases_system, aliases_user),
	aliases_applied = [];

exports.has = function(alias) {
	return _.has(aliases_combined, alias);
};

exports.get = function(alias) {
	return aliases_combined[alias];
};

exports.list = function() {
	console.log('Aliases defined by: ' + ('system'.blue) + ', ' + ('user'.green) + ' and ' + ('user-override'.red) + lb);

	var aliases = _.keys(aliases_combined).sort();

	_.each(aliases, function (alias) {
		var args = aliases_combined[alias],
			aliascolor;

		if (_.has(aliases_user, alias)) {
			color = _.has(aliases_system, alias) ? 'red' : 'green';
		} else {
			color = 'blue';
		}

		console.log(alias + ': ' + (_.isString(args) ? args : args.join(' '))[color]);
	});
}

exports.apply = function(alias, args) {

    if (_.has(aliases_applied, alias)) {
        logger.error('Recursive alias: ' + alias);
        process.exit();
    }

	aliases_applied.push(alias);

	var i = _.indexOf(args, alias);

	if (_.isString(aliases_combined[alias])) {
		args.splice(i, 1, aliases_combined[alias]);
	} else {
		args = _.union(args.slice(0, i), aliases_combined[alias], args.slice(i + 1));
	}

	return args;
};

exports.set = function(alias, args) {

	if (_.has(aliases_user, alias)) {
		logger.info('Overwriting existing user alias: ' + alias);
	} else if (_.has(aliases_system, alias)) {
		logger.info('Setting user alias, overriding system: ' + alias);
	} else {
		logger.info('Setting user alias: ' + alias);
	}

	aliases_combined[alias] = aliases_user[alias] = args;

	fs.writeFileSync(path_user, JSON.stringify(aliases_user));
};

exports.unset = function(alias) {

	if (_.has(aliases_user, alias) === false) {
		logger.error('Could not find user alias to unset: ' + alias);
	
	} else {
		delete aliases_user[alias];
		aliases_combined = _.extend({}, aliases_system, aliases_user);

		logger.info('Unsetting alias: ' + alias);
	}

	fs.writeFileSync(path_user, JSON.stringify(aliases_user));
};