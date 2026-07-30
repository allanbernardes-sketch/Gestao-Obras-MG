# Migrações já aplicadas no projeto remoto

Estes arquivos foram aplicados no projeto remoto (`oabqskuomgiuglailaia`) — com
timestamps diferentes no histórico (`supabase_migrations.schema_migrations`),
pois foram executados via MCP/dashboard. Seus efeitos estão consolidados na
baseline `supabase/migrations/20260601000000_baseline_esquema_remoto.sql`,
gerada por introspecção do banco remoto em 2026-07-30.

Não mova estes arquivos de volta para `supabase/migrations/` — o CLI tentaria
reaplicá-los sobre a baseline e falharia.
