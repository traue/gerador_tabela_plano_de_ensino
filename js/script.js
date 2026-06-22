'use strict';

/**
 * Gerador de Tabela do Plano de Ensino
 *
 * Aplicação estática que monta uma tabela de aulas por semana a partir de uma
 * configuração simples (identificação, nº de semanas, data de início e dias da
 * semana). Recursos: numeração de aulas, pré-preenchimento de feriados e
 * restrições de período, salvamento automático, tema claro/escuro, reordenação
 * de conteúdo por arrasto e exportação para Excel.
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
 * Restrições e feriados adicionais
 * ============================================================ */

const STORAGE_RESTRICOES = 'restricoesPlanoEnsino';

/** Lista de restrições em memória: { inicio, fim, descricao, feriado }. */
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

/**
 * Retorna as restrições cujo período contém a data informada.
 * @returns {{descricao: string, feriado: boolean}[]}
 */
function obterRestricoesDaData(data) {
  const chave = ymd(data);
  return restricoes
    .filter(r => ymd(parseLocalDate(r.inicio)) <= chave && chave <= ymd(parseLocalDate(r.fim)))
    .map(r => ({ descricao: r.descricao, feriado: !!r.feriado }));
}

/* ============================================================
 * Identificação do plano
 * ============================================================ */

const CAMPOS_IDENT = [
  ['disciplina', 'Disciplina'],
  ['professor', 'Professor(a)'],
  ['turma', 'Turma'],
  ['semestre', 'Semestre']
];

/** Lê os campos de identificação do formulário. */
function coletarIdentificacao() {
  const ident = {};
  CAMPOS_IDENT.forEach(([id]) => {
    ident[id] = document.getElementById(id).value;
  });
  return ident;
}

/** Constrói o bloco de identificação exibido acima da tabela (ou null). */
function construirIdentificacao() {
  const ident = coletarIdentificacao();
  const preenchidos = CAMPOS_IDENT.filter(([id]) => ident[id].trim());
  if (preenchidos.length === 0) return null;

  const bloco = document.createElement('div');
  bloco.className = 'plano-identificacao';
  preenchidos.forEach(([id, rotulo]) => {
    const item = document.createElement('div');
    item.className = 'ident-item';

    const r = document.createElement('span');
    r.className = 'ident-rotulo';
    r.textContent = rotulo;

    const v = document.createElement('span');
    v.className = 'ident-valor';
    v.textContent = ident[id];

    item.append(r, v);
    bloco.appendChild(item);
  });
  return bloco;
}

/** Atualiza o bloco de identificação acima da tabela, se ela existir. */
function atualizarBlocoIdentificacao() {
  const container = document.getElementById('tableContainer');
  if (!container.querySelector('table')) return;

  const existente = container.querySelector('.plano-identificacao');
  if (existente) existente.remove();

  const novo = construirIdentificacao();
  if (novo) container.insertBefore(novo, container.firstChild);
}

/* ============================================================
 * Salvamento automático (configuração + conteúdo da tabela)
 * ============================================================ */

const STORAGE_ESTADO = 'planoEnsinoEstado';
let saveIndicatorTimer;

/** Mostra brevemente o indicador "Salvo automaticamente". */
function indicarSalvo() {
  const el = document.getElementById('saveIndicator');
  if (!el) return;
  el.classList.add('visivel');
  clearTimeout(saveIndicatorTimer);
  saveIndicatorTimer = setTimeout(() => el.classList.remove('visivel'), 1800);
}

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
        identificacao: coletarIdentificacao(),
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
    indicarSalvo();
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
 * Monta o texto pré-preenchido de uma data (feriados e/ou restrições) e marca a
 * linha com as classes correspondentes.
 * @returns {{texto: string, ehFeriado: boolean}}
 */
function montarAnotacoes(dataAula, tr) {
  const partes = [];
  let ehFeriado = false;
  let temRestricao = false;

  const feriadoNacional = obterFeriado(dataAula);
  if (feriadoNacional) {
    partes.push('Feriado - ' + feriadoNacional);
    ehFeriado = true;
  }

  obterRestricoesDaData(dataAula).forEach(item => {
    partes.push(item.feriado ? 'Feriado - ' + item.descricao : item.descricao);
    if (item.feriado) ehFeriado = true;
    else temRestricao = true;
  });

  if (ehFeriado) tr.classList.add('feriado');
  if (temRestricao) tr.classList.add('restricao');

  return { texto: partes.join(' / '), ehFeriado };
}

