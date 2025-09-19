import React, { useEffect, useState } from "react";
import { askQuestion, subscribeToStream } from "./api";
import VisualizationCanvas from "./VisualizationCanvas";

function App() {
  const [userId] = useState("u1");
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [currentVis, setCurrentVis] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  const sse = subscribeToStream(
    // question_created
    (q) => {
      setChat((prev) => [...prev, { ...q, type: "question" }]);
    },
    // answer_created_chat
    (a) => {
      setChat((prev) => [...prev, { ...a, type: "answer" }]);
      setLoading(false);
    },
    // answer_created_vis
    (v) => {
      console.log("Received visualization:", v);
      setCurrentVis(v.spec);
    }
  );

  return () => sse.close();
}, []);

  const handleAsk = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setCurrentVis(null);
    await askQuestion(userId, question);
    setQuestion("");
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%" }}>
      {/* Left: Visualization */}
      <div style={{ flex: 1, padding: 10, width: "150%" }}>
        <h2>Visualization</h2>
        {currentVis ? (
          <VisualizationCanvas visualization={currentVis} />
        ) : (
          <p>No visualization available</p>
        )}
      </div>

      {/* Right: Chat */}
      <div style={{ flex: 1, padding: 10, borderLeft: "1px solid #ccc" }}>
        <h2>Chat</h2>
        <div
          style={{
            height: "72%",
            overflowY: "auto",
            border: "1px solid #ddd",
            padding: 10,
          }}
        >
          {chat.map((msg, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <b>{msg.type === "question" ? "You:" : "AI:"}</b>
              <p>{msg.question || msg.text}</p>
            </div>
          ))}

          {loading && (
            <div style={{ marginTop: 10, fontStyle: "italic", color: "#888" }}>
              Waiting for response...
            </div>
          )}
        </div>
        <div style={{ marginTop: 30 }}>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            style={{ width: "80%", padding: 5, height: 30 }}
          />
          <button
            onClick={handleAsk}
            style={{ padding: "5px 10px", marginLeft: 5, height: 44, width: "15%"}}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
