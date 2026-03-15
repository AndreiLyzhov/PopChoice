import { useNavigate } from 'react-router-dom';
import { setStartData } from '../utils/sessionStorage.js';

export default function StartingForm() {
    const navigate = useNavigate();

    async function handleSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);

        const people = parseInt(formData.get("people-number"), 10);
        const hours = parseInt(formData.get("hours-amount"), 10);
        const minutes = parseInt(formData.get("minutes-amount"), 10);

        if (isNaN(people) || people < 1 || people > 10) return;
        if (isNaN(hours) || hours < 0 || hours > 12) return;
        if (isNaN(minutes) || minutes < 0 || minutes > 59) return;

        const timeAmount = hours * 60 + minutes;

        const startData = {
            peopleNumber: people,
            timeAmount: timeAmount,
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
                    min="1"
                    max="10"
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
                        min="0"
                        max="12"
                        required
                    ></input>
                    <span>hours</span>

                    <input
                        className="time-input"
                        type="number"
                        name="minutes-amount"
                        placeholder=""
                        defaultValue="20"
                        min="0"
                        max="59"
                        required
                    ></input>
                    <span>minutes</span>
                </div>

                <button type="submit">Start</button>
            </form>
        </>
    );
}
