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
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            return (
              <div
                key={index}
                className="rounded-xl transition"
                style={{
                  backgroundColor: "var(--card-background)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="w-full text-left p-4 flex justify-between items-center gap-4 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] rounded-xl"
                >
                  <span>{item.question}</span>
                  <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <p
                    id={panelId}
                    style={{ color: "#9CA3AF" }}
                    className="px-4 pb-4 -mt-1"
                  >
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
