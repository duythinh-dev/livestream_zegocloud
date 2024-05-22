"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
// import { ZegoExpressEngine } from "zego-express-engine-webrtc";

const appID = 188047086;
const server =
  "8521de54b40f38bae47d59116b8510d0f3999f3cc5231ba5ddf9cbde536dbc04";

export default function Home() {
  const router = useRouter();
  const [formValue, setFormValue] = useState({
    roomID: "",
  });
  const { roomID } = formValue;

  const handleSubmit = (e) => {
    e.preventDefault();

    router.push(`/Livestream/${roomID}`);
  };
  return (
    <main className="flex flex-col items-center justify-between min-h-screen p-24">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3 ">
          <input
            type="text"
            placeholder="Room id ...."
            className="p-2 border"
            required
            name="roomId"
            onChange={(e) =>
              setFormValue({
                ...formValue,
                roomID: e.target.value,
              })
            }
          />

          <button>save</button>
        </div>
      </form>
    </main>
  );
}
