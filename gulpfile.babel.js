import gulp from "gulp";
import scss from "gulp-sass";
import browserSync from "browser-sync";
import gcmq from "gulp-combine-mq";
import gulpStylelint from "gulp-stylelint";
import notify from "gulp-notify";
import plumber from "gulp-plumber";
import clean from "gulp-rimraf"
import merge from "merge-stream";
import sourcemaps  from"gulp-sourcemaps";
import uglify from "gulp-uglify";
import gulpSequence from"gulp-sequence";
import strip from "gulp-strip-css-comments";
import rename from "gulp-rename";
import cssnano from "gulp-cssnano";
import csscomb from "gulp-csscomb";
import livingcss from 'gulp-livingcss';


const backstopjs = require('backstopjs');

gulp.task('visualreference', () => backstopjs('reference'));
gulp.task('visualtest', () => backstopjs('test'));


const basePaths = {
    src: "./",
    dest: "./build/",
    temp: ".temp",
    node: "./node_modules/",
    bower: "./bower_components/"
};

const paths = {
    dest: basePaths.dest,
    styleGuide: {
        dest: basePaths.dest + "styleguide/index.html",
        partials: basePaths.src + "styleguide-template/partials/*.hbs",
        template: basePaths.src + "styleguide-template/template.hbs"
    },
    scss: {
        src: [basePaths.src + "styles/main.scss"],
        srcFiles: [basePaths.src + "styles/**/*.scss"],
        dest: basePaths.dest + "styles/"
    }
};

var errorAlert = function (error) {
    "use strict";
    var errorString = "[" + error.plugin + "]";
    errorString += " " + error.message.replace("\n", "");
    if (error.fileName)
        errorString += " in " + error.fileName;
    if (error.lineNumber)
        errorString += " on line " + error.lineNumber;
    console.error(errorString);
    notify.onError({
        title: "An Error was found!",
        message: "Check your terminal",
        sound: "Sosumi",
        contentImage: "./img/gnatta.jpg",
        // icon: "./img/gnatta.jpg"
    })(error);
    this.emit("end");
};

gulp.task("clean", function () {
    return gulp.src(basePaths.dest + "*", {
        read: false
    })
        .pipe(clean())
        .pipe(plumber({
            errorHandler: errorAlert
        }))
});

//STYLES
gulp.task("scssLint", function () {
    return gulp.src(paths.scss.src)
        .pipe(plumber({
            errorHandler: errorAlert
        }))
        .pipe(gulpStylelint({
            reporters: [{
                formatter: "string",
                console: true
            }],
            failAfterError: false,
            syntax: "scss"
        }))
});

var path = require('path');

gulp.task("scssStyleguide", function () {
     return gulp.src(paths.scss.srcFiles)
     //.pipe(livingcss())
     .pipe(plumber({
        errorHandler: errorAlert
     }))
     .pipe(livingcss(paths.styleGuide.dest, {
        loadcss: true,
        preprocess: function(context, template, Handlebars) {
            context.title = 'Glowing SCSS StyleGuide';
            context.subTitle = 'https://github.com/gil00pita/glowing-scss-mixins';
            context.subTitleLink = 'https://github.com/gil00pita/glowing-scss-mixins';
            context.imageURL = 'http://www.uat.gnatta.com/media/1239/gnatta-logo-white.svg';
            context.brandColor = '#582C83';
            context.styleSheetURL = "../styles/main.css";
            context.footerHTML = 'Glowing SCSS Styleguide Generator';
            // register a Handlebars partial
            //Handlebars.registerPartial('myPartial', '{{name}}');
            return livingcss.utils.readFileGlobs(paths.styleGuide.partials, function(data, file) {
                // make the name of the partial the name of the file
                var partialName = path.basename(file, path.extname(file));
                Handlebars.registerPartial(partialName, data);
            });
        },
        sortOrder: [
            // sort the pages components and modules in that order, and sort sections
            // within those pages.
            {
            components: ['modals', 'dropdowns']
            },
            {
            modules: ['timeStamp']
            },
            // sort the pages atoms and molecules after components and modules, but
            // not in any particular order between themselves. Also sort sections
            // within those pages.
            {
            atoms: ['buttons', 'forms', 'images'],
            molecules: ['cards']
            },
            // sort the pages organisms and templates in that order, but not any of
            // their sections
            ['organisms', 'templates']
        ],
        tags: {
            color: function() {
            var section = this.sections[this.tag.description];
            if (section) {
                section.colors = section.colors || [];
                section.colors.push({
                name: this.tag.name,
                value: this.tag.type
                });
            }
            }
        },
       template: paths.styleGuide.template
     }))
     .pipe(gulp.dest(paths.dest + 'styleguide'))
});

gulp.task("scssDev", function () {
    return gulp.src(paths.scss.srcFiles)
        .pipe(plumber({
            errorHandler: errorAlert
        }))
        .pipe(sourcemaps.init())
        .pipe(scss())
        //.on("error", scss.logError))
        //.pipe(strip())
        //.pipe(gcmq())
        .pipe(sourcemaps.write("maps/"))
        .pipe(gulp.dest(paths.scss.dest))
        .pipe(browserSync.stream({stream: true, match: "**/*.css"}));
});

gulp.task("scssProd", function () {
    return gulp.src(paths.scss.srcFiles)
        .pipe(scss()
            .on("error", scss.logError))
        .pipe(strip())
        .pipe(gcmq())
        .pipe(csscomb())
        .pipe(cssnano())
        //.pipe(gulp.dest(paths.scss.dest))
        //.pipe(gzip())
        .pipe(gulp.dest(paths.scss.dest));
});


gulp.task("browser-sync", function () {
    browserSync.init({
        server: {
            baseDir: paths.dest
        },
        directory: true,
        logLevel: "info",
        logConnections: true,
        open: false
    });

    gulp.watch(paths.scss.srcFiles, ["scssSeq"]);
    gulp.watch([paths.styleGuide.partials, paths.styleGuide.template], ["scssSeq"]);
});

gulp.task("scssSeq", function (callback) {
    gulpSequence("scssLint", "scssDev", "scssStyleguide")(callback)
    //gulpSequence("scssDev")(callback)
});

gulp.task("watch",  gulpSequence("clean", "scssSeq", "browser-sync"));
gulp.task("dev",  gulpSequence("clean", "scssSeq", "browser-sync"));
gulp.task("default",  gulpSequence("clean", "scssProd", "scssStyleguide"));
