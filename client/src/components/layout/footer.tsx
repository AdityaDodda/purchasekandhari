import React from "react";
import { Mail, MapPin } from "lucide-react";
import { SiLinkedin, SiFacebook, SiInstagram, SiGithub } from "react-icons/si";

export function Footer() {
  return (
    <footer className="bg-[hsl(207,90%,54%)] text-white py-4 px-6 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-6">

        {/* Left: Company Info */}
        <div>
          <h2 className="text-xl font-bold mb-2">KGBPL</h2>
          {/* <p className="text-sm leading-snug">
            Empowering businesses with seamless solutions.
          </p> */}
          <div className="mt-2 text-sm space-y-1.5">
            <div className="flex items-center">
              <Mail className="h-4 w-4 mr-2" />
              <span>helpdesk@kgbpl.in</span>
            </div>
          </div>
        </div>

        {/* Right: Social Media */}
        {/* <div className="self-end md:self-start text-right">
          <h3 className="text-base font-semibold mb-2">Follow Us</h3>
          <div className="flex justify-end space-x-3 text-white text-lg">
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
              <SiLinkedin className="hover:text-gray-300 transition" />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
              <SiFacebook className="hover:text-gray-300 transition" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
              <SiInstagram className="hover:text-gray-300 transition" />
            </a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
              <SiGithub className="hover:text-gray-300 transition" />
            </a>
          </div>
        </div> */}
      </div>

      {/* Bottom Note */}
      <div className="border-t border-white/30 mt-6 pt-2 text-center text-xs text-white/80">
        &copy; {new Date().getFullYear()} KGBPL. All rights reserved.
      </div>
    </footer>
  );
}