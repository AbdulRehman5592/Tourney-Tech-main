"use client";

import { useEffect, useState } from "react";
import api from "@/utils/axios";
import { toast } from "react-hot-toast";

import Loader from "@/components/Loader";
import USLocationSelector from "@/components/ui/signup/USLocationSelector";
import PasswordInput from "@/components/ui/signup/PasswordInput";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const emptyForm = {
  firstname: "",
  lastname: "",
  username: "",
  email: "",
  phone: "",
  gender: "",
  dob: "",
  region: "",
  stateCode: "",
  city: "",
  club: "",
  password: "",
};

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regionsList, setRegionsList] = useState([]); // [{code, name}]
  const [form, setForm] = useState(emptyForm);

  const fetchUser = async () => {
    try {
      const res = await api.get("/api/me");
      setUser(res.data.data.user);
    } catch (err) {
      console.error("Failed to fetch user:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    api
      .get("/api/regions")
      .then((res) => setRegionsList(res.data?.data || []))
      .catch(() => setRegionsList([]));
  }, []);

  // Region is stored on the user as a 2-digit code, but the picker (same one
  // signup uses) works by name -- resolve code -> name once both are loaded
  // so the existing region shows as selected instead of blank.
  const startEditing = () => {
    setForm({
      firstname: user.firstname || "",
      lastname: user.lastname || "",
      username: user.username || "",
      email: user.email || "",
      phone: user.phone || "",
      gender: user.gender || "",
      dob: user.dob || "",
      region: regionsList.find((r) => r.code === user.region)?.name || "",
      stateCode: user.stateCode || "",
      city: user.city || "",
      club: user.club || "",
      password: "",
    });
    setEditing(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;

      const res = await api.patch("/api/me", payload, {
        headers: { "Content-Type": "application/json" },
      });
      setUser(res.data.data.user);
      toast.success(res.data.message || "Profile updated!");
      setEditing(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return (
      <div className="text-center mt-10 text-red-500 font-medium">
        Failed to load user.
      </div>
    );
  }

  return (
    <div className="">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-themePrimary">
          My Profile
        </h1>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            className="px-4 py-2 rounded-lg font-semibold bg-[var(--accent-color)] text-black"
          >
            Edit Profile
          </button>
        )}
      </div>

      <div className="bg-[var(--card-background)] shadow-md rounded-xl p-6 sm:p-10 w-full max-w-3xl">
        {!editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Field label="First Name" value={user.firstname} />
            <Field label="Last Name" value={user.lastname} />
            <Field label="Nickname" value={user.username} />
            <Field label="Email" value={user.email} />
            <Field label="Phone Number" value={user.phone} />
            <Field label="Gender" value={user.gender} capitalize />
            <Field label="Date of Birth" value={user.dob} />
            <Field label="State" value={user.stateCode} />
            <Field label="City" value={user.city} />
            <Field
              label="Playing Region"
              value={regionsList.find((r) => r.code === user.region)?.name || user.region}
            />
            <Field label="Club" value={user.club} />
            <Field label="Role" value={user.role} capitalize />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="First Name" name="firstname" value={form.firstname} onChange={handleChange} />
              <Input label="Last Name" name="lastname" value={form.lastname} onChange={handleChange} />
              <Input
                label="Nickname"
                name="username"
                value={form.username}
                onChange={handleChange}
                required={false}
              />
              <Input
                label="Email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                title="Please enter a valid email address"
              />
              <Input
                label="Phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                maxLength="10"
                pattern="^[0-9]{10}$"
                title="Phone number must be exactly 10 digits"
              />

              <div>
                <label className="block mb-2 text-sm font-medium">Gender</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-md border"
                  style={{
                    backgroundColor: "var(--secondary-color)",
                    borderColor: "var(--border-color)",
                    color: "var(--foreground)",
                  }}
                >
                  <option value="" disabled>
                    Select gender
                  </option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Date of Birth</label>
                <DatePicker
                  selected={
                    form.dob && form.dob.includes("/")
                      ? (() => {
                          const [month, day] = form.dob.split("/").map(Number);
                          if (isNaN(month) || isNaN(day)) return null;
                          const d = new Date();
                          d.setMonth(month - 1);
                          d.setDate(day);
                          return d;
                        })()
                      : null
                  }
                  onChange={(date) => {
                    if (date instanceof Date && !isNaN(date)) {
                      const formatted = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(
                        date.getDate()
                      ).padStart(2, "0")}`;
                      setForm((prev) => ({ ...prev, dob: formatted }));
                    }
                  }}
                  dateFormat="MM/dd"
                  showMonthDropdown
                  showDayDropdown
                  showYearDropdown={false}
                  placeholderText="Select month and day"
                  className="w-full px-4 py-2 rounded-md border focus:outline-none"
                  style={{
                    backgroundColor: "var(--secondary-color)",
                    borderColor: "var(--border-color)",
                    color: "var(--foreground)",
                  }}
                  calendarClassName="custom-calendar"
                />
              </div>
            </div>

            <USLocationSelector
              region={form.region}
              setRegion={(val) => setForm((prev) => ({ ...prev, region: val }))}
              stateCode={form.stateCode}
              setStateCode={(val) => setForm((prev) => ({ ...prev, stateCode: val }))}
              city={form.city}
              setCity={(val) => setForm((prev) => ({ ...prev, city: val }))}
              club={form.club}
              setClub={(val) => setForm((prev) => ({ ...prev, club: val }))}
            />

            <PasswordInput
              label="New Password (leave blank to keep current)"
              required={false}
              value={form.password}
              onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
            />

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 rounded-lg font-semibold bg-[var(--accent-color)] text-black disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="flex-1 py-3 rounded-lg font-semibold border border-[var(--border-color)]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, capitalize }) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p className={`text-lg font-medium ${capitalize ? "capitalize" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

function Input({ label, name, value, onChange, type = "text", required = true, ...rest }) {
  return (
    <div>
      <label className="block mb-2 text-sm font-medium">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-4 py-2 rounded-md border"
        style={{
          backgroundColor: "var(--secondary-color)",
          borderColor: "var(--border-color)",
          color: "var(--foreground)",
        }}
        {...rest}
      />
    </div>
  );
}
