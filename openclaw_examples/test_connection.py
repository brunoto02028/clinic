#!/usr/bin/env python3
"""
BPR.rehab - OpenClaw Connection Test
Testa conexão com a API e valida permissões
"""

import os
import requests
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

API_KEY = os.getenv('BPR_API_KEY', 'bpr_agent_17e9c3e46dc5fc154d5a5d132d09c2b6cd3f327f543a1b0080558ccfec9c5aae')
BASE_URL = os.getenv('BPR_BASE_URL', 'https://bpr.rehab/api/agent')

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def test_connection():
    """Testa conexão com a API BPR"""
    print("=" * 60)
    print("🔍 TESTE DE CONEXÃO - BPR.REHAB API")
    print("=" * 60)
    print(f"\nURL Base: {BASE_URL}")
    print(f"API Key: {API_KEY[:20]}...{API_KEY[-10:]}\n")
    
    # Teste 1: Buscar leads
    print("-" * 60)
    print("📊 Teste 1: Buscar Leads Novos")
    print("-" * 60)
    try:
        response = requests.get(
            f"{BASE_URL}/leads?status=new&daysAgo=30&limit=5",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCESSO! Encontrados {data['total']} leads")
            if data['leads']:
                print("\nPrimeiros leads:")
                for lead in data['leads'][:3]:
                    print(f"  • {lead['name']} ({lead['email']})")
                    print(f"    Status: {lead['status']} | Criado: {lead['createdAt'][:10]}")
            else:
                print("  (Nenhum lead novo nos últimos 30 dias)")
        else:
            print(f"❌ ERRO {response.status_code}")
            print(f"Resposta: {response.text[:200]}")
    except Exception as e:
        print(f"❌ ERRO NA CONEXÃO: {e}")
    
    print()
    
    # Teste 2: Buscar pacientes
    print("-" * 60)
    print("👥 Teste 2: Buscar Pacientes")
    print("-" * 60)
    try:
        response = requests.get(
            f"{BASE_URL}/patients?limit=5",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCESSO! Encontrados {data['total']} pacientes")
            if data['patients']:
                print("\nPrimeiros pacientes:")
                for patient in data['patients'][:3]:
                    print(f"  • {patient['name']}")
                    print(f"    Email: {patient['email']}")
                    print(f"    Consultas: {patient['totalAppointments']}")
            else:
                print("  (Nenhum paciente encontrado)")
        else:
            print(f"❌ ERRO {response.status_code}")
            print(f"Resposta: {response.text[:200]}")
    except Exception as e:
        print(f"❌ ERRO NA CONEXÃO: {e}")
    
    print()
    print("=" * 60)
    print("✅ TESTES CONCLUÍDOS!")
    print("=" * 60)
    print()

if __name__ == "__main__":
    test_connection()
