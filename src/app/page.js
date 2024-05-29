"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const appID = 188047086;
const server =
  "8521de54b40f38bae47d59116b8510d0f3999f3cc5231ba5ddf9cbde536dbc04";

export default function Home() {
  const router = useRouter();
  const [formValue, setFormValue] = useState({
    roomStream: "",
    roomView: "",
  });
  const { roomStream, roomView } = formValue;

  const handleCreateRoomStream = (e) => {
    e.preventDefault();
    router.push(`/Livestream/${roomStream}`);
  };

  const handleJoinRoomStream = (e) => {
    e.preventDefault();
    router.push(`/view/${roomView}`);
  };
  return (
    <main className="flex flex-col items-center justify-between min-h-screen p-24">
      <div className="flex gap-3 ">
        <div className="flex flex-col gap-3">
          <b>Tạo stream</b>
          <input
            type="text"
            placeholder="Room id ...."
            className="p-2 border"
            required
            name="roomStream"
            onChange={(e) =>
              setFormValue({
                ...formValue,
                roomStream: e.target.value,
              })
            }
          />

          <button onClick={handleCreateRoomStream}>Tạo</button>
        </div>
        <div className="flex flex-col gap-3">
          <b>Xem stream</b>
          <input
            type="text"
            placeholder="Room id ...."
            className="p-2 border"
            required
            name="roomId"
            onChange={(e) =>
              setFormValue({
                ...formValue,
                roomView: e.target.value,
              })
            }
          />

          <button onClick={handleJoinRoomStream}>Vào</button>
        </div>
      </div>
    </main>
  );
}
