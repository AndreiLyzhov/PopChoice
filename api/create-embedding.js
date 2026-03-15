import { openai } from '../utils/config.js';

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"})
    }
    const { input } = req.body;

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
        return res.status(400).json({ error: "Input is required and must be a non-empty string" });
    }

    try {
        const { data } = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input,
        })

      res.status(200).json({embedding: data[0].embedding});
    } catch (error) {
      res.status(500).json({ error: "Server Error while creating embedding", message: error.message });
    }
  }
