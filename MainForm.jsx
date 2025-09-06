import { openai, supabase } from './config.js';
import { useState } from "react";
import { useEffect } from "react";
import Recommendation from "./Recommendation.jsx";
import { content } from "./content.js"

export default function MainForm(){
    
        

        const [recommendation, setRecommendation] = useState("")
        const [formData, setFormData] = useState("")

        useEffect(() => {
            if (formData){
                main(formData)
            }
        }, [formData])

        function resetApp() {
            setRecommendation("")
            setFormData("")
        }
            
        
        function clickHandler(formData) {
            setFormData(formData)
        }

        async function main(formData){
            try {
                const userInput = Array.from(formData).filter(entry => entry[1]).map(item => item.join(': '))

                const formattedInput = (await Promise.all(userInput.map(async(pair) => {
                    return await getQueryForEmbedding(pair)
                }))).join('')

                const embedding = await createEmbedding(userInput)

                const match = await findNearestMatch(embedding) 
                const matchedObj = content[match[0].id - 1]

                const response = await getExplanation(match[0].content, formattedInput)
                setRecommendation({...matchedObj, response})       
                setFormData("")
            } catch(e) {
                console.log("Error in async part of the main function: ", e)
            }
            
        }
        
        async function createEmbedding(input) {
            try {
                const { data } = await openai.embeddings.create({
                    model: "text-embedding-ada-002",
                    input, 
                })
                
                return data[0].embedding
            } catch(e) {
                console.log("Error while creating Embedding: ", e)
            }
        }
        
        async function findNearestMatch(embedding) {
            try {
                const { data, error } = await supabase.rpc('match_films', {
                    query_embedding: embedding,
                    match_threshold: 0.50,
                    match_count: 4
                });
                
            
                return data
                // return data.map(item => item.content)

            } catch(e) {
                console.log("Error while finding nearest: ", e)
            }
        }
        
        
        
        async function getExplanation(context, input) {
            try {
                const messages = [
                    {
                        role: "system",
                        content: `You are enthusiastic movie expert who loves recommending movies to people. 
                        You will be given two pieces of information - some context about the chosen movie and the user 
                        input which includes questions for the user and his answers. Your main job is to formulate a short(60-70 words) 
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
                
                console.log("Logging gpt response: ", choices[0].message.content)
                return choices[0].message.content
                
            } catch(e) {
                console.log("Error while querying GPT: ", e)
            }
        }

        async function getQueryForEmbedding(input) {
            try {
                const messages = [
                    {
                        role: "system",
                        content: `You recieve a context consisting of the question and the answer. 
                        Rephrase this context into one sentence that exactly conveys the idea of the context, do not
                        add anything that is not found in the initial context!. Your output should be the resulting 
                        sentence.`
                    },
                    {
                        role: "user",
                        content: input,
                    }
                ]
                
                const { choices }= await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages,
                    temperature: 0.5,
                })
                
                console.log("Logging Embedding Queries: ", choices[0].message.content)
                return choices[0].message.content
                
            } catch(e) {
                console.log("Error while querying GPT for embedding query: ", e)
            }
        }
        
        return (
            <>
                {
                    !formData && !recommendation &&
                    <form action={clickHandler}>
                        <label>What's your favourite movie and why?</label>
                        <textarea className="input" name="what's-your-favourite-movie-and-why?" defaultValue="Harry Potter"></textarea>
                        
                        <label>Are you in the mood for something new or classic?</label>  
                        <textarea className="input" name="are-you-in-the-mood-for-something-new-or-classic?" defaultValue="In a mood for something classy"></textarea>
                        
                        <label>Do you wanna have fun or do you want something serious?</label>  
                        <textarea className="input" name="do-you-wanna-have-fun-or-do-you-want-something-serious?" defaultValue="Something in between"></textarea>
                        
                        <button>Let's Go</button>
                    </form>
                }
                {
                    !formData && recommendation &&
                    <Recommendation 
                        recommendation={recommendation}
                        resetApp={resetApp}
                    />
                }
            </>
        )
}
