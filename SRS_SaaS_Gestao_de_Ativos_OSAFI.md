# SRS — SaaS de Gestão de Ativos OSAFI

**Documento de requisitos para desenvolvimento no Antigravity**  
**Versão:** 1.0  
**Origem:** análise da planilha `Planilha de Gestão de Ativos OSAFI.xlsx`  
**Idioma da aplicação:** Português do Brasil  
**Moeda padrão:** Real brasileiro (BRL)  
**Fuso horário padrão:** America/Sao_Paulo

---

## 1. Visão geral

Desenvolver um SaaS web responsivo para controle completo do ciclo de vida dos ativos da OSAFI, substituindo a planilha atual por uma aplicação centralizada, segura, auditável e escalável.

O sistema deverá controlar:

- cadastro de ativos;
- cadastro de colaboradores;
- vínculo de ativos com usuários;
- localização física;
- movimentações e transferências;
- histórico de responsáveis;
- manutenção preventiva e corretiva;
- custos de manutenção;
- documentos e notas fiscais;
- garantia;
- vida útil;
- previsão de substituição;
- baixa patrimonial;
- dashboard executivo;
- relatórios;
- trilha de auditoria;
- importação da planilha existente;
- gestão de usuários, empresas, filiais e permissões.

O SaaS deverá preservar os controles existentes na planilha, mas eliminar suas limitações de quantidade de linhas, rastreabilidade, segurança, colaboração e dependência de fórmulas.

---

## 2. Análise da planilha atual

A planilha possui seis abas.

### 2.1 Instruções de Uso

Contém as regras operacionais da planilha:

1. cadastrar colaboradores;
2. cadastrar ativos;
3. acompanhar indicadores no dashboard;
4. registrar manutenções pelo mesmo número de série ou patrimônio.

Também define:

- status dos ativos;
- regras de substituição;
- vida útil padrão por categoria;
- orientação para uso do número de série como identificador;
- necessidade de atualização após movimentações.

### 2.2 Dashboard

Apresenta os seguintes indicadores:

- total de ativos;
- ativos em uso;
- ativos em manutenção;
- ativos emprestados;
- ativos baixados;
- valor patrimonial total;
- ativos por categoria;
- valor patrimonial por categoria;
- ativos por status;
- percentual por status;
- ativos com substituição prevista nos próximos 90 dias.

### 2.3 Auxiliar

Armazena listas e parâmetros usados nas validações e fórmulas.

#### Categorias encontradas

- Notebook
- Desktop
- Servidor
- Monitor
- Periférico
- Impressora
- Tablet
- Smartphone
- Switch/Roteador
- Licença de Software
- Nobreak/UPS
- Outros

#### Vida útil padrão

| Categoria | Vida útil |
|---|---:|
| Notebook | 3 anos |
| Desktop | 5 anos |
| Servidor | 5 anos |
| Monitor | 5 anos |
| Periférico | 3 anos |
| Impressora | 5 anos |
| Tablet | 3 anos |
| Smartphone | 2 anos |
| Switch/Roteador | 5 anos |
| Licença de Software | 3 anos |
| Nobreak/UPS | 5 anos |
| Outros | 3 anos |

#### Status encontrados

- Ativo
- Em manutenção
- Emprestado
- Baixado

#### Localizações iniciais

- Sede - Térreo
- Sede - 1º Andar
- Sede - 2º Andar
- Filial SP
- Filial RJ
- Filial BH
- Home Office
- Outro

No SaaS, todas essas listas deverão ser administráveis.

### 2.4 Colaboradores

Campos existentes:

- número sequencial;
- nome completo;
- departamento ou setor;
- e-mail.

A planilha atual comporta 50 colaboradores. O SaaS não deverá ter limite fixo.

### 2.5 Cadastro de Ativos

Campos existentes:

- número sequencial;
- nome do equipamento;
- categoria;
- número de série ou patrimônio;
- marca;
- modelo;
- localização física;
- responsável ou usuário;
- data de aquisição;
- valor de aquisição;
- vida útil em anos;
- previsão de substituição;
- status.

A planilha atual comporta 200 ativos. O SaaS deverá trabalhar sem limite fixo por empresa, respeitando apenas o plano contratado.

### 2.6 Histórico de Manutenção

Campos existentes:

- número sequencial;
- número de série ou patrimônio;
- nome do ativo;
- data da manutenção;
- tipo;
- fornecedor responsável;
- descrição ou problema;
- custo;
- status da manutenção;
- custo acumulado do ativo.

A planilha atual comporta 300 registros. O SaaS não deverá ter limite fixo.

---

## 3. Limitações identificadas na planilha

1. Não existe autenticação ou controle de acesso.
2. Não há separação por empresa ou filial.
3. Não existe histórico confiável de alteração.
4. O responsável atual sobrescreve o anterior.
5. Não há termo de entrega ou devolução.
6. Não há controle de anexos, nota fiscal, garantia ou documentos.
7. Não existe fluxo de aprovação para baixa ou transferência.
8. Não há alertas automáticos por e-mail ou dentro da aplicação.
9. Os cadastros têm limites físicos de linhas.
10. A identificação depende de digitação manual.
11. O histórico de manutenção depende da correspondência exata do número de série.
12. Não há validação robusta de duplicidade.
13. Não há inventário periódico.
14. Não há controle de licenças de software por usuário ou equipamento.
15. Não há gestão de fornecedores.
16. Não há controle de depreciação contábil.
17. Não há trilha de auditoria.
18. Não há controle de permissões por área.
19. Não há API para integrações.
20. Não há visão individual do colaborador com os itens sob sua responsabilidade.

---

## 4. Objetivos do produto

### 4.1 Objetivo principal

Fornecer uma plataforma única para registrar, localizar, atribuir, movimentar, manter, inventariar e substituir ativos corporativos.

### 4.2 Objetivos específicos

