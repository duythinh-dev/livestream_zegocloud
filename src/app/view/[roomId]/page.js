"use client";

import React, { useEffect, useRef, useState } from "react";
import { generateToken04 } from "../../../../server/zegoServerAssistant";

// Bước 1: Kiểm tra yêu cầu hệ thống
async function checkSystemRequirements(zg) {
  console.log("Phiên bản SDK là", zg.getVersion());
  try {
    const result = await zg.checkSystemRequirements();

    console.warn("Kết quả kiểm tra yêu cầu hệ thống", result);
    if (!result.webRTC) {
      console.error("Trình duyệt không hỗ trợ WebRTC!");
      return false;
    } else if (!result.videoCodec.H264 && !result.videoCodec.VP8) {
      console.error("Trình duyệt không hỗ trợ H264 và VP8");
      return false;
    } else if (!result.camera && !result.microphone) {
      console.error("Không cho phép sử dụng camera và micro");
      return false;
    } else if (result.videoCodec.VP8) {
      if (!result.screenSharing) {
        console.warn("Trình duyệt không hỗ trợ chia sẻ màn hình");
      }
    } else {
      console.log("Không hỗ trợ VP8, hãy kiểm tra chuyển mã trộn");
    }
    return { ...result, isSuccess: true, videoCodec: "VP8" };
  } catch (err) {
    console.error("Lỗi khi kiểm tra yêu cầu hệ thống", err);
    return false;
  }
}

// Lấy thông tin thiết bị
async function enumDevices(zg) {
  const deviceInfo = await zg.enumDevices();
  const audioDeviceList =
    deviceInfo &&
    deviceInfo.microphones.map((item, index) => {
      if (!item.deviceName) {
        item.deviceName = "microphone" + index;
      }
      console.log("Microphone: " + item.deviceName);
      return item;
    });
  audioDeviceList.push({ deviceID: 0, deviceName: "Không sử dụng" });
  const videoDeviceList =
    deviceInfo &&
    deviceInfo.cameras.map((item, index) => {
      if (!item.deviceName) {
        item.deviceName = "camera" + index;
      }
      console.log("Camera: " + item.deviceName);
      return item;
    });
  videoDeviceList.push({ deviceID: 0, deviceName: "Không sử dụng" });
  console.log("Danh sách thiết bị âm thanh", audioDeviceList);
  return {
    videoDeviceList,
    audioDeviceList,
    microphoneDevicesVal: audioDeviceList[0].deviceID,
    cameraDevicesVal: videoDeviceList[0].deviceID,
  };
}

// Kiểm tra và cập nhật trạng thái hệ thống
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
  console.log("Trạng thái thay đổi: ", stateChange);
  callback(stateChange);
}

// Đăng nhập vào phòng
async function loginRoom(zg, roomId, userId, userName, token) {
  return await zg.loginRoom(roomId, token, {
    userID: userId,
    userName,
  });
}

// Tùy chọn đăng nhập vào phòng
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

// Bắt đầu phát luồng
async function startPlayingStream({
  streamID,
  options = {},
  zg,
  liveVideoRef,
  callback,
}) {
  try {
    const remoteStream = await zg.startPlayingStream(streamID, options);
    await callback({
      remoteStream: remoteStream,
    });
    if (zg.getVersion() < "2.17.0") {
      liveVideoRef.current.playVideo.srcObject = remoteStream;
    } else {
      const remoteView = zg.createRemoteStreamView(remoteStream);
      remoteView.play(liveVideoRef.current, {
        objectFit: "cover",
      });
    }
    return true;
  } catch (err) {
    return false;
  }
}

// Dừng phát luồng
async function stopPublishingStream(zg, streamId) {
  zg.stopPublishingStream(streamId);
}

// Dừng phát luồng
async function stopPlayingStream(zg, streamId) {
  zg.stopPlayingStream(streamId);
}

// Xóa luồng
function clearStream({ zg, liveVideoRef, remoteStream, callback }) {
  remoteStream && zg.destroyStream(remoteStream);
  liveVideoRef.current.srcObject = null;
  callback({
    remoteStream: null,
  });
}

// Đăng xuất khỏi phòng
function logoutRoom(zg, roomId) {
  zg.logoutRoom(roomId);
}

// Dừng luồng
async function stopStream({
  zg,
  streamID,
  callback,
  remoteStream,
  isLogin,
  publishVideoRef,
  liveVideoRef,
}) {
  if (!zg) {
    return;
  }
  await stopPublishingStream(zg, streamID);
  await stopPlayingStream(zg, streamID);
  if (isLogin) {
    await callback({
      isLogin: false,
    });
    logoutRoom(streamID);
  }
  clearStream({
    zg,
    publishVideoRef,
    remoteStream,
    liveVideoRef,
    callback,
  });
  zg = null;
  callback({
    playStreamStatus: false,
    publishStreamStatus: false,
    createSuccessSvgStatus: false,
    checkSystemRequireStatus: "",
    audioCheckStatus: false,
  });
}

// Bắt đầu phát luồng
async function startPlaying({
  videoCheckStatus,
  audioCheckStatus,
  streamID,
  zg,
  liveVideoRef,
  callback,
}) {
  const flag = await startPlayingStream({
    streamID,
    options: {
      video: videoCheckStatus,
      audio: audioCheckStatus,
    },
    zg,
    liveVideoRef,
    callback,
  });
  if (flag) {
    callback({
      playStreamStatus: true,
    });
  }
}