/** Cria a célula de conteúdo (alça de arrasto + textarea) de uma linha. */
function criarCelulaConteudo(chaveCelula, placeholder, valorInicial) {
  const td = document.createElement('td');
  td.className = 'col-conteudo';

  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.draggable = true;
  handle.title = 'Arraste para mover o conteúdo para outra data';
  handle.textContent = '⠿';

  const textarea = document.createElement('textarea');
  textarea.dataset.cell = chaveCelula;
  textarea.placeholder = placeholder;
  if (valorInicial) textarea.value = valorInicial;

  td.append(handle, textarea);
  return td;
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
  ['Semana', 'Aula', 'Data da Aula', 'Conteúdo'].forEach(texto => {
    const th = document.createElement('th');
    th.textContent = texto;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const semanasOrdenadas = Object.keys(semanas).map(Number).sort((a, b) => a - b);

  let numeroAula = 0;   // numeração sequencial (feriados não contam)
  let totalFeriados = 0;

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

      const { texto, ehFeriado } = montarAnotacoes(dataAula, tr);

      // Coluna de numeração da aula (feriados ficam sem número)
      const tdAula = document.createElement('td');
      tdAula.className = 'col-aula';
      if (ehFeriado) {
        tdAula.textContent = '—';
        totalFeriados++;
      } else {
        tdAula.textContent = ++numeroAula;
      }
      tr.appendChild(tdAula);

      const tdData = document.createElement('td');
      tdData.textContent = formatarDiaMes(dataAula);
      tdData.className = 'col-data';
      tr.appendChild(tdData);

      tr.appendChild(criarCelulaConteudo(
        formatarISO(dataAula),
        'Conteúdo para ' + formatarDiaMes(dataAula),
        texto
      ));

      tbody.appendChild(tr);
    });

    // Linha extra de EaD (uma por semana) quando a disciplina é híbrida
    if (isHybrid) {
      const trHybrid = document.createElement('tr');
      trHybrid.classList.add('ead');

      const tdAulaEaD = document.createElement('td');
      tdAulaEaD.className = 'col-aula';
      tdAulaEaD.textContent = ++numeroAula;
      trHybrid.appendChild(tdAulaEaD);

      const tdEaD = document.createElement('td');
      tdEaD.textContent = 'EaD';
      tdEaD.className = 'col-data';
      trHybrid.appendChild(tdEaD);

      trHybrid.appendChild(criarCelulaConteudo(
        'ead-' + semana,
        'Conteúdo EaD para semana ' + semana,
        ''
      ));

      tbody.appendChild(trHybrid);
    }
  });

  table.appendChild(tbody);
  table.dataset.totalAulas = numeroAula;

  // ----- Insere na página (identificação + tabela + resumo) -----
  const tableContainer = document.getElementById('tableContainer');
  tableContainer.innerHTML = '';

  const blocoIdent = construirIdentificacao();
  if (blocoIdent) tableContainer.appendChild(blocoIdent);

  tableContainer.appendChild(table);

  const resumo = document.createElement('div');
  resumo.className = 'plano-resumo';
  resumo.textContent = `Total de ${numeroAula} aula${numeroAula !== 1 ? 's' : ''}` +
    (totalFeriados > 0
      ? ` · ${totalFeriados} feriado${totalFeriados !== 1 ? 's' : ''} não contabilizado${totalFeriados !== 1 ? 's' : ''}`
      : '');
  tableContainer.appendChild(resumo);

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
 * Reordenação de conteúdo por arrasto (drag and drop)
 * ============================================================ */

(function configurarArrasto() {
  const container = document.getElementById('tableContainer');
  let origemChave = null;

  container.addEventListener('dragstart', e => {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;
    const ta = handle.parentNode.querySelector('textarea');
    origemChave = ta ? ta.dataset.cell : null;
    e.dataTransfer.effectAllowed = 'move';
  });

  container.addEventListener('dragover', e => {
    const celula = e.target.closest('.col-conteudo');
    if (celula && origemChave) {
      e.preventDefault();
      celula.classList.add('drag-over');
    }
  });

  container.addEventListener('dragleave', e => {
    const celula = e.target.closest('.col-conteudo');
    if (celula) celula.classList.remove('drag-over');
  });

  container.addEventListener('drop', e => {
    const celula = e.target.closest('.col-conteudo');
    if (!celula || !origemChave) return;
    e.preventDefault();
    celula.classList.remove('drag-over');

    const destino = celula.querySelector('textarea');
    const origem = container.querySelector(`textarea[data-cell="${CSS.escape(origemChave)}"]`);
    if (origem && destino && origem !== destino) {
      // Troca os conteúdos entre as duas datas
      const tmp = destino.value;
      destino.value = origem.value;
      origem.value = tmp;
      salvarEstado();
    }
    origemChave = null;
  });
})();

