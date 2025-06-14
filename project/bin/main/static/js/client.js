
let localId;
let localStream;
let stompCLient;
let name;
let remoteId;


const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

localId = $("#name").val();

localPeer = new RTCPeerConnection(configuration)

navigator.mediaDevices.getUserMedia({video: false, audio: true}) // Настраиваем включение видео или микрофона в веб интерфейсе
    .then(stream => {
        localStream = stream

        console.log(localStream.getTracks()[0])

    })
    .catch(error => {
        // access denied or error occurred
        console.log(error)
    });



//Signalizing from client




function connect() {
    const socket = new SockJS('/socket', {debug: false}); // подключение к сокету спринга
    stompClient =  Stomp.over(socket);
    localId = $("#name").val(); // включаем STOMP
    stompClient.connect({}, frame => {
    console.log('Connected: ' + frame);
    setConnected(true);
    // localId = 
    
    stompClient.subscribe('/topic/call', (call) => { // подписываемся на тему звонка(чтобы в будущем определить другие пиры)
        remoteId = call.body;
        console.log("Remote id:", remoteId);
        
        let localId = $("#name").val();

        localPeer.ontrack = (event) => {
            console.log("Received remote track:", event.track.kind);
            // For audio-only:
            const audio = new Audio();
            audio.srcObject = event.streams[0];
            audio.play();
          };


        localPeer.onicecandidate = (event) => {
            if (event.candidate) {
                var candidate = {
                    type: "candidate",
                    lable: event.candidate.sdpMLineIndex,
                    id: event.candidate.candidate,
                }
                console.log("Sending Candidate")
                console.log(candidate)
                stompClient.send("/app/candidate", {}, JSON.stringify({
                    "toUser": remoteId,
                    "fromUser": localId,
                    "candidate": candidate
                }))
            }
        }
       
        if (call.body != localId) {
            console.log("local peer")
    
            
            localStream.getTracks().forEach(track => {
                localPeer.addTrack(track, localStream);
            });

            localPeer.createOffer().then(description => {
                localPeer.setLocalDescription(description);
                stompClient.send("/app/offer", {}, JSON.stringify({
                    "toUser": call.body,
                    "fromUser": localId,
                    "offer": description
                }))
            })

            
        }
        

    });

    

    stompClient.subscribe("/topic/offer", (offer) => {
        
        let localId = $("#name").val();
        const offerData = JSON.parse(offer.body);
        let remoteId = offerData.fromUser;
        if (remoteId != localId) {
        // var o = JSON.parse(offer.body)["offer"]
        // console.log(offer.body)
        // console.log(new RTCSessionDescription(o))
        // console.log(typeof (new RTCSessionDescription(o)))
        localStream.getTracks().forEach(track => {
            localPeer.addTrack(track, localStream);
        });
        console.log("Offer came")

        localPeer.ontrack = (event) => {
            console.log("Received remote track:", event.track.kind);
            // For audio-only:
            const audio = new Audio();
            audio.srcObject = event.streams[0];
            audio.play();
          };


        console.log(localPeer.signalingState);
        localPeer.onicecandidate = (event) => {
                if (event.candidate) {
                    var candidate = {
                        type: "candidate",
                        lable: event.candidate.sdpMLineIndex,
                        id: event.candidate.candidate,
                    }
                    console.log("Sending Candidate")
                    console.log(candidate)
                    stompClient.send("/app/candidate", {}, JSON.stringify({
                        "toUser": remoteId,
                        "fromUser": localId,
                        "candidate": candidate
                    }))
                }
            }
           
            localId = $("#name").val();
            var o = JSON.parse(offer.body)["offer"]


                localPeer.setRemoteDescription(new RTCSessionDescription(o))
                localPeer.createAnswer().then(description => {
                    localPeer.setLocalDescription(description)
                    console.log("Setting Local Description")
                    console.log(description)
                    stompClient.send("/app/answer", {}, JSON.stringify({
                        "toUser": remoteId,
                        "fromUser": localId,
                        "answer": description
                    }));

                })
            
            }
            
            
    })
    stompClient.subscribe("/topic/answer", (answer) => {
        if (remoteId != localId) {
        
            console.log("Answer Came")
            localId = $("#name").val();
           
                var o = JSON.parse(answer.body)["answer"]
            console.log(o)
            localPeer.setRemoteDescription(new RTCSessionDescription(o))

            }

            
        });
    
    stompClient.subscribe("/topic/candidate", (answer) => {
            console.log("Candidate Came")
            var o = JSON.parse(answer.body)["candidate"]
            console.log(o)
            console.log(o["label"])
            console.log(o["id"])
            var iceCandidate = new RTCIceCandidate({
                sdpMLineIndex: o["lable"],
                candidate: o["id"],
            })
            localPeer.addIceCandidate(iceCandidate)
        });
    
});
    
}


localPeer.oniceconnectionstatechange = () => {
    console.log('ICE connection state:', localPeer.iceConnectionState);
    
    if (localPeer.iceConnectionState === 'connected') {
      console.log('Пиры успешно соединились!');
      // Здесь можно активировать UI элементы или начать передачу данных
    }
    
    if (localPeer.iceConnectionState === 'failed') {
      console.error('Соединение не удалось установить');
    }
  };


function setConnected(connected) {
    $("#connect").prop("disabled", connected);
    $("#disconnect").prop("disabled", !connected);
    if (connected) {
        $("#conversation").show();
    }
    else {
        $("#conversation").hide();
    }
    $("#greetings").html("");
}

function disconnect() {
    setConnected(false);
    console.log("Disconnected");
}



function send() {
    stompClient.send("/app/call", {}, JSON.stringify({"callFrom": $("#name").val()}))
    console.log("Successfully joined the call")
}

$(function () {
    $("form").on('submit', (e) => e.preventDefault());
    $( "#connect" ).click(() => connect());
    $( "#disconnect" ).click(() => disconnect());
    $( "#send").click(() => send());
    $( "#test").click(() => checkConnection());
});


// Функция для проверки соединения
function checkConnection() {
    console.log(localPeer.iceConnectionState);
    if (localPeer && 
        localPeer.iceConnectionState === 'connected' && 
        localPeer.signalingState === 'stable') {
      console.log('Соединение установлено и стабильно');
      return true;
    }
    return false;
  }
  
  // Проверка каждые 2 секунды
  const checkInterval = setInterval(() => {
    if (checkConnection()) {
      clearInterval(checkInterval);
    }
  }, 2000);