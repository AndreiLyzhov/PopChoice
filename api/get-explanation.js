import { openai } from '../utils/config.js';

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"})
    }
    const { context, input } = req.body;

    if (!input || typeof input !== 'string') {
        return res.status(400).json({ error: "Input is required and must be a string" });
    }

    if (!context || typeof context !== 'string') {
        return res.status(400).json({ error: "Context is required and must be a string" });
    }

    try {
        const messages = [
            {
                role: "system",
                content: `You are enthusiastic movie expert who loves recommending movies to people.
                You will be given two pieces of information - some context about the chosen movie and the user
                input which includes questions for the user and his answers. Your main job is to formulate a short(20-25 words)
                explaination why user should like this movie based on the contex and the user input.`
            },
            {
                role: "user",
                content: `Context: ${context} User input: ${input}`,
            }
        ]

        const { choices }= await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages,
            temperature: 0.5,
        })

        res.status(200).json({explanation: choices[0].message.content});

    } catch (error) {
      res.status(500).json({ error: "Error while querying GPT for explanation", message: error.message });
    }
  }
