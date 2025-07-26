import type { FC } from 'react';
import { Link } from 'react-router-dom';

interface FooterProps {
  className?: string;
}

const Footer: FC<FooterProps> = ({ className = '' }) => {
  return (
    <footer className={`bg-white border-t border-gray-200 ${className}`}>
      <div className="container mx-auto px-4 py-12">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
          
          {/* Kemi Crypto Info */}
          <div className="col-span-1 md:col-span-2 text-left">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-black text-left">Kemi Crypto</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed max-w-md text-left">
              Advancing cryptocurrency analytics through rigorous data methodology and 
              ethical innovation. Building safer crypto systems for a better financial future.
            </p>
            <div className="flex space-x-4 justify-start">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="text-gray-400 hover:text-gray-600 transition-colors">
                {/* Twitter Icon */}
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775..." />
                </svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-gray-400 hover:text-gray-600 transition-colors">
                {/* LinkedIn Icon */}
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569..." />
                </svg>
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="text-gray-400 hover:text-gray-600 transition-colors">
                {/* GitHub Icon */}
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373..." />
                </svg>
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase">Navigation</h4>
            <ul className="space-y-3">
              <li><Link to="/" className="text-sm text-gray-600 hover:text-gray-900">Home</Link></li>
              <li><Link to="/learn-more" className="text-sm text-gray-600 hover:text-gray-900">About Us</Link></li>
              <li><a href="https://www.coingecko.com/en/api" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-gray-900">Contact</a></li>
            </ul>
          </div>

          {/* Company Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase">Company</h4>
            <ul className="space-y-3">
              <li><Link to="/learn-more" className="text-sm text-gray-600 hover:text-gray-900">About Us</Link></li>
              <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900">Careers</a></li>
              <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900">Contact Us</a></li>
              <li><a href="#" className="text-sm text-gray-600 hover:text-gray-900">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase">Resources</h4>
            <ul className="space-y-3">
              <li><a href="https://www.coingecko.com/en/api" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-gray-900">Datasets</a></li>
              <li><a href="https://www.coingecko.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-gray-900">Careers</a></li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="border-t border-gray-200 pt-8 mb-8">
          <div className="max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Stay Updated</h3>
            <p className="text-sm text-gray-600 mb-4">
              Subscribe to our newsletter for updates and insights from our team.
            </p>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Kemi Crypto. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-2 md:mt-0">
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900">Privacy Policy</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900">Terms of Use</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;