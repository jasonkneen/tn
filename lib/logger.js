const chalk = require('chalk'),
  _ = require('lodash');

const levels = {
  // Printed without a label: when every line carries one it stops meaning
  // anything, and warnings and errors are the ones worth spotting.
  info: {
    color: chalk.white,
    bare: true,
  },
  trace: {
    color: chalk.gray,
  },
  debug: {
    color: chalk.blue,
    level: 'log',
  },
  error: {
    color: chalk.red,
  },
  warn: {
    color: chalk.yellow,
  },
  ok: {
    color: chalk.green,
    level: 'info',
  },
};

_.each(levels, function (settings, label) {
  exports[label] = function (msg) {
    const out = console[settings.level || label];

    if (settings.bare) {
      out(msg);
      return;
    }

    out(
      settings.color('[' + label.toUpperCase() + ']') +
        (label.length !== 5 ? new Array(6 - label.length).join(' ') : '') +
        ' ' +
        msg
    );
  };
});
