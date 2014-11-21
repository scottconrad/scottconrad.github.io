var less = require('gulp-less');
var path = require('path');
var gulp = require('gulp');
var concat = require('gulp-concat');

var less_path = './less/**/*.less';

gulp.task('less', function () {
  gulp.src(['./less/reset.less','./less/**/*.less'])
    .pipe(less())
    .pipe(concat('app.css')).pipe(gulp.dest('./css'));
});

gulp.task('default',function(){
  gulp.watch(less_path,['less']);
});
