
import { content } from "./content.js"
import { openai, supabase } from "../utils.config.js"




export function createTable() {
    async function createEmbeddings(input) {
        try {
            const filmData = await Promise.all(
                input.map(async(item) => {
                    const { data } = await openai.embeddings.create({
                        model: "text-embedding-3-small",
                        input: item, 
                    })

                    return {
                        embedding: data[0].embedding,
                        content: item,
                    }

                })
            )
            console.log(filmData)
            return filmData
            
        } catch(e) {
            console.log("Error while creating Embedding: ", e)
        }
    }

    async function main(content) {
        const data = await createEmbeddings(content)

        const { data: insertData, error } = await supabase.from('films').insert(data)
        if (error){
            console.log(error)
        } else {
            console.log('SUCCES inserting ', insertData)
        }
    }

    const contentFormatted = content.map(item => {
        return Object.entries(item).map(innerItem => innerItem.join(' ')).join(". ")
    })
    
    main(contentFormatted)


}





//VERCEL VERSION

/* export default async function handler(res,req) {
    if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"})
    }
    const { input } = req.body;

    if (!input) {
        return res.status(400).json({error: "Input is required" });
    }





    try {

        //Formatting input
        const contentFormatted = input.map(item => {
            return Object.entries(item).map(innerItem => innerItem.join(' ')).join(". ")
        })

        //Creating embedding
        const embedding = await Promise.all(
            input.map(async(item) => {
                const { data } = await openai.embeddings.create({
                    model: "text-embedding-3-small",
                    input: item, 
                })

                return {
                    embedding: data[0].embedding,
                    content: item,
                }

            })
        )

        console.log(embedding)


        //Inserting film data and embedding into the supabase table
        const { data: insertData, error } = await supabase.from('films').insert(data)
        if (error){
            console.log(error)
        } else {
            console.log('SUCCES inserting ', insertData)
        }
        




    } catch(error) {
        return res.status(500).json('Error while trying to create embedding or supabase insert: ', error.message)
    }

    
} */