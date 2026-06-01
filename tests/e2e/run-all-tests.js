/**
 * Script para rodar todos os testes E2E
 * Executa testes da clínica e do paciente em sequência
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

console.log('🚀 INICIANDO TESTES E2E COMPLETOS\n');
console.log(`📍 URL de teste: ${BASE_URL}\n`);
console.log('=' .repeat(60));

async function runTests() {
  try {
    // Teste 1: Fluxo da Clínica
    console.log('\n🏥 TESTE 1: FLUXO DA CLÍNICA');
    console.log('=' .repeat(60));
    
    const { stdout: clinicOutput, stderr: clinicError } = await execPromise(
      'node tests/e2e/clinic-flow.test.js',
      { env: { ...process.env, TEST_URL: BASE_URL } }
    );
    
    console.log(clinicOutput);
    if (clinicError) console.error(clinicError);
    
    // Teste 2: Fluxo do Paciente
    console.log('\n👤 TESTE 2: FLUXO DO PACIENTE');
    console.log('=' .repeat(60));
    
    const { stdout: patientOutput, stderr: patientError } = await execPromise(
      'node tests/e2e/patient-flow.test.js',
      { env: { ...process.env, TEST_URL: BASE_URL } }
    );
    
    console.log(patientOutput);
    if (patientError) console.error(patientError);
    
    // Resumo
    console.log('\n' + '=' .repeat(60));
    console.log('✅ TODOS OS TESTES CONCLUÍDOS!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n❌ ERRO AO EXECUTAR TESTES:');
    console.error(error.message);
    process.exit(1);
  }
}

runTests();
