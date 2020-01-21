'use strict'

const fs = require('fs')
const gulp = require('gulp')
const clean = require('gulp-clean')
const exec = require('gulp-exec')
const runSequence = require('run-sequence')
const uglify = require('gulp-uglify')
const rename = require('gulp-rename')
const pump = require('pump')
const gap = require('gulp-append-prepend')
const packagejson = require('./package.json')

gulp.task('clean', () => {
  if (!fs.existsSync('./dist')) {
    fs.mkdirSync('./dist')
  }
  return gulp.src('./dist/*', {read: false})
    .pipe(clean({force: true}))
})

gulp.task('compress', cb => {
  pump([
    gulp.src('./dist/opentimestamps.js'),
    uglify(),
    gap.prependText('// ' + packagejson.name + ' v.' + packagejson.version + '\n'),
    rename('opentimestamps.min.js'),
    gulp.dest('./dist/')
  ],
  cb
  )
})

gulp.task('index', () => {
  const options = {
    continueOnError: false, // default = false, true means don't emit error event
    pipeStdout: false, // default = false, true means stdout is written to file.contents
    customTemplatingThing: 'test' // content passed to gutil.template()
  }
  const reportOptions = {
    err: true, // default = true, false means don't write err
    stderr: true, // default = true, false means don't write stderr
    stdout: true // default = true, false means don't write stdout
  }
  return gulp.src('./')
    .pipe(exec('./node_modules/browserify/bin/cmd.js --standalone "OpenTimestamps" index.js > ./dist/opentimestamps.es6.js', options))
    .pipe(exec('./node_modules/.bin/babel ./dist/opentimestamps.es6.js -o ./dist/opentimestamps.js', options))
    .pipe(exec.reporter(reportOptions))

    /* NOTE: babelify run babel with .babelrc file, but doesn't convert the code
    gulp.task('index', function() {
        return browserify({ debug: true, entries: ["opentimestamps.es6.js"] })
            .transform(babelify)
            .bundle()
            .pipe(source(' opentimestamps.js'))
            .pipe(gulp.dest('./'));
    }); */
})

gulp.task('default', gulp.series('clean', 'index', 'compress', done => { 
    // default task code here
    done()
}));

/*
gulp.task('default', done => {
  runSequence('clean', 'index', 'compress', () => {
    done()
  })
})
*/
