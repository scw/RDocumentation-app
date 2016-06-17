/**
 * SearchController
 *
 * @description :: Server-side logic for searching
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
 var Promise = require('bluebird');
 var _ = require('lodash');

module.exports = {

  quickSearch: function(req, res) {
    var token = req.body.token;

    es.msearch({
      body: [
        { index: 'rdoc', type: 'package_version' },
        { query: {
            bool: {
              must: [{
                "match_phrase_prefix" : {
                    "package_name" : {
                        "query" : token,
                        "max_expansions" : 20
                    }
                }
              }],
              filter: {
                term: { latest_version: 1 }
              }
            }
          },
          size: 5,
          fields: ['package_name', 'version']
        },

        { index: 'rdoc', type: 'topic' },
        { query: {

            bool: {
              must: [{
                prefix : {
                  name: token,
                }
              }],
              filter: {
                has_parent : {
                  parent_type : "package_version",
                  query : {
                    term : {
                        latest_version : 1
                    }
                  },
                  inner_hits : { fields: ['package_name', 'version', 'latest_version'] }
                }
              }
            }

          },
          size: 5,
          fields: ['name']
        },

    ]}).then(function(response) {
      var packageResult = response.responses[0];
      var topicResult = response.responses[1];
      var packages = _.map(packageResult.hits.hits, function(hit) {
        var name = hit.fields.package_name[0];
        var version = hit.fields.version[0];
        var uri = sails.getUrlFor({ target: 'PackageVersion.findByNameVersion' })
          .replace(':name', name)
          .replace(':version', version)
          .replace('/api/', '/');
        return { uri: uri,  name: name };
      });

      var topics = _.map(topicResult.hits.hits, function(hit) {
        var name = hit.fields.name[0];
        var id = hit._id;
        var inner_hit = hit.inner_hits.package_version.hits.hits[0];
        var package_name = inner_hit.fields.package_name[0];
        var version = inner_hit.fields.version[0];
        var uri =  sails.getUrlFor({ target: 'Topic.findById' })
          .replace(':id', id)
          .replace('/api/', '/');
        return { uri: uri,  name: name, package_name: package_name, package_version: version };
      });
      return res.json({packages: packages, topics: topics});
    }).catch(function(err) {
      return res.negotiate(err);
    });

  },


  fullSearch: function(req, res) {
    var query = req.param('q');

    es.msearch({
      body: [
        { index: 'rdoc', type: 'package_version' },
        { query: {
            bool: {
              must: [{
                multi_match: {
                  query: query,
                  type: "best_fields",
                  fields: ['package_name^4', 'title^3', 'description^2', 'license', 'url', 'copyright']
                }
              }],
              should: {
                term: { latest_version: 1 }
              }
            }

          },
          highlight : {
            pre_tags : ["<mark>"],
            post_tags : ["</mark>"],
            "fields" : {
              "title" : {},
              'description': {}
            }
          },
          size: 5,
          fields: ['package_name', 'version']
        },

        { index: 'rdoc', type: 'topic' },
        { query: {

            bool: {
              must: [{
                multi_match: {
                  query: query,
                  type: "best_fields",
                  fields: [
                    'name^6',
                    'title^3', 'description^3', 'keywords^3', 'aliases^3',
                    'arguments.name^2', 'arguments.description^2',
                    'usage^2', 'details^2', 'value^2',
                    'note', 'author',
                    'references', 'license', 'url', 'copyright']
                }
              }],
              should: {
                has_parent : {
                  parent_type : "package_version",
                  query : {
                    term : {
                        latest_version : 1
                    }
                  },
                  inner_hits : { fields: ['package_name', 'version', 'latest_version'] }
                }
              }
            }

          },
          size: 5,
          fields: ['name']
        }

    ]}).then(function(response) {
      return res.json(response);
    }).catch(function(err) {
      return res.negotiate(err);
    });


  }

};
