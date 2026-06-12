import { Routes, Route } from "react-router";
import Home from "./pages/Home";
import Vault from "./pages/Vault";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/vault" element={<Vault />} />
    </Routes>
  );
}

export default App;
