import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";

export default function Auth() {
  const [mode, setMode] = useState("login");
  const [fields, setFields] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const update = (e) =>
    setFields((f) => ({ ...f, [e.target.name]: e.target.value }));

  const [slow, setSlow] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    setSlow(false);

    // If request takes more than 5 seconds, show a message
    const slowTimer = setTimeout(() => setSlow(true), 5000);

    try {
      const endpoint = mode === "login" ? "/auth/login/" : "/auth/register/";
      const { data } = await api.post(endpoint, fields);
      login(data.user, data.tokens);
      navigate("/rooms");
    } catch (err) {
      const data = err.response?.data;
      if (!data) {
        setError("Network error. Check your connection.");
        return;
      }
      if (typeof data === "string") {
        setError(data);
      } else if (data.detail) {
        setError(data.detail);
      } else if (data.non_field_errors) {
        setError(data.non_field_errors[0]);
      } else {
        const first = Object.values(data)[0];
        setError(Array.isArray(first) ? first[0] : first);
      }
    } finally {
      clearTimeout(slowTimer);
      setLoading(false);
      setSlow(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 w-full max-w-sm">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900 mb-1">
          confr
        </h1>
        <p className="text-sm text-gray-400 mb-7">
          {mode === "login" ? "Welcome back." : "Create your account."}
        </p>

        <div className="flex flex-col gap-3">
          {mode === "register" && (
            <div className="flex gap-2">
              <input
                className="input flex-1"
                name="first_name"
                placeholder="First name"
                value={fields.first_name}
                onChange={update}
              />
              <input
                className="input flex-1"
                name="last_name"
                placeholder="Last name"
                value={fields.last_name}
                onChange={update}
              />
            </div>
          )}

          <input
            className="input"
            name="email"
            type="email"
            placeholder="Email"
            value={fields.email}
            onChange={update}
          />
          <input
            className="input"
            name="password"
            type="password"
            placeholder="Password"
            value={fields.password}
            onChange={update}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={submit}
            disabled={loading}
            className="mt-1 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading
              ? "Please wait…"
              : mode === "login"
              ? "Sign in"
              : "Create account"}
          </button>

          {slow && (
            <p className="text-xs text-center text-gray-400 animate-pulse">
              Server is waking up, this may take a moment…
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          {mode === "login"
            ? "Don't have an account? "
            : "Already have an account? "}
          <button
            className="text-blue-600 font-medium hover:underline"
            onClick={() => {
              setMode((m) => (m === "login" ? "register" : "login"));
              setError("");
            }}
          >
            {mode === "login" ? "Register" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
