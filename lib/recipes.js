var fs = require("fs"),
	path = require("path"),
	logger = require("./logger"),
	colors = require('colors'),
	lb = require('os').EOL,
	_ = require("underscore");

var path_home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var path_user = path.join(path_home, '.tn.json');

var recipes_system = require('./../tn.json'),
	recipes_user = fs.existsSync(path_user) ? require(path_user) : {},
	recipes_combined = _.extend({}, recipes_system, recipes_user),
	recipes_applied = [];

exports.has = function(recipe) {
	return _.has(recipes_combined, recipe);
};

exports.get = function(recipe) {
	return recipes_combined[recipe];
};

exports.list = function() {
	console.log('Recipes defined by: ' + ('system'.blue) + ', ' + ('user'.green) + ' and ' + ('user-override'.red) + lb);

	var recipes = _.keys(recipes_combined).sort();

	_.each(recipes, function (recipe) {
		var args = recipes_combined[recipe],
			recipecolor;

		if (_.has(recipes_user, recipe)) {
			color = _.has(recipes_system, recipe) ? 'red' : 'green';
		} else {
			color = 'blue';
		}

		var commands = '';

		if (_.isString(args)) {
			commands += ' ' + args;
		} else {
			_.each(args, function (arg) {
				if (arg.indexOf(' ') !== -1) {
					commands += ' "' + arg + '"';
				} else {
					commands += ' ' + arg;
				}
			});
		}

		console.log(recipe + ':' + commands[color]);
	});
}

exports.apply = function(recipe, args) {

    if (_.has(recipes_applied, recipe)) {
        logger.error('Recursive recipe: ' + recipe);
        process.exit();
    }

    if (_.has(recipes_combined, recipe) === false) {
        logger.error('Unknown recipe: ' + recipe);
        process.exit();
    }

	recipes_applied.push(recipe);

	var i = _.indexOf(args, recipe);

	if (_.isString(recipes_combined[recipe])) {
		args.splice(i, 1, recipes_combined[recipe]);
	} else {
		args = _.union(args.slice(0, i), recipes_combined[recipe], args.slice(i + 1));
	}

	return args;
};

exports.set = function(recipe, args) {

	if (_.has(recipes_user, recipe)) {
		console.log('Overwriting existing user recipe: ' + recipe);
	} else if (_.has(recipes_system, recipe)) {
		console.log('Setting user recipe, overriding system: ' + recipe);
	} else {
		console.log('Setting user recipe: ' + recipe);
	}

	recipes_combined[recipe] = recipes_user[recipe] = args;

	fs.writeFileSync(path_user, JSON.stringify(recipes_user));

	return this;
};

exports.unset = function(recipe) {

	if (_.has(recipes_user, recipe) === false) {
		logger.error('Unknown user recipe: ' + recipe);
	
	} else {
		delete recipes_user[recipe];
		recipes_combined = _.extend({}, recipes_system, recipes_user);

		console.log('Unsetting recipe: ' + recipe);
	}

	fs.writeFileSync(path_user, JSON.stringify(recipes_user));

	return this;
};

exports.rename = function(oldRecipe, newRecipe) {

    if (_.has(recipes_user, oldRecipe) === false) {
        logger.error('Unknown user recipe: ' + oldRecipe);
        process.exit();
    }

    recipes_user[newRecipe] = recipes_user[oldRecipe];
	delete recipes_user[oldRecipe];
	recipes_combined = _.extend({}, recipes_system, recipes_user);

	console.log('Renaming recipe: ' + oldRecipe + ' > ' + newRecipe);

	fs.writeFileSync(path_user, JSON.stringify(recipes_user));

    return this;
};