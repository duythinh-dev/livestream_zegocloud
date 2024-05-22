"use client";

import React, { useEffect, useRef, useState } from "react";
// import { ZegoExpressEngine } from "zego-express-engine-webrtc";
import { generateToken04 } from "../../../../server/zegoServerAssistant";

// Step1 Check system requirements
async function checkSystemRequirements(zg) {
  console.log("sdk version is", zg.getVersion());
  try {
    const result = await zg.checkSystemRequirements();

    console.warn("checkSystemRequirements ", result);
    if (!result.webRTC) {
      console.error("browser is not support webrtc!!");
      return false;
    } else if (!result.videoCodec.H264 && !result.videoCodec.VP8) {
      console.error("browser is not support H264 and VP8");
      return false;
    } else if (!result.camera && !result.microphone) {
      console.error("camera and microphones not allowed to use");
      return false;
    } else if (result.videoCodec.VP8) {
      if (!result.screenSharing)
        console.warn("browser is not support screenSharing");
    } else {
      console.log("不支持VP8，请前往混流转码测试");
    }
    return { ...result, isSuccess: true, videoCodec: "VP8" };
  } catch (err) {
    console.error("checkSystemRequirements", err);
    return false;
  }
}

async function enumDevices(zg) {
  const deviceInfo = await zg.enumDevices();
  const audioDeviceList =
    deviceInfo &&
    deviceInfo.microphones.map((item, index) => {
      if (!item.deviceName) {
        item.deviceName = "microphone" + index;
      }
      console.log("microphone: " + item.deviceName);
      return item;
    });
  audioDeviceList.push({ deviceID: 0, deviceName: "禁止" });
  const videoDeviceList =
    deviceInfo &&
    deviceInfo.cameras.map((item, index) => {
      if (!item.deviceName) {
        item.deviceName = "camera" + index;
      }
      console.log("camera: " + item.deviceName);
      return item;
    });
  videoDeviceList.push({ deviceID: 0, deviceName: "禁止" });
  console.log("audioDeviceList", audioDeviceList);
  return {
    videoDeviceList,
    audioDeviceList,
    microphoneDevicesVal: audioDeviceList[0].deviceID,
    cameraDevicesVal: videoDeviceList[0].deviceID,
  };
}

async function CheckSystemRequire(zg, callback) {
  let stateChange = {};
  const result = await checkSystemRequirements(zg);
  if (result) {
    stateChange.checkSystemRequireStatus = "SUCCESS";
    const enums = await enumDevices(zg);
    stateChange = { ...stateChange, ...enums, ...result };
  } else {
    stateChange.checkSystemRequireStatus = "ERROR";
  }
  console.log("stateChange: ", stateChange);
  callback(stateChange);
}

// function initEvent() {
//   zg.on("roomStateUpdate", (roomId, state) => {
//     if (state === "CONNECTED") {
//       // $('#roomStateSuccessSvg').css('display', 'inline-block');
//       // $('#roomStateErrorSvg').css('display', 'none');
//     }

//     if (state === "DISCONNECTED") {
//       // $('#roomStateSuccessSvg').css('display', 'none');
//       // $('#roomStateErrorSvg').css('display', 'inline-block');
//     }
//   });

//   zg.on("publisherStateUpdate", (result) => {
//     if (result.state === "PUBLISHING") {
//       // $('#pushlishInfo-id').text(result.streamID)
//     } else if (result.state === "NO_PUBLISH") {
//       // $('#pushlishInfo-id').text('')
//     }
//   });

//   zg.on("playerStateUpdate", (result) => {
//     if (result.state === "PLAYING") {
//       // $('#playInfo-id').text(result.streamID)
//     } else if (result.state === "NO_PLAY") {
//       // $('#playInfo-id').text('')
//     }
//   });

