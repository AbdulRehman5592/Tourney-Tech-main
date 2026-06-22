"use client";

import api from "@/utils/axios";
import { useState } from "react";
import Link from "next/link";
import Loader from "@/components/Loader";

import { toast } from "react-hot-toast";

import CitySelector from "@/components/ui/signup/CitySelector";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import PasswordInput from "@/components/ui/signup/PasswordInput";

export default function SignUpPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [city, setCity] = useState("");
  const [subCity, setSubCity] = useState("");
  const [club, setClub] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔍 Basic required field validation
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !city ||
      !subCity ||
      !stateCode ||
      !club ||
      !dob
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // 🔍 Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    // 🔍 Phone validation (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }

    //    const data = {
    //   firstname: firstName,
    //   lastname: lastName,
    //   email,
    //   username,
    //   password,
    //   dob,
    //   city,
    //   subCity,
    //   stateCode,
    //   club,
    //   phone,
    //   gender,
    // };

    try {
      setLoading(true);

      const data = {
        firstname: firstName,
        lastname: lastName,
        email,
        username,
        password,
        dob,
        city,
        subCity,
        stateCode,
        club,
        phone,
        gender,
      };

      const res = await api.post("/api/register", data, {
        headers: { "Content-Type": "application/json" },
      });

      toast.success(res?.data?.message || "Verification email sent!");
      window.location.href = "/auth/verify-otp";
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || "Something went wrong";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <Loader />} {/* Show loader while processing */}
      <main
        className="min-h-screen flex items-center justify-center px-4 py-6"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        <div
          className="w-full max-w-2xl p-8 rounded-xl shadow-md"
          style={{ backgroundColor: "var(--card-background)" }}
        >
          <h1
            className="text-3xl font-bold mb-6 text-center"
            style={{ color: "var(--accent-color)" }}
          >
            Create Your Account
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First Name & Last Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={firstName}
                onChange={setFirstName}
              />
              <Input
                label="Last Name"
                value={lastName}
                onChange={setLastName}
              />
            </div>

            {/* Username & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nickname ( Optional )"
                value={username}
                onChange={setUsername}
                required={false}
              />
              {/* Email */}
              <Input
                label="Email"
                value={email}
                onChange={setEmail}
                type="email"
                pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                title="Please enter a valid email address."
              />
            </div>

            {/* Password & DOB */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PasswordInput
                label="Password"
                value={password}
                onChange={setPassword}
              />

              {/* DOB */}
              <div>
                <label className="block mb-2 text-sm font-medium">
                  Date of Birth
                </label>
                <DatePicker
                  selected={
                    dob
                      ? (() => {
                          const [month, day] = dob.split("/");
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
                      setDob(formatted); // ✅ store as "MM/DD" string only
                    }
                  }}
                  dateFormat="MM/dd"
                  showMonthDropdown
                  showDayDropdown
                  showYearDropdown={false} // 🚫 disable year
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

            {/* Phone & City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone */}
              <Input
                label="Phone"
                value={phone}
                onChange={setPhone}
                maxLength="10"
                pattern="^[0-9]{10}$"
                title="Phone number must be exactly 10 digits."
              />

              <div className="">
                <label className="block mb-2 text-sm font-medium">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
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
                  {/* <option value="other">Other</option> */}
                </select>
              </div>
              {/* <Input label="City" value={city} onChange={setCity} /> */}
            </div>

            {/* State Code & Gender */}
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> */}
            <CitySelector
              city={city}
              setCity={setCity}
              subCity={subCity}
              setSubCity={setSubCity}
              stateCode={stateCode}
              setStateCode={setStateCode}
              club={club}
              setClub={setClub}
            />

            {/* <Input
                label="State Code"
                value={stateCode}
                onChange={setStateCode}
              /> */}

            {/* </div> */}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-md font-semibold transition"
              style={{
                backgroundColor: "var(--accent-color)",
                color: "var(--background)",
              }}
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "#9CA3AF" }}>
            Already have an account?{" "}
            <Link
              href="login"
              className="hover:underline"
              style={{ color: "var(--accent-color)" }}
            >
              Log In
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}

// 🔧 Reusable Input Component
function Input({
  label,
  value,
  onChange,
  type = "text",
  pattern,
  title,
  maxLength,
  required = true,
}) {
  const handleChange = (e) => {
    let val = e.target.value;

    // If it's a phone field, allow only digits
    if (label.toLowerCase().includes("phone")) {
      val = val.replace(/\D/g, ""); // remove all non-digits
    }

    onChange(val);
  };

  return (
    <div>
      <label className="block mb-2 text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        maxLength={maxLength}
        onChange={handleChange}
        pattern={pattern}
        title={title}
        className="w-full px-4 py-2 rounded-md border"
        style={{
          backgroundColor: "var(--secondary-color)",
          borderColor: "var(--border-color)",
          color: "var(--foreground)",
        }}
      />
    </div>
  );
}