- manter um cadastro central e confiável;
- saber qual colaborador está com cada equipamento;
- consultar todos os equipamentos de um colaborador;
- preservar o histórico completo das movimentações;
- reduzir perdas e equipamentos sem responsável;
- planejar substituições;
- acompanhar custos;
- controlar ativos disponíveis na TI;
- apoiar processos de admissão e desligamento;
- anexar documentos;
- fornecer indicadores gerenciais;
- permitir importação e exportação de dados;
- disponibilizar logs de auditoria.

---

## 5. Escopo funcional

## 5.1 Autenticação

O sistema deverá oferecer:

- login por e-mail e senha;
- recuperação de senha;
- convite de novos usuários;
- opção futura de login com Microsoft Entra ID;
- opção futura de login com Google Workspace;
- sessão segura;
- encerramento de sessão em todos os dispositivos;
- bloqueio de usuário;
- autenticação multifator como melhoria futura.

## 5.2 Multiempresa

O SaaS deverá ser multiempresa.

Estrutura:

- tenant;
- empresa ou coligada;
- filial ou unidade;
- departamento;
- centro de custo;
- localização física;
- usuário do sistema;
- colaborador.

Todo registro deverá possuir `tenant_id`.

Um usuário poderá ter acesso:

- a todo o tenant;
- a empresas específicas;
- a filiais específicas;
- somente ao seu departamento;
- somente aos ativos sob sua responsabilidade.

## 5.3 Empresas e coligadas

Campos:

- razão social;
- nome fantasia;
- CNPJ;
- inscrição estadual;
- status;
- endereço;
- telefone;
- e-mail;
- logotipo;
- responsável administrativo;
- data de criação.

## 5.4 Filiais e localizações

### Filial

- empresa;
- nome;
- código;
- endereço;
- cidade;
- estado;
- CEP;
- status.

### Localização física

Permitir estrutura hierárquica:

- filial;
- prédio;
- andar;
- sala;
- setor;
- rack;
- posição;
- home office;
- estoque da TI;
- manutenção externa.

Exemplo:

`OSAFI > Sede RJ > 2º andar > Financeiro`

## 5.5 Departamentos e centros de custo

Campos:

- nome;
- código;
- empresa;
- centro de custo;
- gestor responsável;
- status.

Departamentos iniciais sugeridos:

- T.I
- Controladoria
- Jurídico
- RH
- Projetos
- Financeiro
- Marketing
- Diretoria
- Administrativo
- Planejamento
- Cobrança

## 5.6 Colaboradores

Campos obrigatórios:

- nome completo;
- e-mail corporativo;
- empresa;
- departamento;
- status.

Campos adicionais:

- matrícula;
- cargo;
- gestor;
- centro de custo;
- telefone;
- data de admissão;
- data de desligamento;
- tipo de vínculo;
- filial;
- observações;
- foto;
- usuário do sistema vinculado.

Status:

- Ativo
- Afastado
- Férias
- Desligado
- Terceirizado
- Inativo

### Tela do colaborador

Ao abrir um colaborador, exibir:

- dados cadastrais;
- equipamentos atualmente vinculados;
- histórico de equipamentos;
- termos pendentes;
- termos assinados;
- chamados ou manutenções relacionados;
- total patrimonial sob responsabilidade;
- data da última movimentação;
- pendências de devolução.

---

## 6. Cadastro de ativos

## 6.1 Identificação básica

Campos obrigatórios:

- nome do ativo;
- categoria;
- número de série, patrimônio ou identificador único;
- empresa;
- status.

Campos adicionais:

- código interno;
- patrimônio;
- número de série;
- etiqueta;
- descrição;
- marca;
- modelo;
- fabricante;
- cor;
- condição física;
- observações;
- foto principal;
- etiquetas personalizadas.

O sistema deverá permitir ativos sem número de série, desde que possuam patrimônio ou código interno único.

## 6.2 Dados de aquisição

- fornecedor;
- número da nota fiscal;
- chave da NF-e;
- data da nota fiscal;
- data de aquisição;
- valor de aquisição;
- empresa compradora;
- centro de custo;
- pedido de compra;
- moeda;
- anexo da nota fiscal;
- data de recebimento;
- responsável pelo recebimento.

## 6.3 Garantia

- possui garantia;
- data de início;
- data de término;
- tipo de garantia;
- fornecedor da garantia;
- número do contrato;
- observações;
- anexos;
- alerta de vencimento.

## 6.4 Dados técnicos comuns

- processador;
- memória RAM;
- armazenamento;
- tipo de armazenamento;
- sistema operacional;
- arquitetura;
- endereço MAC;
- IP;
- hostname;
- versão de firmware;
- voltagem;
- potência;
- capacidade;
- IMEI;
- número da linha;
- operadora.

Os campos técnicos deverão ser configuráveis por categoria.

## 6.5 Campos específicos por categoria

### Notebook e Desktop

- processador;
- memória RAM;
- armazenamento;
- sistema operacional;
- edição do Windows;
- chave da licença;
- hostname;
- MAC Ethernet;
- MAC Wi-Fi;
- possui carregador;
- patrimônio do carregador;
- estado da bateria.

### Monitor

- tamanho;
- resolução;
- tipo de painel;
- conexão;
- acompanha cabo;
- patrimônio.

### Smartphone e Tablet

- IMEI 1;
- IMEI 2;
- número da linha;
- operadora;
- capacidade;
- conta corporativa;
- MDM;
- estado da bateria.

### Impressora

- tipo;
- endereço IP;
- contador;
- suprimento;
- contrato de outsourcing;
- fornecedor.

### Switch e Roteador

- número de portas;
- capacidade;
- endereço IP;
- MAC;
- firmware;
- credencial armazenada em cofre externo;
- rack;
- posição;
- PoE.

### Licença de Software

- fabricante;
- produto;
- plano;
- chave;
- quantidade adquirida;
- quantidade em uso;
- data de início;
- data de expiração;
- recorrência;
- custo recorrente;
- fornecedor;
- contrato;
- usuários vinculados;
- dispositivos vinculados.

