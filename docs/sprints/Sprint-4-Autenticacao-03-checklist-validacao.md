# Sprint 4 - Autenticacao - Checklist de validacao e rollout

## Checklist funcional

- Login renderiza pagina propria e nao reutiliza `/db_bootstrap`.
- Login aceita email e senha.
- Senha nunca e salva em texto puro.
- Usuario inativo nao consegue autenticar.
- Usuario `basic` acessa apenas `/`.
- Usuario `adm` acessa todas as rotas protegidas.
- Usuario sem permissao recebe bloqueio consistente.
- Logout remove a sessao.
- Menu nao exibe links sem permissao.
- Alteracao de senha invalida a experiencia anterior no proximo login.

## Checklist de banco

- `app_meta` continua preservada.
- `app_data` continua acessivel apos a migracao.
- `app_meta.db_version` termina em `1.1`.
- `auth_roles` foi criada com roles `adm` e `basic`.
- `auth_users` foi criada com o usuario `adm@vercel`.
- Seeds nao sao duplicadas em nova execucao do bootstrap.

## Checklist de deploy

- `AUTH_SESSION_SECRET` configurado nos ambientes necessarios.
- Banco de preview separado de producao.
- Migracao validada primeiro em preview.
- Credenciais iniciais testadas e depois trocadas.
- Smoke test manual concluido logo apos o deploy.

## Criterios de aceite da sprint

- Todas as rotas privadas exigem autenticacao.
- Roles controlam acesso por rota.
- O admin consegue manter usuarios e roles sem acesso ao banco.
- A aplicacao sobe em `1.1` via bootstrap sem recriar `app_data`.

## Plano de rollback

- Nao fazer rollback apenas de codigo para `1.0` apos migrar o banco para `1.1`.
- Em caso de erro, preferir hotfix sobre a versao `1.1`.
- Se for indispensavel voltar, preparar antes uma migracao reversa explicita ou restaurar banco a partir de backup/clone validado.
