import { openai, supabase } from './config.js';
import { useState } from "react";
import { useEffect } from "react";
import { useRef } from "react";

import StartingForm from "./StartingForm.jsx"
import MainForm from './MainForm.jsx';
import Recommendation from "./Recommendation.jsx";
import { content } from "./content.js"

export default function Main(){
    
        

        const [recommendation, setRecommendation] = useState("")
        const [formData, setFormData] = useState([])
        const [startData, setStartData] = useState(null)


        const isFormDataFull = formData.length === startData?.peopleNumber
        const isMainFormRendered = !isFormDataFull && !recommendation && startData
        const isRecommendationRendered = !isFormDataFull && recommendation
        const isStartingFormRendered = !startData

        useEffect(() => {
            if (formData.length === startData?.peopleNumber){
                main(formData)
                
            }
        }, [formData])

        // useEffect(() => {
        //     if (startData) {
        //         setCurrentUser(new Array(startData.peopleNumber))
        //     }

        // }, [startData])

        function resetApp() {
            setRecommendation("")
            setFormData("")
            setStartData(null)
            setCurrentUser(null)
        }
            
        

        async function main(formData){
            try {
                
                inputFormat(formData)

                // const formattedInput = (await Promise.all(userInputs.map(async(pair) => {
                //     return await getQueryForEmbedding(pair)
                // }))).join('')

                // const embedding = await createEmbedding(userInputs)

                // const match = await findNearestMatch(embedding) 
                // const matchedObj = content[match[0].id - 1]

                // const response = await getExplanation(match[0].content, formattedInput)
                // setRecommendation({...matchedObj, response})       
                // setFormData("")
            } catch(e) {
                console.log("Error in async part of the main function: ", e)
            }
            
        }

        function inputFormat(formData) {
            let favouriteMovies = ""
            let newOrClassic = ""
            let funOrSerious = ""

            formData.map((userInput, index) => {

                const inputArray = Array.from(userInput).filter(entry => entry[1])

                console.log(inputArray)
                // favouriteMovies += userInput.get("what's-your-favourite-movie-and-why?") ? userInput.get("what's-your-favourite-movie-and-why?") + ". " : ""
                // newOrClassic += userInput.get("are-you-in-the-mood-for-something-new-or-classic?") ? userInput.get("are-you-in-the-mood-for-something-new-or-classic?") + ". " : ""
                // funOrSerious += userInput.get("do-you-wanna-have-fun-or-do-you-want-something-serious?") ? userInput.get("do-you-wanna-have-fun-or-do-you-want-something-serious?") + ". " : ""

                // if (index + 1 === formData.length) {
                //     userInput.get()
                // }
 
            })

            // Array.from(userInput).filter(entry => entry[1]).map(item => item.join(': ')).join(". ")



            console.log(favouriteMovies, newOrClassic, funOrSerious)
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
                    isStartingFormRendered &&
                    <StartingForm 
                        setStartData={setStartData}
                    />
                }
                {
                    isMainFormRendered &&
                    <MainForm 
                        setFormData={setFormData}
                        formData={formData}

                    />
                }
                {
                    isRecommendationRendered &&
                    <Recommendation 
                        recommendation={recommendation}
                        resetApp={resetApp}
                    />
                }
            </>
        )
}
