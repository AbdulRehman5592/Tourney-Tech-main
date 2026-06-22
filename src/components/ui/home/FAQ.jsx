"use client";

import { useState } from "react";

import { faqs } from "@/constants/home/faqData";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      id="faq"
      className="py-20"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <div className="container mx-auto px-6 max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {faqs.map((item, index) => (
            <div
              key={index}
              className="rounded-xl p-4 cursor-pointer transition"
              style={{
                backgroundColor: "var(--card-background)",
                border: "1px solid var(--border-color)",
              }}
              onClick={() => toggle(index)}
            >
              <h3 className="text-lg font-semibold flex justify-between items-center">
                {item.question}
                <span>{openIndex === index ? "−" : "+"}</span>
              </h3>
              {openIndex === index && (
                <p style={{ color: "#9CA3AF" }} className="mt-2">
                  {item.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
