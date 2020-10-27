var fs = require("fs");
var fsExtra = require("fs-extra");
var filePath = require('filepath');
var childProcess = require('child_process');

class BuildScript {
    constructor() {
        this.rootFolder = filePath.create('../');
        this.modules = this.getModuleDir();
        this.buildTrigger = {};
    }

    buildModules() {
        var that = this;
        console.log('\n');

        this.modules.forEach(function (mod) {
            that.buildModule(mod);
        });
    }

    buildModule(module) {
        console.log('building module', module);
        var modBuildDir = this.rootFolder.append(module);
        var distFolder = modBuildDir.append('dist');

        if (distFolder.exists()) {
            fsExtra.removeSync(distFolder.toString());
        }

        try {
            var stdOut = childProcess.execSync('broccoli build dist', {
                cwd: modBuildDir.toString(),
                timeout: 100000
            });
        } catch (e) {
            console.log(e);
        }

        fsExtra.copySync(distFolder.toString(), filePath.create('public/assets/addons').toString());
		
		var libFolder = modBuildDir.append('lib');
		
		if (libFolder.exists()) {
			fsExtra.copySync(libFolder.toString(), filePath.create('public/assets/addons').toString());
		}
    }

    applyWatcher() {
        var that = this;

        this.modules.forEach(function (mod) {
            that.watchDir(mod);
        });
    }

    watchDir(module) {
        var that = this;
        var watcherPath = this.rootFolder.append(module, 'app').toString();
        console.log('watcher added -', watcherPath);

        fs.watch(watcherPath, {recursive: true}, function (event, fileName) {
            that.throttleBuild(module);
            that.buildTrigger[module] = true;
        });
    }

    throttleBuild(module) {
        var that = this;

        if (!this.buildTrigger[module]) {
            console.log('file changed in', module);

            setTimeout(function () {
                that.buildModule(module);
                that.buildTrigger[module] = false;
            }, 1000);
        }
    }

    getModuleDir() {
        var rootPath = this.rootFolder;

        return fs.readdirSync(rootPath.toString()).filter(function (file) {
            return fs.statSync(rootPath.append(file).toString()).isDirectory() && file !== 'ua-kernel'
                && file !== '.idea' && file !== '.git' && file !== 'node_modules' && file !== 'bower_components' && file.startsWith('ua');
        });
    }
}

module.exports = new BuildScript();