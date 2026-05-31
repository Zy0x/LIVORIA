function ShieldIcon() {
  return (
    <svg aria-hidden="true" className="h-8 w-8 text-primary-foreground" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24">
      <path
        d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <rect height="16" rx="2" stroke="currentColor" strokeWidth="2" width="20" x="2" y="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24">
      <rect height="11" rx="2" stroke="currentColor" strokeWidth="2" width="18" x="3" y="11" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function ChromeIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M21.17 8H12M3.95 6.06 8.54 14M10.88 21.94 15.46 14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function AuthStaticShell() {
  return (
    <main
      aria-labelledby="livoria-auth-static-title"
      className="min-h-screen bg-background p-4"
      id="livoria-auth-static-shell"
    >
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
              <ShieldIcon />
            </div>
            <h1 id="livoria-auth-static-title" className="font-display text-3xl font-bold tracking-tight text-foreground">
              LIVORIA
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Living Information & Organized Records Archive</p>
          </div>

          <div className="glass-card p-8">
            <div className="mb-6 flex rounded-lg bg-muted p-1">
              <button className="flex-1 rounded-md bg-card py-2.5 text-sm font-medium text-foreground shadow-sm" type="button">
                Masuk
              </button>
              <button className="flex-1 rounded-md py-2.5 text-sm font-medium text-muted-foreground" type="button">
                Daftar
              </button>
            </div>

            <form className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="auth-static-email">
                  Email
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">
                    <MailIcon />
                  </span>
                  <input
                    className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm"
                    id="auth-static-email"
                    placeholder="email@contoh.com"
                    readOnly
                    type="email"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="auth-static-password">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">
                    <LockIcon />
                  </span>
                  <input
                    className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-12 text-sm"
                    id="auth-static-password"
                    placeholder="********"
                    readOnly
                    type="password"
                  />
                </div>
              </div>

              <button className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20" type="button">
                Masuk
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Atau lanjut dengan</span>
              </div>
            </div>

            <button className="flex w-full items-center justify-center gap-3 rounded-lg border border-input bg-background py-2.5 text-sm font-medium" type="button">
              <ChromeIcon />
              Google Account
            </button>

            <div className="mt-6 border-t border-border/50 pt-4">
              <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
                Dengan masuk, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi kami.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