### Nobreak/UPS

- potência;
- capacidade;
- data da bateria;
- última troca de bateria;
- próxima revisão.

## 6.6 Categorias

A categoria deverá ter:

- nome;
- código;
- ícone;
- cor;
- vida útil padrão;
- exige número de série;
- exige patrimônio;
- permite associação a usuário;
- tipo de depreciação;
- taxa de depreciação;
- campos personalizados;
- status.

## 6.7 Status do ativo

Status padrão:

- Disponível
- Em uso
- Em estoque com a TI
- Emprestado
- Em manutenção
- Aguardando manutenção
- Em garantia
- Reservado
- Em trânsito
- Perdido
- Furtado
- Danificado
- Baixado
- Descartado
- Vendido
- Doado

A planilha usa “Ativo”. No SaaS, recomenda-se separar:

- `Em uso`;
- `Disponível`;
- `Em estoque com a TI`.

## 6.8 Condição física

- Novo
- Excelente
- Bom
- Regular
- Ruim
- Irrecuperável

## 6.9 Vida útil e substituição

A vida útil deverá ser herdada da categoria, mas poderá ser alterada por ativo.

Cálculo:

```text
data_prevista_substituicao = data_aquisicao + vida_util_em_anos
```

Classificação:

- Vencido: data já passou;
- Urgente: vencimento em até 90 dias;
- Atenção: vencimento entre 91 e 180 dias;
- Planejado: vencimento entre 181 e 365 dias;
- Regular: vencimento superior a 365 dias;
- Sem previsão: ausência de data de aquisição ou vida útil.

Permitir:

- adiar substituição;
- justificar adiamento;
- registrar avaliação técnica;
- gerar solicitação de compra;
- marcar como substituído;
- vincular ativo antigo ao novo ativo.

---

## 7. Vínculo e movimentação de ativos

A associação entre ativo e colaborador não deverá ser gravada apenas no cadastro do ativo. Deverá existir uma tabela própria de movimentações.

## 7.1 Tipos de movimentação

- Entrega
- Devolução
- Transferência entre colaboradores
- Transferência entre departamentos
- Transferência entre filiais
- Envio para home office
- Retorno para a TI
- Empréstimo
- Reserva
- Envio para manutenção
- Retorno da manutenção
- Baixa
- Descarte
- Venda
- Doação
- Ajuste de inventário

## 7.2 Dados da movimentação

- ativo;
- tipo;
- origem;
- destino;
- colaborador anterior;
- novo colaborador;
- localização anterior;
- nova localização;
- status anterior;
- novo status;
- data e hora;
- responsável pela operação;
- motivo;
- observações;
- anexos;
- termo;
- assinatura;
- data prevista de devolução;
- data efetiva de devolução.

## 7.3 Regras

1. Um ativo físico só poderá ter um responsável principal ativo.
2. Uma nova entrega encerra automaticamente o vínculo anterior.
3. Todo envio para manutenção deverá registrar uma movimentação.
4. Todo retorno da manutenção deverá registrar outra movimentação.
5. A baixa deverá exigir motivo.
6. Não permitir entrega de ativo baixado.
7. Não permitir número de série duplicado dentro do tenant.
8. Permitir duplicidade controlada apenas quando o número de série estiver vazio e houver outro identificador.
9. O histórico não poderá ser apagado por usuários comuns.
10. Correções deverão gerar registro de auditoria.

---

## 8. Termos de responsabilidade

O sistema deverá gerar termos de:

- entrega;
- empréstimo;
- devolução;
- transferência;
- responsabilidade;
- baixa;
- descarte.

O termo deverá conter:

- empresa;
- colaborador;
- departamento;
- lista de ativos;
- identificação dos ativos;
- estado de conservação;
- acessórios;
- data;
- cláusulas;
- responsável pela entrega;
- assinatura do colaborador;
- assinatura do responsável da TI.

Formatos:

- visualização web;
- PDF;
- impressão;
- assinatura eletrônica simples;
- envio por e-mail.

---

## 9. Manutenção

## 9.1 Tipos

- Preventiva
- Corretiva
- Upgrade
- Limpeza
- Troca de peça
- Garantia
- Diagnóstico
- Formatação
- Reparo externo
- Outros

## 9.2 Status

- Aberta
- Em diagnóstico
- Aguardando aprovação
- Aguardando peça
- Enviada ao fornecedor
- Em execução
- Concluída
- Cancelada
- Sem reparo
- Aguardando retirada

## 9.3 Campos

- ativo;
- protocolo;
- data de abertura;
- tipo;
- solicitante;
- responsável interno;
- fornecedor;
- técnico;
- descrição do problema;
- diagnóstico;
- solução;
- peças utilizadas;
- custo de peças;
- custo de serviço;
- custo total;
- data prevista;
- data de conclusão;
- status;
- garantia do serviço;
- anexos;
- nota fiscal;
- observações;
- ativo substituto;
- indisponibilidade em horas ou dias.

## 9.4 Regras

- O nome do ativo deverá ser obtido pelo relacionamento, não por texto digitado.
- O custo acumulado será a soma das manutenções concluídas e não canceladas.
- Ao abrir uma manutenção, o status do ativo poderá mudar para `Em manutenção`.
- Ao concluir, solicitar o novo status e destino.
- Registrar histórico de peças e custos.
- Alertar quando o custo acumulado ultrapassar um percentual configurável do valor de aquisição.
- Indicador sugerido: custo de manutenção / valor de aquisição.

---

## 10. Fornecedores

Campos:

- razão social;
- nome fantasia;
- CNPJ;
- contato;
- telefone;
- e-mail;
- endereço;
- serviços prestados;
- status;
- observações;
- contratos;
- documentos.

Relacionamentos:

- compra de ativos;
- garantia;
- manutenção;
- licenças;
- contratos.

---

