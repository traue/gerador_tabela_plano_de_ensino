# Gerador de Tabela de Plano de Ensino

Pequena aplicação web para ajudar professores a montar a tabela do plano de
ensino a partir do número de semanas, da data de início e dos dias de aula.

**Live:** [AQUI](https://link.traue.com.br/geradorplano)

## Funcionalidades

- **Identificação do plano:** disciplina, professor(a), turma e semestre, que
  aparecem no topo da tabela e na exportação.
- **Geração da tabela** por semana, com a coluna "Semana" mesclada por grupo.
- **Numeração de aulas:** coluna "Aula" sequencial e total de aulas (feriados
  não são contabilizados).
- **Disciplina híbrida (EaD):** adiciona uma linha de EaD por semana.
- **Feriados nacionais automáticos:** datas de aula que caem em feriados são
  pré-preenchidas. Os feriados (fixos e móveis, como Carnaval, Sexta-feira Santa
  e Corpus Christi) são calculados em tempo de execução, então valem para
  qualquer ano.
- **Restrições e feriados adicionais:** cadastre intervalos (ex.: semana de
  provas) via modal, com opção de editar; marcados como feriado (estadual ou
  municipal), não contam como aula.
- **Salvamento automático:** configuração e conteúdo digitado são guardados no
  navegador (`localStorage`) e restaurados ao reabrir a página, com indicador
  visual de salvamento.
- **Reordenar conteúdo:** arraste a alça (⠿) para mover o conteúdo entre datas.
- **Tema claro/escuro:** alternável e lembrado entre sessões.
- **Resetar tudo:** limpa o plano salvo, com confirmação via modal.
- **Exportação para Excel** (`.xlsx`) via [SheetJS](https://sheetjs.com/).

## Estrutura

| Arquivo          | Responsabilidade                                            |
| ---------------- | ---------------------------------------------------------- |
| `index.html`     | Estrutura da página, formulário e modais.                  |
| `style.css`      | Estilos (design tokens, layout, tabela e modais).          |
| `js/feriados.js` | Cálculo dos feriados nacionais (expõe `obterFeriado`).     |
| `js/script.js`   | Geração da tabela, restrições, salvamento e exportação.    |

É um projeto estático: basta abrir o `index.html` no navegador.

Fique à vontade para contribuir para este projeto!
