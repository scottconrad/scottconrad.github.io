var less = require('gulp-less');
var path = require('path');
var gulp = require('gulp');

var less_path = './less/**/*.less';

gulp.task('less', function () {
  gulp.src(less_path)
    .pipe(less({
      paths: [path.join(__dirname)]
    }))
    .pipe(gulp.dest('./css'));
});

gulp.task('default',function(){
  gulp.watch(less_path,['less']);
});
