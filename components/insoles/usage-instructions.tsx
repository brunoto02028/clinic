"use client";

/**
 * Instruções de Uso das Palmilhas
 * Guia simples e visual para o paciente
 */

import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { useState } from 'react';

export function UsageInstructions() {
  const [activeTab, setActiveTab] = useState<'uso' | 'cuidados' | 'avisos'>('uso');
  
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('uso')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'uso'
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Como Usar
        </button>
        <button
          onClick={() => setActiveTab('cuidados')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'cuidados'
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Cuidados
        </button>
        <button
          onClick={() => setActiveTab('avisos')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'avisos'
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Avisos
        </button>
      </div>
      
      {/* Conteúdo */}
      <div className="space-y-4">
        {activeTab === 'uso' && (
          <div className="space-y-4">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-teal-900">Período de Adaptação</p>
                  <p className="text-sm text-teal-700 mt-1">
                    É normal sentir um leve desconforto nos primeiros 3-5 dias. Seu corpo está se adaptando à nova postura.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Passo a Passo:</h4>
              
              {[
                {
                  step: 1,
                  title: 'Primeiro Dia',
                  description: 'Use por 1-2 horas apenas. Escolha um calçado confortável.',
                },
                {
                  step: 2,
                  title: 'Dias 2-3',
                  description: 'Aumente para 3-4 horas por dia. Observe como seus pés se sentem.',
                },
                {
                  step: 3,
                  title: 'Dias 4-7',
                  description: 'Use durante todo o dia, mas tire à noite para descansar.',
                },
                {
                  step: 4,
                  title: 'Após 1 Semana',
                  description: 'Use normalmente durante todas as atividades.',
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 p-4 bg-white border rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold">
                    {item.step}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{item.title}</h5>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Dica Importante</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Use as palmilhas em calçados com espaço suficiente. Tênis esportivos são ideais para começar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'cuidados' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Limpeza e Manutenção:</h4>
              
              <div className="grid gap-3">
                {[
                  {
                    icon: '🧼',
                    title: 'Limpeza Regular',
                    description: 'Limpe com pano úmido e sabão neutro. Seque ao ar livre.',
                    frequency: 'Semanal',
                  },
                  {
                    icon: '💧',
                    title: 'Evite Água Quente',
                    description: 'Não lave em máquina ou use água quente. Pode deformar.',
                    frequency: 'Sempre',
                  },
                  {
                    icon: '☀️',
                    title: 'Secagem',
                    description: 'Seque à sombra. Nunca em secadora ou sol direto.',
                    frequency: 'Após limpeza',
                  },
                  {
                    icon: '👟',
                    title: 'Rotação',
                    description: 'Se possível, tenha 2 pares para alternar diariamente.',
                    frequency: 'Recomendado',
                  },
                ].map((item, index) => (
                  <div key={index} className="flex gap-4 p-4 bg-white border rounded-lg">
                    <div className="text-3xl flex-shrink-0">{item.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h5 className="font-medium text-gray-900">{item.title}</h5>
                        <span className="text-xs text-teal-600 font-medium">{item.frequency}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">Durabilidade</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Com cuidados adequados, suas palmilhas duram 12-18 meses. Sinais de desgaste incluem perda de suporte ou rachaduras.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'avisos' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-3">
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Quando Parar de Usar</p>
                  <p className="text-sm text-red-700 mt-1">
                    Se sentir dor intensa, dormência ou desconforto que não melhora após 1 semana, pare de usar e entre em contato.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Sinais de Alerta:</h4>
              
              <div className="grid gap-3">
                {[
                  {
                    icon: '🔴',
                    title: 'Dor Intensa',
                    description: 'Dor que piora ao invés de melhorar após 3-5 dias.',
                    action: 'Entre em contato imediatamente',
                  },
                  {
                    icon: '🟡',
                    title: 'Bolhas ou Feridas',
                    description: 'Formação de bolhas ou irritação na pele.',
                    action: 'Pare de usar e consulte',
                  },
                  {
                    icon: '🟡',
                    title: 'Dormência',
                    description: 'Sensação de dormência ou formigamento persistente.',
                    action: 'Consulte seu terapeuta',
                  },
                  {
                    icon: '🟢',
                    title: 'Desconforto Leve',
                    description: 'Leve desconforto nos primeiros dias é normal.',
                    action: 'Continue usando gradualmente',
                  },
                ].map((item, index) => (
                  <div key={index} className="flex gap-4 p-4 bg-white border rounded-lg">
                    <div className="text-2xl flex-shrink-0">{item.icon}</div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{item.title}</h5>
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      <p className="text-xs text-teal-600 font-medium mt-2">{item.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Dúvidas?</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Entre em contato conosco a qualquer momento. Estamos aqui para ajudar!
                  </p>
                  <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    Falar com Terapeuta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
