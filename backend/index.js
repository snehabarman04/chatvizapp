import dotenv from "dotenv";
import express from "express";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors({
  origin: ["http://localhost:3000", "https://chat-and-visualization.netlify.app"]
}));
app.use(express.json());

let questions = [];
let answers = [];
let clients = [];

app.get("/api/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  clients.push(res);
  req.on("close", () => {
    clients = clients.filter((c) => c !== res);
  });
});

function broadcast(event, data) {
  clients.forEach((res) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

function extractVegaLiteJSON(rawText) {
  try {
    let match = rawText.match(/```json([\s\S]*?)```/);
    if (!match) {
      const jsonStart = rawText.indexOf("{");
      if (jsonStart !== -1) {
        const jsonStr = rawText.slice(jsonStart).trim();
        return JSON.parse(jsonStr);
      }
      return null;
    }
    return JSON.parse(match[1]);
  } catch (err) {
    console.error("Failed to parse Vega-Lite JSON:", err);
    return null;
  }
}

app.post("/api/questions", async (req, res) => {
  try {
    const { userId, question } = req.body;
    const questionId = `q_${Date.now()}`;
    const answerId = `a_${Date.now()}`;

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a helpful tutor. Explain clearly and simply.
Also, output both:
Always output two parts:
1. A text explanation.
2. A JSON visualization spec that is a valid Vega-Lite v5 spec.
3. Do not explicitly mention the text explanation as the first point and Vega-Lite spec as your second point in your explanation.
4. Give the JSON part without any additional formatting, markdown, or code block.
5. Do not just give plain graphical visualisations. Use visualizations that are appropriate for the data and the question.
6. The visualisation should be with shapes and diagrams and objects, not just charts.
7. Keep the same format of 

Question: ${question}`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    console.log("Gemini raw response:", JSON.stringify(data, null, 2));
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let visualization = extractVegaLiteJSON(raw);
    let explanation = raw;
    const jsonBlockStart = raw.indexOf("```json");
    if (jsonBlockStart !== -1) {
    explanation = raw.slice(0, jsonBlockStart).trim();
    } else if (visualization) {
    const jsonStart = raw.indexOf("{");
    if (jsonStart !== -1) explanation = raw.slice(0, jsonStart).trim();
    }

    const answer = {
      id: answerId,
      text: explanation,
      visualization: visualization || null,
    };

    questions.push({ id: questionId, userId, question, answerId });
    answers.push(answer);

    broadcast("question_created", {
      id: questionId,
      userId,
      question,
      answerId,
    });

    broadcast("answer_created_chat", { id: answerId, text: explanation });

    if (visualization) {
      broadcast("answer_created_vis", { id: answerId, spec: visualization });
    }
    res.json({ questionId, answerId });
  } catch (err) {
    console.error("Error calling Gemini:", err);
    res.status(500).json({ error: "Failed to generate explanation" });
  }
});

app.listen(3001, () => {
  console.log("Backend running at http://localhost:3001");
});
