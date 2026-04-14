# Vempire - Roadmap e Versão "Business"

Este documento serve para guardar as ideias de evolução da aplicação para a versão comercial ("app a sério").

## Dashboard de Gestão (Owner Insights)
Implementar uma vista de Master BI (Business Intelligence) acessível apenas por administradores.

### Funcionalidades Planeadas:
- **Agregação de Dados Anónimos**: Consolidar volume financeiro e quilometragem sem expor dados pessoais (Nomes/Matrículas).
- **Métricas de Performance da App**:
    - Total de utilizadores registados.
    - Volume bruto total processado mensualmente (Soma de todos os vencimentos).
    - Média salarial por setor (Nacional vs Internacional).
- **Taxa de Utilização de Cláusulas**: Perceber que percentagem de motoristas usa ADR, Cisterna ou Trabalho Noturno.

### Segurança e Acesso:
- **Acesso por Email**: O sistema deve identificar o utilizador através de um email específico de administrador.
- **Camada de Anonimização**: Separação total entre a identidade do utilizador e os dados estatísticos partilhados com a Master Dashboard.

## Próximos Passos (Tech):
- [ ] Configuração do Firebase Firestore para receção de dados agregados.
- [ ] Criação do template da Dashboard de Administração com `Chart.js`.
- [ ] Implementação de lógica de permissões no `app.js`.