## 11. Inventário físico

Criar módulo de inventário periódico.

## 11.1 Funcionalidades

- criar campanha de inventário;
- definir empresa, filial, departamento ou localização;
- gerar lista esperada;
- confirmar ativo localizado;
- marcar não localizado;
- marcar divergência de responsável;
- marcar divergência de localização;
- registrar condição física;
- incluir foto;
- incluir observação;
- finalizar inventário;
- gerar relatório de divergências.

## 11.2 Leitura de identificação

Preparar estrutura para:

- QR Code;
- código de barras;
- etiqueta patrimonial;
- leitura pela câmera do celular.

O QR Code deverá abrir a página do ativo conforme permissão do usuário.

---

## 12. Baixa patrimonial e descarte

## 12.1 Motivos

- obsolescência;
- dano irreparável;
- perda;
- furto;
- venda;
- doação;
- descarte ambiental;
- substituição;
- outro.

## 12.2 Fluxo

1. Solicitação de baixa.
2. Avaliação técnica.
3. Aprovação.
4. Registro do destino.
5. Anexação de comprovantes.
6. Alteração de status.
7. Bloqueio de novas movimentações.
8. Preservação do histórico.

Campos:

- data;
- motivo;
- laudo;
- solicitante;
- aprovador;
- valor residual;
- destino;
- certificado de descarte;
- boletim de ocorrência;
- anexos;
- observações.

---

## 13. Dashboard

## 13.1 Indicadores principais

- total de ativos;
- ativos em uso;
- ativos disponíveis;
- ativos em estoque da TI;
- ativos emprestados;
- ativos em manutenção;
- ativos baixados;
- ativos sem responsável;
- ativos sem localização;
- valor total de aquisição;
- custo total de manutenção;
- ativos com garantia próxima do vencimento;
- ativos com substituição vencida;
- ativos com substituição em 90 dias;
- ativos com substituição em 180 dias;
- colaboradores com pendência de devolução;
- licenças próximas do vencimento.

## 13.2 Gráficos

- ativos por categoria;
- ativos por status;
- ativos por empresa;
- ativos por filial;
- ativos por departamento;
- valor patrimonial por categoria;
- evolução de aquisições;
- evolução de custos de manutenção;
- substituições previstas por mês;
- manutenção por fornecedor;
- condição física dos ativos;
- ativos por faixa etária;
- licenças utilizadas versus disponíveis.

## 13.3 Filtros globais

- período;
- empresa;
- filial;
- departamento;
- categoria;
- status;
- localização;
- responsável;
- fornecedor.

## 13.4 Alertas

- substituição vencida;
- substituição em até 90 dias;
- garantia vencendo;
- licença vencendo;
- empréstimo atrasado;
- manutenção atrasada;
- ativo sem responsável;
- ativo sem localização;
- ativo sem nota fiscal;
- ativo não localizado em inventário;
- colaborador desligado com ativos vinculados.

---

## 14. Relatórios

Relatórios mínimos:

1. Inventário geral.
2. Ativos por colaborador.
3. Ativos por departamento.
4. Ativos por empresa.
5. Ativos por filial.
6. Ativos por localização.
7. Ativos disponíveis.
8. Ativos sem responsável.
9. Ativos em manutenção.
10. Histórico de movimentações.
11. Histórico de manutenção.
12. Custos de manutenção por ativo.
13. Custos por fornecedor.
14. Garantias a vencer.
15. Substituições previstas.
16. Ativos baixados.
17. Licenças de software.
18. Pendências de devolução.
19. Divergências de inventário.
20. Valor patrimonial por centro de custo.

Exportações:

- XLSX;
- CSV;
- PDF;
- impressão.

---

## 15. Busca e filtros

A busca global deverá localizar por:

- nome;
- número de série;
- patrimônio;
- etiqueta;
- marca;
- modelo;
- colaborador;
- e-mail;
- departamento;
- localização;
- nota fiscal;
- fornecedor;
- IMEI;
- hostname;
- endereço MAC.

As telas de listagem deverão possuir:

- paginação;
- ordenação;
- filtros;
- seleção de colunas;
- filtros salvos;
- visualização em tabela;
- exportação;
- ações em lote.

---

## 16. Anexos e documentos

Permitir anexar:

- nota fiscal;
- foto;
- termo;
- garantia;
- contrato;
- laudo;
- ordem de serviço;
- comprovante de entrega;
- comprovante de descarte;
- boletim de ocorrência;
- manual;
- outros.

Regras:

- armazenar metadados;
- registrar quem enviou;
- registrar data;
- validar extensão e tamanho;
- usar URL assinada;
- impedir acesso entre tenants;
- permitir exclusão somente conforme permissão;
- registrar exclusão na auditoria.

---

## 17. Notificações

Canais:

- central de notificações;
- e-mail;
- webhook futuro;
- Microsoft Teams futuro.

Eventos:

- ativo atribuído;
- ativo devolvido;
- empréstimo próximo do vencimento;
- empréstimo vencido;
- manutenção criada;
- manutenção concluída;
- garantia a vencer;
- licença a vencer;
- substituição próxima;
- solicitação aguardando aprovação;
- colaborador desligado com ativos;
- inventário pendente.

Cada usuário deverá poder configurar preferências de notificação.

---

## 18. Perfis e permissões

## 18.1 Superadministrador da plataforma

- gerenciar tenants;
- planos;
- limites;
- suporte;
- métricas da plataforma.

## 18.2 Administrador do tenant

- acesso total ao ambiente da empresa;
- usuários;
- permissões;
- empresas;
- configurações;
- importação.

## 18.3 Gestor de TI

- ativos;
- colaboradores;
- movimentações;
- manutenção;
- inventário;
- relatórios;
- aprovações técnicas.

## 18.4 Técnico de TI

- cadastro e edição operacional;
- movimentações;
- manutenção;
- inventário;
- sem acesso a configurações críticas.

