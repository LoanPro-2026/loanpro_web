import React from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
// import { QuoteLeftIcon } from '@heroicons/react/24/outline';

// Custom Quote Icon SVG component
const QuoteLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    {...props}
  >
    <path
      d="M7 17a5 5 0 0 1 5-5V7a7 7 0 0 0-7 7v3a3 3 0 0 0 3 3h2v-2H7zm10 0a5 5 0 0 1 5-5V7a7 7 0 0 0-7 7v3a3 3 0 0 0 3 3h2v-2h-2z"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const reviews = [
  {
    name: 'Amit Sharma',
    title: 'Finance Manager',
    company: 'Mumbai Financial Services',
    text: 'LoanPro has revolutionized our lending operations. The dashboard is incredibly intuitive and the automated features have saved us countless hours. Our productivity has increased by 60%!',
    rating: 5,
    avatar: '🧑🏻',
    gradient: 'from-blue-500 to-purple-500'
  },
  {
    name: 'Priya Verma',
    title: 'CEO',
    company: 'Delhi Micro Finance',
    text: 'The automated payments and custom subdomain features are absolute game changers. Our clients love the professional interface and we\'ve reduced manual work significantly.',
    rating: 5,
    avatar: '👩🏻',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    name: 'Rakesh Patel',
    title: 'Operations Head',
    company: 'Gujarat Lending Corp',
    text: 'The fingerprint integration and hybrid database give us the perfect balance of security and performance. Our team is more productive than ever before.',
    rating: 5,
    avatar: '🧔🏽',
    gradient: 'from-pink-500 to-red-500'
  },
  {
    name: 'Sunita Rao',
    title: 'Director',
    company: 'Bangalore Credit Solutions',
    text: 'Transparent pricing, comprehensive features, and outstanding support. LoanPro is hands down the best loan management platform we\'ve ever used.',
    rating: 5,
    avatar: '👩🏽',
    gradient: 'from-red-500 to-orange-500'
  },
  {
    name: 'Vikram Singh',
    title: 'Managing Partner',
    company: 'Rajasthan Money Lenders',
    text: 'The analytics and reporting features have transformed how we make business decisions. Real-time insights help us stay ahead of the competition.',
    rating: 5,
    avatar: '👨🏽',
    gradient: 'from-orange-500 to-yellow-500'
  },
  {
    name: 'Meera Krishnan',
    title: 'Founder',
    company: 'Chennai Quick Loans',
    text: 'Implementation was seamless and the ROI was immediate. Our loan processing time has reduced from days to hours. Absolutely phenomenal!',
    rating: 5,
    avatar: '👩�‍💼',
    gradient: 'from-yellow-500 to-green-500'
  }
];

const CustomerReviewsSection = () => (
  <section className="relative py-24 overflow-hidden" id="reviews">
    {/* Background Elements */}
    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
    <div className="absolute top-1/4 right-0 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
    <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
    
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="text-center mb-20">
        <div className="inline-flex items-center space-x-2 bg-white/30 backdrop-blur-sm border border-white/40 rounded-full px-6 py-2 mb-6">
          <StarIcon className="w-5 h-5 text-yellow-500" />
          <span className="text-blue-600 font-semibold">Customer Stories</span>
        </div>
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
          Loved by 
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> 10,000+ Users</span>
        </h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          See how LoanPro has transformed loan management for businesses across India. 
          Join thousands of satisfied customers who trust us with their operations.
        </p>
        
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12">
          <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-6">
            <div className="text-3xl font-bold text-blue-600 mb-2">4.9/5</div>
            <div className="text-gray-600">Average Rating</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-6">
            <div className="text-3xl font-bold text-purple-600 mb-2">10,000+</div>
            <div className="text-gray-600">Happy Customers</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-6">
            <div className="text-3xl font-bold text-pink-600 mb-2">99.9%</div>
            <div className="text-gray-600">Uptime</div>
          </div>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        {reviews.map((review, idx) => (
          <div 
            key={idx} 
            className="group relative bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-8 hover:bg-white/30 transition-all duration-500 hover:scale-105 shadow-xl hover:shadow-2xl"
          >
            {/* Background Gradient on Hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${review.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-500`}></div>
            
            <div className="relative">
              {/* Quote Icon */}
              <div className="mb-6">
                <QuoteLeftIcon className="w-8 h-8 text-blue-400 opacity-50" />
              </div>
              
              {/* Rating */}
              <div className="flex items-center space-x-1 mb-4">
                {[...Array(review.rating)].map((_, i) => (
                  <StarIcon key={i} className="w-5 h-5 text-yellow-400" />
                ))}
              </div>
              
              {/* Review Text */}
              <p className="text-gray-700 mb-6 leading-relaxed italic">
                "{review.text}"
              </p>
              
              {/* Reviewer Info */}
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 bg-gradient-to-r ${review.gradient} rounded-full flex items-center justify-center text-2xl shadow-lg`}>
                  {review.avatar}
                </div>
                <div>
                  <div className="font-bold text-gray-900">{review.name}</div>
                  <div className="text-sm text-gray-600">{review.title}</div>
                  <div className="text-sm text-blue-600 font-medium">{review.company}</div>
                </div>
              </div>
            </div>

            {/* Hover Effect Border */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${review.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10 blur-xl`}></div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="text-center">
        <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-8 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Join Our Success Stories?
          </h3>
          <p className="text-gray-600 mb-6">
            Experience the difference that thousands of loan professionals have already discovered. 
            Start your journey with LoanPro today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              Start Free Trial
            </button>
            <button className="bg-white/30 hover:bg-white/40 text-gray-700 font-semibold px-8 py-3 rounded-xl border border-white/40 transition-all duration-300">
              View More Reviews
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-4">
            ⭐ Join 10,000+ satisfied customers • No credit card required
          </p>
        </div>
      </div>
    </div>
  </section>
);

export default CustomerReviewsSection; 