// Ao carregar a página, restaura o estado salvo (ou usa a data atual)
window.addEventListener('DOMContentLoaded', () => {
  const estado = carregarEstado();

  if (estado && estado.config) {
    const c = estado.config;
    if (c.numSemanas) document.getElementById('numSemanas').value = c.numSemanas;
    if (c.dataInicio) document.getElementById('dataInicio').value = c.dataInicio;
    document.getElementById('hybridCheckbox').checked = !!c.hybrid;
    if (Array.isArray(c.dias)) {
      document.querySelectorAll('input[name="dias"]').forEach(el => {
        el.checked = c.dias.includes(el.value);
      });
    }
  }

  // Sem data salva: usa a data de hoje
  if (!document.getElementById('dataInicio').value) {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    document.getElementById('dataInicio').value = `${ano}-${mes}-${dia}`;
  }

  // Regenera a tabela se havia uma salva, preservando o conteúdo digitado
  if (estado && estado.tabelaGerada && estado.config &&
      Array.isArray(estado.config.dias) && estado.config.dias.length > 0) {
    gerarTabela();
  }
});

// Função auxiliar para formatar datas no padrão dd/mm (sem o ano)
function formatDate(date) {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${d}/${m}`;
}

// Converte 'yyyy-mm-dd' em uma data no fuso local (evita o deslocamento de
// dia que ocorre ao usar new Date('yyyy-mm-dd'), interpretada como UTC).
function parseLocalDate(str) {
  const [ano, mes, dia] = str.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

// Gera um número comparável (yyyymmdd) a partir de uma data local.
function ymd(date) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

// ===== Restrições de período =====
const STORAGE_RESTRICOES = 'restricoesPlanoEnsino';
let restricoes = [];

function carregarRestricoes() {
  try {
    const dados = localStorage.getItem(STORAGE_RESTRICOES);
    if (dados) restricoes = JSON.parse(dados);
  } catch (e) {
    restricoes = [];
  }
}

function salvarRestricoes() {
  try {
    localStorage.setItem(STORAGE_RESTRICOES, JSON.stringify(restricoes));
  } catch (e) {
    /* armazenamento indisponível: mantém apenas em memória */
  }
}

// Retorna as descrições das restrições cujo período contém a data informada.
function obterRestricoesDaData(data) {
  const chave = ymd(data);
  return restricoes
    .filter(r => ymd(parseLocalDate(r.inicio)) <= chave && chave <= ymd(parseLocalDate(r.fim)))
    .map(r => r.descricao);
}

// ===== Salvamento automático do estado (formulário + tabela) =====
const STORAGE_ESTADO = 'planoEnsinoEstado';

// Gera a chave 'yyyy-mm-dd' usada para identificar a célula de uma data.
function keyData(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Lê o conteúdo atual de todas as células da tabela (indexado por célula).
function coletarConteudos() {
  const conteudos = {};
  document.querySelectorAll('#tableContainer textarea[data-cell]').forEach(ta => {
    conteudos[ta.dataset.cell] = ta.value;
  });
  return conteudos;
}

// Salva o estado completo no localStorage. Chamado a cada modificação.
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

// Recupera o estado salvo, ou null se não houver.
function carregarEstado() {
  try {
    const dados = localStorage.getItem(STORAGE_ESTADO);
    return dados ? JSON.parse(dados) : null;
  } catch (e) {
    return null;
  }
}

// Apaga todo o estado salvo (plano + restrições) e recarrega a página,
// voltando aos valores padrão.
function resetarTudo() {
  try {
    localStorage.removeItem(STORAGE_ESTADO);
    localStorage.removeItem(STORAGE_RESTRICOES);
  } catch (e) {
    /* armazenamento indisponível */
  }
  location.reload();
}

// Função para gerar a tabela agrupada por semana (com mesclagem na primeira coluna e linha EaD se híbrida)
function gerarTabela(event) {
  if (event) event.preventDefault();

  const numSemanas = parseInt(document.getElementById('numSemanas').value);
  const dataInicioInput = document.getElementById('dataInicio').value;
  if (!dataInicioInput) {
    alert('Por favor, informe a data de início.');
    return;
  }
  const dataInicio = new Date(dataInicioInput);
  dataInicio.setHours(0,0,0,0);
  
  // Obtém os dias da semana selecionados
  const diasSelecionados = Array.from(document.querySelectorAll('input[name="dias"]:checked'))
                                .map(el => parseInt(el.value));
  if (diasSelecionados.length === 0) {
    alert('Selecione ao menos um dia de aula.');
    return;
  }
  
  // Verifica se a disciplina é híbrida
  const isHybrid = document.getElementById('hybridCheckbox').checked;
  
  // Agrupa as datas por semana
  const semanas = {};
  for (let i = 0; i < numSemanas; i++) {
    const weekStart = new Date(dataInicio);
    weekStart.setDate(weekStart.getDate() + (i * 7));
    // Para cada dia da semana
    for (let d = 0; d < 7; d++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(currentDate.getDate() + d);
      // Ignora datas anteriores à data de início na primeira semana
      if (i === 0 && currentDate < dataInicio) continue;
      if (diasSelecionados.includes(currentDate.getDay())) {
        // Calcula o número da semana com base na diferença de dias
        const diffDays = Math.floor((currentDate - dataInicio) / (1000 * 60 * 60 * 24));
        const semana = Math.floor(diffDays / 7) + 1;
        if (!semanas[semana]) {
          semanas[semana] = [];
        }
        semanas[semana].push(new Date(currentDate));
      }
    }
  }
  
  // Cria a tabela
  const tableContainer = document.getElementById('tableContainer');
  tableContainer.innerHTML = "";
  const table = document.createElement('table');
  
  // Cabeçalho
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Semana', 'Data da Aula', 'Conteúdo'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Corpo da tabela
  const tbody = document.createElement('tbody');
  // Ordena as semanas em ordem crescente
  const semanasOrdenadas = Object.keys(semanas)
                                 .map(Number)
                                 .sort((a, b) => a - b);
  semanasOrdenadas.forEach(semana => {
    const datas = semanas[semana];
    // Calcula o número total de linhas para o grupo:
    // número de dias + 1 se híbrida
    const totalRows = datas.length + (isHybrid ? 1 : 0);
    
    datas.forEach((dataAula, index) => {
      const tr = document.createElement('tr');
      // Para a primeira linha do grupo, cria a célula da semana com rowspan
      if (index === 0) {
        const tdSemana = document.createElement('td');
        tdSemana.textContent = semana;
        tdSemana.rowSpan = totalRows;
        tdSemana.className = 'col-semana';
        tr.appendChild(tdSemana);
      }
      // Coluna da data da aula
      const tdData = document.createElement('td');
      tdData.textContent = formatDate(dataAula);
      tdData.className = 'col-data';
      tr.appendChild(tdData);
      // Coluna para o conteúdo (textarea)
      const tdConteudo = document.createElement('td');
      tdConteudo.className = 'col-conteudo';
      const textarea = document.createElement('textarea');
      textarea.dataset.cell = keyData(dataAula);
      textarea.placeholder = "Conteúdo para " + formatDate(dataAula);
      // Pré-preenche o conteúdo com feriados e/ou restrições da data
      const anotacoes = [];
      const feriado = obterFeriado(dataAula);
      if (feriado) {
        anotacoes.push("Feriado - " + feriado);
        tr.classList.add('feriado');
      }
      const restricoesData = obterRestricoesDaData(dataAula);
      if (restricoesData.length > 0) {
        restricoesData.forEach(desc => anotacoes.push(desc));
        tr.classList.add('restricao');
      }
      if (anotacoes.length > 0) {
        textarea.value = anotacoes.join(' / ');
      }
      tdConteudo.appendChild(textarea);
      tr.appendChild(tdConteudo);

      tbody.appendChild(tr);
    });
    
    // Se for híbrida, adiciona uma linha extra para EaD
    if (isHybrid) {
      const trHybrid = document.createElement('tr');
      trHybrid.classList.add('ead');
      // Não adiciona a célula da semana, pois ela já está mesclada
      const tdEaD = document.createElement('td');
      tdEaD.textContent = "EaD";
      tdEaD.className = 'col-data';
      trHybrid.appendChild(tdEaD);

      const tdConteudoEaD = document.createElement('td');
      tdConteudoEaD.className = 'col-conteudo';
      const textareaEaD = document.createElement('textarea');
      textareaEaD.dataset.cell = 'ead-' + semana;
      textareaEaD.placeholder = "Conteúdo EaD para semana " + semana;
      tdConteudoEaD.appendChild(textareaEaD);
      trHybrid.appendChild(tdConteudoEaD);
      
      tbody.appendChild(trHybrid);
    }
  });
  
  table.appendChild(tbody);
  tableContainer.appendChild(table);

  // Restaura o conteúdo salvo, preservando o que o usuário já havia digitado
  // (sobrepõe os pré-preenchimentos de feriados/restrições quando houver edição)
  const estado = carregarEstado();
  const salvos = estado && estado.conteudos ? estado.conteudos : {};
  tableContainer.querySelectorAll('textarea[data-cell]').forEach(ta => {
    if (Object.prototype.hasOwnProperty.call(salvos, ta.dataset.cell)) {
      ta.value = salvos[ta.dataset.cell];
    }
  });

  // Exibe o botão de exportação
  document.getElementById('exportBtn').style.display = 'inline-block';

  // Persiste o estado (inclusive os conteúdos pré-preenchidos)
  salvarEstado();
}

// Função para exportar a tabela para um arquivo XLSX (utilizando SheetJS)
function exportarParaExcel() {
  const table = document.querySelector('#tableContainer table');
  if (!table) {
    alert("Nenhuma tabela para exportar!");
    return;
  }
  
  // Clona a tabela para não modificar a original
  const tableClone = table.cloneNode(true);
  
  // Substitui os campos <textarea> pelo seu valor
  const textareas = tableClone.querySelectorAll('textarea');
  textareas.forEach(ta => {
    const td = ta.parentNode;
    const text = document.createTextNode(ta.value);
    td.replaceChild(text, ta);
  });
  
  // Cria o workbook a partir da tabela clonada
  const wb = XLSX.utils.table_to_book(tableClone, { sheet: "Planilha" });
  
  // Gera o arquivo XLSX em formato binário
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
  // Cria um blob com o conteúdo e aciona o download
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plano_de_ensino.xlsx';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

document.getElementById('configForm').addEventListener('submit', gerarTabela);
document.getElementById('exportBtn').addEventListener('click', exportarParaExcel);

// Salvamento automático a cada modificação no formulário ou na tabela
document.getElementById('configForm').addEventListener('input', salvarEstado);
document.getElementById('configForm').addEventListener('change', salvarEstado);
document.getElementById('tableContainer').addEventListener('input', salvarEstado);

// ===== Interface do modal de restrições =====
(function configurarModalRestricoes() {
  const overlay = document.getElementById('restricaoModal');
  const btnAbrir = document.getElementById('abrirModal');
  const btnFechar = document.getElementById('fecharModal');
  const btnConcluir = document.getElementById('concluirModal');
  const btnAdd = document.getElementById('addRestricao');
  const inputInicio = document.getElementById('restricaoInicio');
  const inputFim = document.getElementById('restricaoFim');
  const inputDescricao = document.getElementById('restricaoDescricao');
  const listaModal = document.getElementById('modalRestricoesList');
  const listaResumo = document.getElementById('restricoesResumo');

  // Cria o item de uma restrição (descrição, período e botão de remover).
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
      formatDate(parseLocalDate(restricao.inicio)) +
      ' – ' +
      formatDate(parseLocalDate(restricao.fim));
    info.appendChild(desc);
    info.appendChild(periodo);

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

    li.appendChild(info);
    li.appendChild(btnRemover);
    return li;
  }

  // Atualiza as duas listas (modal e resumo no formulário).
  function render() {
    [listaModal, listaResumo].forEach(ul => {
      if (!ul) return;
      ul.innerHTML = '';
      if (restricoes.length === 0) {
        if (ul === listaModal) {
          const vazio = document.createElement('li');
          vazio.className = 'restricao-vazia';
          vazio.textContent = 'Nenhuma restrição adicionada.';
          ul.appendChild(vazio);
        }
        return;
      }
      restricoes.forEach((r, i) => ul.appendChild(criarItem(r, i)));
    });
  }

  function abrir() {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    inputInicio.focus();
  }

  function fechar() {
    overlay.hidden = true;
    document.body.style.overflow = '';
  }

  // Ao escolher o início, o fim passa a valer o mesmo dia (ajustável depois).
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
      alert('Informe a data de início da restrição.');
      return;
    }
    if (!descricao) {
      alert('Informe a descrição da restrição.');
      return;
    }
    let fim = inputFim.value || inicio;
    if (fim < inicio) fim = inicio;

    restricoes.push({ inicio, fim, descricao });
    salvarRestricoes();
    render();

    inputInicio.value = '';
    inputFim.value = '';
    inputFim.removeAttribute('min');
    inputDescricao.value = '';
    inputInicio.focus();
  });

  btnAbrir.addEventListener('click', abrir);
  btnFechar.addEventListener('click', fechar);
  btnConcluir.addEventListener('click', fechar);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) fechar();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.hidden) fechar();
  });

  carregarRestricoes();
  render();
})();

// ===== Modal de confirmação de reset =====
(function configurarReset() {
  const overlay = document.getElementById('resetModal');
  const btnAbrir = document.getElementById('resetBtn');
  const btnCancelar = document.getElementById('cancelarReset');
  const btnConfirmar = document.getElementById('confirmarReset');

  function abrir() {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function fechar() {
    overlay.hidden = true;
    document.body.style.overflow = '';
  }

  btnAbrir.addEventListener('click', abrir);
  btnCancelar.addEventListener('click', fechar);
  btnConfirmar.addEventListener('click', resetarTudo);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) fechar();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.hidden) fechar();
  });
})();
