// This code was kindly stolen from: https://github.com/appcelerator/alloy/blob/master/Alloy/logger.js

var colors = require('colors');

exports.TRACE = 4;
exports.DEBUG = 3;
exports.INFO = 2;
exports.WARN = 1;
exports.ERROR = 0;
exports.NONE = -1;
exports.logLevel = exports.TRACE;

exports.trace = function(msg) {
    if (exports.logLevel >= exports.TRACE) { printMessage(msg, 'trace', 'grey'); }
};

exports.debug = function(msg) {
    if (exports.logLevel >= exports.DEBUG) { printMessage(msg, 'debug', 'cyan'); }
};

exports.info = function(msg) {
    if (exports.logLevel >= exports.INFO) { printMessage(msg, 'info', 'white'); }
};

exports.warn = function(msg) {
    if (exports.logLevel >= exports.WARN) { printMessage(msg, 'warn', 'yellow'); }
};

exports.error = function(msg) {
    if (exports.logLevel >= exports.ERROR) { printMessage(msg, 'error', 'red'); }
};

// Private functions and members
var levels = ['info','debug','error','warn','trace'];
var has = function(array, item) {
    var len = array.length;
    for (var i = 0; i < len; i++) {
        if (array[i] === item) {
            return true;
        }
    }
    return false;
};
var isArray = function(object) {
    return Object.prototype.toString.call(object) === '[object Array]';
};

var printMessage = function(msg, level, color) {
    // Validate arguments
    msg = msg || '';
    level = level || 'info';
    level = has(levels, level) ? level : 'info';
    color = color || 'white';

    // Have to wrap in a function to avoid "Illegal invocation" error on android
    var logFunc = function(msg) {
        (level === 'debug' || level === 'trace' ? console.log : console[level])(msg);
    };

    function printLine(line) {
        if (isArray(line)) {
            for (var i = 0; i < line.length; i++) {
                printLine(line[i]);
            }
        } else {
            var tag = '[' + level.toUpperCase() + '] ';
            var str = tag.grey + (line || '')[color];
            logFunc(str);
        }
    }
    printLine(msg);
};