import { useParams, useNavigate } from 'react-router-dom';
import { getStartData, addFormDataEntry } from '../utils/sessionStorage.js';

export default function MainForm() {
    const { userNumber } = useParams();
    const navigate = useNavigate();
    const currentUser = parseInt(userNumber, 10);
    
    const startData = getStartData();
    
    // If no start data, redirect to home
    if (!startData) {
        navigate('/', { replace: true });
        return null;
    }

    const formData = []; // We'll get this from sessionStorage if needed, but we're building it incrementally
    const currentUserIndex = currentUser - 1;

    function handleSubmit(event) {
        event.preventDefault();
        const formDataObj = new FormData(event.target);
        const currentFormData = new Map();
        
        // Convert FormData to Map
        for (const [key, value] of formDataObj.entries()) {
            currentFormData.set(key, value);
        }


        // Add to sessionStorage
        addFormDataEntry(currentFormData);

        // Check if this is the last user
        if (currentUser >= startData.peopleNumber) {
            // All users have filled the form, navigate to loading
            navigate('/loading');
        } else {
            // Navigate to next user
            navigate(`/form/${currentUser + 1}`);
        }
    }
    
    return (
        <>
            <header>
                <img src="/PopChoiceIcon.png"/>
                <p>Pop Choice</p>
            </header>
        
            <form onSubmit={handleSubmit}>
                <p className="current-user">{currentUser}</p>

                <label>What's your favourite movie? What type of movie would you like to watch?</label>
                <textarea className="input" name="what's-your-favourite-movie-and-why?" defaultValue="Harry Potter"></textarea>
                
                <label>Are you in the mood for something new or classic?</label>  
                <div className="radio-container">
                    <input type="radio" id={`new-${currentUser}`} name="are-you-in-the-mood-for-something-new-or-classic?" value="New" defaultChecked></input>
                    <label htmlFor={`new-${currentUser}`} className="radio-label">New</label>

                    <input type="radio" id={`classic-${currentUser}`} name="are-you-in-the-mood-for-something-new-or-classic?" value="Classic"></input>
                    <label htmlFor={`classic-${currentUser}`} className="radio-label">Classic</label>
                </div>

                
                <label>What are you in the mood for?</label>  
                <div className="radio-container">
                    <input type="radio" id={`fun-${currentUser}`} name="what-are-you-in-the-mood-for?" value="Fun" defaultChecked></input>
                    <label htmlFor={`fun-${currentUser}`} className="radio-label">Fun</label>

                    <input type="radio" id={`serious-${currentUser}`} name="what-are-you-in-the-mood-for?" value="Serious"></input>
                    <label htmlFor={`serious-${currentUser}`} className="radio-label">Serious</label>

                    <input type="radio" id={`inspiring-${currentUser}`} name="what-are-you-in-the-mood-for?" value="Inspiring"></input>
                    <label htmlFor={`inspiring-${currentUser}`} className="radio-label">Inspiring</label>

                    <input type="radio" id={`scary-${currentUser}`} name="what-are-you-in-the-mood-for?" value="Scary"></input>
                    <label htmlFor={`scary-${currentUser}`} className="radio-label">Scary</label>
                </div>


                {/* <el>Which famous film person would you love to be stranded on an island with and why?</label>   */}
                {/* <textarea className="input" name="which-famous-film-person-would-you-love-to-be-stranded-on-an-island-with-and-why?" defaultValue="Tom Hanks"></textarea> */}
                
                <button type="submit">Let's Go</button>
            </form>
        </>
    );
}
