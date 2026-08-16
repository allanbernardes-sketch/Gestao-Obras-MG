-- Remove o perfil "Gestor de Atendimento (DORE)" (gestor_dore) do sistema — descontinuado a
-- pedido do usuário ("não fará mais parte do sistema"). Ver [[remocao-perfil-gestor-dore]].
--
-- A única usuária vinculada a esse perfil (Aline, gestordore@educacao.mg.gov.br) é reatribuída
-- para Analista de Engenharia (DORE) antes de remover a linha do perfil (FK usuarios.perfil_id).

update public.usuarios
set perfil_id = (select id from public.perfis where codigo = 'analista_dore')
where perfil_id = (select id from public.perfis where codigo = 'gestor_dore');

delete from public.perfis where codigo = 'gestor_dore';
