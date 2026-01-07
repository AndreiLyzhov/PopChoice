import { openai } from '../utils/config.js';

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"})
    }
    const { input } = req.body;

    if (!input) {
        return res.status(400).json({ error: "Input is required" });
    }
  
    try {
        const { data } = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input, 
        })
      console.log("succesfully created embedding")
  
      res.status(200).json({embedding: data[0].embedding});
    } catch (error) {
      res.status(500).json({ error: "Server Error while finding nearest: ", message: error.message });
    }
  }