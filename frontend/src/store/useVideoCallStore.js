import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

export const useVideoCallStore = create((set, get) => ({
  // Call state
  currentCall: null,
  isIncomingCall: false,
  incomingCallData: null,
  isCallActive: false,
  callStatus: "idle", // idle, ringing, connecting, connected, ended
  
  // Media streams
  localStream: null,
  remoteStream: null,
  
  // WebRTC
  peerConnection: null,
  
  // UI state
  isVideoEnabled: true,
  isAudioEnabled: true,
  isScreenSharing: false,
  callTimeout: null, // Thêm timeout reference
  callDuration: 0, // Thêm call duration timer
  
  // Initialize call
  initiateCall: async (receiverId, callType = "voice") => {
    const { socket } = useAuthStore.getState();
    if (!socket) {
      toast.error("Socket not connected");
      return false;
    }
    
    try {
      // Get user media based on call type
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === "video",
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        },
      });
      
      set({ 
        localStream: stream,
        callStatus: "ringing",
        currentCall: { receiverId, callType, isCaller: true }
      });
      
      socket.emit("initiateCall", { receiverId, callType });
      
      // Set timeout for call
      const timeout = setTimeout(() => {
        const { callStatus } = get();
        if (callStatus === "ringing") {
          get().endCall();
          toast.error("Call timeout - no answer");
        }
      }, 30000); // 30 seconds timeout

      set({ callTimeout: timeout });
      
      return true;
    } catch (error) {
      console.error("Error initiating call:", error);
      toast.error("Failed to access camera/microphone");
      return false;
    }
  },
  
  // Update call ID (for caller)
  updateCallId: (callId) => {
    const { currentCall } = get();
    if (currentCall && currentCall.isCaller) {
      set({ 
        currentCall: { ...currentCall, callId }
      });
      console.log("Updated call ID for caller:", callId);
    }
  },

  // Handle incoming call
  handleIncomingCall: (callData) => {
    console.log("Handling incoming call:", callData);
    
    // Clear any existing timeout
    const { callTimeout } = get();
    if (callTimeout) {
      clearTimeout(callTimeout);
    }
    
    set({ 
      isIncomingCall: true, 
      incomingCallData: callData,
      callStatus: "ringing"
    });

    // Play ringtone sound
    try {
      const audio = new Audio();
      audio.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT";
      audio.loop = true;
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Could not play ringtone:", e));
      
      // Store audio reference for cleanup
      set({ ringtoneAudio: audio });
    } catch (error) {
      console.log("Could not create ringtone:", error);
    }

    // Set incoming call timeout (45 seconds)
    const timeout = setTimeout(() => {
      const { isIncomingCall } = get();
      if (isIncomingCall) {
        console.log("Incoming call timeout - auto rejecting");
        get().rejectCall("timeout");
      }
    }, 45000);

    set({ callTimeout: timeout });
  },
  
  // Accept call
  acceptCall: async () => {
    const { socket } = useAuthStore.getState();
    const { incomingCallData, callTimeout, ringtoneAudio } = get();
    
    if (!socket || !incomingCallData) return false;
    
    // Clear incoming call timeout
    if (callTimeout) {
      clearTimeout(callTimeout);
    }
    
    // Stop ringtone
    if (ringtoneAudio) {
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
    }
    
    try {
      // Get user media based on call type
      const stream = await navigator.mediaDevices.getUserMedia({
        video: incomingCallData.callType === "video",
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });
      
             set({ 
         localStream: stream,
         isIncomingCall: false,
         currentCall: { 
           callId: incomingCallData.callId,
           callerId: incomingCallData.callerId,
           callType: incomingCallData.callType,
           isCaller: false 
         },
         callStatus: "connecting"
       });
      
      socket.emit("acceptCall", { callId: incomingCallData.callId });
      
      // Initialize WebRTC
      get().initializePeerConnection();
      
      return true;
    } catch (error) {
      console.error("Error accepting call:", error);
      toast.error("Failed to access camera/microphone");
      get().rejectCall();
      return false;
    }
  },
  
  // Reject call
  rejectCall: (reason = "user_rejected") => {
    const { socket } = useAuthStore.getState();
    const { incomingCallData, callTimeout, ringtoneAudio } = get();
    
    // Clear timeout
    if (callTimeout) {
      clearTimeout(callTimeout);
    }
    
    // Stop ringtone
    if (ringtoneAudio) {
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
    }
    
    if (socket && incomingCallData) {
      console.log("Rejecting call:", incomingCallData.callId, "reason:", reason);
      socket.emit("rejectCall", { callId: incomingCallData.callId });
    }
    
    set({ 
      isIncomingCall: false, 
      incomingCallData: null,
      callStatus: "idle",
      callTimeout: null,
      ringtoneAudio: null
    });
  },
  
  // Initialize WebRTC peer connection
  initializePeerConnection: () => {
    const { socket } = useAuthStore.getState();
    const { currentCall, localStream } = get();
    
    if (!socket || !currentCall || !localStream) {
      console.error("Missing required data for peer connection:", { socket: !!socket, currentCall, localStream: !!localStream });
      return;
    }
    
    console.log("Initializing peer connection for call:", currentCall);
    console.log("Call ID available:", !!currentCall.callId);
    
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        // Thêm TURN server cho localhost testing
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject"
        },
        {
          urls: "turn:openrelay.metered.ca:443",
          username: "openrelayproject", 
          credential: "openrelayproject"
        }
      ]
    });
    
    // Add local stream
    localStream.getTracks().forEach(track => {
      console.log("Adding track to peer connection:", track.kind, "enabled:", track.enabled);
      
      // Ensure audio tracks are enabled
      if (track.kind === 'audio') {
        track.enabled = true;
        console.log("Local audio track enabled:", track.enabled, "settings:", track.getSettings());
      }
      
      peerConnection.addTrack(track, localStream);
    });
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log("Received remote stream:", event.streams[0]);
      console.log("Remote stream tracks:", event.streams[0].getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
      
      // Ensure audio tracks are enabled
      event.streams[0].getAudioTracks().forEach(track => {
        track.enabled = true;
        console.log("Audio track enabled:", track.enabled, "settings:", track.getSettings());
      });
      
      set({ remoteStream: event.streams[0] });
    };
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate:", event.candidate);
        socket.emit("iceCandidate", {
          callId: currentCall.callId,
          candidate: event.candidate
        });
      }
    };
    
    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log("Connection state changed:", peerConnection.connectionState);
      if (peerConnection.connectionState === "connected") {
        set({ callStatus: "connected", isCallActive: true });
        toast.success("Call connected!");
        
        // Ensure audio is working after connection
        setTimeout(() => {
          const { remoteStream } = get();
          if (remoteStream) {
            const audioTracks = remoteStream.getAudioTracks();
            console.log("Connected - Audio tracks:", audioTracks.length);
            audioTracks.forEach(track => {
              console.log("Audio track state:", track.enabled, track.readyState);
            });
          }
        }, 1000);
      } else if (peerConnection.connectionState === "disconnected") {
        get().endCall();
      }
    };

    // Debug ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", peerConnection.iceConnectionState);
    };

    // Debug ICE gathering state
    peerConnection.onicegatheringstatechange = () => {
      console.log("ICE gathering state:", peerConnection.iceGatheringState);
    };
    
    set({ peerConnection });
    
    // If caller, create and send offer
    if (currentCall.isCaller) {
      console.log("Caller creating offer...");
      get().createOffer();
    }
  },
  
  // Create and send offer
  createOffer: async () => {
    const { socket } = useAuthStore.getState();
    const { peerConnection, currentCall } = get();
    
    if (!socket || !peerConnection || !currentCall) {
      console.error("Missing data for creating offer:", { socket: !!socket, peerConnection: !!peerConnection, currentCall });
      return;
    }
    
    try {
      console.log("Creating offer for call:", currentCall.callId);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      console.log("Sending offer:", offer);
      socket.emit("offer", {
        callId: currentCall.callId,
        offer: offer
      });
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  },
  
  // Handle offer
  handleOffer: async (offer) => {
    const { peerConnection, currentCall } = get();
    
    if (!peerConnection) {
      console.error("No peer connection available for handling offer");
      return;
    }
    
    try {
      console.log("Handling offer:", offer);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      const { socket } = useAuthStore.getState();
      
      console.log("Sending answer:", answer);
      socket.emit("answer", {
        callId: currentCall.callId,
        answer: answer
      });
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  },
  
  // Handle answer
  handleAnswer: async (answer) => {
    const { peerConnection } = get();
    
    if (!peerConnection) {
      console.error("No peer connection available for handling answer");
      return;
    }
    
    try {
      console.log("Handling answer:", answer);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  },
  
  // Handle ICE candidate
  handleIceCandidate: async (candidate) => {
    const { peerConnection } = get();
    
    if (!peerConnection) {
      console.error("No peer connection available for handling ICE candidate");
      return;
    }
    
    try {
      console.log("Handling ICE candidate:", candidate);
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
    }
  },
  
  // End call
  endCall: () => {
    const { socket } = useAuthStore.getState();
    const { currentCall, peerConnection, localStream } = get();
    
    if (socket && currentCall) {
      socket.emit("endCall", { callId: currentCall.callId });
    }
    
    // Clean up media streams
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnection) {
      peerConnection.close();
    }
    
    set({
      currentCall: null,
      isIncomingCall: false,
      incomingCallData: null,
      isCallActive: false,
      callStatus: "idle",
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      isVideoEnabled: true,
      isAudioEnabled: true,
      isScreenSharing: false
    });
  },
  
  // Toggle video
  toggleVideo: () => {
    const { localStream, isVideoEnabled } = get();
    
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        set({ isVideoEnabled: !isVideoEnabled });
      }
    }
  },
  
  // Toggle audio
  toggleAudio: () => {
    const { localStream, isAudioEnabled } = get();
    
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        set({ isAudioEnabled: !isAudioEnabled });
        console.log("Audio toggled:", !isAudioEnabled);
      }
    }
  },
  
  // Screen sharing
  toggleScreenShare: async () => {
    const { peerConnection, localStream, isScreenSharing } = get();
    
    if (!peerConnection) return;
    
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === "video"
        );
        
        if (sender) {
          sender.replaceTrack(videoTrack);
          set({ isScreenSharing: true });
        }
      } else {
        // Stop screen sharing and restore camera
        const videoTrack = localStream.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === "video"
        );
        
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
          set({ isScreenSharing: false });
        }
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
      toast.error("Failed to toggle screen sharing");
    }
  },

  // Cleanup function
  cleanup: () => {
    const { callTimeout, callDurationTimer, peerConnection, localStream, ringtoneAudio } = get();
    
    if (callTimeout) {
      clearTimeout(callTimeout);
    }
    
    if (callDurationTimer) {
      clearInterval(callDurationTimer);
    }
    
    if (peerConnection) {
      peerConnection.close();
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    if (ringtoneAudio) {
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
    }
    
    set({
      currentCall: null,
      isIncomingCall: false,
      incomingCallData: null,
      isCallActive: false,
      callStatus: "idle",
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      isVideoEnabled: true,
      isAudioEnabled: true,
      isScreenSharing: false,
      callTimeout: null,
      callDuration: 0,
      callDurationTimer: null,
      ringtoneAudio: null,
    });
  },
}));
