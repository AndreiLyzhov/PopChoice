// import { supabase } from './utils/config.js';
import { theMovieDb } from "./themoviedb.js"
import { useState } from "react";
import { useEffect } from "react";
import { useRef } from "react";

import StartingForm from "./StartingForm.jsx"
import MainForm from './MainForm.jsx';
import Recommendation from "./Recommendation.jsx";
import { content } from "./content.js"
import { index } from 'langchain/indexes';



export default function Main(){
    
        

        const [recommendation, setRecommendations] = useState("")
        const [formData, setFormData] = useState("")
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


        function resetApp() {
            setRecommendations([])
            setFormData("")
            setStartData(null)
            setCurrentUser(null)
        }
            
        

        async function main(formData){
            try {         

                const formattedInput = inputFormat(formData)

                const embedding = await createEmbedding(formattedInput)

                console.log(embedding)

                
                const match = await findNearestMatch(embedding) 

                const matchedObjects = match.map(item => content[item.id - 1])

                console.log(matchedObjects)

                
                const responses = await Promise.all(
                  match.map(
                    async (item) =>
                      await getExplanation(item.content, formattedInput)
                  )
                );

                console.log("Explanation: ", responses)

                
                const posterUrls = await Promise.all(
                  match.map(async (item) => {
                    const movieTitle = content[item.id - 1].title;
                    return await getPoster(movieTitle);
                  })
                );

                setRecommendations({matchedObjects, responses, posterUrls})       
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


            questions.map(question => {
                
                answers[question] = usersObjects.map((user) => user[question] ? user[question] : "")
                    .filter(answer => answer).join(". ")
            })

            return Object.entries(answers).map(answer => answer.join(": ")).join(". \n\n")
            
        }
        


        // async function createEmbedding(input) {
        //     try {
        //         const { data } = await openai.embeddings.create({
        //             model: "text-embedding-ada-002",
        //             input, 
        //         })
                
        //         return data[0].embedding
        //     } catch(e) {
        //         console.log("Error while creating Embedding: ", e)
        //     }
        // }

        async function createEmbedding(input){
            try {
                const response = await fetch('/api/create-embedding', {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({input})
                })

                if (!response.ok){
                    const errorData = await response.json()
                    throw new Error(errorData.error || 'Server Error');
                }

                const data = await response.json()
                return data.embedding

            } catch(error) {
                console.error("Error while getting embedding:", error.message);
                // Здесь можно вывести уведомление пользователю
                return null;
            }
        }
        
        // async function findNearestMatch(embedding) {
        //     try {
        //         const { data, error } = await supabase.rpc('match_films', {
        //             query_embedding: embedding,
        //             match_threshold: 0.50,
        //             match_count: 4
        //         });
                
            
        //         return data
        //         // return data.map(item => item.content)

        //     } catch(e) {
        //         console.log("Error while finding nearest: ", e)
        //     }
        // }

        async function findNearestMatch(embedding){
            try {
                const response = await fetch('/api/find-nearest-match', {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({embedding})
                })

                if (!response.ok){
                    const errorData = await response.json()
                    throw new Error(errorData.error || 'Server Error');
                }

                const data = await response.json()
                return data

            } catch(error) {
                console.error("Error while finding nearest:", error.message);
                // Здесь можно вывести уведомление пользователю
                return null;
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

        async function getExplanation(context, input){
            try {
                const response = await fetch('/api/get-explanation', {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({context, input})
                })

                if (!response.ok){
                    const errorData = await response.json()
                    throw new Error(errorData.error || 'Server Error');
                }

                const { explanation } = await response.json()
                return explanation

            } catch(error) {
                console.error("Error while getting explanation:", error.message);
                // Здесь можно вывести уведомление пользователю
                return null;
            }
        }

        

        async function getPoster(title) {
            try {
                
            function getFilmId(title) {
              return new Promise((resolve, reject) => {
                theMovieDb.search.getMovie(
                  { query: title },
                  (response) => resolve(response),
                  (error) =>
                    reject(
                      error || new Error("Unknown TMDB error when getting id")
                    )
                );
              });
            }

            function getPosterById(id) {
              return new Promise((resolve, reject) => {
                theMovieDb.movies.getImages(
                  {
                    id: id,
                    language: "en-US",
                    include_image_language: "en,null",
                  },
                  (response) => resolve(response),
                  (error) => reject(error || new Error("Unknown TMDB error when getting poster"))
                );
              });
            }

            let response = await getFilmId(title)
            let data = JSON.parse(response)
            const filmId = data.results[0].id

            response = await getPosterById(filmId)
            data = JSON.parse(response)
            
            console.log(data, " - after getting Poster")
            const posterUrl = data.posters[0].file_path
            
            return theMovieDb.common.images_uri + "original" + posterUrl 

            } catch(e) {
                console.log(e)
            }
            
            
        }


        /*
        // async function getQueryForEmbedding(input) {
        //     try {
        //         const messages = [
        //             {
        //                 role: "system",
        //                 content: `You recieve a context consisting of the question and the answer. 
        //                 Rephrase this context into one sentence that exactly conveys the idea of the context, do not
        //                 add anything that is not found in the initial context!. Your output should be the resulting 
        //                 sentence.`
        //             },
        //             {
        //                 role: "user",
        //                 content: input,
        //             }
        //         ]
                
        //         const { choices }= await openai.chat.completions.create({
        //             model: "gpt-3.5-turbo",
        //             messages,
        //             temperature: 0.5,
        //         })
                
        //         console.log("Logging Embedding Queries: ", choices[0].message.content)
        //         return choices[0].message.content
                
        //     } catch(e) {
        //         console.log("Error while querying GPT for embedding query: ", e)
        //     }
        // }
        */
        
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



