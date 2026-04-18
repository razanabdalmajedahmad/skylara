'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    category: 'Tandem Skydiving',
    question: 'What is a tandem skydive?',
    answer: 'A tandem skydive is where you are securely attached to a highly experienced instructor via a specially designed harness. Your instructor handles all the technical aspects while you enjoy the experience of freefall and canopy flight.',
  },
  {
    category: 'Tandem Skydiving',
    question: 'Do I need any prior experience?',
    answer: 'No prior experience is needed for a tandem skydive. You will receive a thorough ground briefing before your jump covering body position, altitude awareness, and landing procedures.',
  },
  {
    category: 'Tandem Skydiving',
    question: 'What is the age and weight limit?',
    answer: 'You must be at least 18 years old. Weight limits vary by dropzone but typically range from 200-230 lbs (90-105 kg). Contact the dropzone directly for specific limits.',
  },
  {
    category: 'AFF Training',
    question: 'What is the AFF program?',
    answer: 'Accelerated Freefall (AFF) is a structured training program that teaches you to skydive independently. It consists of ground school followed by a series of progressive jumps with instructor supervision until you are cleared for solo freefall.',
  },
  {
    category: 'AFF Training',
    question: 'How long does it take to get licensed?',
    answer: 'Most students complete their A-license in 25-30 jumps, which can take anywhere from a few weeks to several months depending on weather, availability, and progression pace.',
  },
  {
    category: 'Weather & Safety',
    question: 'What happens if the weather is bad?',
    answer: 'Safety is our top priority. If conditions are unsuitable for jumping (high winds, low clouds, rain, or thunderstorms), operations will be paused. You can reschedule at no additional cost if your jump is weather-cancelled.',
  },
  {
    category: 'Weather & Safety',
    question: 'How safe is skydiving?',
    answer: 'Modern skydiving equipment includes multiple redundancy systems including a main parachute, reserve parachute, and an automatic activation device (AAD). Dropzones follow strict safety protocols overseen by qualified safety officers.',
  },
  {
    category: 'Weather & Safety',
    question: 'What wind speeds are too high for jumping?',
    answer: 'Wind limits vary based on jumper experience. Tandem operations typically pause at sustained winds above 14-18 mph. Student limits are similar. Experienced jumpers may operate in higher winds at the discretion of the safety officer.',
  },
  {
    category: 'General',
    question: 'What should I wear?',
    answer: 'Wear comfortable, athletic clothing that fits close to the body. Sneakers or athletic shoes are required. Avoid loose clothing, sandals, boots, or jewelry. The dropzone will provide a jumpsuit, goggles, and all necessary gear.',
  },
  {
    category: 'General',
    question: 'Can I bring a camera?',
    answer: 'Personal cameras and phones are not permitted on tandem or student jumps for safety reasons. Professional video and photo packages are typically available for purchase through the dropzone.',
  },
  {
    category: 'General',
    question: 'Do I need to sign a waiver?',
    answer: 'Yes, all participants must sign a liability waiver before any skydiving activity. You can sign your waiver in advance through your account portal or on arrival at the dropzone.',
  },
];

const CATEGORIES = [...new Set(FAQ_ITEMS.map((item) => item.category))];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredItems = activeCategory
    ? FAQ_ITEMS.filter((item) => item.category === activeCategory)
    : FAQ_ITEMS;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Frequently Asked Questions</h1>
        <p className="text-gray-500 dark:text-gray-400">Find answers to common questions about skydiving</p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
            activeCategory === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              activeCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Accordion */}
      <div className="space-y-3">
        {filteredItems.map((item, index) => {
          const globalIndex = FAQ_ITEMS.indexOf(item);
          const isOpen = openIndex === globalIndex;
          return (
            <div
              key={globalIndex}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.question}</span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 shrink-0 ml-2 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pt-0">
                  <div className="pl-8">
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{item.answer}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      {item.category}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