## 18.5 Gestor de departamento

- visualizar ativos do departamento;
- solicitar transferências;
- confirmar inventário;
- visualizar relatórios permitidos.

## 18.6 Financeiro ou Controladoria

- valores;
- notas fiscais;
- depreciação;
- baixas;
- relatórios patrimoniais;
- sem alterar configurações técnicas.

## 18.7 Auditor

- leitura de dados;
- relatórios;
- histórico;
- logs;
- sem edição.

## 18.8 Colaborador

- visualizar seus ativos;
- aceitar termo;
- solicitar suporte;
- confirmar recebimento;
- solicitar devolução.

As permissões deverão usar RBAC e escopo por empresa, filial e departamento.

---

## 19. Trilha de auditoria

Registrar:

- usuário;
- data e hora;
- endereço IP;
- ação;
- módulo;
- registro;
- valores anteriores;
- valores novos;
- origem;
- navegador ou dispositivo.

Ações auditáveis:

- criação;
- edição;
- exclusão;
- movimentação;
- importação;
- exportação;
- login;
- alteração de permissão;
- download de documento;
- aprovação;
- baixa.

Os logs não deverão ser editáveis por usuários comuns.

---

## 20. Importação da planilha

Criar assistente de importação para o arquivo analisado.

## 20.1 Etapas

1. Upload do XLSX.
2. Leitura das abas.
3. Mapeamento de colunas.
4. Pré-visualização.
5. Validação.
6. Detecção de duplicidades.
7. Importação.
8. Relatório de erros.
9. Possibilidade de desfazer lote.

## 20.2 Mapeamento de colaboradores

| Planilha | SaaS |
|---|---|
| Nome Completo | employee.full_name |
| Departamento / Setor | department.name |
| E-mail | employee.email |

## 20.3 Mapeamento de ativos

| Planilha | SaaS |
|---|---|
| Nome do Equipamento | asset.name |
| Categoria | asset_category.name |
| Nº de Série / Patrimônio | asset.serial_number ou asset.asset_tag |
| Marca | asset.brand |
| Modelo | asset.model |
| Localização Física | location.name |
| Responsável / Usuário | employee.full_name |
| Data de Aquisição | asset.acquisition_date |
| Valor de Aquisição | asset.acquisition_value |
| Vida Útil | asset.useful_life_years |
| Previsão de Substituição | calculado |
| Status | asset.status |

## 20.4 Mapeamento de manutenção

| Planilha | SaaS |
|---|---|
| Nº de Série / Patrimônio | localizar asset |
| Data da Manutenção | maintenance.opened_at |
| Tipo | maintenance.type |
| Fornecedor Responsável | supplier.name |
| Descrição / Problema | maintenance.problem_description |
| Custo | maintenance.total_cost |
| Status da Manutenção | maintenance.status |
| Custo Acumulado | calculado |

---

## 21. Modelo de dados sugerido

Usar PostgreSQL.

## 21.1 Tabelas principais

### tenants

```sql
id uuid primary key
name varchar not null
slug varchar unique not null
status varchar not null
plan_id uuid
created_at timestamptz
updated_at timestamptz
```

### companies

```sql
id uuid primary key
tenant_id uuid not null
legal_name varchar not null
trade_name varchar
cnpj varchar
status varchar not null
created_at timestamptz
updated_at timestamptz
```

### branches

```sql
id uuid primary key
tenant_id uuid not null
company_id uuid not null
name varchar not null
code varchar
address jsonb
status varchar not null
created_at timestamptz
updated_at timestamptz
```

### departments

```sql
id uuid primary key
tenant_id uuid not null
company_id uuid
name varchar not null
code varchar
cost_center varchar
manager_employee_id uuid
status varchar not null
created_at timestamptz
updated_at timestamptz
```

### locations

```sql
id uuid primary key
tenant_id uuid not null
branch_id uuid
parent_id uuid
name varchar not null
type varchar
full_path varchar
status varchar not null
created_at timestamptz
updated_at timestamptz
```

### employees

```sql
id uuid primary key
tenant_id uuid not null
company_id uuid
branch_id uuid
department_id uuid
manager_id uuid
full_name varchar not null
email varchar
registration_number varchar
job_title varchar
employment_type varchar
hire_date date
termination_date date
status varchar not null
phone varchar
notes text
created_at timestamptz
updated_at timestamptz
```

### asset_categories

```sql
id uuid primary key
tenant_id uuid not null
name varchar not null
code varchar
icon varchar
color varchar
default_useful_life_years integer
requires_serial_number boolean
requires_asset_tag boolean
assignable_to_employee boolean
custom_fields_schema jsonb
status varchar not null
created_at timestamptz
updated_at timestamptz
```

### assets

```sql
id uuid primary key
tenant_id uuid not null
company_id uuid
branch_id uuid
department_id uuid
category_id uuid not null
location_id uuid
current_employee_id uuid
supplier_id uuid
replacement_asset_id uuid
name varchar not null
internal_code varchar
asset_tag varchar
serial_number varchar
brand varchar
model varchar
manufacturer varchar
description text
status varchar not null
physical_condition varchar
acquisition_date date
acquisition_value numeric(14,2)
invoice_number varchar
invoice_key varchar
invoice_date date
purchase_order varchar
useful_life_years integer
replacement_date date
replacement_status varchar
warranty_start_date date
warranty_end_date date
technical_data jsonb
custom_fields jsonb
notes text
created_at timestamptz
updated_at timestamptz
deleted_at timestamptz
```

### asset_assignments

```sql
id uuid primary key
tenant_id uuid not null
asset_id uuid not null
employee_id uuid
location_id uuid
assignment_type varchar not null
started_at timestamptz not null
expected_return_at timestamptz
ended_at timestamptz
delivered_by_user_id uuid
returned_to_user_id uuid
condition_at_delivery varchar
condition_at_return varchar
term_id uuid
notes text
created_at timestamptz
```

### asset_movements

