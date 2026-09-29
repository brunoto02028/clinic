/**
 * O Stripe nativo, atrás de uma porta que o web consegue abrir.
 *
 * `@stripe/stripe-react-native` importa `codegenNativeComponent`, que é interno
 * do React Native e **não existe no web**. Importá-lo direto de uma tela derruba
 * o bundle web inteiro — não a tela, o bundle:
 *
 * ```
 * Importing native-only module "react-native/Libraries/Utilities/codegenNativeComponent"
 *   node_modules/@stripe/stripe-react-native/.../NativeStripeContainer.js
 *   app/(app)/(clinica)/invoices.tsx
 * ```
 *
 * Isso quebrou o `eas update` de 29/09/2026 (iOS e Android empacotaram; o web
 * não) e, antes disso, impediu o QA de medir **qualquer** tela do app pelo
 * navegador em três tarefas seguidas — a 102 T-8, T-9 e T-10 saíram todas com
 * "a tela do app não foi medida". O diagnóstico corrente era cache do Metro, e
 * não era: era isto, todas as vezes.
 *
 * Aqui só existe o reexport. O arquivo irmão `stripe-nativo.web.ts` é o que o
 * Metro escolhe no web, e ele não toca no pacote nativo.
 */
export { StripeProvider, useStripe } from "@stripe/stripe-react-native";
