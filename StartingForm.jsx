

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
            <form action={startApp}>
                
                <input type="number" className="input starting" name="people-number" placeholder="How mane people?" required></input>
                
                <label>How much time do you have?</label>
                <div className="input starting time-container">

                    <input className="time-input" type="number" name="hours-amount" placeholder="" required></input>
                    <span>hours</span>

                    <input className="time-input" type="number" name="minutes-amount" placeholder="" required></input>
                    <span>minutes</span>

                </div>
                
                <button>Start</button>
            </form>
        </>
    )
}