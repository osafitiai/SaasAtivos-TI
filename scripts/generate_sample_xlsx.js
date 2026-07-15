const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

function generateSample() {
  const headers = [
    "User",
    "Setor",
    "Equipamento",
    "Modelo",
    "Patrimonio",
    "Coligada",
    "Numero de Serie",
    "Ano",
    "Situação",
    "Processador",
    "Sistema Operacional",
    "Nome da máquina",
    "OBS"
  ];

  const data = [
    {
      "User": "Daniele Gomes",
      "Setor": "Financeiro",
      "Equipamento": "Notebook",
      "Modelo": "Dell Vostro 15 3525",
      "Patrimonio": "000024",
      "Coligada": "UNIQO",
      "Numero de Serie": "67CB7X3",
      "Ano": "2023",
      "Situação": "Boa",
      "Processador": "Ryzen 5",
      "Sistema Operacional": "Windows 11",
      "Nome da máquina": "NTB-DANIELE",
      "OBS": "Sem observações"
    },
    {
      "User": "Felipe Silva",
      "Setor": "T.I",
      "Equipamento": "Notebook",
      "Modelo": "Dell Vostro 14 5490",
      "Patrimonio": "000080",
      "Coligada": "VIVERDE",
      "Numero de Serie": "2C3CH73",
      "Ano": "2020",
      "Situação": "Boa",
      "Processador": "Core i7",
      "Sistema Operacional": "Ubuntu 22.04",
      "Nome da máquina": "SRV-FELIPE",
      "OBS": "Teclado trocado"
    },
    {
      "User": "Adriana Moura",
      "Setor": "Juridico",
      "Equipamento": "Notebook",
      "Modelo": "Dell Vostro 5490",
      "Patrimonio": "000010",
      "Coligada": "DA",
      "Numero de Serie": "BDYKD53",
      "Ano": "2020",
      "Situação": "Critico",
      "Processador": "Core i5",
      "Sistema Operacional": "Windows 10",
      "Nome da máquina": "NTB-ADRIANA",
      "OBS": "Diversos travamentos, máquina descontinuada"
    }
  ];

  const ws = XLSX.utils.json_to_sheet(data, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ativos");

  const publicDir = path.join(__dirname, "../public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }

  const outputPath = path.join(publicDir, "planilha_exemplo.xlsx");
  XLSX.writeFile(wb, outputPath);
  console.log("Planilha de exemplo gerada com sucesso em:", outputPath);
}

generateSample();
