import React from 'react';

export const Services: React.FC = () => {
  return (
    <section className="services">
      <div className="service">
        <b>🔎 Smart Search</b>
        <span>Search terms match the relevant products and categories.</span>
      </div>
      <div className="service">
        <b>❤️ Wishlist</b>
        <span>Save favourites on this device.</span>
      </div>
      <div className="service">
        <b>⇄ Compare</b>
        <span>Compare products without an account.</span>
      </div>
      <div className="service">
        <b>💬 WhatsApp Only</b>
        <span>No online payment gateway.</span>
      </div>
    </section>
  );
};
