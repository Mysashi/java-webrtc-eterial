
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

        // console.log(stream.getTracks()[0])
        // console.log(stream.getTracks()[1])
        console.log(localStream.getTracks()[0])

        // access granted, stream is the webcam stream
    })
    .catch(error => {
        // access denied or error occurred
        console.log(error)
    });



//Signalizing from client




function connect() {
    const socket = new SockJS('/socket', {debug: false}); // подключение к сокету спринга
    stompClient =  Stomp.over(socket); // включаем STOMP
    stompClient.connect({}, frame => {
    console.log('Connected: ' + frame);
    setConnected(true);
    // localId = 
    
    stompClient.subscribe('/topic/call', (call) => { // подписываемся на тему звонка(чтобы в будущем определить другие пиры)
        remoteId = call.body;
        console.log("Remote id:", remoteId);
        if (call.body != localId) {
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
                        "toUser": call.body,
                        "fromUser": localId,
                        "candidate": candidate
                    }))
                }
            }

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
        console.log("Offer came")
        // var o = JSON.parse(offer.body)["offer"]
        // console.log(offer.body)
        // console.log(new RTCSessionDescription(o))
        // console.log(typeof (new RTCSessionDescription(o)))
        
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
            console.log("REMOTEID:", remoteId);
            console.log("LOCALID: ", localId);
            var o = JSON.parse(offer.body)["offer"]
            if (remoteId != localId) {
                console.log("Setting up the answer");
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
            console.log("Answer Came")
            localId = $("#name").val();
            if (remoteId != localId) {
                var o = JSON.parse(answer.body)["answer"]
            console.log(o)
            localPeer.setRemoteDescription(new RTCSessionDescription(o))

            }

            
        });
    
    stompClient.subscribe("/topic/candidate", (answer) => {
            console.log("Candidate Came")
            var o = JSON.parse(answer.body)["candidate"]
            console.log(o)
            console.log(o["lable"])
            console.log(o["id"])
            var iceCandidate = new RTCIceCandidate({
                sdpMLineIndex: o["lable"],
                candidate: o["id"],
            })
            localPeer.addIceCandidate(iceCandidate)
        });
    
});
    
}


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
});