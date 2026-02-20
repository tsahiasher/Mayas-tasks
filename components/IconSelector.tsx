
import React from 'react';

// A curated list of 60+ diverse and expressive standard emojis
export const availableEmojis = [
  '✅', '⭐', '❤️', '✨', '💡', '☕', '🍕', '🥗', '🛍️', '🎁', 
  '🏠', '💼', '🏋️', '🎵', '🎮', '✈️', '📷', '📚', '💻', '📱', 
  '📞', '😊', '🚩', '⏰', '☁️', '☀️', '🌙', '⛱️', '🚀', '⚡', 
  '🎯', '🏆', '⚓', '🚲', '🚗', '🚌', '🚆', '🐕', '🐈', '🍃', 
  '🍷', '🍎', '🍬', '👻', '🎤', '🎨', '🔥', '🎓', '👑', '🔨', 
  '🔑', '📍', '📺', '⌚', '🧸', '🧺', '🛒', '🛠️', '📅', '📝', 
  '🔒', '🧼', '🦷', '🕶️', '💊', '🩹', '🧪'
];

interface IconSelectorProps {
  selected: string;
  onSelect: (emoji: string) => void;
  color?: string; // Preview background color for selected state
}

const IconSelector: React.FC<IconSelectorProps> = ({ selected, onSelect, color = '#3b82f6' }) => {
  return (
    <div className="grid grid-cols-6 gap-3 mt-2 max-h-64 overflow-y-auto p-4 border border-gray-100 rounded-3xl bg-slate-50/50 custom-scrollbar">
      {availableEmojis.map((emoji) => {
        const isSelected = selected === emoji;
        
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className={`flex items-center justify-center aspect-square rounded-2xl transition-all duration-300 transform shadow-sm text-2xl ${
              isSelected 
              ? 'scale-110 ring-4 ring-white shadow-xl' 
              : 'bg-white hover:bg-slate-100 hover:scale-105'
            }`}
            style={isSelected ? { backgroundColor: color } : {}}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
};

export default IconSelector;
