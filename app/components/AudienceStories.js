"use client";

import { useState } from "react";

const STORIES = [
  {
    id: "parents",
    emoji: "👨‍👩‍👧",
    tab: "Parents to children",
    headline: "Write to your child today. They read it when they are ready.",
    blurb:
      "Record your voice for their first day of school, or write a letter for their 18th birthday. The words you can't fit into a busy day will still be waiting.",
    to: "Dear Meera,",
    body: [
      "You are asleep next to me as I write this, three weeks old and already stubborn about your milk.",
      "By the time you read this you will be eighteen and probably embarrassed by me. I just want you to know that on the day you were born, I stood in the hospital corridor and cried for an hour.",
      "Whatever you choose to become, come home when you need to. The door is always open.",
    ],
    from: "Appa",
    opens: "Opens on her 18th birthday",
    cta: "Write to your child",
  },
  {
    id: "children",
    emoji: "🙏",
    tab: "Children to parents",
    headline: "Say thank you to the people who never asked for it.",
    blurb:
      "Some things are hard to say face to face. Write them once, choose a date like their birthday or anniversary, and we deliver it at the right moment.",
    to: "Dear Amma,",
    body: [
      "I never said this at home, so I am saying it here. Thank you for the nights you stayed up with me before every exam, even when you had work in the morning.",
      "I used to think you were being strict. Now I understand you were being brave.",
      "I am sorry for the arguments. I am grateful for everything else.",
    ],
    from: "Your son",
    opens: "Opens on her birthday",
    cta: "Write to your parents",
  },
  {
    id: "lovers",
    emoji: "💛",
    tab: "Couples",
    headline: "Schedule a surprise for the person you love.",
    blurb:
      "Plan it for your anniversary next year, or for a day five years from now. They will not see it coming, and they will keep it forever.",
    to: "My love,",
    body: [
      "If you are reading this, it is our fifth anniversary and I have been planning this surprise since the day we got engaged.",
      "I hope we are still arguing about where to eat and still laughing about it afterwards.",
      "Do you remember that rainy day in Amsterdam?",
    ],
    from: "Yours, always",
    opens: "Opens on your 5th anniversary",
    cta: "Schedule a surprise",
  },
  {
    id: "students",
    emoji: "🎓",
    tab: "Friends and students",
    headline: "Leave the gossip, the jokes and the promises for later.",
    blurb:
      "Write down the inside jokes, who liked whom, and what you all swore you would do by 30. Open it at the reunion and see who kept their word.",
    to: "To the back bench gang,",
    body: [
      "Right now Ravi is failing physics, Divya is pretending she does not like Karthik, and we are all broke.",
      "I bet Ravi runs a company by the time you read this. If not, someone owes me a biryani.",
      "Did we ever go on that trip we kept planning? Be honest.",
    ],
    from: "Class of 2026",
    opens: "Opens at the 10 year reunion",
    cta: "Create a group memory",
  },
];

export default function AudienceStories() {
  const [active, setActive] = useState("parents");

  return (
    <section id="stories" className="max-w-4xl mx-auto px-6 py-16 scroll-mt-8">
      <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
        Some things are easier to say on another day
      </h2>
      <p className="text-gray-500 text-center mb-10 max-w-xl mx-auto">
        Choose who you are writing to and see what a capsule can hold.
      </p>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Who are you writing to?"
        className="flex flex-wrap justify-center gap-2 mb-10"
      >
        {STORIES.map((s) => {
          const selected = s.id === active;
          return (
            <button
              key={s.id}
              role="tab"
              id={`tab-${s.id}`}
              aria-selected={selected}
              aria-controls={`panel-${s.id}`}
              onClick={() => setActive(s.id)}
              className={
                "px-5 py-2 rounded-full text-sm font-medium transition " +
                (selected
                  ? "bg-amber-500 text-white"
                  : "border border-gray-300 text-gray-600 hover:border-amber-400")
              }
            >
              <span className="mr-1">{s.emoji}</span>
              {s.tab}
            </button>
          );
        })}
      </div>

      {/* All panels stay in the page so everyone (and Google) can read them */}
      {STORIES.map((s) => (
        <div
          key={s.id}
          role="tabpanel"
          id={`panel-${s.id}`}
          aria-labelledby={`tab-${s.id}`}
          hidden={s.id !== active}
          className="text-center"
        >
          <h3 className="text-2xl font-semibold text-amber-900 mb-2">{s.headline}</h3>
          <p className="text-gray-500 mb-8 max-w-xl mx-auto">{s.blurb}</p>

          <article className="max-w-xl mx-auto bg-white border border-amber-200 rounded-2xl shadow-sm p-6 sm:p-8 text-left">
            <p className="font-serif text-lg font-semibold text-gray-900">{s.to}</p>
            <div className="mt-3 space-y-3 font-serif leading-relaxed text-gray-700">
              {s.body.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            <p className="mt-4 font-serif italic text-gray-600">{s.from}</p>
            <div className="mt-5 pt-3 border-t border-dashed border-amber-300 text-sm text-amber-700 flex items-center gap-2">
              <span>🔒</span>
              {s.opens}
            </div>
          </article>

          <a
            href="/login"
            className="inline-block mt-8 bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-full text-lg font-medium transition"
          >
            {s.cta}
          </a>
        </div>
      ))}
    </section>
  );
}