/* ============================================================
 * Exportação para Excel (SheetJS)
 * ============================================================ */

/** Gera um nome de arquivo a partir da disciplina (ou um padrão). */
function nomeArquivoExcel(disciplina) {
  const base = (disciplina || '').trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return base ? `plano_de_ensino_${base}.xlsx` : 'plano_de_ensino.xlsx';
}

function exportarParaExcel() {
  const table = document.querySelector('#tableContainer table');
  if (!table) {
    alert('Nenhuma tabela para exportar!');
    return;
  }

  // Clona a tabela, remove as alças de arrasto e troca cada <textarea> pelo seu
  // valor em texto (a tabela original na página fica intacta).
  const tableClone = table.cloneNode(true);
  tableClone.querySelectorAll('.drag-handle').forEach(h => h.remove());
  tableClone.querySelectorAll('textarea').forEach(ta => {
    ta.parentNode.replaceChild(document.createTextNode(ta.value), ta);
  });

  // Converte a tabela e preserva as mesclagens (coluna "Semana")
  const wsTabela = XLSX.utils.table_to_sheet(tableClone);
  const linhasTabela = XLSX.utils.sheet_to_json(wsTabela, { header: 1 });
  const merges = wsTabela['!merges'] || [];

  // Bloco de identificação no topo da planilha
  const ident = coletarIdentificacao();
  const topo = [['Plano de Ensino']];
  CAMPOS_IDENT.forEach(([id, rotulo]) => {
    if (ident[id].trim()) topo.push([rotulo + ':', ident[id].trim()]);
  });
  if (table.dataset.totalAulas) {
    topo.push(['Total de aulas:', Number(table.dataset.totalAulas)]);
  }
  topo.push([]); // linha em branco separando do cabeçalho da tabela

  const offset = topo.length;
  const ws = XLSX.utils.aoa_to_sheet(topo.concat(linhasTabela));
  ws['!merges'] = merges.map(m => ({
    s: { r: m.s.r + offset, c: m.s.c },
    e: { r: m.e.r + offset, c: m.e.c }
  }));
  ws['!cols'] = [{ wch: 8 }, { wch: 6 }, { wch: 14 }, { wch: 60 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plano de Ensino');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivoExcel(ident.disciplina);
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
 * Tema claro/escuro
 * ============================================================ */

(function configurarTema() {
  const btn = document.getElementById('themeToggle');

  function aplicar(tema) {
    document.documentElement.dataset.theme = tema;
    btn.textContent = tema === 'dark' ? '☀️' : '🌙';
  }

  aplicar(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

  btn.addEventListener('click', () => {
    const novo = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    aplicar(novo);
    try {
      localStorage.setItem('planoEnsinoTema', novo);
    } catch (e) {
      /* armazenamento indisponível */
    }
  });
})();

/* ============================================================
 * Modal de restrições e feriados (adicionar / editar / remover)
 * ============================================================ */

(function configurarModalRestricoes() {
  const overlay = document.getElementById('restricaoModal');
  const inputInicio = document.getElementById('restricaoInicio');
  const inputFim = document.getElementById('restricaoFim');
  const inputDescricao = document.getElementById('restricaoDescricao');
  const inputFeriado = document.getElementById('restricaoFeriado');
  const btnAdd = document.getElementById('addRestricao');
  const btnCancelar = document.getElementById('cancelarEdicao');
  const listaModal = document.getElementById('modalRestricoesList');
  const listaResumo = document.getElementById('restricoesResumo');

  // Índice da restrição em edição, ou null quando adicionando uma nova.
  let editandoIndex = null;

  configurarModal(overlay, {
    botaoAbrir: document.getElementById('abrirModal'),
    botoesFechar: [
      document.getElementById('fecharModal'),
      document.getElementById('concluirModal')
    ],
    aoAbrir: () => inputInicio.focus()
  });

  /** Cria um botão de ação (editar/remover) do item de lista. */
  function criarBotaoAcao(classe, rotulo, simbolo, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = classe;
    btn.setAttribute('aria-label', rotulo);
    btn.title = rotulo;
    btn.textContent = simbolo;
    btn.addEventListener('click', onClick);
    return btn;
  }

  /** Cria o item de lista de uma restrição (descrição, período e ações). */
  function criarItem(restricao, index) {
    const li = document.createElement('li');
    li.className = 'restricao-item' + (restricao.feriado ? ' is-feriado' : '');

    const info = document.createElement('span');
    info.className = 'restricao-info';

    const desc = document.createElement('strong');
    desc.textContent = restricao.descricao;
    if (restricao.feriado) {
      const tag = document.createElement('span');
      tag.className = 'restricao-tag';
      tag.textContent = 'feriado';
      desc.append(' ', tag);
    }

    const periodo = document.createElement('span');
    periodo.className = 'restricao-periodo';
    periodo.textContent =
      formatarDiaMes(parseLocalDate(restricao.inicio)) + ' – ' +
      formatarDiaMes(parseLocalDate(restricao.fim));

    info.append(desc, periodo);

    const acoes = document.createElement('span');
    acoes.className = 'restricao-acoes';
    acoes.append(
      criarBotaoAcao('restricao-edit', 'Editar restrição', '✎', () => entrarModoEdicao(index)),
      criarBotaoAcao('restricao-remove', 'Remover restrição', '×', () => {
        restricoes.splice(index, 1);
        salvarRestricoes();
        sairModoEdicao();
        render();
      })
    );

    li.append(info, acoes);
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

  function limparFormulario() {
    inputInicio.value = '';
    inputFim.value = '';
    inputFim.removeAttribute('min');
    inputDescricao.value = '';
    inputFeriado.checked = false;
  }

  function entrarModoEdicao(index) {
    const r = restricoes[index];
    editandoIndex = index;
    inputInicio.value = r.inicio;
    inputFim.value = r.fim;
    inputFim.min = r.inicio;
    inputDescricao.value = r.descricao;
    inputFeriado.checked = !!r.feriado;
    btnAdd.textContent = 'Salvar alteração';
    btnCancelar.hidden = false;
    inputInicio.focus();
  }

  function sairModoEdicao() {
    editandoIndex = null;
    limparFormulario();
    btnAdd.textContent = 'Adicionar';
    btnCancelar.hidden = true;
  }

  // Ao escolher o início, o fim assume o mesmo dia (ajustável depois) e nunca
  // pode ser anterior ao início.
  inputInicio.addEventListener('change', () => {
    inputFim.min = inputInicio.value;
    if (!inputFim.value || inputFim.value < inputInicio.value) {
      inputFim.value = inputInicio.value;
    }
  });

  btnAdd.addEventListener('click', () => {
    const inicio = inputInicio.value;
    const descricao = inputDescricao.value.trim();
    if (!inicio) {
      alert('Informe a data de início.');
      return;
    }
    if (!descricao) {
      alert('Informe a descrição.');
      return;
    }

    const fim = inputFim.value && inputFim.value >= inicio ? inputFim.value : inicio;
    const dados = { inicio, fim, descricao, feriado: inputFeriado.checked };

    if (editandoIndex !== null) {
      restricoes[editandoIndex] = dados;
    } else {
      restricoes.push(dados);
    }
    salvarRestricoes();
    render();
    sairModoEdicao();
  });

  btnCancelar.addEventListener('click', sairModoEdicao);

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
document.getElementById('configForm').addEventListener('input', () => {
  salvarEstado();
  atualizarBlocoIdentificacao();
});
document.getElementById('configForm').addEventListener('change', salvarEstado);
document.getElementById('tableContainer').addEventListener('input', salvarEstado);

// Restaura o estado salvo ao abrir a página (ou usa a data de hoje)
window.addEventListener('DOMContentLoaded', () => {
  const estado = carregarEstado();
  const inputData = document.getElementById('dataInicio');

  if (estado && estado.config) {
    const c = estado.config;
    if (c.identificacao) {
      CAMPOS_IDENT.forEach(([id]) => {
        document.getElementById(id).value = c.identificacao[id] || '';
      });
    }
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
