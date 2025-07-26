import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      {/* Gradient Animation Keyframes */}
      <style>{`
        @keyframes gradientMove {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>

      <header className="sticky top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200/60 z-40 shadow-sm">
        <nav className="w-full px-6 sm:px-10 lg:px-20">
          <div className="max-w-[1600px] mx-auto flex justify-between items-center h-20">

            {/* Logo with Animated Gradient */}
            <Link
              to="/"
              className="text-2xl font-bold bg-gradient-to-r from-black via-gray-600 to-gray-300 bg-clip-text text-transparent bg-[length:200%_200%] animate-gradientMove duration-5000 ease-linear infinite"
            >
              Kemi Crypto
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <a
                href="https://x.com/chumba_24"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 bg-[length:200%_200%] animate-gradientMove duration-5000 ease-linear infinite text-white text-sm font-medium rounded-lg transition-transform transform hover:scale-105"
              >
                Chumba_24
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              className="md:hidden flex flex-col justify-center items-center w-8 h-8 space-y-1.5"
              aria-label="Toggle mobile menu"
            >
              <span
                className={`block w-6 h-0.5 bg-gray-700 transition-transform duration-300 ${
                  isMenuOpen ? 'rotate-45 translate-y-2' : ''
                }`}
              ></span>
              <span
                className={`block w-6 h-0.5 bg-gray-700 transition-opacity duration-300 ${
                  isMenuOpen ? 'opacity-0' : ''
                }`}
              ></span>
              <span
                className={`block w-6 h-0.5 bg-gray-700 transition-transform duration-300 ${
                  isMenuOpen ? '-rotate-45 -translate-y-2' : ''
                }`}
              ></span>
            </button>

          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-md border-b border-gray-200/60 shadow-lg">
              <div className="px-4 py-6 space-y-3">
                <Link
                  to="/"
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-4 py-3 text-base font-medium rounded-lg transition-all duration-200 mx-4 ${
                    isActive('/')
                      ? 'text-black bg-gray-50/80'
                      : 'text-gray-700 hover:text-black hover:bg-gray-100/60'
                  }`}
                >
                  Home
                </Link>

                <div className="px-4 pt-4">
                  <a
                    href="https://x.com/chumba_24"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-4 py-2 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 bg-[length:200%_200%] animate-gradientMove duration-5000 ease-linear infinite text-white text-sm font-medium rounded-lg transition-transform transform hover:scale-105"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Chumba_24
                  </a>
                </div>
              </div>
            </div>
          )}
        </nav>
      </header>
    </>
  );
};

export default Header;
