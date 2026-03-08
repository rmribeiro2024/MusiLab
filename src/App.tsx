import React from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import BancoPlanos from './components/BancoPlanos'
import ErrorBoundary from './components/ErrorBoundary'
import Toast from './components/Toast'
import OfflineBanner from './components/OfflineBanner'
import { ModalProvider, EstrategiasProvider, RepertorioProvider, AtividadesProvider, SequenciasProvider, HistoricoProvider, AnoLetivoProvider, CalendarioProvider, AplicacoesProvider, PlanosProvider, PlanejamentoTurmaProvider } from './contexts'

// ── TELA DE LOGIN ──
function LoginScreen({ onUsarSemLogin }: { onUsarSemLogin: () => void }) {
    const [loading, setLoading] = React.useState(false);
    const [erro, setErro] = React.useState('');
    const loginGoogle = async () => {
        setLoading(true); setErro('');
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
        });
        if (error) { setErro(error.message); setLoading(false); }
    };
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10 text-center">
                <div className="text-6xl mb-4">🎵</div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">MusiLab</h1>
                <p className="text-gray-500 mb-8">Criação e Planejamento Musical</p>
                <button onClick={loginGoogle} disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:border-indigo-400 hover:shadow-md text-gray-700 font-semibold py-4 px-6 rounded-2xl transition-all duration-200 disabled:opacity-60">
                    {loading ? <span className="text-xl">⏳</span> : (
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                    )}
                    {loading ? 'Entrando...' : 'Entrar com Google'}
                </button>
                {erro && <p className="text-red-500 text-sm mt-4">{erro}</p>}

                {/* Separador */}
                <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">ou</span>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Botão usar sem login */}
                <button onClick={onUsarSemLogin}
                    className="w-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-500 font-medium py-3 px-6 rounded-2xl transition-all duration-200 text-sm">
                    Usar sem login (modo local)
                </button>
                <p className="text-xs text-gray-400 mt-3">Dados salvos apenas neste dispositivo. Sem sincronização na nuvem.</p>

                <p className="text-xs text-gray-400 mt-6">Seus dados ficam salvos na nuvem e acessíveis em qualquer dispositivo.</p>
            </div>
        </div>
    );
}

export default function App() {
  const [session, setSession] = React.useState<Session | null | undefined>(undefined);
  const [modoLocal, setModoLocal] = React.useState(false);

  React.useEffect(() => {
    // Timeout de 8s: se o Supabase não responder, mostra a tela de login
    const timeout = setTimeout(() => {
      if (session === undefined) setSession(null);
    }, 8000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
    }).catch(() => {
      clearTimeout(timeout);
      setSession(null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  if (session === undefined) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="text-5xl mb-4">🎵</div>
        <p className="text-indigo-200">Carregando MusiLab...</p>
      </div>
    </div>
  );

  if (!session && !modoLocal) return <LoginScreen onUsarSemLogin={() => setModoLocal(true)} />;

  const userId = session?.user?.id ?? '';

  return (
    <ModalProvider>
      <EstrategiasProvider userId={userId}>
        <RepertorioProvider userId={userId}>
          <AtividadesProvider userId={userId}>
            <SequenciasProvider userId={userId}>
              <HistoricoProvider>
                <AnoLetivoProvider userId={userId}>
                  <CalendarioProvider>
                    <AplicacoesProvider userId={userId}>
                    <PlanosProvider userId={userId}>
                      <PlanejamentoTurmaProvider userId={userId}>
                        <ErrorBoundary modulo="MusiLab">
                          <BancoPlanos session={session ?? null} />
                        </ErrorBoundary>
                        <Toast />
                        <OfflineBanner />
                      </PlanejamentoTurmaProvider>
                    </PlanosProvider>
                    </AplicacoesProvider>
                  </CalendarioProvider>
                </AnoLetivoProvider>
              </HistoricoProvider>
            </SequenciasProvider>
          </AtividadesProvider>
        </RepertorioProvider>
      </EstrategiasProvider>
    </ModalProvider>
  );
}
