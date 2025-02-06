function exportToExcel() {
    let table = document.getElementById("tabelaAulas");
    let wb = XLSX.utils.table_to_book(table, { sheet: "Plano de Ensino" });
    XLSX.writeFile(wb, "plano_de_ensino.xlsx");
}