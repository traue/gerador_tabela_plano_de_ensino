// Feriados nacionais do Brasil (fixos e móveis), usados para pré-preencher
// automaticamente os campos de conteúdo da tabela do plano de ensino.

// Calcula a data do Domingo de Páscoa para um ano, usando o algoritmo de
// Meeus/Jones/Butcher (calendário gregoriano). Os feriados móveis brasileiros
// são calculados a partir dela.
function calcularPascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = março, 4 = abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

// Retorna uma nova data resultante da soma (ou subtração) de dias.
function somarDias(data, dias) {
  const nova = new Date(data);
  nova.setDate(nova.getDate() + dias);
  return nova;
}

// Gera a chave usada para indexar os feriados no formato yyyy-mm-dd.
function chaveFeriado(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Cache dos feriados já calculados, indexado por ano.
const feriadosPorAno = {};

// Monta o mapa de feriados (chave yyyy-mm-dd -> nome) para um ano.
function obterFeriadosDoAno(ano) {
  if (feriadosPorAno[ano]) return feriadosPorAno[ano];

  const feriados = {};
  const adicionar = (data, nome) => {
    feriados[chaveFeriado(data)] = nome;
  };

  // Feriados nacionais fixos
  adicionar(new Date(ano, 0, 1), 'Confraternização Universal');
  adicionar(new Date(ano, 3, 21), 'Tiradentes');
  adicionar(new Date(ano, 4, 1), 'Dia do Trabalho');
  adicionar(new Date(ano, 8, 7), 'Independência do Brasil');
  adicionar(new Date(ano, 9, 12), 'Nossa Senhora Aparecida');
  adicionar(new Date(ano, 10, 2), 'Finados');
  adicionar(new Date(ano, 10, 15), 'Proclamação da República');
  adicionar(new Date(ano, 11, 25), 'Natal');

  // Dia da Consciência Negra: feriado nacional desde 2024 (Lei 14.759/2023).
  if (ano >= 2024) {
    adicionar(new Date(ano, 10, 20), 'Consciência Negra');
  }

  // Feriados móveis, calculados a partir da Páscoa. Carnaval, Sexta-feira
  // Santa e Corpus Christi são amplamente observados no calendário acadêmico.
  const pascoa = calcularPascoa(ano);
  adicionar(somarDias(pascoa, -48), 'Carnaval (segunda-feira)');
  adicionar(somarDias(pascoa, -47), 'Carnaval');
  adicionar(somarDias(pascoa, -2), 'Sexta-feira Santa');
  adicionar(somarDias(pascoa, 60), 'Corpus Christi');

  feriadosPorAno[ano] = feriados;
  return feriados;
}

// Retorna o nome do feriado correspondente à data, ou null se não houver.
function obterFeriado(data) {
  const feriados = obterFeriadosDoAno(data.getFullYear());
  return feriados[chaveFeriado(data)] || null;
}
