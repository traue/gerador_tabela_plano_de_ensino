// Ao carregar a página, define a data atual no input de data
window.addEventListener('DOMContentLoaded', () => {
  const hoje = new Date();
  // Formata a data para yyyy-mm-dd
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  document.getElementById('dataInicio').value = `${ano}-${mes}-${dia}`;
});

// Função auxiliar para formatar datas no padrão dd/mm (sem o ano)
function formatDate(date) {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${d}/${m}`;
}

// Função para gerar a tabela agrupada por semana (com mesclagem na primeira coluna e linha EaD se híbrida)
function gerarTabela(event) {
  event.preventDefault();
  
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
        tr.appendChild(tdSemana);
      }
      // Coluna da data da aula
      const tdData = document.createElement('td');
      tdData.textContent = formatDate(dataAula);
      tr.appendChild(tdData);
      // Coluna para o conteúdo (textarea)
      const tdConteudo = document.createElement('td');
      const textarea = document.createElement('textarea');
      textarea.placeholder = "Conteúdo para " + formatDate(dataAula);
      tdConteudo.appendChild(textarea);
      tr.appendChild(tdConteudo);
      
      tbody.appendChild(tr);
    });
    
    // Se for híbrida, adiciona uma linha extra para EaD
    if (isHybrid) {
      const trHybrid = document.createElement('tr');
      // Não adiciona a célula da semana, pois ela já está mesclada
      const tdEaD = document.createElement('td');
      tdEaD.textContent = "EaD";
      trHybrid.appendChild(tdEaD);
      
      const tdConteudoEaD = document.createElement('td');
      const textareaEaD = document.createElement('textarea');
      textareaEaD.placeholder = "Conteúdo EaD para semana " + semana;
      tdConteudoEaD.appendChild(textareaEaD);
      trHybrid.appendChild(tdConteudoEaD);
      
      tbody.appendChild(trHybrid);
    }
  });
  
  table.appendChild(tbody);
  tableContainer.appendChild(table);
  
  // Exibe o botão de exportação
  document.getElementById('exportBtn').style.display = 'inline-block';
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
