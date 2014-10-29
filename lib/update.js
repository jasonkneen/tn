var updateNotifier = require('update-notifier'),
  colors = require('colors');

module.exports = function update(opts) {

  var notifier = updateNotifier(opts);

  if (notifier.update) {

    var fill = function(str, count) {
      return (new Array(count + 1)).join(str);
    };

    var line1 = ' Update available: ' + (notifier.update.latest).green.bold +
      (' (current: ' + notifier.update.current + ')').grey + ' ';
    var line2 = ' Run ' + ('[sudo] npm update -g ' + opts.packageName + ' [--unsafe-perm]').blue +
      ' to update. ';
    var contentWidth = Math.max(colors.stripColors(line1).length, colors.stripColors(line2).length);
    var line1rest = contentWidth - colors.stripColors(line1).length;
    var line2rest = contentWidth - colors.stripColors(line2).length;
    var top = ('┌' + fill('─', contentWidth) + '┐').yellow;
    var bottom = ('└' + fill('─', contentWidth) + '┘').yellow;
    var side = ('│').yellow;

    var message =
      '\n\n' +
      top + '\n' +
      side + line1 + fill(' ', line1rest) + side + '\n' +
      side + line2 + fill(' ', line2rest) + side + '\n' +
      bottom + '\n';

    process.on('exit', function() {
      console.error(message);
    });
  }

};