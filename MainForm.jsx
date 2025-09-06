

export default function MainForm(props) {
    
    return (
        
            <form action={props.clickHandler}>
                <label>What's your favourite movie and why?</label>
                <textarea className="input" name="what's-your-favourite-movie-and-why?" defaultValue="Harry Potter"></textarea>
                
                <label>Are you in the mood for something new or classic?</label>  
                <textarea className="input" name="are-you-in-the-mood-for-something-new-or-classic?" defaultValue="In a mood for something classy"></textarea>
                
                <label>Do you wanna have fun or do you want something serious?</label>  
                <textarea className="input" name="do-you-wanna-have-fun-or-do-you-want-something-serious?" defaultValue="Something in between"></textarea>
                
                <button>Let's Go</button>
            </form>
    )
}