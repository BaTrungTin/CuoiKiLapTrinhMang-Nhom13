import React, { useEffect, useRef } from "react";
import { useVideoCallStore } from "../store/useVideoCallStore";
import { useAuthStore } from "../store/useAuthStore";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Monitor, X } from "lucide-react";
import toast from "react-hot-toast";

const VideoCallModal = () => {
  const {
    currentCall,
    isIncomingCall,
    incomingCallData,
    isCallActive,
    callStatus,
    localStream,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    callDuration,
    acceptCall,
    rejectCall,
    endCall,
    toggleVideo,
    toggleAudio,
    toggleScreenShare
  } = useVideoCallStore();

  const { authUser } = useAuthStore();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const audioRef = useRef(null);

  // Set video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      console.log("Remote stream set to video element");
      
      // Ensure video element is not muted for audio
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.volume = 1.0;
    }
  }, [remoteStream]);

  // Audio level monitoring and audio setup
  useEffect(() => {
    if (remoteStream) {
      const audioTrack = remoteStream.getAudioTracks()[0];
      if (audioTrack) {
        console.log("Remote audio track found:", audioTrack.enabled);
        console.log("Audio track settings:", audioTrack.getSettings());
        
        // Ensure audio is enabled
        audioTrack.enabled = true;
        
        // Create audio context to monitor levels (only if user has interacted)
        try {
          const audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(remoteStream);
          const analyser = audioContext.createAnalyser();
          source.connect(analyser);
          
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkAudioLevel = () => {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            if (average > 10) {
              console.log("Audio detected! Level:", average);
            }
          };
          
          const interval = setInterval(checkAudioLevel, 100);
          return () => clearInterval(interval);
        } catch (error) {
          console.log("Audio context not available:", error);
        }
      }
    }
  }, [remoteStream]);

  // Handle incoming call
  useEffect(() => {
    const { socket } = useAuthStore.getState();
    if (socket) {
      socket.on("incomingCall", (callData) => {
        console.log("Incoming call received:", callData);
        useVideoCallStore.getState().handleIncomingCall(callData);
        
        // Show browser notification if tab is not focused
        if (!document.hasFocus()) {
          if (Notification.permission === "granted") {
            new Notification("Incoming Call", {
              body: `${callData.callType === "video" ? "Video" : "Voice"} call from ${callData.callerInfo?.userId || "Unknown"}`,
              icon: "/avatar.png",
              requireInteraction: true
            });
          }
        }
      });

      socket.on("callInitiated", ({ callId, receiverId }) => {
        console.log("Call initiated event received:", callId);
        const { currentCall } = useVideoCallStore.getState();
        if (currentCall && currentCall.isCaller) {
          // Update currentCall with callId
          useVideoCallStore.getState().updateCallId(callId);
        }
      });

      socket.on("callAccepted", ({ callId }) => {
        console.log("Call accepted event received:", callId);
        const { currentCall } = useVideoCallStore.getState();
        if (currentCall && currentCall.isCaller) {
          console.log("Caller initializing peer connection...");
          useVideoCallStore.getState().initializePeerConnection();
        }
      });

      socket.on("callRejected", ({ callId }) => {
        useVideoCallStore.getState().endCall();
      });

      socket.on("callEnded", ({ callId, reason }) => {
        useVideoCallStore.getState().endCall(reason);
      });

      socket.on("offer", ({ callId, offer }) => {
        console.log("Offer received:", callId);
        useVideoCallStore.getState().handleOffer(offer);
      });

      socket.on("answer", ({ callId, answer }) => {
        console.log("Answer received:", callId);
        useVideoCallStore.getState().handleAnswer(answer);
      });

      socket.on("iceCandidate", ({ callId, candidate }) => {
        console.log("ICE candidate received:", callId);
        useVideoCallStore.getState().handleIceCandidate(candidate);
      });

      return () => {
        socket.off("incomingCall");
        socket.off("callInitiated");
        socket.off("callAccepted");
        socket.off("callRejected");
        socket.off("callEnded");
        socket.off("offer");
        socket.off("answer");
        socket.off("iceCandidate");
      };
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      useVideoCallStore.getState().cleanup();
    };
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Debug audio when call connects
  useEffect(() => {
    if (callStatus === "connected" && remoteStream) {
      console.log("Call connected - checking audio...");
      const audioTracks = remoteStream.getAudioTracks();
      console.log("Audio tracks found:", audioTracks.length);
      
      audioTracks.forEach((track, index) => {
        console.log(`Audio track ${index}:`, {
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted,
          settings: track.getSettings()
        });
      });
    }
  }, [callStatus, remoteStream]);

  // Handle page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      const { isIncomingCall, incomingCallData } = useVideoCallStore.getState();
      
      // If page becomes visible and there's an incoming call, show it again
      if (!document.hidden && isIncomingCall && incomingCallData) {
        console.log("Page became visible, showing incoming call modal");
        // Force re-render by updating state
        useVideoCallStore.setState({ 
          isIncomingCall: true,
          incomingCallData: incomingCallData 
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, []);

  // Incoming call modal
  if (isIncomingCall) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-base-100 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-white" />
            </div>
                         <h3 className="text-lg font-semibold mb-2">Incoming Call</h3>
             <p className="text-base-content/70 mb-6">
               {incomingCallData?.callType === "video" ? "Video Call (Audio + Video)" : "Voice Call (Audio Only)"}
             </p>
             <p className="text-sm text-base-content/50 mb-4">
               Call will auto-reject in 45 seconds
             </p>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={acceptCall}
                className="btn btn-success btn-circle"
              >
                <Phone className="w-5 h-5" />
              </button>
              <button
                onClick={rejectCall}
                className="btn btn-error btn-circle"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active call modal
  if (isCallActive || callStatus === "ringing" || callStatus === "connecting") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="relative w-full h-full max-w-4xl max-h-[90vh]">
                                 {/* Remote video (main) - only for video calls */}
            {(incomingCallData?.callType === "video" || currentCall?.callType === "video") && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover rounded-lg"
                muted={false}
                onLoadedMetadata={() => {
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.volume = 1.0;
                    console.log("Video element audio set up");
                  }
                }}
              />
            )}
           
                       {/* Voice call interface - only for voice calls */}
            {(incomingCallData?.callType === "voice" || currentCall?.callType === "voice") && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center mx-auto mb-8">
                    <Phone className="w-16 h-16 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Voice Call</h2>
                  <p className="text-lg text-base-content/70">Audio Only</p>
                  
                                     {/* Hidden audio element for voice calls */}
                   {remoteStream && (
                     <audio
                       autoPlay
                       playsInline
                       ref={audioRef}
                       onLoadedMetadata={() => {
                         if (audioRef.current && remoteStream) {
                           audioRef.current.srcObject = remoteStream;
                           audioRef.current.volume = 1.0;
                           audioRef.current.muted = false;
                           console.log("Audio element set up for voice call");
                           
                           // Test audio
                           audioRef.current.play().then(() => {
                             console.log("Audio playing successfully");
                           }).catch(error => {
                             console.error("Audio play failed:", error);
                           });
                         }
                       }}
                     />
                   )}
                </div>
              </div>
            )}
          
                     {/* Local video (picture-in-picture) - only for video calls */}
           {(incomingCallData?.callType === "video" || currentCall?.callType === "video") && (
             <div className="absolute top-4 right-4 w-48 h-36">
               <video
                 ref={localVideoRef}
                 autoPlay
                 playsInline
                 className="w-full h-full object-cover rounded-lg border-2 border-white"
                 muted={true}
               />
             </div>
           )}

          {/* Call status overlay */}
                     {callStatus === "ringing" && (
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
               <div className="bg-base-100 rounded-lg p-4 text-center">
                 <div className="animate-pulse">
                   <Phone className="w-8 h-8 mx-auto mb-2" />
                   <p>Calling...</p>
                   <p className="text-sm text-base-content/50 mt-2">
                     Call will timeout in 30 seconds
                   </p>
                 </div>
               </div>
             </div>
           )}

          {callStatus === "connecting" && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="bg-base-100 rounded-lg p-4 text-center">
                <div className="animate-spin">
                  <Phone className="w-8 h-8 mx-auto mb-2" />
                  <p>Connecting...</p>
                </div>
              </div>
            </div>
          )}

                     {/* Call duration display */}
           {callStatus === "connected" && callDuration > 0 && (
             <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
               <div className="bg-base-100/80 rounded-lg px-3 py-1 text-sm">
                 {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
               </div>
             </div>
           )}

                      {/* Call controls */}
           <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
             <div className="flex gap-4">
               {/* Toggle video - only for video calls */}
               {(incomingCallData?.callType === "video" || currentCall?.callType === "video") && (
                 <button
                   onClick={toggleVideo}
                   className={`btn btn-circle ${isVideoEnabled ? 'btn-primary' : 'btn-error'}`}
                 >
                   {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                 </button>
               )}

              {/* Toggle audio */}
              <button
                onClick={toggleAudio}
                className={`btn btn-circle ${isAudioEnabled ? 'btn-primary' : 'btn-error'}`}
              >
                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

                             {/* Screen share - only for video calls */}
               {(incomingCallData?.callType === "video" || currentCall?.callType === "video") && (
                 <button
                   onClick={toggleScreenShare}
                   className={`btn btn-circle ${isScreenSharing ? 'btn-success' : 'btn-primary'}`}
                 >
                   <Monitor className="w-5 h-5" />
                 </button>
               )}

              {/* End call */}
              <button
                onClick={endCall}
                className="btn btn-circle btn-error"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={endCall}
            className="absolute top-4 left-4 btn btn-circle btn-sm btn-ghost bg-base-100/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default VideoCallModal;