//   zg.on("publishQualityUpdate", (streamId, stats) => {
//     // $('#publishResolution').text(`${stats.video.frameWidth} * ${stats.video.frameHeight}`)
//     // $('#sendBitrate').text(parseInt(stats.video.videoBitrate) + 'kbps')
//     // $('#sendFPS').text(parseInt(stats.video.videoFPS) + ' f/s')
//     // $('#sendPacket').text(stats.video.videoPacketsLostRate.toFixed(1) + '%')
//   });

//   zg.on("playQualityUpdate", (streamId, stats) => {
//     // $('#playResolution').text(`${stats.video.frameWidth} * ${stats.video.frameHeight}`)
//     // $('#receiveBitrate').text(parseInt(stats.video.videoBitrate) + 'kbps')
//     // $('#receiveFPS').text(parseInt(stats.video.videoFPS) + ' f/s')
//     // $('#receivePacket').text(stats.video.videoPacketsLostRate.toFixed(1) + '%')
//   });
// }

function destroyStream(localStream, zg) {
  localStream && zg.destroyStream(localStream);
  localStream = null;
  published = false;
}

function getCreateStreamConfig() {
  const aec = true;
  const agc = true;
  const ans = true;
  const config = {
    camera: {
      video: true,
      audio: {
        AEC: aec,
        AGC: agc,
        ANS: ans,
      },
    },
  };
  return config;
}

async function loginRoom(zg, roomId, userId, userName, token) {
  return await zg.loginRoom(roomId, token, {
    userID: userId,
    userName,
  });
}

async function loginRoomOption(state) {
  try {
    await loginRoom(
      state.zg,
      state.roomID,
      state.userID,
      state.userName,
      state.token
    );
  } catch (err) {
    console.log(err);
  }
}

async function startPublishingStream(
  // zg,
  // publishVideo,
  // videoCodec,
  // streamId,
  // config,
  // callback
  { zg, streamID, publishVideo, videoCodec, config, callback }
) {
  try {
    const localStream = await zg.createZegoStream(config);
    callback({ localStream });
    zg.startPublishingStream(streamID, localStream, {
      videoCodec: videoCodec,
    });
    const localVideoDiv = document.getElementById("localVideo");
    console.log(
      "localVideoDiv: ",
      g,
      streamID,
      publishVideo,
      videoCodec,
      config,
      callback
    );
    localStream.playVideo(publishVideo.current, {
      mirror: true,
      objectFit: "cover",
    });
    publishVideo.current.show();
    return true;
  } catch (err) {
    console.log("err: ", err);
    return false;
  }
}

async function startPublishing(
  zg,
  streamID,
  publishVideo,
  videoCodec,
  cameraCheckStatus,
  cameraDevicesVal,
  microphoneCheckStatus,
  microphoneDevicesVal,
  callback
) {
  console.log(
    "startPublishing",
    streamID,
    publishVideo,
    videoCodec,
    cameraCheckStatus,
    cameraDevicesVal,
    microphoneCheckStatus,
    microphoneDevicesVal,
    callback
  );
  const flag = await startPublishingStream({
    zg,
    streamID,
    publishVideo,
    videoCodec,
    config: {
      camera: {
        video: cameraCheckStatus
          ? {
              input: cameraDevicesVal,
            }
          : false,
        audio: microphoneCheckStatus
          ? {
              input: microphoneDevicesVal,
            }
          : false,
      },
    },
    callback,
  });
  if (flag) {
    callback({
      publishStreamStatus: true,
    });
  }
}

function changeAudioDevices(zg, localStream, microphoneDevicesVal) {
  if (!zg || !localStream) {
    return;
  }
  const isMicrophoneMuted = zg.isMicrophoneMuted();
  if (microphoneDevicesVal == "0" && !isMicrophoneMuted) {
    zg.muteMicrophone(true); //Turn off the microphone
    console.log("关闭");
  } else {
    zg.muteMicrophone(false);
    zg.useAudioDevice(localStream, microphoneDevicesVal);
  }
}

