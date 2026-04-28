import { useState, useEffect } from "react";
import api from "../../services/api";

export default function ExpenseFormModal({
  categories,
  expense,
  onClose,
  onSubmit,
  loading,
}) {
  const isEdit = !!expense;

  const getLocalNow = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [form, setForm] = useState({
    category: expense?.category?._id || "",
    amount: expense?.amount || "",
    description: expense?.description || "",
    notes: expense?.notes || "",
    date: expense?.date
      ? new Date(expense.date).toISOString().slice(0, 16)
      : getLocalNow(),
  });

  const [selectedDesc, setSelectedDesc] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [descriptions, setDescriptions] = useState([]);
  const [errors, setErrors] = useState({});

  /* ================= CATEGORY DESCRIPTION LOAD ================= */

  useEffect(() => {
  if (!form.category) {
    setDescriptions([]);
    return;
  }

  const selectedCat = categories.find(
    (c) => c._id === form.category
  );

  const name = selectedCat?.name?.toLowerCase() || "";

  let defaults = [];

  if (name.includes("food")) {
    defaults = [
      "Breakfast",
      "Lunch",
      "Dinner",
      "Snacks",
      "Tea / Coffee",
    ];
  }

  else if (name.includes("transport")) {
    defaults = [
      "Petrol",
      "Diesel",
      "Auto Fare",
      "Bus Ticket",
      "Taxi / Cab",
    ];
  }

  else if (name.includes("housing")) {
    defaults = [
      "Rent",
      "Maintenance",
      "Furniture",
      "Repairs",
      "Cleaning",
    ];
  }

  else if (name.includes("shopping")) {
    defaults = [
      "Clothes",
      "Groceries",
      "Electronics",
      "Accessories",
      "Daily Use Items",
    ];
  }

  else if (name.includes("entertainment")) {
    defaults = [
      "Movie",
      "Games",
      "Party",
      "OTT Subscription",
      "Trip",
    ];
  }

  else if (name.includes("health")) {
    defaults = [
      "Medicine",
      "Doctor Visit",
      "Tests",
      "Hospital",
      "Gym",
    ];
  }

  else if (name.includes("education")) {
    defaults = [
      "Fees",
      "Books",
      "Course",
      "Exam Form",
      "Stationery",
    ];
  }

  else if (name.includes("bill")) {
    defaults = [
      "Electricity Bill",
      "Water Bill",
      "Internet",
      "Mobile Recharge",
      "Gas Bill",
    ];
  }

  else if (name.includes("travel")) {
    defaults = [
      "Hotel",
      "Flight",
      "Train",
      "Bus",
      "Tour Expense",
    ];
  }

  else if (name.includes("fitness")) {
    defaults = [
      "Gym Fees",
      "Protein",
      "Yoga",
      "Sports",
      "Trainer",
    ];
  }

  else if (name.includes("personal")) {
    defaults = [
      "Salon",
      "Cosmetics",
      "Haircut",
      "Skincare",
      "Self Care",
    ];
  }

  else {
    defaults = [
      "General Expense",
      "Cash Payment",
      "Online Payment",
      "Miscellaneous",
      "Other Expense",
    ];
  }

  api.get(`/categories/${form.category}/descriptions`)
    .then((res) => {
      const apiData = res.data.data || [];

      const merged = [...new Set([...defaults, ...apiData])];

      setDescriptions(merged.slice(0, 7));
    })
    .catch(() => {
      setDescriptions(defaults);
    });

}, [form.category, categories]);

  /* ================= AUTO PREFILL EDIT MODE ================= */

  useEffect(() => {
    if (expense?.description) {
      if (descriptions.includes(expense.description)) {
        setSelectedDesc(expense.description);
      } else {
        setSelectedDesc("__other__");
        setCustomDesc(expense.description);
      }
    }
  }, [descriptions, expense]);

  /* ================= VALIDATION ================= */

  const validate = () => {
    const e = {};

    if (!form.category) e.category = "Select category";

    if (!form.amount || +form.amount <= 0)
      e.amount = "Enter valid amount";

    if (!form.description.trim())
      e.description = "Enter description";

    setErrors(e);

    return !Object.keys(e).length;
  };

  /* ================= HANDLE SUBMIT ================= */

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    onSubmit({
      ...form,
      amount: parseFloat(form.amount),
      date: new Date(form.date).toISOString(),
    });
  };

  /* ================= SETTER ================= */

  const set = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }));

    setErrors((p) => {
      const n = { ...p };
      delete n[key];
      return n;
    });
  };

  const selCat = categories.find((c) => c._id === form.category);

  return (
    <>
      <div className="modal fade show d-block">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content ef-modal">
            {/* HEADER */}
            <div className="modal-header">
              <div className="d-flex align-items-center gap-2">
                <div className="ef-modal-icon">
                  <i className="bi bi-receipt-cutoff" />
                </div>

                <div>
                  <h5 className="modal-title mb-0">
                    {isEdit ? "Edit Expense" : "Add New Expense"}
                  </h5>
                  <small className="text-muted">
                    Quick expense entry
                  </small>
                </div>
              </div>

              <button
                type="button"
                className="btn-close"
                onClick={onClose}
              />
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* CATEGORY */}
                <div className="mb-3">
                  <label className="form-label fw-medium">
                    Category *
                  </label>

                  <div className="ef-cat-grid">
                    {categories.map((cat) => (
                      <button
                        type="button"
                        key={cat._id}
                        className={`ef-cat-btn ${
                          form.category === cat._id
                            ? "ef-cat-btn--active"
                            : ""
                        }`}
                        style={{ "--cat-color": cat.color }}
                        onClick={() => {
                          set("category", cat._id);
                          set("description", "");
                          setSelectedDesc("");
                          setCustomDesc("");
                        }}
                      >
                        <span className="ef-cat-btn__icon">
                          {cat.icon}
                        </span>
                        <span className="ef-cat-btn__name">
                          {cat.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  {errors.category && (
                    <div className="text-danger small mt-1">
                      {errors.category}
                    </div>
                  )}
                </div>

                {/* DESCRIPTION */}
                {form.category && (
                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      Description *
                    </label>

                    <select
                      className={`form-select ${
                        errors.description
                          ? "is-invalid"
                          : ""
                      }`}
                      value={selectedDesc}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedDesc(val);

                        if (val === "__other__") {
                          set("description", "");
                        } else {
                          set("description", val);
                        }
                      }}
                    >
                      <option value="">
                        Select description...
                      </option>

                      {descriptions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}

                      <option value="__other__">
                        Other
                      </option>
                    </select>

                    {selectedDesc === "__other__" && (
                      <input
                        type="text"
                        className="form-control mt-2"
                        placeholder="Enter custom description"
                        value={customDesc}
                        onChange={(e) => {
                          setCustomDesc(e.target.value);
                          set("description", e.target.value);
                        }}
                        autoFocus
                      />
                    )}

                    {errors.description && (
                      <div className="invalid-feedback d-block">
                        {errors.description}
                      </div>
                    )}
                  </div>
                )}

                {/* AMOUNT + DATE */}
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="form-label fw-medium">
                      Amount (₹) *
                    </label>

                    <div className="input-group">
                      <span className="input-group-text">
                        ₹
                      </span>

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={`form-control ${
                          errors.amount
                            ? "is-invalid"
                            : ""
                        }`}
                        value={form.amount}
                        onChange={(e) =>
                          set("amount", e.target.value)
                        }
                      />
                    </div>

                    {errors.amount && (
                      <div className="text-danger small">
                        {errors.amount}
                      </div>
                    )}
                  </div>

                  <div className="col-6">
                    <label className="form-label fw-medium">
                      Date & Time
                    </label>

                    <input
                      type="datetime-local"
                      className="form-control"
                      value={form.date}
                      onChange={(e) =>
                        set("date", e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* NOTES */}
                <div className="mb-3">
                  <label className="form-label fw-medium">
                    Notes
                  </label>

                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Optional notes..."
                    value={form.notes}
                    onChange={(e) =>
                      set("notes", e.target.value)
                    }
                  />
                </div>

                {/* PREVIEW */}
                {form.category && form.amount && (
                  <div className="ef-expense-preview">
                    <span
                      className="ef-cat-badge"
                      style={{
                        background:
                          selCat?.color + "22",
                        color: selCat?.color,
                      }}
                    >
                      {selCat?.icon} {selCat?.name}
                    </span>

                    <span className="fw-bold">
                      ₹
                      {parseFloat(
                        form.amount || 0
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn ef-btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm me-2" />
                  ) : (
                    <i
                      className={`bi ${
                        isEdit
                          ? "bi-check-lg"
                          : "bi-plus-lg"
                      } me-2`}
                    />
                  )}

                  {isEdit
                    ? "Update Expense"
                    : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div
        className="modal-backdrop fade show"
        onClick={onClose}
      />
    </>
  );
}