```sql
id uuid primary key
tenant_id uuid not null
asset_id uuid not null
movement_type varchar not null
from_employee_id uuid
to_employee_id uuid
from_location_id uuid
to_location_id uuid
from_department_id uuid
to_department_id uuid
from_status varchar
to_status varchar
performed_by_user_id uuid not null
reason text
occurred_at timestamptz not null
metadata jsonb
created_at timestamptz
```

### maintenances

```sql
id uuid primary key
tenant_id uuid not null
asset_id uuid not null
supplier_id uuid
protocol varchar
type varchar not null
status varchar not null
problem_description text
diagnosis text
solution text
parts_cost numeric(14,2)
service_cost numeric(14,2)
total_cost numeric(14,2)
opened_at timestamptz not null
expected_at timestamptz
completed_at timestamptz
requested_by_user_id uuid
assigned_to_user_id uuid
replacement_asset_id uuid
notes text
created_at timestamptz
updated_at timestamptz
```

### suppliers

```sql
id uuid primary key
tenant_id uuid not null
legal_name varchar
trade_name varchar not null
cnpj varchar
contact_name varchar
email varchar
phone varchar
service_types jsonb
status varchar not null
notes text
created_at timestamptz
updated_at timestamptz
```

### documents

```sql
id uuid primary key
tenant_id uuid not null
entity_type varchar not null
entity_id uuid not null
document_type varchar not null
file_name varchar not null
storage_path varchar not null
mime_type varchar
size_bytes bigint
uploaded_by_user_id uuid
created_at timestamptz
deleted_at timestamptz
```

### responsibility_terms

```sql
id uuid primary key
tenant_id uuid not null
employee_id uuid
type varchar not null
status varchar not null
document_id uuid
generated_at timestamptz
sent_at timestamptz
signed_at timestamptz
signature_data jsonb
created_by_user_id uuid
created_at timestamptz
```

### inventories

```sql
id uuid primary key
tenant_id uuid not null
name varchar not null
scope_type varchar
scope_ids jsonb
status varchar not null
started_at timestamptz
finished_at timestamptz
created_by_user_id uuid
created_at timestamptz
```

### inventory_items

```sql
id uuid primary key
tenant_id uuid not null
inventory_id uuid not null
asset_id uuid not null
expected_employee_id uuid
expected_location_id uuid
found boolean
found_employee_id uuid
found_location_id uuid
physical_condition varchar
divergence_type varchar
notes text
checked_by_user_id uuid
checked_at timestamptz
```

### software_licenses

```sql
id uuid primary key
tenant_id uuid not null
company_id uuid
name varchar not null
vendor varchar
plan varchar
license_key_encrypted text
quantity_purchased integer
quantity_used integer
starts_at date
expires_at date
billing_cycle varchar
recurring_cost numeric(14,2)
supplier_id uuid
status varchar not null
created_at timestamptz
updated_at timestamptz
```

### notifications

```sql
id uuid primary key
tenant_id uuid not null
user_id uuid not null
type varchar not null
title varchar not null
message text
entity_type varchar
entity_id uuid
read_at timestamptz
created_at timestamptz
```

### audit_logs

```sql
id uuid primary key
tenant_id uuid not null
user_id uuid
action varchar not null
entity_type varchar not null
entity_id uuid
old_values jsonb
new_values jsonb
ip_address inet
user_agent text
created_at timestamptz not null
```

---

## 22. Restrições e índices

Criar índices para:

- `tenant_id`;
- `company_id`;
- `branch_id`;
- `department_id`;
- `category_id`;
- `current_employee_id`;
- `location_id`;
- `status`;
- `serial_number`;
- `asset_tag`;
- `replacement_date`;
- `warranty_end_date`;
- `created_at`.

Restrições:

```text
unique(tenant_id, serial_number) where serial_number is not null
unique(tenant_id, asset_tag) where asset_tag is not null
unique(tenant_id, email) para usuários
```

Usar exclusão lógica em registros críticos.

---

## 23. Segurança

- isolamento por tenant;
- Row Level Security quando usar Supabase;
- validação no backend;
- armazenamento seguro de arquivos;
- URLs temporárias;
- criptografia de chaves de licença;
- nunca armazenar senha de equipamento em texto puro;
- proteção contra XSS, CSRF e SQL Injection;
- rate limit;
- logs;
- política de senha;
- auditoria;
- backups;
- adequação à LGPD;
- retenção configurável;
- exportação dos dados do tenant;
- remoção segura mediante contrato.

---

## 24. Arquitetura sugerida para o Antigravity

### Frontend

- Next.js;
- TypeScript;
- interface responsiva;
- componentes reutilizáveis;
- formulários com validação;
- tabela com filtros e paginação;
- gráficos;
- modo claro e escuro opcional.

### Backend

Opção preferencial:

- Supabase;
- PostgreSQL;
- Supabase Auth;
- Supabase Storage;
- Row Level Security;
- Edge Functions para rotinas;
- jobs agendados para alertas.

Alternativa:

- API Node.js;
- PostgreSQL;
- storage S3 compatível;
- autenticação própria ou provedor externo.

### Estado e dados

- consultas paginadas;
- cache;
- filtros no servidor;
- validação com schema;
- transações para movimentações;
- idempotência em importações.

---

## 25. Estrutura de navegação

Menu lateral:

1. Dashboard
2. Ativos
3. Colaboradores
4. Movimentações
5. Manutenções
6. Inventários
7. Licenças
8. Fornecedores
9. Relatórios
10. Aprovações
11. Notificações
12. Administração
13. Auditoria
14. Configurações

---

## 26. Telas mínimas

### Dashboard

Cards, gráficos, alertas e filtros.

### Lista de ativos

Colunas sugeridas:

- foto;
- patrimônio;
- nome;
- categoria;
- marca/modelo;
- número de série;
- responsável;
- departamento;
- localização;
- status;
- condição;
- aquisição;
- substituição;
- ações.

