import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showResetPw, setShowResetPw] = useState(false);

  // Forgot Password Modal States
  const [showForgot, setShowForgot] = useState(false);
  const [step, setStep] = useState(1); // 1=email , 2=verify/reset
  const [fpLoading, setFpLoading] = useState(false);
  const [fpMsg, setFpMsg] = useState("");
  const [fpError, setFpError] = useState("");

  const [resetForm, setResetForm] = useState({
    email: "",
    code: "",
    password: "",
    confirmPassword: "",
  });

  // ================= LOGIN =================
  const handle = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Login failed",
      );
    } finally {
      setLoading(false);
    }
  };

  // ================= OPEN MODAL =================
  const openForgot = () => {
    setShowForgot(true);
    setStep(1);
    setFpMsg("");
    setFpError("");

    setResetForm({
      email: form.email || "",
      code: "",
      password: "",
      confirmPassword: "",
    });
  };

  const closeForgot = () => {
    setShowForgot(false);
    setFpMsg("");
    setFpError("");
  };

  // ================= SEND CODE =================
  const sendCode = async (e) => {
    e.preventDefault();

    setFpLoading(true);
    setFpError("");
    setFpMsg("");

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/auth/forgot-password`,
        { email: resetForm.email },
      );

      setFpMsg(res.data.message || "Verification code sent");
      setStep(2);
    } catch (err) {
      setFpError(
        err.response?.data?.error ||
          err.message ||
          "Failed to send verification code",
      );
    } finally {
      setFpLoading(false);
    }
  };

  // ================= RESET PASSWORD =================
  const resetPassword = async (e) => {
    e.preventDefault();

    setFpError("");
    setFpMsg("");

    if (resetForm.password !== resetForm.confirmPassword) {
      return setFpError("Passwords do not match");
    }

    setFpLoading(true);

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/auth/reset-password`,
        {
          email: resetForm.email,
          code: resetForm.code,
          password: resetForm.password,
        },
      );

      setFpMsg(res.data.message || "Password reset successful");

      setTimeout(() => {
        closeForgot();
      }, 1500);
    } catch (err) {
      setFpError(
        err.response?.data?.error || err.message || "Failed to reset password",
      );
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <>
      <div className="ef-auth-root">
        <div className="ef-auth-left">
          <div className="ef-auth-brand">
            <i className="bi bi-lightning-charge-fill ef-auth-icon" />
            <h1>ExpenseFlow</h1>
            <p>Smart Budget Tracking with AI Predictions</p>
          </div>

          <div className="ef-auth-features">
            {[
              [
                "bi-graph-up-arrow",
                "AI Budget Predictions",
                "ML model forecasts next month spending",
              ],
              [
                "bi-bullseye",
                "Budget Goals",
                "Set limits per category, track progress",
              ],
              [
                "bi-pie-chart-fill",
                "Visual Analytics",
                "Beautiful charts and spending breakdowns",
              ],
            ].map(([icon, title, desc]) => (
              <div className="ef-auth-feature" key={title}>
                <div className="ef-auth-feature-icon">
                  <i className={`bi ${icon}`} />
                </div>

                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ef-auth-right">
          <div className="ef-auth-card card shadow-lg">
            <div className="card-body p-4 p-md-5">
              <h2 className="ef-auth-title">Welcome Back</h2>
              <p className="ef-auth-sub text-muted">
                Sign in to your dashboard
              </p>

              {error && (
                <div className="alert alert-danger py-2">
                  <i className="bi bi-exclamation-circle me-2" />
                  {error}
                </div>
              )}

              <form onSubmit={handle}>
                <div className="mb-3">
                  <label htmlFor="loginEmail" className="form-label">
                    Email address
                  </label>

                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-envelope" />
                    </span>

                    <input
                      id="loginEmail"
                      name="email"
                      type="email"
                      autoComplete="email"
                      className="form-control"
                      placeholder="you@email.com"
                      value={form.email}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          email: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="loginPassword" className="form-label">
                    Password
                  </label>

                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="bi bi-lock" />
                    </span>

                    <input
                      id="loginPassword"
                      name="password"
                      type={showPw ? "text" : "password"}
                      autoComplete="current-password"
                      className="form-control"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          password: e.target.value,
                        }))
                      }
                      required
                    />

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPw(!showPw)}
                    >
                      <i
                        className={`bi ${showPw ? "bi-eye-slash" : "bi-eye"}`}
                      />
                    </button>
                  </div>
                </div>

                <div className="text-end mb-3">
                  <button
                    type="button"
                    onClick={openForgot}
                    className="btn btn-link p-0 text-decoration-none"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="btn ef-btn-primary w-100"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm me-2" />
                  ) : (
                    <i className="bi bi-box-arrow-in-right me-2" />
                  )}
                  Sign In
                </button>
              </form>

              <hr className="my-4" />

              <p className="text-center mb-0">
                Don't have an account?{" "}
                <Link to="/register" className="ef-link fw-semibold">
                  Create one
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL ================= */}
      {showForgot && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(15,23,42,.65)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div
              className="modal-content border-0 shadow-lg"
              style={{
                borderRadius: "20px",
                overflow: "hidden",
              }}
            >
              <div
                className="modal-header border-0 text-white"
                style={{
                  background: "linear-gradient(135deg,#4F46E5,#6366F1)",
                }}
              >
                <h5 className="modal-title fw-bold">
                  {step === 1 ? "Forgot Password" : "Reset Password"}
                </h5>

                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={closeForgot}
                />
              </div>

              <div className="modal-body p-4 bg-white">
                {fpMsg && (
                  <div className="alert alert-success py-2">{fpMsg}</div>
                )}

                {fpError && (
                  <div className="alert alert-danger py-2">{fpError}</div>
                )}

                {/* STEP 1 */}
                {step === 1 && (
                  <form onSubmit={sendCode}>
                    <label className="form-label fw-semibold">
                      Email Address
                    </label>

                    <input
                      type="email"
                      className="form-control mb-3 bg-white text-dark"
                      style={{ backgroundColor: "#fff", color: "#000" }}
                      value={resetForm.email}
                      onChange={(e) =>
                        setResetForm((p) => ({
                          ...p,
                          email: e.target.value,
                        }))
                      }
                      required
                    />

                    <button
                      className="btn ef-btn-primary w-100"
                      disabled={fpLoading}
                    >
                      {fpLoading ? "Sending..." : "Send Code"}
                    </button>
                  </form>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <form onSubmit={resetPassword}>
                    <label className="form-label fw-semibold">
                      Verification Code
                    </label>

                    <input
                      type="text"
                      className="form-control mb-3 bg-white text-dark"
                      style={{ backgroundColor: "#fff", color: "#000" }}
                      maxLength="6"
                      placeholder="Enter 6 digit code"
                      value={resetForm.code}
                      onChange={(e) =>
                        setResetForm((p) => ({
                          ...p,
                          code: e.target.value,
                        }))
                      }
                      required
                    />

                    <label className="form-label fw-semibold">
                      New Password
                    </label>

                    <div className="input-group mb-3">
                      <input
                        type={showResetPw ? "text" : "password"}
                        className="form-control bg-white text-dark"
                        style={{ backgroundColor: "#fff", color: "#000" }}
                        placeholder="New Password"
                        value={resetForm.password}
                        onChange={(e) =>
                          setResetForm((p) => ({
                            ...p,
                            password: e.target.value,
                          }))
                        }
                        required
                      />

                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowResetPw(!showResetPw)}
                      >
                        <i
                          className={`bi ${
                            showResetPw ? "bi-eye-slash" : "bi-eye"
                          }`}
                        />
                      </button>
                    </div>

                    <label className="form-label fw-semibold">
                      Confirm New Password
                    </label>

                    <input
                      type="password"
                      className="form-control mb-3 bg-white text-dark"
                      style={{ backgroundColor: "#fff", color: "#000" }}
                      placeholder="Confirm Password"
                      value={resetForm.confirmPassword}
                      onChange={(e) =>
                        setResetForm((p) => ({
                          ...p,
                          confirmPassword: e.target.value,
                        }))
                      }
                      required
                    />

                    <button
                      className="btn ef-btn-primary w-100"
                      disabled={fpLoading}
                    >
                      {fpLoading ? "Resetting..." : "Reset Password"}
                    </button>

                    <button
                      type="button"
                      className="btn btn-link w-100 mt-2 text-decoration-none"
                      onClick={sendCode}
                    >
                      Resend Code
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
