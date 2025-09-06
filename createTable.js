
import { content } from "./content.js"

export function createTable() {
    async function createEmbeddings(input) {
        try {
            const filmData = await Promise.all(
                input.map(async(item) => {
                    const { data } = await openai.embeddings.create({
                        model: "text-embedding-ada-002",
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