### Detalhe do ativo

Abas:

- Resumo
- Dados técnicos
- Responsável e localização
- Movimentações
- Manutenções
- Documentos
- Custos
- Auditoria

### Formulário de ativo

Organizar por etapas:

1. Identificação
2. Categoria e dados técnicos
3. Aquisição
4. Localização e responsável
5. Garantia
6. Documentos
7. Revisão

### Lista de colaboradores

- nome;
- empresa;
- departamento;
- cargo;
- e-mail;
- quantidade de ativos;
- valor sob responsabilidade;
- status.

### Detalhe do colaborador

- perfil;
- ativos atuais;
- histórico;
- termos;
- pendências.

### Manutenções

- Kanban por status;
- tabela;
- calendário;
- custos;
- SLA.

### Inventário

- campanhas;
- progresso;
- divergências;
- leitura móvel.

### Administração

- empresas;
- filiais;
- departamentos;
- localizações;
- categorias;
- status;
- campos personalizados;
- usuários;
- permissões;
- notificações;
- importação.

---

## 27. Regras de negócio críticas

1. Todo ativo pertence a um tenant.
2. O ativo deve pertencer a uma empresa.
3. Número de série e patrimônio devem ser únicos no tenant quando preenchidos.
4. A categoria define vida útil e campos técnicos.
5. A previsão de substituição é recalculada após alteração da aquisição ou vida útil.
6. Um ativo só pode possuir uma atribuição principal aberta.
7. A transferência deve encerrar o vínculo anterior e criar um novo.
8. A movimentação deve ser transacional.
9. A baixa não pode apagar o histórico.
10. Colaborador desligado não pode receber novo ativo.
11. O desligamento deve gerar alerta se houver ativo pendente.
12. Manutenção concluída deve atualizar o custo acumulado.
13. Ativo baixado não pode ser entregue nem enviado para manutenção, salvo reabertura autorizada.
14. Exclusões sensíveis devem ser lógicas.
15. Toda alteração importante deve gerar log.
16. Valores financeiros só podem ser vistos por perfis autorizados.
17. Chaves de licença devem ser mascaradas.
18. Importação não pode criar duplicidades silenciosas.
19. O usuário deve selecionar como resolver cada conflito de importação.
20. Alterações em lote precisam de confirmação.

---

## 28. Automação de alertas

Executar diariamente:

```text
- ativos com substituição vencida;
- ativos com substituição em 90 dias;
- garantias vencendo em 30, 60 e 90 dias;
- licenças vencendo em 30, 60 e 90 dias;
- empréstimos vencidos;
- manutenção com prazo vencido;
- colaboradores desligados com ativos;
- inventários em atraso.
```

Evitar envio repetitivo usando controle de última notificação.

---

## 29. API e integrações

Preparar API REST ou equivalente para:

- ativos;
- colaboradores;
- movimentações;
- manutenção;
- categorias;
- localizações;
- fornecedores;
- relatórios.

Integrações futuras:

- Microsoft Entra ID;
- Google Workspace;
- TOTVS RM;
- n8n;
- Power BI;
- Microsoft Teams;
- webhooks;
- ferramenta de chamados;
- ERP e compras.

Webhooks sugeridos:

- `asset.created`
- `asset.updated`
- `asset.assigned`
- `asset.returned`
- `asset.status_changed`
- `asset.maintenance_opened`
- `asset.maintenance_completed`
- `asset.replacement_due`
- `employee.terminated_with_assets`
- `inventory.completed`

---

## 30. Requisitos não funcionais

### Desempenho

- páginas principais em até 3 segundos em condições normais;
- busca com resposta rápida;
- paginação no servidor;
- suporte a milhares de ativos por tenant.

### Disponibilidade

- arquitetura em nuvem;
- backup automático;
- recuperação documentada;
- monitoramento de erros.

### Usabilidade

- interface em PT-BR;
- responsiva;
- acessível;
- mensagens claras;
- confirmação para ações destrutivas;
- atalhos e ações em lote.

### Escalabilidade

- nenhuma tabela operacional limitada a quantidade fixa;
- isolamento por tenant;
- storage escalável;
- filas para importações e notificações extensas.

### Compatibilidade

- Chrome;
- Edge;
- Firefox;
- Safari;
- celular e tablet.

---

## 31. MVP

O MVP deverá conter:

1. Autenticação.
2. Tenant único inicialmente, mas banco preparado para multiempresa.
3. Cadastro de empresas e departamentos.
4. Cadastro de colaboradores.
5. Cadastro de categorias.
6. Cadastro de ativos.
7. Associação de ativo a colaborador.
8. Tela do colaborador com ativos vinculados.
9. Movimentação e histórico.
10. Status e localização.
11. Manutenção.
12. Dashboard.
13. Alertas de substituição.
14. Importação da planilha.
15. Exportação XLSX/CSV.
16. Documentos.
17. Usuários e permissões básicas.
18. Auditoria.

---

## 32. Fases posteriores

### Fase 2

- termos em PDF;
- assinatura eletrônica;
- inventário com QR Code;
- garantia;
- fornecedores;
- baixa com aprovação;
- licenças de software;
- notificações avançadas.

### Fase 3

- app móvel ou PWA;
- integrações;
- API pública;
- depreciação;
- portal do colaborador;
- workflow configurável;
- BI;
- cobrança por assinatura;
- multi-tenant comercial completo.

---

## 33. Critérios de aceite do MVP

### Cadastro de ativo

- criar ativo;
- editar ativo;
- bloquear duplicidade;
- calcular substituição;
- anexar documento;
- localizar por busca;
- filtrar por status e categoria.

### Associação

- associar ativo a colaborador;
- remover associação;
- transferir entre colaboradores;
- manter histórico;
- refletir imediatamente na tela do ativo e do colaborador.

### Manutenção

- abrir manutenção;
- vincular ao ativo;
- alterar status;
- registrar custo;
- concluir;
- atualizar custo acumulado;
- preservar histórico.

