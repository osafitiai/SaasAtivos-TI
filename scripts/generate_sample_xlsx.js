const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

function generateSample() {
  // Aba 1 - Importação de ativos
  const headers = [
    "categoria_ativo",
    "nome_maquina",
    "patrimonio",
    "numero_serie",
    "numero_serie_teclado",
    "numero_serie_mouse",
    "numero_serie_headset",
    "marca",
    "modelo",
    "condicao",
    "observacoes",
    "usuario_responsavel",
    "email_usuario",
    "ano_produto",
    "localizacao",
    "processador",
    "sistema_operacional",
    "endereco_mac",
    "endereco_ip",
    "chave_licenca_windows",
    "tamanho_polegadas",
    "numero_nota_fiscal",
    "data_compra",
    "valor_compra",
    "fornecedor"
  ];

  const data = [
    {
      "categoria_ativo": "Notebook",
      "nome_maquina": "NOTE-FINANCEIRO-01",
      "patrimonio": "PAT-0001",
      "numero_serie": "SN123456",
      "numero_serie_teclado": "",
      "numero_serie_mouse": "",
      "numero_serie_headset": "",
      "marca": "Dell",
      "modelo": "Latitude 5440",
      "condicao": "Boa",
      "observacoes": "Exemplo de preenchimento para notebook",
      "usuario_responsavel": "Daniele Gomes",
      "email_usuario": "daniele@empresa.com",
      "ano_produto": "2025",
      "localizacao": "Sede RJ",
      "processador": "Intel Core i5",
      "sistema_operacional": "Windows 11 Pro",
      "endereco_mac": "00:1A:2B:3C:4D:5E",
      "endereco_ip": "192.168.1.100",
      "chave_licenca_windows": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
      "tamanho_polegadas": "",
      "numero_nota_fiscal": "NF-9988",
      "data_compra": "2025-01-10",
      "valor_compra": "4500.00",
      "fornecedor": "Dell Brasil"
    },
    {
      "categoria_ativo": "Monitor",
      "nome_maquina": "",
      "patrimonio": "PAT-0002",
      "numero_serie": "MON123456",
      "numero_serie_teclado": "",
      "numero_serie_mouse": "",
      "numero_serie_headset": "",
      "marca": "LG",
      "modelo": "24MP400",
      "condicao": "Boa",
      "observacoes": "Exemplo de monitor",
      "usuario_responsavel": "Felipe Silva",
      "email_usuario": "felipe@empresa.com",
      "ano_produto": "",
      "localizacao": "Sede RJ",
      "processador": "",
      "sistema_operacional": "",
      "endereco_mac": "",
      "endereco_ip": "",
      "chave_licenca_windows": "",
      "tamanho_polegadas": "24",
      "numero_nota_fiscal": "NF-5544",
      "data_compra": "2024-05-15",
      "valor_compra": "890.00",
      "fornecedor": "Kabum"
    },
    {
      "categoria_ativo": "Kit teclado e mouse",
      "nome_maquina": "",
      "patrimonio": "PAT-0003",
      "numero_serie": "",
      "numero_serie_teclado": "TEC123456",
      "numero_serie_mouse": "MOU123456",
      "numero_serie_headset": "",
      "marca": "Logitech",
      "modelo": "MK540",
      "condicao": "Boa",
      "observacoes": "Exemplo de Kit Teclado e Mouse",
      "usuario_responsavel": "Adriana Moura",
      "email_usuario": "adriana@empresa.com",
      "ano_produto": "",
      "localizacao": "Sede RJ",
      "processador": "",
      "sistema_operacional": "",
      "endereco_mac": "",
      "endereco_ip": "",
      "chave_licenca_windows": "",
      "tamanho_polegadas": "",
      "numero_nota_fiscal": "",
      "data_compra": "",
      "valor_compra": "",
      "fornecedor": ""
    },
    {
      "categoria_ativo": "Headset",
      "nome_maquina": "",
      "patrimonio": "PAT-0004",
      "numero_serie": "",
      "numero_serie_teclado": "",
      "numero_serie_mouse": "",
      "numero_serie_headset": "HEAD123456",
      "marca": "Jabra",
      "modelo": "Evolve 20",
      "condicao": "Boa",
      "observacoes": "Exemplo de Headset",
      "usuario_responsavel": "Daniele Gomes",
      "email_usuario": "daniele@empresa.com",
      "ano_produto": "",
      "localizacao": "Sede RJ",
      "processador": "",
      "sistema_operacional": "",
      "endereco_mac": "",
      "endereco_ip": "",
      "chave_licenca_windows": "",
      "tamanho_polegadas": "",
      "numero_nota_fiscal": "",
      "data_compra": "",
      "valor_compra": "",
      "fornecedor": ""
    }
  ];

  const ws = XLSX.utils.json_to_sheet(data, { header: headers });
  
  // Congelar primeira linha
  ws["!views"] = [
    { state: "frozen", ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" }
  ];

  // Adicionar filtros nas colunas
  ws["!autofilter"] = { ref: `A1:Y${data.length + 1}` };

  // Ajustar largura automática das colunas
  const colsWidth = headers.map(key => {
    let maxLen = key.length;
    for (let r of data) {
      const val = r[key] ? String(r[key]).length : 0;
      if (val > maxLen) maxLen = val;
    }
    return { wch: maxLen + 3 };
  });
  ws["!cols"] = colsWidth;


  // Aba 2 - Instruções
  const instrucoesData = [
    { "Instrução": "1. Categorias aceitas", "Detalhes": "Notebook, Monitor, Kit teclado e mouse, Headset (Case-insensitive)." },
    { "Instrução": "2. Notebook - Obrigatórios", "Detalhes": "nome_maquina, numero_serie, patrimonio, marca, modelo, condicao, localizacao." },
    { "Instrução": "3. Monitor - Obrigatórios", "Detalhes": "patrimonio, numero_serie, marca, modelo, tamanho_polegadas, condicao, localizacao." },
    { "Instrução": "4. Kit teclado e mouse - Obrigatórios", "Detalhes": "numero_serie_teclado, numero_serie_mouse, marca, modelo, condicao, localizacao." },
    { "Instrução": "5. Headset - Obrigatórios", "Detalhes": "numero_serie_headset, marca, modelo, condicao, localizacao." },
    { "Instrução": "6. Condições aceitas", "Detalhes": "Boa, Média, Ruim (ou 'Media')." },
    { "Instrução": "7. Formato MAC", "Detalhes": "Exemplo: 00:1A:2B:3C:4D:5E." },
    { "Instrução": "8. Formato IP", "Detalhes": "Exemplo: 192.168.1.100." },
    { "Instrução": "9. Ano do produto", "Detalhes": "Número de 4 dígitos entre 1900 e 2100 (ex: 2025)." },
    { "Instrução": "10. Usuário Responsável", "Detalhes": "Preencha com o nome ou e-mail exato do colaborador cadastrado." },
    { "Instrução": "11. Localização", "Detalhes": "Preencha com o nome exato da localização cadastrada." }
  ];
  const wsInst = XLSX.utils.json_to_sheet(instrucoesData);
  wsInst["!cols"] = [{ wch: 30 }, { wch: 90 }];


  // Aba 3 - Valores permitidos
  const valoresPermitidosData = [
    { "Categorias Disponíveis": "Notebook", "Condições Aceitas": "Boa" },
    { "Categorias Disponíveis": "Monitor", "Condições Aceitas": "Média" },
    { "Categorias Disponíveis": "Kit teclado e mouse", "Condições Aceitas": "Ruim" },
    { "Categorias Disponíveis": "Headset", "Condições Aceitas": "" }
  ];
  const wsValores = XLSX.utils.json_to_sheet(valoresPermitidosData);
  wsValores["!cols"] = [{ wch: 30 }, { wch: 30 }];


  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Importação de ativos");
  XLSX.utils.book_append_sheet(wb, wsInst, "Instruções");
  XLSX.utils.book_append_sheet(wb, wsValores, "Valores permitidos");

  const publicDir = path.join(__dirname, "../public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }

  const outputPath = path.join(publicDir, "planilha_exemplo.xlsx");
  XLSX.writeFile(wb, outputPath);
  console.log("Planilha modelo multitab gerada com sucesso em:", outputPath);
}

generateSample();
