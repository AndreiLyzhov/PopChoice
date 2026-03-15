import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { processRecommendations } from '../utils/processRecommendations.js';
import { getFormData, setRecommendation, clearAll } from '../utils/sessionStorage.js';

export default function Loading() {
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;

        async function loadRecommendations() {
            try {
                const formData = getFormData();

                if (!formData || formData.length === 0) {
                    if (!cancelled) navigate('/', { replace: true });
                    return;
                }

                const result = await processRecommendations(formData);

                if (cancelled) return;

                setRecommendation(result);
                navigate('/recommendations', { replace: true });
            } catch (error) {
                if (cancelled) return;
                clearAll();
                navigate('/', { replace: true, state: { error: 'Failed to load recommendations. Please try again.' } });
            }
        }

        loadRecommendations();

        return () => { cancelled = true; };
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
