import React from 'react';

interface CategoryNavProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
}) => {
  const normActive = (activeCategory || '').trim().toLowerCase();

  return (
    <nav className="cats" id="cats" aria-label="Product categories">
      {categories.map((cat) => {
        const isActive = normActive === cat.trim().toLowerCase();
        return (
          <button
            key={cat}
            type="button"
            className={`cat ${isActive ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              onSelectCategory(cat);
            }}
            aria-pressed={isActive}
          >
            {cat}
          </button>
        );
      })}
    </nav>
  );
};
