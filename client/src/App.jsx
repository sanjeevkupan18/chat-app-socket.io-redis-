import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";

import ProtectedRoute from "./routes/ProtectedRoute";

const App = () => {
  return (
    <Routes>
      {/* Public */}

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      {/* Protected */}

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Chat />} />
      </Route>

      {/* Fallback */}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
