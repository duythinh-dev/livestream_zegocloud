"use client";

import React, { useEffect, useRef, useState } from "react";
import { generateToken04 } from "../../../server/zegoServerAssistant";
import ReactPlayer from "react-player";
import moment from "moment";
import md5 from "md5";

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

function LiveStream() {
  const zgRef = useRef(null);

  const [link, setLink] = useState({
    streamKey: "",
    URLlive: "",
  });
  const [id, setId] = useState(0);
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
  const zg = zgRef.current;
  const userID = Math.floor(Math.random() * 10000) + "";

  const userNameJoin = "state.userName" + "_" + userID;
  const effectiveTimeInSeconds = 60 * 60 * 24 * 30;
  const appID = process.env.NEXT_PUBLIC_ZEGO_APP_ID * 1;
  const server = process.env.NEXT_PUBLIC_ZEGO_SERVER_ID;
  const handleJoinRoom = async () => {
    const token = generateToken04(
      appID,
      userNameJoin,
      server,
      effectiveTimeInSeconds,
      ""
    );

    await loginRoomOption({
      zg: zg,
      roomID: id,
      token,
      userID: userNameJoin,
      userName: "state.userName",
    });
  };
  const handleChangeValueState = (val) => {
    setState({
      ...state,
      ...val,
    });
  };

  useEffect(() => {
    const randomNumber = Math.floor(Math.random() * 100000);

    const num = moment().add(3, "hours").unix().toString(16);
    const md5Hash = md5(
      num + `/live/${randomNumber}` + process.env.NEXT_PUBLIC_PRIMARY_KEY
    );
    import("zego-express-engine-webrtc").then(({ ZegoExpressEngine }) => {
      const zg = new ZegoExpressEngine(appID, server);
      zgRef.current = zg;

      CheckSystemRequire(zg, handleChangeValueState);
      zg.on("roomStateUpdate", (roomId, state) => {
        console.log("Trạng thái: ", roomId, state);
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
      zg.on("IMRecvBroadcastMessage", (roomID, messageList) => {
        setChats((prev) => [
          ...prev,
          ...messageList.map((item) => ({
            message: item.message,
            name: item.fromUser.userName,
          })),
        ]);
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
      handleJoinRoom();
      setLink({
        streamKey: `${randomNumber}?wsSecret=${md5Hash}&wsABStime=${num}`,
        URLlive: `http://play-ws1.copbeo.com/live/${randomNumber}/playlist.m3u8`,
      });
    });
  }, []);

  return (
    <div className="p-4">
      <p>Tạo stream với phần mềm thứ 3 ( OBS, ... )</p>
      <div>Server : {process.env.NEXT_PUBLIC_URL_SERVER}</div>
      <div>Stream key:{link.streamKey}</div>
      <div>URL live: {link.URLlive}</div>
    </div>
  );
}
export default LiveStream;
