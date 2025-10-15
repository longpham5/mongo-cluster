"use client";

import { useState } from "react";
import Link from "next/link";
import { randomMail } from "@/lib/random";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
import CopyButton from "@/components/client/copy-button";

interface HomeInputProps {
  emailValue: string;
  serverDomains: string[];
  serverDefaultDomain: string;
}

export default function HomeInput({ 
  emailValue,
  serverDomains,
  serverDefaultDomain 
}: HomeInputProps) {
  // Parse initial email
  const parseEmail = (email: string) => {
    if (email.includes("@")) {
      const [local, dom] = email.split("@");
      return {
        localPart: local,
        domain: serverDomains.includes(dom) ? dom : serverDefaultDomain,
      };
    }
    return {
      localPart: email || randomMail(),
      domain: serverDefaultDomain,
    };
  };

  const { localPart: initialLocal, domain: initialDomain } = parseEmail(emailValue);

  const [localPart, setLocalPart] = useState<string>(initialLocal);
  const [domain, setDomain] = useState<string>(initialDomain);

  const fullEmail = `${localPart}@${domain}`;

  const regenerateEmail = () => {
    setLocalPart(randomMail());
  };

  const handleLocalPartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // If user pastes full email, parse it
    if (value.includes("@")) {
      const [local, userDomain] = value.split("@");
      setLocalPart(local);
      
      // Update domain if it's valid
      if (userDomain && serverDomains.includes(userDomain)) {
        setDomain(userDomain);
      }
    } else {
      setLocalPart(value);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    
    // If empty, generate random
    if (!value) {
      setLocalPart(randomMail());
    }
  };

  return (
    <section className="w-full">
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Email Username Input with @ separator */}
        <div className="flex-grow flex items-stretch rounded-lg border border-slate-300 bg-white shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition overflow-hidden">
          {/* User input */}
          <input
            value={localPart}
            onChange={handleLocalPartChange}
            onBlur={handleBlur}
            placeholder="your-email"
            type="text"
            className="flex-1 h-10 px-3 border-0 bg-transparent text-slate-800 text-sm focus:outline-none focus:ring-0 placeholder:text-slate-400"
          />
          
          <div className="flex items-center px-3 bg-slate-50 text-slate-600 font-medium border-l border-slate-200">
            @
          </div>
          
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="px-3 border-0 bg-transparent text-slate-800 text-sm font-medium 
                      focus:outline-none focus:ring-0 cursor-pointer hover:bg-slate-50 transition-colors
                      appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem'
            }}
          >
            {serverDomains.map((d) => (
              <option key={d} value={d} className="rounded-lg py-2">
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={regenerateEmail}
            size="icon"
            variant="outline"
            type="button"
            aria-label="Regenerate Email"
            title="Regenerate Email"
            className="bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-700 hover:border-indigo-300 transition-colors"
          >
            <RefreshCwIcon className="h-4 w-4" />
          </Button>
          
          <CopyButton
            text={fullEmail}
            className="bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-700 hover:border-indigo-300 transition-colors"
          />
        </div>
      </div>

      {/* Full Email Display */}
      <div className="mt-2 text-xs sm:text-sm text-slate-600 bg-slate-50 rounded-md px-3 py-2 truncate">
        {fullEmail}
      </div>

      {/* Get Mail Button */}
      <Link href={`/${fullEmail}`} title="Get mail now">
        <Button
          className="mt-2 w-full text-background"
          type="button"
          aria-label="Get mail now"
        >
          Get mail now!
        </Button>
      </Link>
    </section>
  );
}