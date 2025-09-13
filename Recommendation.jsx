

export default function Recommendation(props) {
    
    return (
        <div className="recommendation-container">
            <p className="recommendation-title">{`${props.recommendation.title} (${props.recommendation.releaseYear})`}</p> 
            <img className="poster" src={props.recommendation.posterUrl}></img>
            <p className="recommendation-description">{props.recommendation.response}</p> 
            <button onClick={props.resetApp}>Go Again</button>
        </div>
    )
}