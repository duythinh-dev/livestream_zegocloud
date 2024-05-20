"use client";

import { redirect, useRouter } from "next/navigation";
import { useState } from "react";
import { ZegoExpressEngine } from "zego-express-engine-webrtc";

const appID = 188047086;
const server =
  "8521de54b40f38bae47d59116b8510d0f3999f3cc5231ba5ddf9cbde536dbc04";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  // const zg = new ZegoExpressEngine(appID, server);

  // const result = await zg.loginRoom(
  //   roomID,
  //   token,
  //   { userID, userName },
  //   { userUpdate: true }
  // );

  const handleSubmit = (e) => {
    e.preventDefault();
    router.push(`/room/${roomId}`);
  };
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            placeholder="Room ID ...."
            required
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button>save</button>
        </div>
      </form>
    </main>
  );
}
