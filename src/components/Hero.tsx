import React from 'react';

interface HeroProps {
  onExplore: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExplore }) => {
  return (
    <section className="hero">
      <div>
        <div className="eyebrow">AnmolKala Handmade Collection</div>
        <h1>Art, Gifts &amp; Craft — all in one place.</h1>
        <p>
          Discover Puja Thali, photo frames, wall clocks, trays, jewellery, personalised
          name plates, diya &amp; candle holders, keychains, Rakhi and home décor. Browse by
          category and open any product for its unique product page and WhatsApp enquiry.
        </p>
        <button type="button" className="cta" onClick={onExplore}>
          Explore Collections →
        </button>
      </div>
    </section>
  );
};