function LiveStream({ params }) {
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
    videoCheckStatus: true,
    audioCheckStatus: true,
    numberViewer: 0,
    sendBitrate: 0,
    sendFPS: 0,
    sendPacket: 0,
    receiveBitrate: 0,
    receiveFPS: 0,
    receivePacket: 0,
    frameWidth: 0,
    frameHeight: 0,
  });
  console.log("Trạng thái", state);

  const appID = process.env.NEXT_PUBLIC_ZEGO_APP_ID * 1;
  const server = process.env.NEXT_PUBLIC_ZEGO_SERVER_ID;
  const userID = Math.floor(Math.random() * 10000) + "";
  const effectiveTimeInSeconds = 60 * 60 * 24 * 30;
  const payload = "";

  const zgRef = useRef(null);
  const publishVideoRef = useRef(null);
  const liveVideoRef = useRef(null);

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
        console.log("Trạng thái: ", state);
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
        }
      });

      zg.on("publisherStateUpdate", (result) => {
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
        console.log("Stream ID: ", streamId);
        setState((prev) => ({
          ...prev,
          frameWidth: stats.video.frameWidth,
          frameHeight: stats.video.frameHeight,
          videoBitrate: stats.video.videoBitrate,
          videoFPS: stats.video.videoFPS,
          videoPacketsLostRate: stats.video.videoPacketsLostRate,
        }));
      });

      zg.on("playQualityUpdate", (streamId, stats) => {
        setState((prev) => ({
          ...prev,
          frameWidth: stats.video.frameWidth,
          frameHeight: stats.video.frameHeight,
          receiveBitrate: stats.video.videoBitrate,
          receiveFPS: stats.video.videoFPS,
          receivePacket: stats.video.videoPacketsLostRate.toFixed(1),
        }));
      });
    });
  }, []);

  return (
    <>
      <p>Vào phòng xem stream</p>
      <div className="flex gap-2 m-4">
        <div className="col-span-1 p-2 border">
          {!state.connect.connected ? (
            <div className="flex gap-4 p-2">
              <input
                type="text"
                placeholder="StreamID ...."
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
                Đăng nhập phòng
              </button>
            </div>
          ) : (
            ""
          )}
          <div>
            {state.connect.connecting ? (
              <div className="flex items-center justify-center border-gray-200 rounded-lg w-30 h-30 ">
                <div className="px-3 py-1 text-xs font-medium leading-none text-center text-blue-800 bg-blue-200 rounded-full animate-pulse dark:bg-blue-900 dark:text-blue-200">
                  Đang kết nối...
                </div>
              </div>
            ) : (
              ""
            )}
          </div>
          {state.connect.connected ? (
            <div className="flex flex-col gap-4 p-2">
              <b>Bắt đầu phát luồng</b>
              <div className="flex flex-col gap-4 p-2">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-sm">StreamID phát</p>
                  <input type="text" className="border " value={roomId}></input>
                  <div className="flex items-center ">
                    <label
                      className="form-check-label m-r-5"
                      htmlFor="Video"
                      data-lang="Video"
                    >
                      Video
                    </label>
                    <input
                      className="check-input"
                      checked={state.videoCheckStatus}
                      type="checkbox"
                      id="Video"
                      onChange={(e) =>
                        handleChangeValueState({
                          videoCheckStatus: e.target.checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center">
                    <label
                      className="form-check-label m-r-5"
                      htmlFor="Audio"
                      data-lang="Audio"
                    >
                      Audio
                    </label>
                    <input
                      className="check-input"
                      checked={state.audioCheckStatus}
                      type="checkbox"
                      onChange={(e) =>
                        handleChangeValueState({
                          audioCheckStatus: e.target.checked,
                        })
                      }
                      id="Audio"
                    />
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      startPlaying({
                        videoCheckStatus: state.videoCheckStatus,
                        audioCheckStatus: state.audioCheckStatus,
                        streamID: roomId,
                        zg: zgRef.current,
                        liveVideoRef,
                        callback: handleChangeValueState,
                      });
                    }}
                    className="p-2 border"
                  >
                    Xem stream
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="px-4 py-2 border"
                onClick={() =>
                  stopStream({
                    zg: zgRef.current,
                    streamID: roomId,
                    playStreamID: state.playStreamID,
                    callback: handleChangeValueState,
                    remoteStream: state.remoteStream,
                    isLogin: state.isLogin,
                    publishVideoRef,
                    liveVideoRef,
                  })
                }
              >
                Ngắt kết nối
              </button>
            </div>
          ) : (
            ""
          )}
        </div>
        <div className="flex flex-col gap-4 p-2 border">
          Live
          <div>
            <div
              id="liveVideo"
              ref={liveVideoRef}
              className="h-64 border w-96"
            ></div>
          </div>
        </div>
        <div className="flex flex-col gap-4 p-2 border">
          Thông tin luồng trực tiếp
          <div className="flex flex-col gap-4">
            <div className="p-2 border">
              <p>Xem trước</p>

              <p>
                Kích thước khung hình : {state.frameWidth} * {state.frameHeight}
              </p>
              <p>Tốc độ bit : {state.videoBitrate}</p>
              <p>FPS : {state.videoFPS}</p>
              <p>Tỷ lệ mất gói : {state.videoPacketsLostRate}</p>
            </div>
            <div className="p-2 border">
              <p>Trực tiếp</p>
              <p>
                Kích thước khung hình : {state.frameWidth} * {state.frameHeight}
              </p>
              <p>Tốc độ bit : {state.receiveBitrate}</p>
              <p>FPS : {state.receiveFPS}</p>
              <p>Nhận gói : {state.receivePacket}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default LiveStream;
