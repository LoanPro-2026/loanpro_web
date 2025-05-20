import React from 'react';

const reviews = [
  {
    name: 'Amit Sharma',
    text: 'LoanPro has made managing my lending business so much easier. The dashboard is intuitive and the support is fantastic!',
    avatar: '🧑🏻',
  },
  {
    name: 'Priya Verma',
    text: 'The automated payments and subdomain feature are game changers. Highly recommended for any lender!',
    avatar: '👩🏻',
  },
  {
    name: 'Rakesh Patel',
    text: 'I love the fingerprint integration and the hybrid database. My team is more productive than ever.',
    avatar: '🧔🏽',
  },
  {
    name: 'Sunita Rao',
    text: 'The pricing is transparent and the features are all-inclusive. LoanPro is the best SaaS for lending businesses.',
    avatar: '👩🏽',
  },
];

const CustomerReviewsSection = () => (
  <section className="py-20 bg-gradient-to-b from-white to-blue-50" id="reviews">
    <div className="max-w-6xl mx-auto px-4 text-center">
      <h2 className="text-4xl font-bold mb-12 text-blue-700">What Our Customers Say</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {reviews.map((review, idx) => (
          <div key={idx} className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center border-2 border-blue-100 hover:border-blue-600 transition">
            <div className="text-5xl mb-4">{review.avatar}</div>
            <p className="text-gray-700 mb-4 italic">"{review.text}"</p>
            <div className="font-semibold text-blue-700">{review.name}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default CustomerReviewsSection; 