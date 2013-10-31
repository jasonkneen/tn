#!/usr/bin/env node
var fs = require("fs"),
	path = require("path"),
	child_process = require('child_process'),
	pkginfo = require('pkginfo')(module, 'version'),
	lb = require('os').EOL,
	logger = require("./lib/logger");

console.log("TiNy " + module.exports.version + " by Fokke Zandbergen <www.fokkezb.nl>." + lb + "The simple CLI for Titanium, Alloy and related tools." + lb);

// CONFIG
var config = {};
config.cwd = process.cwd();
config.home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
config.platforms = ['android', 'ios', 'tizen', 'blackberry', 'mobileweb'];
config.targets = ['simulator', 'device', 'distribute', 'dist-appstore', 'dist-adhoc'];
config.family = ['iphone', 'ipad', 'universal'];
config.aliases_path = path.join(config.home, '.tn.json');

if (!fs.existsSync(path.join(config.cwd, 'tiapp.xml'))) {
	logger.error("TiNy must be called in a Titanium project's root directory");
	process.exit();
}

// OPTIONS = WHAT ARGS TRANSLATE TO
var options = {
	titanium: true,
	build: true,
	platform: 'ios'
};

// ALIASES = USER DEFINED GROUPS OF ARGS
var aliases = fs.existsSync(config.aliases_path) ? require(config.aliases_path) : {};

// ARGS = USER INPUT
var args = process.argv.slice(2),
	i, l, arg, match, alias;

// PROCESS ARGS
for (i = 0, l = args.length; i < l; i++) {
	arg = args[i];

	// PLATFORM
	if (config.platforms.indexOf(arg) !== -1) {
		options.platform = arg;
	}

	// TARGET
	else if (config.targets.indexOf(arg) !== -1) {
		options.target = arg;
	}

	// FAMILY
	else if (config.family.indexOf(arg) !== -1) {
		options.family = arg;
	}

	// APPLY ALIAS
	else if (aliases[arg]) {
		args = args.concat(aliases[arg]);
		l = args.length;
	}

	// REMOVE/ADD ALIAS
	else if (match = arg.match(/^alias:([a-z0-9]+)$/)) {
		alias = match[1];

		if (l === 1) {

			if (aliases[alias]) {
				delete aliases[alias];
				logger.info('Removed alias: ' + alias);
			} else {
				logger.error('Could not find alias: ' + alias);
				process.exit();
			}

		} else {
			args.splice(i, 1);
			logger.info((aliases[alias] ? 'Updated' : 'Added') + ' alias: ' + alias);
			aliases[alias] = args;
		}

		fs.writeFileSync(config.aliases_path, JSON.stringify(aliases));
		process.exit();
	}

	// SDK
	else if (arg.match(/^[0-9]\.[0-9]\.[0-9]/)) {
		options.sdk = arg;
	}

	// IP
	else if (arg.match(/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/)) {
		options.ip = arg;
	}

	// FORCE
	else if (arg === 'force') {
		options.force = true;
	}
}

function execute(executable, params, callback) {
	var spawned = child_process.spawn(executable, params);

	spawned.stdout.setEncoding('utf8');
	spawned.stdout.pipe(process.stdout);
	spawned.stderr.pipe(process.stderr);
	spawned.on('close', function() { !! callback && callback();
	});
};

if (options.titanium) {
	var executable = 'titanium',
		params = [];

	if (options.build) {
		params.push('build');
	}

	if (options.sdk) {
		params.push('-s', options.sdk);
	}

	if (options.force) {
		params.push('-f');
	}

	if (options.target) {
		params.push('-T', options.target);
	}

	if (options.family) {
		params.push('-F', options.family);
	}

	params.push('-p', options.platform);

	logger.info('Executing: ' + executable + ' ' + params.join(' ') + lb);

	execute(executable, params, function() {
		console.log('Done!');
	});
}