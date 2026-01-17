import { useState } from 'react'

export default function Recommendation(props) {

    const [option, setOption] = useState(0)

    // console.log(props?.recommendation)


    const title = props?.recommendation?.match?.[option].metadata.title
    const releaseYear = props?.recommendation?.match?.[option].metadata.year
    const posterUrl = props?.recommendation?.posterUrls?.[option]
    const response = props?.recommendation?.responses?.[option]
    const optionsLength = props?.recommendation?.match?.length
    const isNotFinalOption = (option < optionsLength - 1)

    // console.log(optionsLength)

    function clickHandler() {
        if (isNotFinalOption) {
            setOption(prev => prev + 1)
        } else {
            props.resetApp()
        }
    }
    

    return (
        <div className="recommendation-container">
            <p className="recommendation-title">{`${title} (${releaseYear})`}</p> 
            <img className="poster" src={posterUrl}></img>
            <p className="recommendation-description">{response}</p> 
            <button onClick={clickHandler}>{isNotFinalOption ? "Next Option" : "Go Again"}</button>
        </div>
    )
}