import dotenv from "dotenv";
import express from "express";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors({
  origin: ["http://localhost:3000","http://localhost:3001","https://chatvizapp-by6z.vercel.app"]
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
3. Every answer must include a visualisation spec, even if with simple shapes and figures.
text
4. If you are unable to generate a meaningful diagram, return a Vega-Lite spec that displays an informative message or a simple shape (such as a labeled text mark).
5. If producing a diagram is not possible, or if the answer lends itself to an animation (like showing an orbit or process), return an animated Vega-Lite spec or a recognized Lottie JSON animation when appropriate.
6. Do not explicitly mention the text explanation as the first point and Vega-Lite spec as your second point in your explanation.
7. Give the JSON part without any additional formatting, markdown, or code block.
8. Do not just give plain graphical visualisations. Use visualizations that are appropriate for the data and the question.
9. The visualisation should be with shapes and diagrams and objects, not just charts.

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
    if (!visualization) {
      visualization = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "description": "Default visualization when AI does not provide one.",
        "mark": "text",
        "encoding": {
          "text": { "value": "No visualization available" },
          "x": { "value": 100 },
          "y": { "value": 100 }
        },
        "width": 300,
        "height": 120
      };
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
app.get('/',(req,res)=>{
  res.send({
    activeStatus:true,
    error:false,
  })
})
app.listen(3001, () => {
  console.log("Backend running at http://localhost:3001");
});
