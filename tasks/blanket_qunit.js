/*
 * grunt-contrib-qunit
 * http://gruntjs.com/
 *
 * Copyright (c) 2012 "Cowboy" Ben Alman, contributors
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

    // Nodejs libs.
    var path = require('path');

    // External lib.
    var phantomjs = require('grunt-contrib-qunit/node_modules/grunt-lib-phantomjs').init(grunt);

    // Keep track of the last-started module, test and status.
    var currentModule, currentTest, status, coverageThreshold;
    // Keep track of the last-started test(s).
    var unfinished = {};

    // Get an asset file, local to the root of the project.
    var asset = path.join.bind(null, __dirname, '..');

    // Allow an error message to retain its color when split across multiple lines.
    var formatMessage = function(str) {
        return String(str).split('\n').map(function(s) { return s.magenta; }).join('\n');
    };

    // Keep track of failed assertions for pretty-printing.
    var failedAssertions = [];
    var logFailedAssertions = function() {
        var assertion;
        // Print each assertion error.
        while (assertion = failedAssertions.shift()) {
            grunt.verbose.or.error(assertion.testName);
            grunt.log.error('Message: ' + formatMessage(assertion.message));
            if (assertion.actual !== assertion.expected) {
                grunt.log.error('Actual: ' + formatMessage(assertion.actual));
                grunt.log.error('Expected: ' + formatMessage(assertion.expected));
            }
            if (assertion.source) {
                grunt.log.error(assertion.source.replace(/ {4}(at)/g, '  $1'));
            }
            grunt.log.writeln();
        }
    };

    // QUnit hooks.
    phantomjs.on('qunit.moduleStart', function(name) {
        unfinished[name] = true;
        currentModule = name;
    });

    phantomjs.on('qunit.moduleDone', function(name/*, failed, passed, total*/) {
        delete unfinished[name];
    });

    phantomjs.on('qunit.log', function(result, actual, expected, message, source) {
        if (!result) {
            failedAssertions.push({
                actual: actual, expected: expected, message: message, source: source,
                testName: currentTest
            });
        }
    });

    phantomjs.on('qunit.testStart', function(name) {
        currentTest = (currentModule ? currentModule + ' - ' : '') + name;
        grunt.verbose.write(currentTest + '...');
    });

    phantomjs.on('qunit.testDone', function(name, failed/*, passed, total*/) {
        // Log errors if necessary, otherwise success.
        if (failed > 0) {
            // list assertions
            if (grunt.option('verbose')) {
                grunt.log.error();
                logFailedAssertions();
            } else {
                grunt.log.write('F'.red);
            }
        } else {
            grunt.verbose.ok().or.write('.');
        }
    });

    var reportFile = function( data,options) {
        var ret = {
            coverage: 0,
            hits: 0,
            misses: 0,
            sloc: 0
        };
        data.source.forEach(function(line, num){
            num++;
            if (data[num] === 0) {
                ret.misses++;
                ret.sloc++;
            } else if (data[num] !== undefined) {
                ret.hits++;
                ret.sloc++;
            }
        });
        ret.coverage = ret.hits / ret.sloc * 100;

        return [ret.hits,ret.sloc];

    };

    phantomjs.on('blanket:fileDone', function(thisTotal, filename) {
        if (status.blanketPass === 0 && status.blanketFail === 0 ) {
            grunt.log.writeln();
        }

//        var threshold = coverageThreshold; //threshold || 50;
        var coveredLines = thisTotal[0];
        var totalLines = thisTotal[1];

        var percent = (coveredLines / totalLines) * 100;
        var pass = (percent > coverageThreshold);

        var result = pass ? "PASS" : "FAIL";

        var percentDisplay = percent < 10 ? " " + Math.floor(percent) : "" + Math.floor(percent);

        var msg = result + " [" + percentDisplay + "%] : " + filename + " (" + coveredLines + " / " + totalLines + ")";

        if (pass) {
            status.blanketPass++;
//            grunt.log.ok(msg);
        } else {
            status.blanketFail++;
            grunt.log.write(msg.red);
            grunt.log.writeln();
        }
    });

    phantomjs.on('blanket:done', function(cov) {


    });

    phantomjs.on('qunit.done', function(failed, passed, total, duration) {
        phantomjs.halt();
        status.failed += failed;
        status.passed += passed;
        status.total += total;
        status.duration += duration;
        // Print assertion errors here, if verbose mode is disabled.
        if (!grunt.option('verbose')) {
            if (failed > 0) {
                grunt.log.writeln();
                logFailedAssertions();
            } else {
//                grunt.log.ok();
            }
        }
    });

    // Re-broadcast qunit events on grunt.event.
    phantomjs.on('qunit.*', function() {
        var args = [this.event].concat(grunt.util.toArray(arguments));
        grunt.event.emit.apply(grunt.event, args);
    });

    // Built-in error handlers.
    phantomjs.on('fail.load', function(url) {
        phantomjs.halt();
        grunt.verbose.write('Running PhantomJS...').or.write('...');
        grunt.log.error();
        grunt.warn('PhantomJS unable to load "' + url + '" URI.');
    });

    phantomjs.on('fail.timeout', function() {
        phantomjs.halt();
        grunt.log.writeln();
        grunt.warn('PhantomJS timed out, possibly due to a missing QUnit start() call.');
    });

    // Pass-through console.log statements.
    phantomjs.on('console', console.log.bind(console));

    grunt.registerMultiTask('blanket_qunit', 'Run BlanketJS coverage and QUnit unit tests in a headless PhantomJS instance.', function() {
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            // Default PhantomJS timeout.
            timeout: 5000,
            // QUnit-PhantomJS bridge file to be injected.
            inject: asset('node_modules/grunt-contrib-qunit/phantomjs/bridge.js'),
            // Explicit non-file URLs to test.
            urls: [],
            threshold: 20
        });

        // Combine any specified URLs with src files.
        var urls = options.urls.concat(this.filesSrc);

        // This task is asynchronous.
        var done = this.async();

        // Reset status.
        status = {failed: 0, passed: 0, total: 0, duration: 0, blanketPass: 0, blanketFail: 0};

        coverageThreshold = options.threshold;

        // Process each filepath in-order.
        grunt.util.async.forEachSeries(urls, function(url, next) {
                    var basename = path.basename(url);
                    grunt.verbose.subhead('Testing ' + url).or.write('Testing ' + url);

                    // Reset current module.
                    currentModule = null;

                    // Launch PhantomJS.
                    grunt.event.emit('qunit.spawn', url);
                    phantomjs.spawn(url, {
                        // Additional PhantomJS options.
                        options: options,
                        // Do stuff when done.
                        done: function(err) {
                            if (err) {
                                // If there was an error, abort the series.
                                done();
                            } else {
                                // Otherwise, process next url.
                                next();
                            }
                        },
                    });
                },
                // All tests have been run.
                function() {
                    var ok = true;

                    grunt.log.writeln();
                    grunt.log.write("Code Coverage Results: ");

                    var thresholdMsg = "(" + coverageThreshold + "% minimum)";
                    
                    if (status.blanketFail > 0) {
//                    grunt.log.write(status.blanketPass + " files passed coverage\n");
                        var failMsg = (status.blanketFail + " files failed coverage " + thresholdMsg);
                        grunt.log.write(failMsg.red);
                        grunt.log.writeln();
                        ok = false;
                    } else {
                        var blanketPassMsg = status.blanketPass + " files passed coverage " + thresholdMsg;
                        grunt.log.write(blanketPassMsg.green);
                        grunt.log.writeln();
                    }

                    grunt.log.write("Unit Test Results: ");

                    if (status.failed > 0) {
                        var failMsg2 = (status.failed + '/' + status.total + ' assertions failed (' +
                                status.duration + 'ms)');
                        grunt.log.write(failMsg2.red);
                        grunt.log.writeln();
                        ok = false;
                    } else if (status.total === 0) {
                        var failMsg3 = ('0/0 assertions ran (' + status.duration + 'ms)');
                        grunt.log.write(failMsg3.red);
                        grunt.log.writeln();
                        ok = false;
                    } else {
                        grunt.verbose.writeln();
                        var passMsg = status.total + ' tests passed (' + status.duration + 'ms)';
                        grunt.log.write(passMsg.green);
                        grunt.log.writeln();
                    }

                    if (!ok) {
                        grunt.warn("Issues were found.");
                    } else {
                        grunt.log.ok("No issues found.");
                    }

                    done();
                });
    });

};