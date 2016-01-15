"use strict";

var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();

// Watson services initialize
var watson = require('watson-developer-cloud');
var watson_pi_credentials = appEnv.getServiceCreds('Personality Insights-fd');

var personality_insights = watson.personality_insights({
  username: watson_pi_credentials.username,
  password: watson_pi_credentials.password,
  version: 'v2'
});

var tone_analyzer = watson.tone_analyzer({
  username: watson_pi_credentials.username,
  password: watson_pi_credentials.password,
  version: 'v2-experimental'
});

module.exports = {

  /*
   * Analyze the given message and call back with a suitable response
   * based on the agreeableness of the message.
   * @param {string} msg - The message to be assessed
   * @param {Function} callback - The callback function taking a string response
   */
  watson_analyze: function(msg, callback) {
    console.log('analysing '+ msg);
    tone_analyzer.tone(
      {
        text: msg
      },
      function(err, response) {
        if (err) {
          console.log('ERROR', err);
        }
        else {
          var agreeableness = response.children[2].children[2].normalized_score;
          console.log('OK score = ' + agreeableness);
          if (agreeableness < 0) {
            callback('That was not a very nice thing to say.');
          } else {
            if (agreeableness > 0.5) {
              callback('Thank you!');
            } else {
              callback('OK');
            }
          }
        }
      } // end function
    ); // end tone
  } // watson_analyze

};

