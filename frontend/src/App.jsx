import { Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import ResetPassword from "./pages/resetpassword";
import VerifyEmail from "./pages/verifyEmail";
import Login from "./pages/login";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // make sure to import styles

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/resetPassword" element={<ResetPassword />} />
        <Route path="/verifyEmail" element={<VerifyEmail />} />
      </Routes>

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}

export default App;
