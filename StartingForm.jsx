

export default function StartingForm(props) {

    function startApp(formData) {
        const timeAmount = formData.get("hours-amount") * 60 + +formData.get("minutes-amount")
    
        props.setStartData({
            peopleNumber: +formData.get("people-number"),
            timeAmount: +timeAmount,
        })

    }

    return (
        <>  
            <header>
                <img src="./PopChoiceIcon.png"/>
                <p>Pop Choice</p>
            </header>

            <form action={startApp}>
                
                <input 
                    type="number" 
                    className="input starting" 
                    name="people-number" 
                    placeholder="How mane people?" 
                    defaultValue="5"
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
                
                <button>Start</button>
            </form>
        </>
    )
}