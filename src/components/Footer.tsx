export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-6 text-sm text-slate-500">
      <div className="mx-auto max-w-6xl px-4">

        {/* TOP ROW */}
        <div className="flex items-center justify-center gap-4">

          <p className="whitespace-nowrap">
            © {new Date().getFullYear()} SectorSafe - v1.5.0
          </p>

          {/* Social Icons */}
          <div className="flex items-center gap-4">

            {/* Instagram */}
            <a
              href="https://www.instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-slate-500 transition-colors hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                fill="currentColor" className="h-5 w-5">
                <path d="M7 2C4.239 2 2 4.239 2 7v10c0 2.761 2.239 5 5 5h10c2.761 0 5-2.239 5-5V7c0-2.761-2.239-5-5-5H7zm10 2a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3h10zm.5 1.5a1 1 0 100 2 1 1 0 000-2zM12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z" />
              </svg>
            </a>

            {/* YouTube */}
            <a
              href="https://www.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="text-slate-500 transition-colors hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                fill="currentColor" className="h-5 w-5">
                <path d="M23.5 6.2a2.9 2.9 0 00-2-2C19.8 3.7 12 3.7 12 3.7s-7.8 0-9.5.5a2.9 2.9 0 00-2 2C0 8 0 12 0 12s0 4 .5 5.8a2.9 2.9 0 002 2c1.7.5 9.5.5 9.5.5s7.8 0 9.5-.5a2.9 2.9 0 002-2C24 16 24 12 24 12s0-4-.5-5.8zM10 15.5v-7l6 3.5-6 3.5z" />
              </svg>
            </a>

            {/* GitHub */}
            <a
              href="https://github.com/aarmaanpahuja-sudo/VexGrid"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-slate-500 transition-colors hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                fill="currentColor" className="h-5 w-5">
                <path d="M12 .5A12 12 0 000 12.7c0 5.4 3.4 10 8.2 11.6.6.1.8-.3.8-.6v-2.3c-3.3.7-4-1.6-4-1.6-.6-1.5-1.4-1.9-1.4-1.9-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.3 1.8 1.3 1.1 1.9 2.9 1.4 3.6 1.1.1-.8.4-1.4.8-1.7-2.7-.3-5.5-1.4-5.5-6.2 0-1.4.5-2.5 1.3-3.4-.1-.3-.6-1.6.1-3.3 0 0 1.1-.4 3.5 1.3a11.8 11.8 0 016.4 0c2.4-1.7 3.5-1.3 3.5-1.3.7 1.7.2 3 .1 3.3.8.9 1.3 2 1.3 3.4 0 4.8-2.8 5.9-5.5 6.2.4.4.9 1.1.9 2.3v3.4c0 .3.2.7.8.6A12.2 12.2 0 0024 12.7 12 12 0 0012 .5z" />
              </svg>
            </a>

          </div>
        </div>

        {/* DESKTOP ONLY TAGLINE */}
        <p className="mt-2 hidden text-center text-xs sm:block">
          "Connecting Communities. Protecting Neighbors."
        </p>

      </div>
    </footer>
  );
}
