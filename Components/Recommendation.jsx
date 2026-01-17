import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecommendation, clearAll } from '../utils/sessionStorage.js';

export default function Recommendation() {
    const [option, setOption] = useState(0);
    const navigate = useNavigate();
    const recommendation = getRecommendation();

    useEffect(() => {
        // If no recommendation data, redirect to home
        if (!recommendation) {
            navigate('/', { replace: true });
        }
    }, [recommendation, navigate]);

    if (!recommendation) {
        return null;
    }

    const title = recommendation?.match?.[option]?.metadata?.title;
    const releaseYear = recommendation?.match?.[option]?.metadata?.year;
    const posterUrl = recommendation?.posterUrls?.[option];
    const response = recommendation?.responses?.[option];
    const optionsLength = recommendation?.match?.length || 0;
    const isNotFinalOption = (option < optionsLength - 1);

    function clickHandler() {
        if (isNotFinalOption) {
            setOption(prev => prev + 1);
        } else {
            // Clear all data and navigate to start
            clearAll();
            navigate('/');
        }
    }
    
    return (
        <div className="recommendation-container">
            <p className="recommendation-title">{`${title} (${releaseYear})`}</p> 
            <img className="poster" src={posterUrl} alt={`Poster for ${title}`}></img>
            <p className="recommendation-description">{response}</p> 
            <button onClick={clickHandler}>{isNotFinalOption ? "Next Option" : "Go Again"}</button>
        </div>
    );
}
