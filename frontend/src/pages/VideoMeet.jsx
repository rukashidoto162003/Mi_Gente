import React, { useRef, useState, useEffect } from "react";

import { Badge, BadgeMark, IconButton, TextField } from "@mui/material";
import { Button } from "@mui/material";
import io from "socket.io-client";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";

import styles from "../styles/videoComponent.module.css";
import { useNavigate } from "react-router-dom";
import server from "../environment";

const server_url = server;

var connections =
  {}; /*connections is an object that stores all WebRTC peer connections between you and other participants Think:

connections = dictionary of active peer connections

Each key:socket ID of another user and Each value:WebRTC connection object with that user 
"connections["socket456"] = new RTCPeerConnection(...)" */

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoMeetComponent() {
  var socketRef = useRef();
  let socketIdRef = useRef();

  let localVideoRef = useRef();

  let [videoAvailable, setVideoAvailable] = useState(true);

  let [audioAvailable, setAudioAvailable] = useState(true);

  let [video, setVideo] = useState([]);

  let [audio, setAudio] = useState();

  let [screen, setScreen] = useState();

  let [showModal, setModal] = useState();

  let [screenAvailable, setScreenAvailable] = useState();

  let [messages, setMessages] = useState([]);

  let [message, setMessage] = useState("");

  let [newMessages, setNewMessages] = useState(0);

  let [askForUsername, setAskForUserName] = useState(true);

  let [username, setUsername] = useState("");

  const videoRef = useRef([]);

  let [videos, setVideos] = useState([]);

  //TODO
  //if(isChrome()===false){
  //}

  

  const getPermissions = async () => {
    try {
      const videoPermission = await navigator.mediaDevices.getUserMedia({
        video: true,
        /*Request camera access, Browser will:Ask user permission If allowed → give you a video stream */
      });

      /*navigator lets your web app talk to the user’s device, and in your project it’s what enables camera + mic for video calls. */
      /**navigator.mediaDevices → gives access to media hardware
       getUserMedia() → asks user permission */
      if (videoPermission) {
        setVideoAvailable(true);
      } else {
        setVideoAvailable(false);
      }
      const audioPermission = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (audioPermission) {
        setAudioAvailable(true);
      } else {
        setAudioAvailable(false);
      }

      if (navigator.mediaDevices.getDisplayMedia) {
        setScreenAvailable(true);
      } else {
        setScreenAvailable(false);
      }

      if (videoAvailable || audioAvailable) {
        const userMediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoAvailable,
          audio: audioAvailable,
        });

        if (userMediaStream) {
          window.localStream = userMediaStream;

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = userMediaStream;
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    getPermissions();
  }, []);

  let getUserMediaSuccess = (stream) => {
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    localVideoRef.current.srcObject = stream;

    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      connections[id].addStream(window.localStream);
      /*Yes, addStream() is a built-in method of RTCPeerConnection, but it’s outdated—modern apps use addTrack() instead. */

      connections[id].createOffer().then((description) => {
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription }),
            );
          })
          .catch((e) => console.log(e));
      });
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setVideo(false);
          setAudio(false);

          try {
            let tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (e) {
            console.log(e);
          }

          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);
          window.localStream = blackSilence();
          localVideoRef.current.srcObject = window.localStream;

          for (let id in connections) {
            connections[id].addStream(window.localStream);
            connections[id].createOffer().then((description) => {
              connections[id]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id,
                    JSON.stringify({ sdp: connections[id].localDescription }),
                  );
                })
                .catch((e) => console.log(e));
            });
          }
        }),
    );
  };
  /*description is an SDP (Session Description Protocol) object which contains the plane showing how your device wants to communicate.... description is the SDP object that defines how your WebRTC connection should be established. */

  let silence = () => {
    let ctx = new AudioContext();
    let oscillator = ctx.createOscillator();

    let dst = oscillator.connect(ctx.createMediaStreamDestination());

    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  let black = ({ widht = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      widht,
      height,
    });

    canvas.getContext("2d").fillRect(0, 0, widht, height);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  let getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices
        .getUserMedia({
          video: video,
          audio: audio,
        })
        .then(getUserMediaSuccess)
        .catch((e) => console.log(e));
      /*Your function getUserMediaSuccess automatically receives stream because .then() passes the resolved value of the Promise to it. */
    } else {
      try {
        let tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (video != undefined && audio != undefined) {
      getUserMedia();
    }
  }, [video, audio]);

  let gotMessageFromServer = (fromId, message) => {
    /*fromId==> The socket ID of the sender (the other peer).This helps identify which connection object to update.*/

    var signal = JSON.parse(message);
    /*message==> Stringified JSON message sent through socket and hereConvert message string → JSON object*/
    if (fromId !== socketIdRef.current) {
      /*This prevents processing messages sent by yourself.Because signalling server broadcasts messages to everyone in the room, including the sender*/
      if (signal.sdp) {
        /*SDP=Session Description Protocol Contains:audio/video codecs, IP address, port numbers, media capabilities*/
        connections[fromId]
          .setRemoteDescription(
            new RTCSessionDescription(signal.sdp),
          ) /*Store the other peer's SDP inside your connection object*/
          .then(() => {
            if (signal.sdp.type === "offer") {
              connections[fromId]
                .createAnswer()
                .then((description) => {
                  /*Exactly the same thing happens earlier with:createOffer().then(description => ...)There, description is the offer blueprint instead of the answer blueprint. */
                  connections[fromId]
                    .setLocalDescription(description)
                    /*the browser must first store the SDP internally before sharing it*/
                    .then(() => {
                      socketRef.current.emit(
                        "signal",
                        fromId,
                        JSON.stringify({
                          sdp: connections[fromId].localDescription,
                        }),
                      );
                    })
                    .catch((e) => console.log(e));
                })
                .catch((e) => console.log(e));
            } /*while sending offer we set our local description for offer and while sending answer we set our local answer*/
            if (signal.ice) {
              connections[fromId]
                .addIceCandidate(new RTCIceCandidate(signal.ice))
                .catch((e) => console.log(e));
            }

            /*SDP Offer → requires an Answer back and ICE Candidate → does NOT require an Answer back ICE candidates are different. They are network path suggestions, not negotiation requests. while When a peer sends an SDP offer, it is basically saying:“Here is my full communication setup — do you accept it?” so it requires an answer*/
          });
      }
    }

    /*This function runs whenever your client receives a signalling message from another user through the socket server.this function is part of the WebRTC signalling pipeline.*/
    /*setLocalDescription() sets our own communication blueprint, and setRemoteDescription() reads and applies the other user's communication blueprint. */
  };

  let addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: sender, data: data },
    ]);

    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((prevMessages) => prevMessages + 1);
    }
  };

  let connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, {
      secure: false,
    }); /*This creates connection between Frontend (browser) ↔ Backend (Socket server) io.connect function comes from SOCKET.IO and it returns a connections object which contains the information about the connection represents your live socket connection object (your active communication channel with the server).Think of it like:socketRef.current = your personal communication line with server*/

    socketRef.current.on("signal", gotMessageFromServer);
    /* This listens for:
    SDP messages
    ICE candidates==>network address to facilitate peer to peer connection
    from other users.
    Example:
    User A sends SDP
    Server forwards SDP
    User B receives SDP here
    Then handled by:
    gotMessageFromServer()
    This function completes WebRTC handshake. basically it means Whenever server sends connection data → handle it */

    socketRef.current.on("connect", () => {
      /*This runs when browser successfully connects to backend socket server Before this no communication possible After this meeting setup begins */

      socketRef.current.emit("join-call", window.location.href);
      /*This tells server Add me to this meeting room=>Room name window.location.href So everyone visiting same URL joins same meeting.This is your meeting ID system.*/

      socketIdRef.current =
        socketRef.current.id; /*Store socket ID Now your browser knows:Who am I inside this meeting? simply getting the socket id from the connections object */

      socketRef.current.on("chat-message", addMessage);
      /*Whenever someone sends chat: Server broadcasts message Browser receives message here Then: addMessage() updates UI.*/

      socketRef.current.on("user-left", (id) => {
        /*Runs when:someone exits meetingServer sends:socketId of user who left*/
        setVideo((videos) => videos.filter((video) => video.socketId !== id));
        /*remove that user's video from UI */
      });

      socketRef.current.on("user-joined", (id, clients) => {
        /* runs when someone joins meeting id-> who joined and clients-> list of everyone in the room*/
        clients.forEach((socketListId) => {
          /*Loop through all users in meeting.socketListId represents:The socket ID of another participant in the meeting*/

          connections[socketListId] = new RTCPeerConnection(
            peerConfigConnections,
          );
          /*Creates:direct browser-to-browser connection object */

          connections[socketListId].onicecandidate = (event) => {
            /*You are assigning an event handler (callback function) to a built-in event property called onicecandidate it comes from WebRTC API. onicecandidate is a built-in event handler of the WebRTC object.Runs when browser finds:possible network path local IP, public IP relay path.It runs automatically when the browser finds:possible network routes between two users*/
            /*event is an ICE Candidate Event object It is automatically provided by the browser when the event fires.*/
            /*WebRTC finds routes and Socket.IO delivers routes */
            /*Browser discovers network path
            ↓
             Browser triggers onicecandidate
            ↓
             Browser sends event object into your function */

            if (event.candidate != null) {
              /*event.candidate-->RTCIceCandidate*/
              /*This line means ==> Only send ICE candidate data to the other user if a real network route exists.
              Because sometimes the browser sends a final empty signal (null) to indicate "I have finished searching for connection routes"*/
              socketRef.current.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate }),
              );
              /*send ICE candidate to other user So connection improves step-by-step.*/
            }
          };
          /*Basically When the browser discovers a possible connection route to another user, give me that route inside event.candidate so I can send it to them through the signaling server. */

          connections[socketListId].onaddstream = (event) => {
            /*Runs when other user sends video stream Everything before this prepares the connection — this block renders the incoming video stream into your UI.*/
            let videoExists = videoRef.current.find(
              (video) => video.socketId === socketListId,
              /*Checks:already displaying this user's video? If YES:update stream.If NO:create new video element. */
            );

            if (videoExists) {
              setVideos((videos) => {
                const updatedVideos = videos.map((video) =>
                  video.socketId === socketListId
                    ? { ...video, stream: event.stream }
                    : video,
                );
                videoRef.current = updatedVideos;
                return updatedVideos;
              });
            } else {
              let newVideo = {
                socketId: socketListId,
                stream: event.stream,
                autoPlay: true,
                playsinline: true,
              };
              setVideos((videos) => {
                const updatedVideos = [...videos, newVideo];
                videoRef.current = updatedVideos;
                return updatedVideos;
              });
              /*Creates object:video metadata Then:setVideos()adds it to UI. */
            }
          };

          if (window.localStream !== undefined && window.localStream !== null) {
            /*Check:do we already have camera stream?If yes:send my camera stream to other user*/
            connections[socketListId].addStream(
              window.localStream,
            ); /*Send my camera stream to that participant */
          } else {
            let blackSilence = (...args) =>
              new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            connections[socketListId].addStream(window.localStream);
          }
          /*This block is where your camera stream gets sent to the other participant in the meeting.It’s a small piece of code, but it plays a critical role in making your video visible to others.simply checks whether your camera stream is available and, if yes, attaches it to the WebRTC peer connection so the other participant can see and hear you. */
        });

        if (id === socketIdRef.current) {
          /*This checks:Did I just join the meeting? this condition exist so that only the new joining user generates the offer */
          for (let id2 in connections) {
            /*Loop through every participant connection*/
            if (id2 === socketIdRef.current)
              continue; /*skip if its my own id */

            try {
              connections[id2].addStream(
                window.localStream,
              ); /*Attach your camera to this peer connection */
            } catch (e) {}

            connections[id2].createOffer().then((description) => {
              /*description is the offer object created by the browser*/
              connections[id2]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id2,
                    JSON.stringify({ sdp: connections[id2].localDescription }),
                  ); /**Send SDP to other user or send connection offer to other user */
                })
                .catch((e) => {
                  console.log(e);
                });
            });
            /*Create connection request message for other participant
            Save my connection offer inside my browser. So browser remembers:This is my connection configuration 
            Send my connection request to that specific participant
            When I join the meeting, I create WebRTC offers for every other participant and send those offers through the signaling server so peer-to-peer video connections can begin.*/
          }
        }
        /*I will start the connection with everyone else in the meeting.
        .then() is used because createOffer() and setLocalDescription() are asynchronous operations, so the browser must finish generating and storing the SDP offer before sending it to the other participant.*/
      });
    });
  };

  let getMedia = () => {
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    connectToSocketServer();
  };

  let routeTo = useNavigate();

  let connect = () => {
    setAskForUserName(false);
    getMedia();
  };

  let handleVideo = () => {
    setVideo(!video);
  };

  let handleAudio = () => {
    setAudio(!audio);
  };

  let getDisplayMediaSuccess = (stream) => {
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    localVideoRef.current.srcObject = stream;

    for (let id in connections) {
      if (id === socketIdRef.current) continue;
      connections[id].addStream(window.localStream);
      connections[id].createOffer().then((description) => {
        connections[id].setLocalDescription(description).then(() => {
          socketRef.current
            .emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription }),
            )
            .catch((e) => console.log(e));
        });
      });
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setScreen(false);

          try {
            let tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (e) {
            console.log(e);
          }

          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);
          window.localStream = blackSilence();
          localVideoRef.current.srcObject = window.localStream;

          getUserMedia();
        }),
    );
  };

  let getDisplayMedia = () => {
    if (screen) {
      if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: true })
          .then(getDisplayMediaSuccess)
          .then((stream) => {})
          .catch((e) => {
            console.log(e);
          });
      }
    }
  };

  useEffect(() => {
    if (screen !== undefined) {
      getDisplayMedia();
    }
  });

  let handleScreen = () => {
    setScreen(!screen);
  };

  let sendMessage = () => {
    socketRef.current.emit("chat-message", message, username);
    setMessage(" ");
  };

  let handleEndCall = () => {
    try {
      let tracks = localVideoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    } catch (e) {}

    routeTo("/home");
  };

  return (
    <div>
      {askForUsername === true ? (
        <div>
          <h2>Enter into Lobby</h2>
          <TextField
            id="outlined-basic"
            label="Username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
            }}
          ></TextField>
          <Button variant="contained" onClick={connect}>
            Connect
          </Button>

          <div>
            <video ref={localVideoRef} autoPlay muted></video>
          </div>
        </div>
      ) : (
        <div className={styles.meetVideoContainer}>
          {showModal ? (
            <div className={styles.chatRoom}>
              <div className={styles.chatContainer}>
                <h1>Chat</h1>
                <div className={styles.chattingDisplay}>
                  {messages.length > 0 ? (
                    messages.map((item, index) => {
                      return (
                        <div style={{ marginBottom: "20px" }} key={index}>
                          <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                          <p>{item.data}</p>
                        </div>
                      );
                    })
                  ) : (
                    <p>No Messages Yet</p>
                  )}
                </div>

                <div className={styles.chattingArea}>
                  {message}
                  <TextField
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    id="outlined-basic"
                    label="Enter Your Chat"
                    variant="outlined"
                  />
                  <Button variant="contained" onClick={sendMessage}>
                    Send
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <></>
          )}

          <div className={styles.buttonContainers}>
            <IconButton onClick={handleVideo} style={{ color: "white" }}>
              {video === true ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
            <IconButton onClick={handleEndCall} style={{ color: "red" }}>
              <CallEndIcon />
            </IconButton>
            <IconButton onClick={handleAudio} style={{ color: "white" }}>
              {audio === true ? <MicIcon /> : <MicOffIcon />}
            </IconButton>

            {screenAvailable === true ? (
              <IconButton onClick={handleScreen} style={{ color: "white" }}>
                {screen === true ? (
                  <ScreenShareIcon />
                ) : (
                  <StopScreenShareIcon />
                )}
              </IconButton>
            ) : (
              <></>
            )}

            <Badge badgeContent={newMessages} max={999} color="orange">
              <IconButton
                onClick={() => setModal(!showModal)}
                style={{ color: "secondary" }}
              >
                <ChatIcon />
              </IconButton>
            </Badge>
          </div>

          <video
            className={styles.meetUserVideo}
            ref={localVideoRef}
            autoPlay
            muted
          ></video>

          <div className={styles.conferenceView}>
            {videos.map((video) => (
              <div key={video.socketId}>
                <video
                  data-socket={video.socketId}
                  ref={(ref) => {
                    if (ref && video.stream) {
                      ref.srcObject = video.stream;
                    }
                  }}
                  autoPlay
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/*Your browser already knows its local IP.
It asks STUN:
"Hey STUN server — what public address am I visible as on the internet?"
Then STUN replies:
49.x.x.x:port
This becomes an ICE candidate */
