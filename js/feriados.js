'use strict';

/**
 * Feriados nacionais do Brasil (fixos e móveis).
 *
 * Expõe globalmente a função `obterFeriado(date)`, usada para pré-preencher os
 * campos de conteúdo da tabela. As datas são calculadas em tempo de execução,
 * portanto funcionam para qualquer ano.
 */
(function () {
  // Cache dos feriados já calculados, indexado por ano.
  const feriadosPorAno = {};

  /**
   * Calcula o Domingo de Páscoa de um ano (algoritmo de Meeus/Jones/Butcher,
   * calendário gregoriano). Base para todos os feriados móveis.
   */
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

  /** Retorna uma nova data resultante de somar (ou subtrair) dias. */
  function somarDias(data, dias) {
    const nova = new Date(data);
    nova.setDate(nova.getDate() + dias);
    return nova;
  }

  /** Gera a chave 'yyyy-mm-dd' (fuso local) usada para indexar os feriados. */
  function chave(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  /** Monta o mapa de feriados (chave 'yyyy-mm-dd' -> nome) de um ano. */
  function obterFeriadosDoAno(ano) {
    if (feriadosPorAno[ano]) return feriadosPorAno[ano];

    const feriados = {};
    const adicionar = (data, nome) => {
      feriados[chave(data)] = nome;
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

    // Consciência Negra: feriado nacional a partir de 2024 (Lei 14.759/2023)
    if (ano >= 2024) {
      adicionar(new Date(ano, 10, 20), 'Consciência Negra');
    }

    // Feriados móveis (a partir da Páscoa). Carnaval, Sexta-feira Santa e
    // Corpus Christi são amplamente observados no calendário acadêmico.
    const pascoa = calcularPascoa(ano);
    adicionar(somarDias(pascoa, -48), 'Carnaval (segunda-feira)');
    adicionar(somarDias(pascoa, -47), 'Carnaval');
    adicionar(somarDias(pascoa, -2), 'Sexta-feira Santa');
    adicionar(somarDias(pascoa, 60), 'Corpus Christi');

    feriadosPorAno[ano] = feriados;
    return feriados;
  }

  /** Retorna o nome do feriado da data informada, ou null se não houver. */
  window.obterFeriado = function obterFeriado(data) {
    return obterFeriadosDoAno(data.getFullYear())[chave(data)] || null;
  };
})();
