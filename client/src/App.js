import React, { useEffect, useState, useRef } from "react";
import { askQuestion, subscribeToStream } from "./api";
import VisualizationCanvas from "./VisualizationCanvas";
import "./App.css";

function App() {
  const [userId] = useState("u1");
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [currentVis, setCurrentVis] = useState(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat, loading]);

  useEffect(() => {
    const sse = subscribeToStream(
      // question_created
      (q) => {},
      // answer_created_chat
      (a) => {
        setChat((prev) => {
          if (prev.length && prev[prev.length - 1].type === "answer" && prev[prev.length - 1].pending) {
            return [
              ...prev.slice(0, -1),
              { ...a, type: "answer" }
            ];
          }
          return [...prev, { ...a, type: "answer" }];
        });
        setLoading(false);
      },
      // answer_created_vis
      (v) => {
        setCurrentVis(v.spec);
      }
    );
    return () => sse.close();
  }, []);

  const handleAsk = async () => {
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion("");

    setChat((prev) => [
      ...prev,
      { type: "question", question: q },
      { type: "answer", pending: true }
    ]);
    setLoading(true);
    setCurrentVis(null);
    await askQuestion(userId, q);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-text">
            <h1>Chat & Visualization App</h1>
            <span className="subtle">Ask questions, get answers and visualizations</span>
          </div>
        </div>
      </header>

      <main className="content">
        {/* Left: Visualization */}
        <section className="panel panel-left">
          <div className="panel-header">
            <h2>Visualization</h2>
          </div>
          <div className="panel-body vis-body">
            {currentVis ? (
              <VisualizationCanvas visualization={currentVis} />
            ) : (
              <div className="empty-state">
                <div className="empty-illustration" />
                <h3>No visualization available</h3>
                <p className="subtle">
                  Ask a question to generate answer and visualisation if any
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right: Chat */}
        <section className="panel panel-right">
          <div className="panel-header">
            <h2>Chat</h2>
          </div>
          <div className="panel-body chat-body">
            <div className="messages">
              {chat.map((msg, i) => {
                if (msg.type === "answer" && msg.pending) {
                  return (
                    <div key={i} className="message from-ai">
                      <div className="avatar">AI</div>
                      <div className="bubble typing">
                        <span className="dot" />
                        <span className="dot" />
                        <span className="dot" />
                      </div>
                    </div>
                  );
                }
                const isUser = msg.type === "question";
                return (
                  <div key={i} className={`message ${isUser ? "from-user" : "from-ai"}`}>
                    <div className="avatar">{isUser ? "U" : "AI"}</div>
                    <div className="bubble">
                      <div className="meta">
                        <span className="who">{isUser ? "You" : "Assistant"}</span>
                      </div>
                      <p className="text">{msg.question || msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="composer">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              className="input"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
            />
            <button
              onClick={handleAsk}
              className="btn"
              disabled={loading || !question.trim()}
            >
              {loading ? "Sending…" : "Send"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
