# grunt-blanket-qunit

> Headless Blanket.js code coverage and QUnit testing via PhantomJS

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-blanket-qunit --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-blanket-qunit');
```

## Blanket.js dependency

This plugin requires Blanket.js v1.1.5 which is currently still in development.  Check the blanket.js version in the [dev branch](https://github.com/alex-seville/blanket/blob/development/dist/qunit/blanket.js) in the meantime.  

## The "blanket_qunit" task

### See Also

This plugin is based off of grunt-contrib-qunit.  For general config options and examples, please see that repo.

### Overview
In your project's Gruntfile, add a section named `blanket_qunit` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  blanket_qunit: {
    options: {
		urls: ['test.html?coverage=true&gruntReport'],
        threshold: 70
    }
  }
})
```

The `urls` param works the same way as it does in the base `grunt-contrib-qunit` plugin, with two important considerations.  First, you should pass `&coverage=true` as a URL parameter as shown above to trigger blanket.js.  This is the same as clicking the `Enable Coverage` checkbox in the QUnit report.  Second, you may pass another parameter such as `&gruntReport` to trigger the custom blanket reporter that talks to the grunt task.  See the next section for more info.

### Custom Reporter

In order for Blanket.js to communicate with the Grunt task, you must enable a custom blanket reporter.  See the `grunt-reporter.js` file in the `reporter` directory in this repo.

You can enable this reporter in one of two ways:

1. As an inline proprety in your blanket.js script declaration, like so:

```html
<script type="text/javascript" src="blanket.js"
        data-cover-reporter="reporter/grunt-reporter.js"></script>
```

This method is suitable if your test runner html file is only used for headless testing.  Do not use this if you will be using this test runner html file in a browser, as it will spew a bunch of alerts at you (see the reporter implementation for the ugly `alert` hack used to communicate with phantomjs).

2. As a conditional option evaulauted at runtime in your test runner html, like so:

```js
<script>
    if (location.href.match(/(\?|&)gruntReport($|&|=)/)) {
        blanket.options("reporter", "reporter/grunt-reporter.js");
    }
</script>
``` 

Place this script snippet after your blanket.js script declaration.  This allows you to conditionally only enable this custom reporter if the `gruntReport` URL parameter is specified.  This way, you can share the same test runner html file between two use cases: running it in the browser and viewing the report inline, and running it via grunt. 


### Options

#### options.threshold
Type: `Number`
Default value: `60`

The minimum percent coverage per-file.  Any files that have coverage below this threshold will fail the build.  By default, only the failing files will be output in the console.  To show passing files as well, use the grunt `--verbose` option.


## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History

### 0.1.4
*Released 23 May 2013*

* Doc updates & misc fixes

### 0.1.0
*Released 23 May 2013*

* Initial release
