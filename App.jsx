
import MainForm from "./MainForm.jsx";
import { openai, supabase } from "./config.js"
import { createTable } from "./createTable.js"


export default function App() {


    // createTable()
    
    
    return (
        <>
            <header>
                <img src="./PopChoiceIcon.png"/>
                <p>Pop Choice</p>
            </header>
            <MainForm />
            
            
        </>
    )
}