### Dashboard

- números devem refletir os dados cadastrados;
- filtros devem alterar indicadores;
- alertas devem respeitar os prazos;
- valores devem respeitar permissão.

### Importação

- importar colaboradores;
- importar ativos;
- importar manutenções;
- gerar relatório;
- não duplicar registros existentes;
- permitir correção de erros.

### Auditoria

- registrar criação;
- edição;
- movimentação;
- baixa;
- alteração de permissão.

---

## 34. Dados de demonstração

Criar seed opcional com:

### Colaboradores

- João — Financeiro
- Larissa — Marketing
- Gustavo — T.I

### Ativos

- Notebook Dell atribuído a João;
- Monitor Dell atribuído a João;
- Notebook Lenovo atribuído a Larissa;
- Notebook Asus em estoque com a TI;
- Monitor em manutenção;
- Kit teclado e mouse atribuído a Gustavo.

Não utilizar dados pessoais reais no ambiente de demonstração.

---

## 35. Diretrizes visuais

- aparência corporativa;
- navegação simples;
- dashboard limpo;
- cards de indicadores;
- cores de status consistentes;
- tabelas densas, mas legíveis;
- formulários divididos em seções;
- ícones por categoria;
- badges de status;
- destaque para alertas.

Cores de alerta:

- vermelho: vencido ou crítico;
- amarelo: atenção;
- azul: informação;
- verde: regular ou concluído;
- cinza: inativo ou baixado.

---

## 36. Prompt de execução para o Antigravity

```text
Desenvolva um SaaS web responsivo de gestão de ativos corporativos chamado “Gestão de Ativos OSAFI”.

Use este documento como especificação funcional e técnica principal.

Objetivo:
Substituir uma planilha de controle de ativos por uma aplicação centralizada, segura, auditável e escalável.

Stack preferencial:
- Next.js com TypeScript;
- PostgreSQL;
- Supabase Auth;
- Supabase Database;
- Supabase Storage;
- Row Level Security;
- interface em português do Brasil;
- moeda BRL;
- fuso America/Sao_Paulo.

Implemente inicialmente o MVP com:
1. autenticação;
2. empresas;
3. departamentos;
4. localizações;
5. colaboradores;
6. categorias;
7. ativos;
8. associação de ativos a colaboradores;
9. histórico de movimentações;
10. manutenção;
11. dashboard;
12. alertas de substituição;
13. importação XLSX;
14. documentos;
15. permissões;
16. auditoria.

Regras indispensáveis:
- todo registro deve possuir tenant_id;
- número de série e patrimônio devem ser únicos por tenant;
- um ativo físico deve possuir apenas uma atribuição principal aberta;
- toda transferência deve encerrar o vínculo anterior e criar um novo;
- a previsão de substituição deve ser calculada pela data de aquisição e vida útil;
- o histórico nunca deve ser sobrescrito;
- ativos baixados não podem ser entregues;
- colaboradores desligados não podem receber novos ativos;
- o desligamento com ativos vinculados deve gerar alerta;
- a manutenção deve acumular custos;
- ações importantes devem gerar log de auditoria;
- arquivos devem ser isolados por tenant.

Crie:
- migrations SQL;
- políticas RLS;
- tipos TypeScript;
- serviços de acesso a dados;
- validações;
- componentes reutilizáveis;
- telas responsivas;
- seed de demonstração;
- README de instalação;
- arquivo .env.example;
- tratamento de erros;
- estados vazios;
- loading skeletons;
- confirmação de ações destrutivas.

Estrutura das telas:
- Dashboard;
- Ativos;
- Detalhe do ativo;
- Colaboradores;
- Detalhe do colaborador;
- Movimentações;
- Manutenções;
- Inventários;
- Licenças;
- Fornecedores;
- Relatórios;
- Administração;
- Auditoria;
- Configurações.

Na tela de Ativos:
- tabela paginada;
- busca;
- filtros;
- exportação;
- ações em lote;
- cadastro e edição;
- associação a usuário;
- visualização do histórico.

Na tela de Colaboradores:
- exibir todos os ativos atualmente vinculados;
- total patrimonial;
- histórico de entregas e devoluções;
- termos e pendências.

No Dashboard:
- total de ativos;
- em uso;
- disponíveis;
- em manutenção;
- emprestados;
- baixados;
- sem responsável;
- valor patrimonial;
- custos de manutenção;
- substituições em 90 e 180 dias;
- gráficos por categoria, status, departamento e empresa.

Não limite a aplicação a 200 ativos, 50 colaboradores ou 300 manutenções. Esses limites pertenciam apenas à planilha original.

Implemente o sistema em etapas, garantindo que cada módulo esteja funcional antes de avançar.
```

---

## 37. Resultado esperado

Ao final do desenvolvimento, a OSAFI deverá conseguir:

- localizar qualquer ativo rapidamente;
- saber quem está com cada equipamento;
- consultar todos os itens de um colaborador;
- acompanhar equipamentos disponíveis;
- rastrear transferências;
- controlar manutenção e custos;
- planejar substituições;
- controlar garantias e documentos;
- executar inventários;
- gerenciar baixas;
- gerar relatórios;
- auditar alterações;
- importar os dados da planilha;
- operar com múltiplas empresas e departamentos.

---

## 38. Observação final da análise

A planilha analisada está configurada como um modelo vazio, com fórmulas, listas e capacidade pré-definida, mas não contém uma base real preenchida de ativos ou colaboradores.

Por isso, este documento foi construído a partir:

- da estrutura das seis abas;
- dos campos cadastráveis;
- das categorias;
- dos status;
- das localizações;
- das regras de vida útil;
- das fórmulas de substituição;
- dos indicadores do dashboard;
- do relacionamento entre ativo, responsável e manutenção;
- das lacunas naturais que precisam ser resolvidas em uma aplicação SaaS.
