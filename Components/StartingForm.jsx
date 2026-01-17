import { Form, useNavigate } from 'react-router-dom';
import { setStartData } from '../utils/sessionStorage.js';

export default function StartingForm() {
    const navigate = useNavigate();

    async function handleSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        
        const timeAmount = formData.get("hours-amount") * 60 + +formData.get("minutes-amount");
        
        const startData = {
            peopleNumber: +formData.get("people-number"),
            timeAmount: +timeAmount,
        };

        setStartData(startData);
        navigate(`/form/1`);
    }

    return (
        <>  
            <header>
                <img src="/PopChoiceIcon.png"/>
                <p>Pop Choice</p>
            </header>

            <form onSubmit={handleSubmit}>
                <input 
                    type="number" 
                    className="input starting" 
                    name="people-number" 
                    placeholder="How mane people?" 
                    defaultValue="1"
                    required
                ></input>
                
                <label>How much time do you have?</label>
                <div className="input starting time-container">
                    <input 
                        className="time-input" 
                        type="number" 
                        name="hours-amount" 
                        placeholder="" 
                        defaultValue="1"
                        required
                    ></input>
                    <span>hours</span>

                    <input 
                        className="time-input" 
                        type="number" 
                        name="minutes-amount" 
                        placeholder="" 
                        defaultValue="20"
                        required
                    ></input>
                    <span>minutes</span>
                </div>
                
                <button type="submit">Start</button>
            </form>
        </>
    );
}
