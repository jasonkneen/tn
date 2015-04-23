var child_process = require('child_process');

module.exports = function spawn(cmd, args, opts, callback) {

	if (process.platform === 'win32') {
		args = ['/c', cmd].concat(args);
		cmd = process.env.comspec;
	}

	var childProcess = child_process.spawn(cmd, args, opts || {});

	if (callback) {
		var stdout = '';
		var stderr = '';

		childProcess.stdout.on('data', function (data) {
			stdout += data.toString();
		});
		childProcess.stderr.on('data', function (data) {
			stderr += data.toString();
		});
		childProcess.on('close', function (code) {
			callback(code !== 0, stdout, stderr);
		});
		childProcess.on('error', function (err) {
			callback(err, stdout, stderr);
		});
	}

	return childProcess;
};
