'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass');
const sassGlob = require('gulp-sass-glob');
const include = require('gulp-include');
const order = require('gulp-order');
const concat = require('gulp-concat');
const connect = require('gulp-connect');
const clean = require('gulp-clean');
const exec = require('gulp-exec');
const source = require('vinyl-source-stream');
const runSequence = require('run-sequence');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const pump = require('pump');

gulp.task('clean', function () {
    return gulp.src('./dist/*', {read: false})
        .pipe(clean({force: true}))
});

gulp.task('compress', function (cb) {
    pump([
            gulp.src('./dist/bower-opentimestamps.js'),
            uglify(),
            rename('bower-opentimestamps.min.js'),
            gulp.dest('./dist/')
        ],
        cb
    );
});

gulp.task('index', function() {
    var options = {
        continueOnError: false, // default = false, true means don't emit error event
        pipeStdout: false, // default = false, true means stdout is written to file.contents
        customTemplatingThing: "test" // content passed to gutil.template()
    };
    var reportOptions = {
        err: true, // default = true, false means don't write err
        stderr: true, // default = true, false means don't write stderr
        stdout: true // default = true, false means don't write stdout
    };
    return gulp.src('./')
        .pipe(exec('./node_modules/browserify/bin/cmd.js -r ./src/open-timestamps.js index.js -o ./dist/bower-opentimestamps.es6.js', options))
        .pipe(exec('./node_modules/babel-cli/bin/babel.js ./dist/bower-opentimestamps.es6.js -o ./dist/bower-opentimestamps.js', options))
        .pipe(exec.reporter(reportOptions));

    /*NOTE: babelify run babel with .babelrc file, but doesn't convert the code
    gulp.task('index', function() {
        return browserify({ debug: true, entries: [" bower-opentimestamps.es6.js"] })
            .transform(babelify)
            .bundle()
            .pipe(source(' bower-opentimestamps.js'))
            .pipe(gulp.dest('./'));
    });*/
});


gulp.task('default', function(done) {
    runSequence('clean', 'index','compress', function(){
        done();
    });
});
