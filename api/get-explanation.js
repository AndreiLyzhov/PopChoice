import { openai } from '../utils/config.js';

export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"})
    }
    const { context, input } = req.body;

    if (!input) {
        return res.status(400).json({ error: "Input and context is required" });
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
        
        // console.log("Logging gpt response: ", choices[0].message.content)
        res.status(200).json({explanation: choices[0].message.content});
  
      
    } catch (error) {
      res.status(500).json({ error: "Error while querying GPT for explanation: ", message: error.message });
    }
  }








// async function getExplanation(context, input) {
//     try {
//         const messages = [
//             {
//                 role: "system",
//                 content: `You are enthusiastic movie expert who loves recommending movies to people. 
//                 You will be given two pieces of information - some context about the chosen movie and the user 
//                 input which includes questions for the user and his answers. Your main job is to formulate a short(20-25 words) 
//                 explaination why user should like this movie based on the contex and the user input.`
//             },
//             {
//                 role: "user",
//                 content: `Context: ${context} User input: ${input}`,
//             }
//         ]
        
//         const { choices }= await openai.chat.completions.create({
//             model: "gpt-3.5-turbo",
//             messages,
//             temperature: 0.5,
//         })
        
//         console.log("Logging gpt response: ", choices[0].message.content)
//         return choices[0].message.content
        
//     } catch(e) {
//         console.log("Error while querying GPT: ", e)
//     }
// }