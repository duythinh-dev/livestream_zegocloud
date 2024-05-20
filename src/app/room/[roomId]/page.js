"use client";
import React, { useRef } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

export default function Room({ params }) {
  //   const streamRef = useRef(null);
  const { roomId } = params;
  const myMeeting = async (e) => {
    const appId = 1628765537;
    const serverSecret = "a208a4bf3df6e21cb911595336bdf125";
    const userID = Math.floor(Math.random() * 10000) + "";
    const userName = "userName" + userID;
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      appId,
      serverSecret,
      roomId,
      userID,
      userName
    );

    const zp = ZegoUIKitPrebuilt.create(kitToken);
    zp.joinRoom({
      container: e,
      scenario: {
        mode: ZegoUIKitPrebuilt.LiveStreaming,
      },
      //   sharedLinks: [
      //     {
      //       name: "Join as audience",
      //       url:
      //         window.location.protocol +
      //         "//" +
      //         window.location.host +
      //         window.location.pathname +
      //         "?roomID=" +
      //         roomID +
      //         "&role=Audience",
      //     },
      //   ],
    });
  };

  console.log("props", params);
  return (
    <div>
      Room {roomId}
      <div
        ref={myMeeting}
        className="w-[500px] h-[500px] max-h-full max-w-full"
      />
    </div>
  );
}
