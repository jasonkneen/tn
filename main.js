var kitchen = require('./lib/kitchen');

exports.parse = function (args) {
	var tray;

	tray = kitchen.cook(args);

	return tray ? tray.dinner : args;
};
