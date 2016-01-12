var express = require('express');
var cfenv = require('cfenv');
var app = express();
app.use(express.static(__dirname + '/public'));
var appEnv = cfenv.getAppEnv();
app.listen(appEnv.port, '0.0.0.0', function() {
  console.log("server starting on " + appEnv.url);
});




var Botkit = require('botkit')
var os = require('os');

var controller = Botkit.slackbot({
  debug: false,
});

var bot = controller.spawn(
  {
    token: process.env.slack_token
  }
).startRTM();

var watson = require('watson-developer-cloud');

var personality_insights = watson.personality_insights({
    username: process.env.watson_username,
    password: process.env.watson_password,
    version: 'v2'
});

var tone_analyzer = watson.tone_analyzer({
    username: process.env.watson_username,
    password: process.env.watson_password,
    version: 'v2-experimental'
});

controller.hears(['watson (.*)'],'ambient,mention', function(bot, message) {
  console.log(message.text);
  tone_analyzer.tone(
    {
      text: message.text
    },
    function(err, response) {
      if (err) {
        console.log('ERROR', err);
      }
      else {
        console.log(response);
        console.log(response.children[2].children[2]);
        var agreeableness = response.children[2].children[2].normalized_score;
        if (agreeableness < 0) {
          bot.reply(message, 'That was not a very nice thing to say.');
        } else {
           if (agreeableness > 0.5) {
             bot.reply(message, 'Thank you!');
            }
        }
      }
    } // end function
  ); // end tone_analyzer
});

controller.hears(['analyze', 'analyse'], 'direct_message,direct_mention', function(bot, message) {

    bot.api.channels.history({
      channel: message.channel,
    }, function(err, history) {

      if (err) {
        console.log('ERROR',err);
      }

      var messages = [];
      for (var i = 0; i < history.messages.length; i++) {
        messages.push(history.messages[i].text);
      }

      // call the watson api with your text
      var corpus = messages.join("\n");

      personality_insights.profile(
        {
          text: corpus,
          language: 'en'
        },
        function (err, response) {
          if (err) {
            console.log('error:', err);
            bot.reply(message, err.error);
          } else {
            // response.tree.children.children is a list of the top 5 traits
            var top5 = response.tree.children[0].children[0].children;
            bot.reply(message, ':robot_face: Let me analyze that for you...');
            bot.reply(message, 'In this community I\'m seeing:');
            for (var c = 0; c < top5.length; c++) {
              bot.reply(message, '   ' + Math.round(top5[c].percentage*100) + '% ' + top5[c].name);
            }

            bot.reply(message, 'Agreeableness is a person\'s tendency to be compassionate and cooperative toward others.');
            bot.reply(message, 'Conscientiousness is a person\'s tendency to act in an organized or thoughtful way.');
            bot.reply(message, 'Extraversion is a person\'s tendency to seek stimulation in the company of others.');
            bot.reply(message, 'Emotional Range, also referred to as Neuroticism or Natural Reactions, is the extent to which a person\'s emotions are sensitive to his or her environment.');
            bot.reply(message, 'Openness is the extent to which a person is open to experiencing a variety of activities');

          }
        } // end function
      );  // end personality_insights.profile

    });  // end bot.api.channels.history
})

controller.hears(['hello','hi'],'direct_message,direct_mention,mention',function(bot,message) {

  bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: 'robot_face',
  },function(err,res) {
    if (err) {
      bot.botkit.log("Failed to add emoji reaction :(",err);
    }
  });

  controller.storage.users.get(message.user,function(err,user) {
    if (user && user.name) {
      bot.reply(message,"Hello " + user.name+"!!");
    } else {
      bot.reply(message,"Hello.");
    }
  });
})

controller.hears(['call me (.*)'],'direct_message,direct_mention,mention',function(bot,message) {
  var matches = message.text.match(/call me (.*)/i);
  var name = matches[1];
  controller.storage.users.get(message.user,function(err,user) {
    if (!user) {
      user = {
        id: message.user,
      }
    }
    user.name = name;
    controller.storage.users.save(user, function(err,id) {
      bot.reply(message,"Got it. I will call you " + user.name + " from now on.");
    })
  })
});

controller.hears(['what is my name','who am i'],'direct_message,direct_mention,mention',function(bot,message) {

  controller.storage.users.get(message.user, function(err,user) {
    if (user && user.name) {
      bot.reply(message,"Your name is " + user.name);
    } else {
      bot.reply(message,"I don't know yet!");
    }
  })
});


controller.hears(['shutdown'],'direct_message,direct_mention,mention',function(bot,message) {

  bot.startConversation(message,function(err,convo) {
    convo.ask("Are you sure you want me to shutdown?",[
      {
        pattern: bot.utterances.yes,
        callback: function(response,convo) {
          convo.say("Bye!");
          convo.next();
          setTimeout(function() {
            process.exit();
          },3000);
        }
      },
      {
        pattern: bot.utterances.no,
        default:true,
        callback: function(response,convo) {
          convo.say("*Phew!*");
          convo.next();
        }
      }
    ])
  })
})


controller.hears(['uptime','identify yourself','who are you','what is your name'],'direct_message,direct_mention,mention',function(bot,message) {

  var hostname = os.hostname();
  var uptime = formatUptime(process.uptime());

  bot.reply(message,':robot_face: I am a bot named <@' + bot.identity.name +'>. I have been running for ' + uptime + ' on ' + hostname + ".");

})

function formatUptime(uptime) {
  var unit = 'second';
  if (uptime > 60) {
    uptime = uptime / 60;
    unit = 'minute';
  }
  if (uptime > 60) {
    uptime = uptime / 60;
    unit = 'hour';
  }
  if (uptime != 1) {
    unit = unit +'s';
  }

  uptime = uptime + ' ' + unit;
  return uptime;
}
