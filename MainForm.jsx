

export default function MainForm(props) {

    function clickHandler(currentFormData) {
        props.setFormData(prev => {
            // console.log([...prev, currentFormData])
            return [...prev, currentFormData]
        })
        // console.log(props.formData.length)
    }
    
    return (
        <>
            <header>
                <img src="./PopChoiceIcon.png"/>
                <p>Pop Choice</p>
            </header>
        
            <form action={clickHandler}>
                <p className="current-user">{props.formData.length + 1}</p>

                <label>What's your favourite movie and why?</label>
                <textarea className="input" name="what's-your-favourite-movie-and-why?" defaultValue="Harry Potter"></textarea>
                
                <label>Are you in the mood for something new or classic?</label>  
                <div className="radio-container">
                    <input type="radio" id="new" name="are-you-in-the-mood-for-something-new-or-classic?" value="New" defaultChecked></input>
                    <label htmlFor="new" className="radio-label">New</label>

                    <input type="radio" id="classic" name="are-you-in-the-mood-for-something-new-or-classic?" value="Classic"></input>
                    <label htmlFor="classic" className="radio-label">Classic</label>
                </div>

                
                <label>What are you in the mood for?</label>  
                <div className="radio-container">
                    <input type="radio" id="fun" name="what-are-you-in-the-mood-for?" value="Fun" defaultChecked></input>
                    <label htmlFor="fun" className="radio-label">Fun</label>

                    <input type="radio" id="serious" name="what-are-you-in-the-mood-for?" value="Serious"></input>
                    <label htmlFor="serious" className="radio-label">Serious</label>

                    <input type="radio" id="inspiring" name="what-are-you-in-the-mood-for?" value="Inspiring"></input>
                    <label htmlFor="inspiring" className="radio-label">Inspiring</label>

                    <input type="radio" id="scary" name="what-are-you-in-the-mood-for?" value="Scary"></input>
                    <label htmlFor="scary" className="radio-label">Scary</label>
                </div>


                <label>Which famous film person would you love to be stranded on an island with and why?</label>  
                <textarea className="input" name="which-famous-film-person-would-you-love-to-be-stranded-on-an-island-with-and-why?" defaultValue="Tom Hanks"></textarea>
                
                <button>Let's Go</button>
            </form>
        </>
    )
}