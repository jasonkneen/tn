'use strict';

var _ = require('underscore'),
  fields = require('fields');

var config = require('./config'),
  recipes = require('./recipes'),
  logger = require('./logger'),
  utils = require('./utils');

exports.cook = cook;
exports.confirm = confirm;

function cook(ingr, opts) {
  var pan, i, tray = {};

  opts || (opts = {});

  // no ingredients, no cooking
  if (!_.isArray(ingr) || ingr.length === 0) {
    return;
  }

  // skip studio signature
  if (opts.cli && ingr[0] === '--no-colors') {
    return;
  }

  // skip help and version
  if (_.intersection(ingr, ['-h', '--help', '-v', '--version']).length > 0) {
    return;
  }

  // don't change original object
  pan = _.clone(ingr);

  // --skip
  if ((i = pan.indexOf('--skip')) !== -1) {

    // remove
    pan.splice(i, 1);

    // serve remainder as dinner
    tray.dinner = pan;

    return tray;
  }

  // --verbose
  if ((i = pan.indexOf('--verbose')) !== -1) {

    // remove
    pan.splice(i, 1);

    // set flag
    config.verbose = true;

    // save remainder as original recipe
    tray.recipe = _.clone(pan);
  }

  // first ingredient is a recipe > assume build command
  if (pan[0].substr(0, 1) === '-') {
    config.verbose && logger.debug('Prepending assumed build command');

    pan.unshift('build');

  } else {

    // first ingredient is an command alias
    if (config.commandAliases[pan[0]]) {
      config.verbose && logger.debug('Resolving command alias ' + pan[0].yellow + ' to '.white + config.commandAliases[pan[0]].yellow);

      pan[0] = config.commandAliases[pan[0]];
    }

    // the command is not build, this is as far as the rabbit hole goes
    if (pan[0] !== 'build') {
      config.verbose && logger.debug('Recipes are supported for the build-command only');

      // serve with resolved alias as dinner
      tray.dinner = pan;

      return tray;
    }
  }

  function heat(args, doNotOverheat) {
    var i, arg, matches, name, value, recipe;

    doNotOverheat || (doNotOverheat = []);

    i = 0;

    // loop until end
    while (i < args.length) {
      arg = args[i];

      matches = arg.match(/^--([a-z0-9-]+)$/);

      if (matches) {
        name = matches[1];

        if (name && recipes.has(name)) {

          // prevent infinite loop
          if (_.contains(doNotOverheat, name)) {
            logger.warn('Skipping recursive recipe: ' + name.yellow);

          } else {

            // find if next arg is value
            value = (args[i + 1] && args[i + 1].substr(0, 1) !== '-') ? args[i + 1] : null;

            config.verbose && logger.debug('Cooking recipe ' + name.yellow + (value ? ' with '.white + value.yellow : ''));

            // replace recipe name (and value) with the args of the recipe
            recipe = recipes.get(name, value);

            recipe = heat(recipe, _.union(doNotOverheat, [name]));

            var recipeLength = recipe.length;

            // replace recipe name (+ value) with the heated recipe
            recipe.unshift(i, value ? 2 : 1);
            args.splice.apply(args, recipe);

            // hop over the heated recipe
            i += recipeLength;
          }
        }
      }

      i++;
    }

    return args;
  }

  pan = heat(pan);

  pan = decorate(pan);

  // Show what TiNy made (only for build and create, not to mess with JSON output)
  console.log('TiNy'.cyan.bold + ' cooked: ' + 'ti '.yellow + utils.join(pan).yellow + '\n');

  tray.dinner = pan;

  return tray;
}

function confirm(tray, eat) {

  fields.select({
    title: 'What would you like me to do?',
    numbered: true,
    default: 1,
    options: [{
      label: 'Execute: ' + utils.join(tray.dinner).yellow,
      value: 'execute'
    }, {
      label: 'Save as recipe: ' + utils.join(tray.recipe).yellow,
      value: 'save'
    }, {
      label: 'Exit',
      value: 'exit'
    }]
  }).prompt(function(err, value) {

    if (err) {
      console.log();
      console.error(('' + err).red);

    } else if (value === 'execute') {
      eat();

    } else if (value === 'save') {

      fields.text({
        title: 'What do you want to name it?',
        validate: function(value) {

          if (/^([a-z0-9]+(?:-[a-z0-9]+)*)$/i.test(value)) {
            return true;
          }

          console.error('Error: format as: my-Recipe'.red);

          return false;
        }
      }).prompt(function(err, value) {

        if (err) {
          console.log();
          console.error(('' + err).red);
        } else {
          console.log();
          recipes.save(value, tray.recipe);
        }

        process.exit();

      });

    } else {
      process.exit();
    }
  });
}

function decorate(pan) {
  var platform, i, arg, matches, shrt, lng, j, l;

  // read the platform
  if ((i = pan.indexOf('--platform')) !== -1 || (i = pan.indexOf('-p')) !== -1) {
    platform = pan[i + 1];
  }

  for (i = 0; i < pan.length; i++) {
    arg = pan[i];

    matches = arg.match(/^-([a-z])$/i);

    // resolve aliases
    if (matches) {
      shrt = matches[1];

      if (config.aliases.shared[shrt]) {
        lng = config.aliases.shared[shrt];
      } else if (config[platform] && config[platform][shrt]) {
        lng = config[platform][shrt];
      } else {
        lng = null;
      }

      if (lng) {
        config.verbose && logger.debug('Resolving option alias ' + shrt.yellow + ' to '.white + lng.yellow);

        pan[i] = '--' + lng;
      }
    }

    // remove earlier duplicates
    for (j = 0; j < i; j++) {

      if (pan[j] === pan[i]) {

        l = (pan[j + 1] && pan[j + 1].substr(0, 1) !== '-') ? 2 : 1;

        config.verbose && logger.debug('Remvoving duplicate ' + utils.join(pan.slice(j, j + l)).yellow + ' in favor of '.white + utils.join(pan.slice(i, i + l)).yellow);

        // remove duplicate option (+ value) and rebase i
        i = i - pan.splice(j, l).length;
      }
    }
  }

  return pan;
}