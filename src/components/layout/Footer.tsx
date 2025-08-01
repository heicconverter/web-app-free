import React from 'react';

export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export interface FooterProps {
  sections?: FooterSection[];
  copyright?: string;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({
  sections = [],
  copyright = `© ${new Date().getFullYear()} HEIC Converter. All rights reserved.`,
  className = '',
}) => {
  return (
    <footer className={`bg-gray-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {sections.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {sections.map((section, index) => (
              <div key={index}>
                <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
                  {section.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a
                        href={link.href}
                        target={link.external ? '_blank' : undefined}
                        rel={link.external ? 'noopener noreferrer' : undefined}
                        className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        {link.label}
                        {link.external && (
                          <svg
                            className="inline-block w-3 h-3 ml-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        
        <div className="border-t border-gray-200 pt-8">
          <p className="text-sm text-gray-500 text-center">
            {copyright}
          </p>
        </div>
      </div>
    </footer>
  );
};

export interface SimpleFooterProps {
  text?: string;
  links?: FooterLink[];
  className?: string;
}

export const SimpleFooter: React.FC<SimpleFooterProps> = ({
  text = `© ${new Date().getFullYear()} HEIC Converter`,
  links = [],
  className = '',
}) => {
  return (
    <footer className={`bg-white border-t border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <p className="text-sm text-gray-500">
            {text}
          </p>
          
          {links.length > 0 && (
            <nav className="flex space-x-6">
              {links.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noopener noreferrer' : undefined}
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          )}
        </div>
      </div>
    </footer>
  );
};