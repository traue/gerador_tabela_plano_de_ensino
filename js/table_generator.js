// Definir data inicial como a data atual
document.addEventListener("DOMContentLoaded", function () {
  let hoje = new Date();
  let dataFormatada = hoje.toISOString().split("T")[0];
  document.getElementById("data_inicial").value = dataFormatada;
  document.getElementById("result").style.display = "none";
});

//gerador da tabela das datas
document
  .getElementById("formAulas")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const dataInicial = document.getElementById("data_inicial").value;
    const numSemanas = parseInt(document.getElementById("num_semanas").value);
    const numAulas = parseInt(document.getElementById("num_aulas").value);
    const diasSelecionados = Array.from(
      document.querySelectorAll("input[name='dias']:checked")
    ).map((el) => parseInt(el.value));

    if (diasSelecionados.length !== numAulas) {
      alert(
        "⚠️ Ops. O número de dias selecionados deve ser igual ao número de aulas por semana"
      );
      return;
    }

    diasSelecionados.sort((a, b) => a - b);

    const tbody = document.querySelector("#tabelaAulas tbody");
    tbody.innerHTML = "";

    let dataAtual = new Date(dataInicial);

    for (let semana = 1; semana <= numSemanas; semana++) {
      let primeiraLinha = true;

      for (let dia of diasSelecionados) {
        let dataAula = new Date(dataAtual);
        dataAula.setDate(
          dataAula.getDate() +
            (dia - dataAula.getDay() + (dataAula.getDay() > dia ? 7 : 0))
        );

        const row = document.createElement("tr");

        if (primeiraLinha) {
          row.innerHTML = `<td rowspan="${numAulas}">${semana}</td>`;
          primeiraLinha = false;
        }

        row.innerHTML += `<td>${dataAula
          .getDate()
          .toString()
          .padStart(2, "0")}/${(dataAula.getMonth() + 1)
          .toString()
          .padStart(2, "0")}</td><td></td>`;
        tbody.appendChild(row);
      }

      dataAtual.setDate(dataAtual.getDate() + 7);
    }
    document.getElementById("result").style.display = "block";
    document.getElementById("exportContainer").style.display = "block";
  });
