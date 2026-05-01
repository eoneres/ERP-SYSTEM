import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acesso',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left — branding panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-[#0F172A] flex-col justify-between overflow-hidden p-12">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Glow orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary-600/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 rounded-full bg-secondary-600/20 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center shadow-glow-primary">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">
              ERP<span className="text-primary-400">System</span>
            </span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Gestão completa
              <br />
              <span className="gradient-text">do seu negócio</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-md">
              Financeiro, estoque, vendas e RH em uma única plataforma. Simples como deve ser.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {['Financeiro', 'Estoque', 'Vendas', 'RH', 'Relatórios'].map((f) => (
              <span
                key={f}
                className="px-3 py-1 rounded-full text-xs font-medium border border-white/10 bg-white/5 text-slate-300"
              >
                {f}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            {[
              { label: 'Empresas', value: '2.4k+' },
              { label: 'Transações/dia', value: '180k' },
              { label: 'Uptime', value: '99.9%' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-slate-600 text-xs">
            © {new Date().getFullYear()} ERP System. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[var(--bg)]">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
