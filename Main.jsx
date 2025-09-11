import { openai, supabase } from './config.js';
import { useState } from "react";
import { useEffect } from "react";
import { useRef } from "react";

import StartingForm from "./StartingForm.jsx"
import MainForm from './MainForm.jsx';
import Recommendation from "./Recommendation.jsx";
import { content } from "./content.js"
import { index } from 'langchain/indexes';

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

                // const formattedInput = (await Promise.all(userInputs.map(async(pair) => {
                //     return await getQueryForEmbedding(pair)
                // }))).join('')

                const formattedInput = inputFormat(formData)

                const embedding = await createEmbedding(formattedInput)

                const match = await findNearestMatch(embedding) 
                const matchedObj = content[match[0].id - 1]

                

                const response = await getExplanation(match[0].content, formattedInput)
                setRecommendation({...matchedObj, response})       
                setFormData("")
            } catch(e) {
                console.log("Error in async part of the main function: ", e)
            }
            
        }

        function inputFormat(formData) {
            let answers = {}
            let questions = formData.map(userInput => Array.from(userInput))[0].map(entry => entry[0])

            const usersObjects = formData.map(userInput => {

                return Object.fromEntries(Array.from(userInput).filter(entry => entry[1]))

            })

            

            // for (let i = 0; i < 4; i++) {
            //     answers[i] = usersObjects.map(user => {
            //         return user[questions[i]]
            //     }).join(". ")
                
            // }

            questions.map(question => {
                
                answers[question] = usersObjects.map((user) => user[question] ? user[question] : "")
                    .filter(answer => answer).join(". ")
            })

            return Object.entries(answers).map(answer => answer.join(": ")).join(". \n\n")
            
            

            // Array.from(userInput).filter(entry => entry[1]).map(item => item.join(': ')).join(". ")

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
                        input which includes questions for the user and his answers. Your main job is to formulate a short(30-40 words) 
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
