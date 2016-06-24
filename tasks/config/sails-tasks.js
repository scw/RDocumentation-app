
module.exports = function(grunt) {

  grunt.config.set('sails_tasks', {
    authorCleaning: {
      functions: [
        function (callback) {
          AuthorService.aggregateAuthors().then(function(result) {
            console.log("Finished cleaning authors");
            callback();
          });
        }
      ]
    },

    maintainerRecover: {
      functions: [
        function (callback) {
          AuthorService.recoverMaintainer().then(function(result) {
            console.log("Finished recover maitainers");
            callback();
          });
        }
      ]
    },

    indexStats: {
      functions: [
        function (callback) {
          CronService.indexAggregatedDownloadStats().then(function(result) {
            console.log("Finished indexing stats");
            callback();
          });
        }
      ]
    },
  });


  grunt.loadNpmTasks('grunt-sails-tasks');
};
