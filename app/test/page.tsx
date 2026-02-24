'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Card className="w-[450px] shadow-xl border-slate-200 dark:border-slate-800 backdrop-blur-sm bg-white/50 dark:bg-slate-900/50">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Clinic Test Page
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Esta é uma página de teste para verificar se o ambiente está funcionando corretamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-100 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
              O ambiente Next.js foi configurado com sucesso. Você pode começar a desenvolver novas funcionalidades.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
              <span className="block text-2xl font-bold text-slate-900 dark:text-white">Next.js</span>
              <span className="text-xs text-slate-500">v14.2.28</span>
            </div>
            <div className="p-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
              <span className="block text-2xl font-bold text-slate-900 dark:text-white">React</span>
              <span className="text-xs text-slate-500">v18.2.0</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
          <Button variant="outline" onClick={() => window.history.back()}>
            Voltar
          </Button>
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all duration-200">
            Continuar
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
