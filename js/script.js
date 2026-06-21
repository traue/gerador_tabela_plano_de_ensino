'use strict';

/**
 * Gerador de Tabela do Plano de Ensino
 *
 * Aplicação estática que monta uma tabela de aulas por semana a partir de uma
 * configuração simples (nº de semanas, data de início e dias da semana).
 * Recursos: pré-preenchimento de feriados e restrições de período, salvamento
 * automático no navegador e exportação para Excel.
 *
 * Depende de `feriados.js` (função global `obterFeriado`) e da biblioteca
 * SheetJS (`XLSX`), ambas carregadas antes deste arquivo.
 */

/* ============================================================
 * Utilitários de data
 * ============================================================ */

/** Formata uma data como 'dd/mm' (sem o ano), para exibição. */
function formatarDiaMes(date) {
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}`;
}

/** Formata uma data como 'yyyy-mm-dd' no fuso local (chave estável). */
function formatarISO(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Converte 'yyyy-mm-dd' em uma data no fuso local.
 * Evita o deslocamento de um dia causado por `new Date('yyyy-mm-dd')`, que é
 * interpretada como meia-noite em UTC.
 */
function parseLocalDate(str) {
  const [ano, mes, dia] = str.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/** Gera um inteiro comparável (yyyymmdd) a partir de uma data local. */
function ymd(date) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/* ============================================================
 * Restrições de período
 * ============================================================ */

const STORAGE_RESTRICOES = 'restricoesPlanoEnsino';

/** Lista de restrições em memória: { inicio, fim, descricao }. */
let restricoes = [];

/** Carrega as restrições do localStorage (ignora dados inválidos). */
function carregarRestricoes() {
  try {
    const dados = JSON.parse(localStorage.getItem(STORAGE_RESTRICOES));
    restricoes = Array.isArray(dados) ? dados : [];
  } catch (e) {
    restricoes = [];
  }
}

/** Persiste as restrições no localStorage. */
function salvarRestricoes() {
  try {
    localStorage.setItem(STORAGE_RESTRICOES, JSON.stringify(restricoes));
  } catch (e) {
    /* armazenamento indisponível: mantém apenas em memória */
  }
}

/** Retorna as descrições das restrições cujo período contém a data informada. */
function obterRestricoesDaData(data) {
  const chave = ymd(data);
  return restricoes
    .filter(r => ymd(parseLocalDate(r.inicio)) <= chave && chave <= ymd(parseLocalDate(r.fim)))
    .map(r => r.descricao);
}

/* ============================================================
 * Salvamento automático (configuração + conteúdo da tabela)
 * ============================================================ */

const STORAGE_ESTADO = 'planoEnsinoEstado';

/** Lê o conteúdo de todas as células da tabela, indexado pela chave da célula. */
function coletarConteudos() {
  const conteudos = {};
  document.querySelectorAll('#tableContainer textarea[data-cell]').forEach(ta => {
    conteudos[ta.dataset.cell] = ta.value;
  });
  return conteudos;
}

/** Salva o estado completo (formulário + conteúdos) no localStorage. */
function salvarEstado() {
  try {
    const estado = {
      config: {
        numSemanas: document.getElementById('numSemanas').value,
        dataInicio: document.getElementById('dataInicio').value,
        dias: Array.from(document.querySelectorAll('input[name="dias"]:checked'))
          .map(el => el.value),
        hybrid: document.getElementById('hybridCheckbox').checked
      },
      conteudos: coletarConteudos(),
      tabelaGerada: !!document.querySelector('#tableContainer table')
    };
    localStorage.setItem(STORAGE_ESTADO, JSON.stringify(estado));
  } catch (e) {
    /* armazenamento indisponível: segue apenas em memória */
  }
}

/** Recupera o estado salvo, ou null se não houver / for inválido. */
function carregarEstado() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_ESTADO));
  } catch (e) {
    return null;
  }
}

/** Apaga todo o estado salvo (plano + restrições) e recarrega a página. */
function resetarTudo() {
  try {
    localStorage.removeItem(STORAGE_ESTADO);
    localStorage.removeItem(STORAGE_RESTRICOES);
  } catch (e) {
    /* armazenamento indisponível */
  }
  location.reload();
}

/* ============================================================
 * Geração da tabela
 * ============================================================ */

/**
 * Agrupa as datas de aula por semana, a partir da configuração do formulário.
 * @returns {Object<number, Date[]>} mapa do nº da semana para suas datas.
 */
function agruparDatasPorSemana(dataInicio, numSemanas, diasSelecionados) {
  const semanas = {};
  for (let i = 0; i < numSemanas; i++) {
    const inicioSemana = new Date(dataInicio);
    inicioSemana.setDate(inicioSemana.getDate() + i * 7);

    for (let d = 0; d < 7; d++) {
      const dataAtual = new Date(inicioSemana);
      dataAtual.setDate(dataAtual.getDate() + d);

      // Ignora datas anteriores ao início, possíveis apenas na primeira semana
      if (i === 0 && dataAtual < dataInicio) continue;
      if (!diasSelecionados.includes(dataAtual.getDay())) continue;

      const diffDias = Math.floor((dataAtual - dataInicio) / 86400000);
      const semana = Math.floor(diffDias / 7) + 1;
      (semanas[semana] = semanas[semana] || []).push(dataAtual);
    }
  }
  return semanas;
}

/**
 * Monta o texto pré-preenchido de uma data (feriado e/ou restrições) e marca a
 * linha com as classes correspondentes. Retorna o texto (pode ser vazio).
 */
function montarAnotacoes(dataAula, tr) {
  const anotacoes = [];

  const feriado = obterFeriado(dataAula);
  if (feriado) {
    anotacoes.push('Feriado - ' + feriado);
    tr.classList.add('feriado');
  }

  const restricoesData = obterRestricoesDaData(dataAula);
  if (restricoesData.length > 0) {
    anotacoes.push(...restricoesData);
    tr.classList.add('restricao');
  }

  return anotacoes.join(' / ');
}

/** Gera (ou regenera) a tabela do plano de ensino. */
function gerarTabela(event) {
  if (event) event.preventDefault();

  const numSemanas = parseInt(document.getElementById('numSemanas').value, 10);
  const dataInicioInput = document.getElementById('dataInicio').value;
  if (!dataInicioInput) {
    alert('Por favor, informe a data de início.');
    return;
  }

  const diasSelecionados = Array.from(document.querySelectorAll('input[name="dias"]:checked'))
    .map(el => parseInt(el.value, 10));
  if (diasSelecionados.length === 0) {
    alert('Selecione ao menos um dia de aula.');
    return;
  }

  const dataInicio = parseLocalDate(dataInicioInput);
  const isHybrid = document.getElementById('hybridCheckbox').checked;
  const semanas = agruparDatasPorSemana(dataInicio, numSemanas, diasSelecionados);

  // ----- Monta a tabela -----
  const table = document.createElement('table');

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Semana', 'Data da Aula', 'Conteúdo'].forEach(texto => {
    const th = document.createElement('th');
    th.textContent = texto;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const semanasOrdenadas = Object.keys(semanas).map(Number).sort((a, b) => a - b);

  semanasOrdenadas.forEach(semana => {
    const datas = semanas[semana];
    // Total de linhas do grupo: uma por data, mais a linha de EaD se híbrida
    const totalRows = datas.length + (isHybrid ? 1 : 0);

    datas.forEach((dataAula, index) => {
      const tr = document.createElement('tr');

      // Primeira linha do grupo: célula da semana mesclada via rowspan
      if (index === 0) {
        const tdSemana = document.createElement('td');
        tdSemana.textContent = semana;
        tdSemana.rowSpan = totalRows;
        tdSemana.className = 'col-semana';
        tr.appendChild(tdSemana);
      }

      const tdData = document.createElement('td');
      tdData.textContent = formatarDiaMes(dataAula);
      tdData.className = 'col-data';
      tr.appendChild(tdData);

      const tdConteudo = document.createElement('td');
      tdConteudo.className = 'col-conteudo';
      const textarea = document.createElement('textarea');
      textarea.dataset.cell = formatarISO(dataAula);
      textarea.placeholder = 'Conteúdo para ' + formatarDiaMes(dataAula);
      textarea.value = montarAnotacoes(dataAula, tr);
      tdConteudo.appendChild(textarea);
      tr.appendChild(tdConteudo);

      tbody.appendChild(tr);
    });

    // Linha extra de EaD (uma por semana) quando a disciplina é híbrida
    if (isHybrid) {
      const trHybrid = document.createElement('tr');
      trHybrid.classList.add('ead');

      const tdEaD = document.createElement('td');
      tdEaD.textContent = 'EaD';
      tdEaD.className = 'col-data';
      trHybrid.appendChild(tdEaD);

      const tdConteudoEaD = document.createElement('td');
      tdConteudoEaD.className = 'col-conteudo';
      const textareaEaD = document.createElement('textarea');
      textareaEaD.dataset.cell = 'ead-' + semana;
      textareaEaD.placeholder = 'Conteúdo EaD para semana ' + semana;
      tdConteudoEaD.appendChild(textareaEaD);
      trHybrid.appendChild(tdConteudoEaD);

      tbody.appendChild(trHybrid);
    }
  });

  table.appendChild(tbody);

  const tableContainer = document.getElementById('tableContainer');
  tableContainer.innerHTML = '';
  tableContainer.appendChild(table);

  // Restaura o conteúdo salvo, preservando o que o usuário já havia digitado
  // (sobrepõe os pré-preenchimentos de feriados/restrições quando houver edição)
  const estado = carregarEstado();
  const salvos = (estado && estado.conteudos) || {};
  tableContainer.querySelectorAll('textarea[data-cell]').forEach(ta => {
    if (Object.prototype.hasOwnProperty.call(salvos, ta.dataset.cell)) {
      ta.value = salvos[ta.dataset.cell];
    }
  });

  document.getElementById('exportBtn').style.display = 'inline-block';
  salvarEstado();
}

/* ============================================================
 * Exportação para Excel (SheetJS)
 * ============================================================ */

function exportarParaExcel() {
  const table = document.querySelector('#tableContainer table');
  if (!table) {
    alert('Nenhuma tabela para exportar!');
    return;
  }

  // Clona a tabela e troca cada <textarea> pelo seu valor em texto, para que o
  // conteúdo digitado apareça na planilha (a tabela original fica intacta).
  const tableClone = table.cloneNode(true);
  tableClone.querySelectorAll('textarea').forEach(ta => {
    ta.parentNode.replaceChild(document.createTextNode(ta.value), ta);
  });

  const wb = XLSX.utils.table_to_book(tableClone, { sheet: 'Planilha' });
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plano_de_ensino.xlsx';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================================================
 * Modais (comportamento compartilhado)
 * ============================================================ */

/**
 * Configura abertura/fechamento de um modal: botão de abrir, fechar com Esc,
 * clique no fundo e botões de fechar adicionais. Retorna { abrir, fechar }.
 */
function configurarModal(overlay, { botaoAbrir, botoesFechar = [], aoAbrir } = {}) {
  function abrir() {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    if (aoAbrir) aoAbrir();
  }
  function fechar() {
    overlay.hidden = true;
    document.body.style.overflow = '';
  }

  if (botaoAbrir) botaoAbrir.addEventListener('click', abrir);
  botoesFechar.forEach(btn => btn && btn.addEventListener('click', fechar));
  overlay.addEventListener('click', e => {
    if (e.target === overlay) fechar();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.hidden) fechar();
  });

  return { abrir, fechar };
}

/* ============================================================
 * Modal de restrições
 * ============================================================ */

(function configurarModalRestricoes() {
  const overlay = document.getElementById('restricaoModal');
  const inputInicio = document.getElementById('restricaoInicio');
  const inputFim = document.getElementById('restricaoFim');
  const inputDescricao = document.getElementById('restricaoDescricao');
  const listaModal = document.getElementById('modalRestricoesList');
  const listaResumo = document.getElementById('restricoesResumo');

  configurarModal(overlay, {
    botaoAbrir: document.getElementById('abrirModal'),
    botoesFechar: [
      document.getElementById('fecharModal'),
      document.getElementById('concluirModal')
    ],
    aoAbrir: () => inputInicio.focus()
  });

  /** Cria o item de lista de uma restrição (descrição, período e remover). */
  function criarItem(restricao, index) {
    const li = document.createElement('li');
    li.className = 'restricao-item';

    const info = document.createElement('span');
    info.className = 'restricao-info';

    const desc = document.createElement('strong');
    desc.textContent = restricao.descricao;

    const periodo = document.createElement('span');
    periodo.className = 'restricao-periodo';
    periodo.textContent =
      formatarDiaMes(parseLocalDate(restricao.inicio)) + ' – ' +
      formatarDiaMes(parseLocalDate(restricao.fim));

    info.append(desc, periodo);

    const btnRemover = document.createElement('button');
    btnRemover.type = 'button';
    btnRemover.className = 'restricao-remove';
    btnRemover.setAttribute('aria-label', 'Remover restrição');
    btnRemover.textContent = '×';
    btnRemover.addEventListener('click', () => {
      restricoes.splice(index, 1);
      salvarRestricoes();
      render();
    });

    li.append(info, btnRemover);
    return li;
  }

  /** Redesenha as duas listas (modal e resumo no formulário). */
  function render() {
    listaResumo.innerHTML = '';
    listaModal.innerHTML = '';

    if (restricoes.length === 0) {
      const vazio = document.createElement('li');
      vazio.className = 'restricao-vazia';
      vazio.textContent = 'Nenhuma restrição adicionada.';
      listaModal.appendChild(vazio);
      return;
    }

    restricoes.forEach((restricao, i) => {
      listaModal.appendChild(criarItem(restricao, i));
      listaResumo.appendChild(criarItem(restricao, i));
    });
  }

  // Ao escolher o início, o fim assume o mesmo dia (ajustável depois) e nunca
  // pode ser anterior ao início.
  inputInicio.addEventListener('change', () => {
    inputFim.min = inputInicio.value;
    if (!inputFim.value || inputFim.value < inputInicio.value) {
      inputFim.value = inputInicio.value;
    }
  });

  document.getElementById('addRestricao').addEventListener('click', () => {
    const inicio = inputInicio.value;
    const descricao = inputDescricao.value.trim();
    if (!inicio) {
      alert('Informe a data de início da restrição.');
      return;
    }
    if (!descricao) {
      alert('Informe a descrição da restrição.');
      return;
    }

    const fim = inputFim.value && inputFim.value >= inicio ? inputFim.value : inicio;
    restricoes.push({ inicio, fim, descricao });
    salvarRestricoes();
    render();

    inputInicio.value = '';
    inputFim.value = '';
    inputFim.removeAttribute('min');
    inputDescricao.value = '';
    inputInicio.focus();
  });

  carregarRestricoes();
  render();
})();

/* ============================================================
 * Modal de confirmação de reset
 * ============================================================ */

(function configurarModalReset() {
  const overlay = document.getElementById('resetModal');
  configurarModal(overlay, {
    botaoAbrir: document.getElementById('resetBtn'),
    botoesFechar: [document.getElementById('cancelarReset')]
  });
  document.getElementById('confirmarReset').addEventListener('click', resetarTudo);
})();

/* ============================================================
 * Inicialização
 * ============================================================ */

document.getElementById('configForm').addEventListener('submit', gerarTabela);
document.getElementById('exportBtn').addEventListener('click', exportarParaExcel);

// Salvamento automático a cada modificação no formulário ou na tabela
document.getElementById('configForm').addEventListener('input', salvarEstado);
document.getElementById('configForm').addEventListener('change', salvarEstado);
document.getElementById('tableContainer').addEventListener('input', salvarEstado);

// Restaura o estado salvo ao abrir a página (ou usa a data de hoje)
window.addEventListener('DOMContentLoaded', () => {
  const estado = carregarEstado();
  const inputData = document.getElementById('dataInicio');

  if (estado && estado.config) {
    const c = estado.config;
    if (c.numSemanas) document.getElementById('numSemanas').value = c.numSemanas;
    if (c.dataInicio) inputData.value = c.dataInicio;
    document.getElementById('hybridCheckbox').checked = !!c.hybrid;
    if (Array.isArray(c.dias)) {
      document.querySelectorAll('input[name="dias"]').forEach(el => {
        el.checked = c.dias.includes(el.value);
      });
    }
  }

  if (!inputData.value) {
    inputData.value = formatarISO(new Date());
  }

  // Regenera a tabela se havia uma salva, preservando o conteúdo digitado
  if (estado && estado.tabelaGerada && estado.config &&
      Array.isArray(estado.config.dias) && estado.config.dias.length > 0) {
    gerarTabela();
  }
});
