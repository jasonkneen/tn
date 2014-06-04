var colors = require('colors');

exports.cliVersion = '>=3.2';

exports.init = function(logger, config, cli, nodeappc) {

  cli.on('build.config', function(data, callback) {

    // input args
    var args = cli.argv['$_'];

    // sdk-specific config of command options
    var cfg = data.result[1];

    // let the cook cook
    require('../lib/cook').cook(args, cfg, function(cooked) {

      // replace input args with cooked ones
      if (cooked) {
        cli.argv['$_'] = cooked;
      }

      // continue "ti build"
      callback(null, data);
    });
  });
};