"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({ label = "Password", value, onChange, required, name }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <label className="block mb-2 text-sm font-medium">{label}</label>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={`Enter ${label.toLowerCase()}`}
          className="w-full px-4 py-2 rounded-md border pr-10"
          style={{
            backgroundColor: "var(--secondary-color)",
            borderColor: "var(--border-color)",
            color: "var(--foreground)",
          }}
        />

        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
}
