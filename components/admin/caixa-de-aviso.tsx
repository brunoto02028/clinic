"use client";

/**
 * "Avisar o paciente agora" — a caixa que nasce desmarcada.
 *
 * Atividade 104, 02/10/2026. A varredura achou treze botões do painel que
 * mandavam mensagem ao paciente como efeito colateral de outra coisa:
 * prescrever exercício, anexar documento ao prontuário, criar tarefa,
 * montar um pacote. A regra do Bruno: *"nenhum botao é pra disparar na hora
 * sem minha confirmação"*.
 *
 * As rotas passaram a exigir `notify` explícito — ausência é **não**. Esta
 * é a contrapartida na tela, e ela existe num arquivo só de propósito: nove
 * cópias divergem na primeira semana, e a que divergir vai ser a que nasce
 * marcada.
 */
export function CaixaDeAviso({
  marcada,
  aoMudar,
  /** O que o texto explica que vai acontecer. O padrão serve para a maioria. */
  titulo = "Tell the patient now",
  /** Por que está desligado — some quando a explicação não ajuda. */
  explicacao = "Off by default. Tick this to let them know straight away.",
  /** Para o plural: "Tell 3 patients now". */
  className = "",
  disabled = false,
}: {
  marcada: boolean;
  aoMudar: (v: boolean) => void;
  titulo?: string;
  explicacao?: string | null;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-2.5 rounded-md border border-border/60 bg-muted/30 px-3 py-2.5 text-sm select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${className}`}
    >
      <input
        type="checkbox"
        checked={marcada}
        disabled={disabled}
        onChange={(e) => aoMudar(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-current"
      />
      <span>
        <span className="font-medium">{titulo}</span>
        {explicacao && (
          <span className="block text-xs text-muted-foreground">{explicacao}</span>
        )}
      </span>
    </label>
  );
}
