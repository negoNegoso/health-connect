# Health Connect - SOUDE

Aplicação para gestão e acompanhamento médico comunitário.

## Fluxos de Trabalho (Workflows)

O sistema é dividido em perfis de acesso, cada um com fluxos específicos para garantir o atendimento completo ao paciente, desde a visita domiciliar até a análise gerencial.

### 1. Perfil: Agente de Saúde (ACS)
**Objetivo:** Realizar a busca ativa no território e notificar pacientes sobre consultas pendentes.

*   **Minha Área (Território):**
    *   **Visualização em Lista:** Lista de pacientes sob sua responsabilidade, ordenados por prioridade e atraso.
    *   **Visualização em Mapa:** Mapa interativo mostrando a localização exata dos pacientes. Os marcadores (pins) mudam de cor conforme a prioridade (Verde, Amarelo, Laranja, Vermelho).
    *   **Ação de Contato:** Botão direto para WhatsApp com mensagem personalizada (lembrete de consulta ou alerta de atraso).
    *   **Visita Domiciliar:** Botão "Marcar como Notificado" para registrar no sistema que o paciente foi avisado presencialmente.

### 2. Perfil: Médico(a)
**Objetivo:** Atendimento clínico, gestão de prontuários e definição de prioridades de risco.

*   **Agenda de Consultas:**
    *   **Agendamento:** Criação de novas consultas para os pacientes.
    *   **Definição de Prioridade:** No momento do agendamento, o médico define a **Prioridade Manual** do paciente (Verde, Amarelo, Laranja, Vermelho). Essa definição impacta diretamente a visualização do Agente de Saúde no mapa, indicando quem precisa de atenção urgente independente do atraso cronológico.
*   **Prontuários:**
    *   Registro de evolução clínica, diagnósticos e prescrições.

### 3. Perfil: Enfermeiro(a)
**Objetivo:** Apoio à gestão clínica e controle de busca ativa.

*   **Busca Ativa:**
    *   Lista dedicada de pacientes faltosos que necessitam de contato imediato.
*   **Gestão de Pacientes:**
    *   Visualização e cadastro de pacientes.
*   **Comunicação:**
    *   Acesso facilitado para contato via WhatsApp com pacientes.

### 4. Perfil: Diretor(a) de Saúde
**Objetivo:** Visão estratégica e análise de indicadores de saúde populacional.

*   **Painel Analítico (Dashboard):**
    *   **Distribuição por Prioridade:** Gráfico visualizando a estratificação de risco da população (quantos são urgentes/vermelho, etc.).
    *   **Níveis de Atraso:** Monitoramento de quantos pacientes estão com consultas atrasadas e em quais faixas de tempo.
    *   **Eficácia das Ações:** Comparativo de produtividade (Consultas Agendadas vs. Visitas Realizadas pelos agentes) para medir a efetividade da busca ativa.

---

## Estrutura Técnica

Este projeto utiliza:
*   **Frontend:** React, Vite, TypeScript, Tailwind CSS, Shadcn UI.
*   **Mapas:** Leaflet / React-Leaflet.
*   **Backend/Banco de Dados:** Supabase (PostgreSQL).

## Configuração Local

# (Continua com as instruções originais de instalação...)
