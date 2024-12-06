
const gulp = require('gulp');
const ts = require('gulp-typescript');
const replace = require('gulp-replace');
const rename = require('gulp-rename');

const { exec } = require('child_process');

gulp.task('tspc', function(done) {
    exec('./node_modules/.bin/tspc src/**/*.ts', function(err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        if (err) {
            return done(err); // if error happened, exit with an error status
        }
        done(); // finished task
    });
});


gulp.task('rename', function(){
  return gulp.src('dist/bin/*.js')  // This will get all .js files in src and its sub-directories
    .pipe(rename(function(path) {
      path.extname = ".cjs";
    }))
    .pipe(gulp.dest('dist')); // Output the renamed files in the same directory
});

// Compile TypeScript files
gulp.task('compile', () => {
    const tsProject = ts.createProject('tsconfig.json');
    return gulp.src(['src/**/*.ts', '!src/nativeLib/**'])
        .pipe(tsProject())
        .pipe(gulp.dest('dist'));
});

// Add shebang to scripts and output to dist/bin
gulp.task('scripts', () => {
    return gulp.src('dist/bin/*.js')
        .pipe(replace(/^/, '#!/usr/bin/env node\n'))
        .pipe(gulp.dest('dist/bin'));
});

var filesToMove = [
  './src/bin/so2ts.py',
  './src/bin/so2ts.jinja',
];

gulp.task('copyFiles', function(){
  // Get the files from the file paths
  return gulp.src(filesToMove)
    // Perform the copy operation
    .pipe(gulp.dest('./dist/bin'));  // specify the destination folder
});


// Define array of objects for the directories to copy
const directoriesToMove = [
  { source: './templates/**/*', destination: './dist/templates/' },
  { source: './src/lib/**/*', destination: './dist/lib/' },
  { source: './src/nativeLib/**/*', destination: './dist/nativeLib/' },
  // Add more directories as needed
];

// `copyDirectories` task
gulp.task('copyDirectories', done => {
  // Use each directory pair defined in directoriesToMove
  directoriesToMove.forEach(dir => {
    gulp.src(dir.source, { base: dir.source.replace('/**/*', '') })
      .pipe(gulp.dest(dir.destination));
  });

  // Signal completion of the task
  done();
});

gulp.task('default', gulp.series( 'copyFiles', 'copyDirectories', ));

