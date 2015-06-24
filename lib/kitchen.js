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

  // skip help, version and --skip
  if (_.intersection(ingr, ['-h', '--help', '-v', '--version']).length > 0) {
    return;
  }

  // don't change original object
  pan = _.clone(ingr);

  // --verbose
  if ((i = pan.indexOf('--verbose')) !== -1) {

    // remove
    pan.splice(i, 1);

    // set flag
    config.verbose = true;

    // save remainder as original recipe
    tray.recipe = _.clone(pan);
  }

  // first ingredient is a command recipe
  if (pan[0].substr(0, 1) !== '-' && recipes.has(pan[0])) {
    pan[0] = '--' + pan[0];
  }

  function heat(args, doNotOverheat, prefix) {
    var i, arg, matches, name, value, recipe, before, after;

    i = 0;

    // loop until end
    while (i < args.length) {
      arg = args[i];

      matches = arg.match(/^--([a-z0-9-]+)$/);

      if (matches) {
        name = matches[1];

        if (name && recipes.has(name)) {

          // prevent infinite loop
          if (doNotOverheat && _.contains(doNotOverheat, name)) {
            // config.verbose && logger.debug('Skipped ' + name.cyan + ' recursive recipe'.white);

          } else {

            // find if next arg is value
            value = (args[i + 1] && args[i + 1].substr(0, 1) !== '-') ? args[i + 1] : null;

            config.verbose && logger.debug(prefix + 'Cooking ' + name.cyan + ' recipe'.white + (value ? ' with ' + value.cyan : '') + ' ..');

            // replace recipe name (and value) with the args of the recipe
            recipe = recipes.get(name, value);
            recipe = heat(recipe, _.union(doNotOverheat || [], [name]), prefix + '  ');

            before = args.slice(0, i);
            after = args.slice(i + (value ? 2 : 1));

            args = before.concat(recipe, after);

            config.verbose && logger.debug(prefix + '.. into: '.white + utils.join(before).yellow + ' ' + utils.join(recipe).cyan + ' ' + utils.join(after).yellow);

            // hop over the heated recipe
            i += recipe.length - 1;
          }
        }
      }

      i++;
    }

    return args;
  }

  pan = heat(pan, null, '');

  pan = decorate(pan);

  tray.dinner = pan;

  return tray;
}

function confirm(tray, eat) {

  fields.select({
    title: 'What would you like me to do?',
    numbered: true,
    default: 1,
    options: [{
      label: 'Execute: ' + 'ti '.yellow + utils.join(tray.dinner).yellow,
      value: 'execute'
    }, {
      label: 'Save as recipe: ' + utils.join(tray.recipe).yellow,
      value: 'save'
    }, {
      label: 'Exit',
      value: 'exit'
    }]
  }).prompt(function (err, value) {

    if (err) {
      console.log();
      console.error(('' + err).red);

    } else if (value === 'execute') {
      eat();

    } else if (value === 'save') {

      fields.text({
        title: 'What do you want to name it?',
        validate: function (value) {

          if (/^([a-z0-9]+(?:-[a-z0-9]+)*)$/i.test(value)) {
            return true;
          }

          console.error('Error: format as: my-Recipe'.red);

          return false;
        }
      }).prompt(function (err, value) {

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
  var platform, i, arg, matches, shrt, lng, j, l, dupe;

  // assume build
  if (pan[0][0] === '-') {
    pan.unshift('build');
  }

  // read the (last) platform
  if ((i = pan.lastIndexOf('--platform')) !== -1 || (i = pan.lastIndexOf('-p')) !== -1) {
    platform = pan[i + 1];
  }

  for (i = 0; i < pan.length; i++) {
    arg = pan[i];

    if (arg.substr(0, 1) === '-') {
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
          pan[i] = '--' + lng;

          config.verbose && logger.debug('Resolved ' + shrt.cyan + ' option alias: '.white + 'ti '.yellow + utils.join(pan).yellow);
        }
      }

      // remove earlier duplicates
      for (j = 0; j < i; j++) {

        if (pan[j] === pan[i]) {

          l = (pan[j + 1] && pan[j + 1].substr(0, 1) !== '-') ? 2 : 1;

          dupe = pan.slice(j, j + l);

          // remove duplicate option (+ value) and rebase i
          i = i - pan.splice(j, l).length;

          config.verbose && logger.debug('Removed ' + utils.join(dupe).cyan + ' duplicate: '.white + 'ti '.yellow + utils.join(pan).yellow);
        }
      }
    }
  }

  return pan;
}
