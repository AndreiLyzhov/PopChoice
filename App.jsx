import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StartingForm from './Components/StartingForm.jsx';
import MainForm from './Components/MainForm.jsx';
import Recommendation from './Components/Recommendation.jsx';
import Loading from './Components/Loading.jsx';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<StartingForm />} />
                <Route path="/form/:userNumber" element={<MainForm />} />
                <Route path="/loading" element={<Loading />} />
                <Route path="/recommendations" element={<Recommendation />} />
            </Routes>
        </BrowserRouter>
    );
}
