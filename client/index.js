const recognition = new webkitSpeechRecognition()
const synth = window.speechSynthesis
const langs = require('./webspeechLangs')
const outputLanguages = require('./translationLangs')
const API_KEY = require('../secrets.js')

for (let i = 0; i < outputLanguages.length; i++) {
  output_language.options[i] = new Option(
    outputLanguages[i].name,
    outputLanguages[i].language
  )
}

const getTranslation = async final_transcript => {
  let targetLang = output_language.value
  const uri = `https://translation.googleapis.com/language/translate/v2?target=${targetLang}&key=${API_KEY}&q=${final_transcript}`
  console.log(targetLang, 'targetLang')
  const response = await fetch(uri)
  const {data} = await response.json()
  translated_span.innerHTML = data.translations[0].translatedText
}

for (let i = 0; i < langs.length; i++) {
  select_language.options[i] = new Option(langs[i][0], i)
}
select_language.addEventListener('change', () => {
  updateCountry()
})
//this sets the default lang to English, updates the options, then sets the default dialect to US
select_language.selectedIndex = 6
updateCountry()
select_dialect.selectedIndex = 6
showInfo('info_start')

//allows you to select country based on selected language
function updateCountry() {
  //this removes all the dialects at the beginning of the language onchange
  for (var i = select_dialect.options.length - 1; i >= 0; i--) {
    select_dialect.remove(i)
  }
  var list = langs[select_language.selectedIndex]
  //this creates dialect options for the selected language if language.length is greater than 1
  for (var i = 1; i < list.length; i++) {
    select_dialect.options.add(new Option(list[i][1], list[i][0]))
  }
  select_dialect.style.visibility = list[1].length == 1 ? 'hidden' : 'visible'
}

let final_transcript = ''
let recognizing = false
let ignore_onend
let start_timestamp
if (!('webkitSpeechRecognition' in window)) {
  upgrade()
} else {
  start_button.style.display = 'inline-block'
  recognition.continuous = true
  recognition.interimResults = true

  recognition.onstart = function() {
    recognizing = true
    showInfo('info_speak_now')
    start_img.src = 'recording_nopause.gif'
  }

  recognition.onerror = function(event) {
    if (event.error == 'no-speech') {
      start_img.src = 'recording.png'
      showInfo('info_no_speech')
      ignore_onend = true
    }
    if (event.error == 'audio-capture') {
      start_img.src = 'recording.png'
      showInfo('info_no_microphone')
      ignore_onend = true
    }
    if (event.error == 'not-allowed') {
      if (event.timeStamp - start_timestamp < 100) {
        showInfo('info_blocked')
      } else {
        showInfo('info_denied')
      }
      ignore_onend = true
    }
  }

  recognition.onend = function() {
    recognizing = false
    if (ignore_onend) {
      return
    }
    start_img.src = 'recording.png'
    if (!final_transcript) {
      showInfo('info_start')
      return
    }
    showInfo('')
    if (window.getSelection) {
      window.getSelection().removeAllRanges()
      var range = document.createRange()
      range.selectNode(document.getElementById('final_span'))
      window.getSelection().addRange(range)
    }
  }

  recognition.onresult = function(event) {
    let interim_transcript = ''
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final_transcript += event.results[i][0].transcript
      } else {
        interim_transcript += event.results[i][0].transcript
      }
    }
    final_transcript = capitalize(final_transcript)
    const translatedText = getTranslation(interim_transcript)
    if (translatedText) translated_span.innerHTML = translatedText
    if (final_transcript) getTranslation(final_transcript)
    translated_span.innerHTML = getTranslation(final_transcript)
    final_span.innerHTML = linebreak(final_transcript)
    interim_span.innerHTML = linebreak(interim_transcript)
  }
}

function upgrade() {
  start_button.style.visibility = 'hidden'
  showInfo('info_upgrade')
}

var two_line = /\n\n/g
var one_line = /\n/g
function linebreak(s) {
  return s.replace(two_line, '<p></p>').replace(one_line, '<br>')
}

var first_char = /\S/
function capitalize(s) {
  return s.replace(first_char, function(m) {
    return m.toUpperCase()
  })
}

document.getElementById('start_button').addEventListener('click', () => {
  if (recognizing) {
    recognition.stop()
    return
  }
  final_transcript = ''
  recognition.lang = select_dialect.value
  recognition.start()
  ignore_onend = false
  final_span.innerHTML = ''
  interim_span.innerHTML = ''
  start_img.src = 'recording_nopause.gif'
  showInfo('info_allow')
  start_timestamp = event.timeStamp
})

function showInfo(s) {
  if (s) {
    for (var child = info.firstChild; child; child = child.nextSibling) {
      if (child.style) {
        child.style.display = child.id == s ? 'inline' : 'none'
      }
    }
    info.style.visibility = 'visible'
  } else {
    info.style.visibility = 'hidden'
  }
}

//fun speech synthesis stuff here

let voices = []

const getVoices = () => {
  voices = synth.getVoices()
}
getVoices()
if (synth.onvoiceschanged !== undefined) {
  synth.onvoiceschanged = getVoices
}

output_language.addEventListener('change', () => {
  updateSpeaker()
})

function updateSpeaker() {
  for (var i = spoken_language.options.length - 1; i >= 0; i--) {
    spoken_language.remove(i)
  }
  for (let i = 0; i < voices.length; i++) {
    let currentVoice = voices[i].lang
    console.log(currentVoice, 'current voice')
    console.log(output_language.value, 'output value')
    if (currentVoice.startsWith(output_language.value)) {
      spoken_language.options.add(
        new Option(
          `${voices[i].name} (${voices[i].lang})`,
          voices[i].name //value
        )
      )
    }
  }
}

spoken_language.addEventListener('change', () => speak())
//speak!

const speak = () => {
  // Check if speaking
  if (synth.speaking) {
    console.error('Already speaking...')
    return
  }
  if (translated_span.innerHTML !== '') {
    // Get speak text
    const speakText = new SpeechSynthesisUtterance(translated_span.innerHTML)

    // Speak end
    speakText.onend = e => {
      console.log('Done speaking...')
    }

    // Speak error
    speakText.onerror = e => {
      console.error('Something went wrong')
    }

    // Loop through voices
    voices.forEach(voice => {
      if (voice.name === spoken_language.value) {
        speakText.voice = voice
      }
    })

    synth.speak(speakText)
  }
}
