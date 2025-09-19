const API_URL = process.env.API_URL || "http://localhost:3001";

export async function askQuestion(userId, question) {
  const res = await fetch(`${API_URL}/api/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, question }),
  });
  return res.json();
}

export function subscribeToStream(onQuestion, onAnswer, onVis) {
  const sse = new EventSource(`${API_URL}/api/stream`);

  sse.addEventListener("question_created", (e) => {
    const data = JSON.parse(e.data);
    onQuestion && onQuestion(data);
  });

  sse.addEventListener("answer_created_chat", (e) => {
    const data = JSON.parse(e.data);
    onAnswer && onAnswer(data);
  });

  sse.addEventListener("answer_created_vis", (e) => {
    const data = JSON.parse(e.data);
    onVis && onVis(data);
  });

  return sse;
}