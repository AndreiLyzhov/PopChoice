import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { processRecommendations } from '../utils/processRecommendations.js';
import { getFormData, setRecommendation, clearAll } from '../utils/sessionStorage.js';

export default function Loading() {
    const navigate = useNavigate();

    useEffect(() => {
        async function loadRecommendations() {
            try {
                const formData = getFormData();
                
                if (!formData || formData.length === 0) {
                    // No form data, redirect to start
                    navigate('/', { replace: true });
                    return;
                }

                // Process recommendations
                const result = await processRecommendations(formData);
                
                // Store results
                setRecommendation(result);
                
                // Navigate to recommendations
                navigate('/recommendations', { replace: true });
            } catch (error) {
                console.error('Error loading recommendations:', error);
                // On error, redirect to start and clear data
                clearAll();
                navigate('/', { replace: true, state: { error: 'Failed to load recommendations. Please try again.' } });
            }
        }

        loadRecommendations();
    }, [navigate]);

    return (
        <div className="recommendation-container" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div className="loading-spinner"></div>
                <p className="recommendation-title" style={{ marginBottom: '10px' }}>
                    Finding your perfect matches...
                </p>
                <p className="recommendation-description" style={{ fontSize: '16px', color: '#aaa' }}>
                    Analyzing your preferences and searching our database
                </p>
            </div>
        </div>
    );
}
