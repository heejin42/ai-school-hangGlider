// var messages = {
//   "start": {
//     msg: 'Click on the microphone icon and begin speaking.',
//     class: 'alert-success'},
//   "speak_now": {
//     msg: 'Speak now.',
//     class: 'alert-success'},
//   "no_speech": {
//     msg: 'No speech was detected. You may need to adjust your <a href="//support.google.com/chrome/answer/2693767" target="_blank">microphone settings</a>.',
//     class: 'alert-danger'},
//   "no_microphone": {
//     msg: 'No microphone was found. Ensure that a microphone is installed and that <a href="//support.google.com/chrome/answer/2693767" target="_blank">microphone settings</a> are configured correctly.',
//     class: 'alert-danger'},
//   "allow": {
//     msg: 'Click the "Allow" button above to enable your microphone.',
//     class: 'alert-warning'},
//   "denied": {
//     msg: 'Permission to use microphone was denied.',
//     class: 'alert-danger'},
//   "blocked": {
//     msg: 'Permission to use microphone is blocked. To change, go to chrome://settings/content/microphone',
//     class: 'alert-danger'},
//   "upgrade": {
//     msg: 'Web Speech API is not supported by this browser. It is only supported by <a href="//www.google.com/chrome">Chrome</a> version 25 or later on desktop and Android mobile.',
//     class: 'alert-danger'},
//   "stop": {
//       msg: 'Stop listening, click on the microphone icon to restart',
//       class: 'alert-success'},
//   "copy": {
//     msg: 'Content copy to clipboard successfully.',
//     class: 'alert-success'},
// }

var final_transcript = '';
var recognizing = false;
var ignore_onend;
var start_timestamp;
var recognition;

$( document ).ready(function() {
  for (var i = 0; i < langs.length; i++) {
    select_language.options[i] = new Option(langs[i][0], i);
  }
  select_language.selectedIndex = 28;
  updateCountry();
  select_dialect.selectedIndex = 6;
  
  if (!('webkitSpeechRecognition' in window)) {
    upgrade();
  } else {
    // showInfo('start');  
    start_button.style.display = 'inline-block';
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = function() {
      recognizing = true;
      // showInfo('speak_now');
      start_img.src = url1;
    };

    recognition.onerror = function(event) {
      if (event.error == 'no-speech') {
        start_img.src = url3;
        // showInfo('no_speech');
        ignore_onend = true;
      }
      if (event.error == 'audio-capture') {
        start_img.src = url3;
        // showInfo('no_microphone');
        ignore_onend = true;
      }
      if (event.error == 'not-allowed') {
        // if (event.timeStamp - start_timestamp < 100) {
        //   showInfo('blocked');
        // } else {
        //   showInfo('denied');
        // }
        ignore_onend = true;
      }
    };

    recognition.onend = function() {
      recognizing = false;
      if (ignore_onend) {
        return;
      }
      start_img.src = url3;
      if (!final_transcript) {
        // showInfo('start');
        return;
      }
      // showInfo('stop');
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
        var range = document.createRange();
        range.selectNode(document.getElementById('final_span'));
        window.getSelection().addRange(range);
      }
    };

    recognition.onresult = function(event) {
      var interim_transcript = '';
      for (var i = event.resultIndex; i < event.results.length; ++i) {
        if (interim_span.innerHTML.length >=40){
          recognition.stop();
        }
        if (event.results[i].isFinal) {
          final_transcript += event.results[i][0].transcript;
          final_transcript = capitalize(final_transcript);
          final_span.innerHTML = linebreak(final_transcript);
          interim_span.innerHTML = linebreak(interim_transcript);
          $.ajax({
            type:'POST',
            url: url4,
            data:{
                text1:final_span.innerHTML,
                csrfmiddlewaretoken:$('input[name=csrfmiddlewaretoken]').val(),
                action: 'POST'
            },
            success:function(json){
                console.log("data pass",json.q);
                new_arr = json.q;
                if (firstview){
                    video_list = $.merge([], new_arr);
                    onload();
                } else{
                    video_list = $.merge( $.merge([],video_list), new_arr);
                }
                if (recognizing) {
                  final_transcript = '';
                  final_span.innerHTML = '';
                  interim_span.innerHTML = '';
                  firstview = false;
                  console.log("data pass2",video_list);
                  return;
                }
                final_transcript = '';
                recognition.lang = select_dialect.value;
                recognition.start();
                ignore_onend = false;
                final_span.innerHTML = '';
                interim_span.innerHTML = '';
                start_img.src = url2;
                start_timestamp = event.timeStamp;
                firstview = false;
                
                console.log("data pass2",video_list);
            },
            error : function(xhr,errmsg,err) {
            console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
            }
          });
        } 
        else {
                interim_transcript += event.results[i][0].transcript;
                final_transcript = capitalize(final_transcript);
                final_span.innerHTML = linebreak(final_transcript);
                interim_span.innerHTML = linebreak(interim_transcript);
        }
      }
    };
  }
});


function updateCountry() {
  for (var i = select_dialect.options.length - 1; i >= 0; i--) {
    select_dialect.remove(i);
  }
  var list = langs[select_language.selectedIndex];
  for (var i = 1; i < list.length; i++) {
    select_dialect.options.add(new Option(list[i][1], list[i][0]));
  }
  select_dialect.style.visibility = list[1].length == 1 ? 'hidden' : 'visible';
}


function upgrade() {
  start_button.style.visibility = 'hidden';
  // showInfo('upgrade');
}

var two_line = /\n\n/g;
var one_line = /\n/g;
function linebreak(s) {
  return s.replace(two_line, '<p></p>').replace(one_line, '<br>');
}

var first_char = /\S/;
function capitalize(s) {
  return s.replace(first_char, function(m) { return m.toUpperCase(); });
}

// $("#copy_button").click(function () {
//   if (recognizing) {
//     recognizing = false;
//     recognition.stop();
//   }
//   setTimeout(copyToClipboard, 500);
  
// });

// function copyToClipboard() {
//   if (document.selection) { 
//       var range = document.body.createTextRange();
//       range.moveToElementText(document.getElementById('results'));
//       range.select().createTextRange();
//       document.execCommand("copy"); 
  
//   } else if (window.getSelection) {
//       var range = document.createRange();
//        range.selectNode(document.getElementById('results'));
//        window.getSelection().addRange(range);
//        document.execCommand("copy");
//   }
  // showInfo('copy');
// }

$("#start_button").click(function () {
  if (recognizing) {
    recognition.stop();
    return;
  }
  final_transcript = '';
  recognition.lang = select_dialect.value;
  recognition.start();
  ignore_onend = false;
  final_span.innerHTML = '';
  interim_span.innerHTML = '';
  start_img.src = url2;
  // showInfo('allow');
  start_timestamp = event.timeStamp;
});

$("#select_language").change(function () {
  updateCountry();
});

// 알림메시지 출력
// function showInfo(s) {
//   if (s) {
//     var message = messages[s];
//     $("#info").html(message.msg);
//     $("#info").removeClass();
//     $("#info").addClass('alert');
//     $("#info").addClass(message.class);
//   } else {
//     $("#info").removeClass();
//     $("#info").addClass('d-none');
//   }
// }
