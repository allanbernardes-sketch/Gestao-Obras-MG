import React, { useState } from 'react';
import { HardHat, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { PerfilUsuario } from '../types';
import { supabase } from '../lib/supabase';

interface LoginScreenProps {
  onLogin: (perfil: PerfilUsuario, nome: string, usuarioId: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail]               = useState('');
  const [senha, setSenha]               = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro]                 = useState('');
  const [loading, setLoading]           = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });

    if (error) {
      setErro('E-mail ou senha inválidos. Verifique suas credenciais.');
      setLoading(false);
      return;
    }

    const { data: usuario, error: erroUsuario } = await supabase
      .from('usuarios')
      .select('nome, perfis(codigo)')
      .eq('id', data.user.id)
      .single();

    if (erroUsuario || !usuario) {
      setErro('Usuário autenticado mas sem perfil cadastrado. Contate o administrador.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    const perfil = (usuario.perfis as unknown as { codigo: string }).codigo as PerfilUsuario;
    onLogin(perfil, usuario.nome as string, data.user.id);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f1f3d] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <HardHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sistema de Gestão de Obras</h1>
          <p className="text-slate-400 text-sm mt-1">SEE-MG / DORE — Acesso Institucional</p>
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Entrar no sistema</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                E-mail Institucional
              </label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@educacao.mg.gov.br"
                required
                autoComplete="username"
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition pr-12"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {erro && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#13264d] hover:bg-[#1a3060] active:bg-[#0f1f3d] text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-2"
            >
              {loading
                ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <LogIn className="w-4 h-4" />
              }
              {loading ? 'Autenticando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-[10px] mt-6">
          © 2026 Secretaria de Estado de Educação de Minas Gerais — DORE
        </p>
      </div>
    </div>
  );
}