function LiveStream({ params }) {
  console.log("params: ", params);
  const { roomId } = params;
  const [state, setState] = useState({
    userName: "",
    connectStatus: "DISCONNECTED",
    connect: {
      connecting: false,
      connected: false,
    },
    videoCodec: "VP8",
    checkSystemRequireStatus: "",
    microphoneDevicesVal: null,
    cameraDevicesVal: "",
    cameraCheckStatus: true,
    microphoneCheckStatus: true,
    audioCheckStatus: false,
    playStreamStatus: false,
    localStream: null,
    remoteStream: null,
    isLogin: false,
    audioDeviceList: [],
  });
  console.log("state: ", state);

  const appID = process.env.NEXT_PUBLIC_ZEGO_APP_ID * 1;
  const server = process.env.NEXT_PUBLIC_ZEGO_SERVER_ID;
  const userID = Math.floor(Math.random() * 10000) + "";
  const effectiveTimeInSeconds = 60 * 60 * 24 * 30;
  const payload = "";

  const zgRef = useRef(null);
  const publishVideo = useRef(null);

  const handleJoinRoom = async () => {
    const zg = zgRef.current;
    const userNameJoin = state.userName + "_" + userID;

    const token = generateToken04(
      appID,
      userNameJoin,
      server,
      effectiveTimeInSeconds,
      payload
    );

    await loginRoomOption({
      zg: zg,
      roomID: roomId,
      token,
      userID: userNameJoin,
      userName: state.userName,
    });
  };

  const handleChangeValueState = (val) => {
    setState({
      ...state,
      ...val,
    });
  };

  useEffect(() => {
    import("zego-express-engine-webrtc").then(({ ZegoExpressEngine }) => {
      const zg = new ZegoExpressEngine(appID, server);
      zgRef.current = zg;

      CheckSystemRequire(zg, handleChangeValueState);
      zg.on("roomStateUpdate", (roomId, state) => {
        console.log("state: ", state);
        if (state === "CONNECTING") {
          setState((prev) => ({
            ...prev,
            connect: {
              connecting: true,
              connected: false,
            },
            connectStatus: state,
          }));
        }
        if (state === "CONNECTED") {
          setState((prev) => ({
            ...prev,
            connect: {
              connecting: false,
              connected: true,
            },
            connectStatus: state,
          }));
        }

        if (state === "DISCONNECTED") {
          setState((prev) => ({
            ...prev,
            connectStatus: state,
          }));
          // $('#roomStateSuccessSvg').css('display', 'none');
          // $('#roomStateErrorSvg').css('display', 'inline-block');
        }
      });

      zg.on("publisherStateUpdate", (result) => {
        console.log("result: ", result);
        if (result.state === "PUBLISHING") {
          // $('#pushlishInfo-id').text(result.streamID)
        } else if (result.state === "NO_PUBLISH") {
          // $('#pushlishInfo-id').text('')
        }
      });

      zg.on("playerStateUpdate", (result) => {
        if (result.state === "PLAYING") {
          // $('#playInfo-id').text(result.streamID)
        } else if (result.state === "NO_PLAY") {
          // $('#playInfo-id').text('')
        }
      });

      zg.on("publishQualityUpdate", (streamId, stats) => {
        // $('#publishResolution').text(`${stats.video.frameWidth} * ${stats.video.frameHeight}`)
        // $('#sendBitrate').text(parseInt(stats.video.videoBitrate) + 'kbps')
        // $('#sendFPS').text(parseInt(stats.video.videoFPS) + ' f/s')
        // $('#sendPacket').text(stats.video.videoPacketsLostRate.toFixed(1) + '%')
      });

      zg.on("playQualityUpdate", (streamId, stats) => {
        // $('#playResolution').text(`${stats.video.frameWidth} * ${stats.video.frameHeight}`)
        // $('#receiveBitrate').text(parseInt(stats.video.videoBitrate) + 'kbps')
        // $('#receiveFPS').text(parseInt(stats.video.videoFPS) + ' f/s')
        // $('#receivePacket').text(stats.video.videoPacketsLostRate.toFixed(1) + '%')
      });
    });
  }, []);

  return (
    <div className="flex grid-cols-2 gap-2 m-4">
      <div className="col-span-1 p-2 border">
        {!state.connect.connected ? (
          <div className="flex gap-4 p-2">
            <input
              type="text"
              placeholder="Username ...."
              className="p-2 border"
              required
              name="username"
              onChange={(e) =>
                setState({
                  ...state,
                  userName: e.target.value,
                })
              }
            />

            <button
              className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-700"
              onClick={handleJoinRoom}
            >
              Login Room
            </button>
          </div>
        ) : (
          ""
        )}
        <div>
          {state.connect.connecting ? (
            <div className="flex items-center justify-center border-gray-200 rounded-lg w-30 h-30 ">
              <div className="px-3 py-1 text-xs font-medium leading-none text-center text-blue-800 bg-blue-200 rounded-full animate-pulse dark:bg-blue-900 dark:text-blue-200">
                Connecting...
              </div>
            </div>
          ) : (
            ""
          )}
        </div>
        {state.connect.connected ? (
          <div>
            <div className="flex flex-col gap-4 p-2">
              <div className="flex items-center justify-center gap-2">
                <p className="text-sm">Publish StreamID</p>
                <input type="text" className="border " value={roomId}></input>
                <div className="flex items-center ">
                  <input
                    checked={state.microphoneCheckStatus}
                    id="default-checkbox"
                    type="checkbox"
                    onChange={(e) => {
                      setState({
                        ...state,
                        microphoneCheckStatus: e.target.checked,
                      });
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label
                    for="default-checkbox"
                    className="text-sm font-medium text-gray-900 ms-2 dark:text-gray-300"
                  >
                    Micro
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    checked={state.cameraCheckStatus}
                    id="checked-checkbox"
                    type="checkbox"
                    onChange={(e) => {
                      setState({
                        ...state,
                        cameraCheckStatus: e.target.checked,
                      });
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label
                    for="checked-checkbox"
                    className="text-sm font-medium text-gray-900 ms-2 dark:text-gray-300"
                  >
                    Camera
                  </label>
                </div>
                <div className="font-12 select-wrapper">
                  <span data-lang="MicrophoneSwitch">Microphone Switch</span>
                  <select
                    className="ml-5 form-control form-control-sm"
                    name="microphoneDevicesVal"
                    value={state.microphoneDevicesVal || ""}
                    onChange={(e) => {
                      changeAudioDevices(
                        zgRef.current,
                        state.localStream,
                        e.target.value
                      );
                      setState({
                        ...state,
                        microphoneDevicesVal: e.target.value,
                      });
                    }}
                    disabled={!state.microphoneCheckStatus}
                  >
                    {state.audioDeviceList.map((item) => {
                      return (
                        <option key={item.deviceID} value={item.deviceID}>
                          {item.deviceName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    startPublishing(
                      zgRef.current,
                      roomId, // streamID,
                      publishVideo,
                      state.videoCodec,
                      state.cameraCheckStatus,
                      state.cameraDevicesVal,
                      state.microphoneCheckStatus,
                      state.microphoneDevicesVal,
                      handleChangeValueState
                    );
                  }}
                  className="p-2 border"
                >
                  Start Publishing
                </button>
              </div>
            </div>
            <button type="button" className="px-4 py-2 border">
              Disconnect
            </button>
          </div>
        ) : (
          ""
        )}
      </div>
      <div className="flex flex-col p-2 border w-96">
        Review
        <div>
          <video controls ref={publishVideo} autoPlay playsInline muted></video>
          <div id="localVideo"></div>
        </div>
      </div>
    </div>
  );
}
export default LiveStream;