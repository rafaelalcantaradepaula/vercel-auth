# Sprint 4 - Autenticacao - Visao geral

## Objetivo

Implantar autenticacao propria com login por email, sessao via cookie seguro e controle de acesso por role, preservando o fluxo atual de bootstrap do banco e evoluindo a aplicacao da versao `1.0` para `1.1`.

## Estado atual da aplicacao

- A app possui apenas as rotas `/`, `/db_bootstrap` e `/api/health`.
- Nao existe autenticacao, middleware, sessao, tabela de usuarios ou tabela de roles.
- O menu superior e fixo e hoje expoe `/` e `/db_bootstrap` para qualquer visitante.
- O versionamento de banco depende de `app_meta.db_version` e a funcao `updateDb()` ainda nao foi implementada.

## Escopo funcional da sprint

- Proteger todas as rotas da aplicacao, exceto a rota publica de relatorio contabil quando ela existir.
- Criar pagina propria de login.
- Adicionar roles padrao:
  - `adm`: acesso total
  - `basic`: acesso apenas a `LandingPage`
- Permitir administracao de usuarios.
- Permitir administracao de roles com selecao das rotas permitidas.
- Alterar `db_version` para `1.1`.
- Implementar migracao em `updateDb()` para criar o modelo de autenticacao.

## Decisoes tecnicas recomendadas

### Estrategia de autenticacao

- Autenticacao local, sem provedor externo.
- Login por email e senha.
- Senha armazenada com hash forte usando `crypto.scrypt` do Node.js para evitar dependencia nativa extra.
- Sessao em cookie `HttpOnly`, `Secure`, `SameSite=Lax`, assinado com segredo proprio.
- Middleware para bloquear rotas privadas antes de renderizar a pagina.

### Estrategia de autorizacao

- Autorizacao baseada em role.
- Cada role armazena uma lista de rotas permitidas em coluna `text[]`.
- O login grava no cookie o `roleName` e o snapshot das permissoes para permitir validacao rapida no middleware.
- Alteracoes de role passam a valer no proximo login. Se for necessario revogacao imediata, isso entra como evolucao posterior.

### Modelo de dados alvo

#### `auth_roles`

- `id bigserial primary key`
- `name varchar(20) unique not null`
- `permissions text[] not null default '{}'`
- `is_system boolean not null default false`
- `created_at timestamp not null default now()`
- `updated_at timestamp not null default now()`

#### `auth_users`

- `id bigserial primary key`
- `login varchar(120) unique not null`
- `name varchar(60) not null`
- `role_id bigint not null references auth_roles(id)`
- `password_hash text not null`
- `is_active boolean not null default true`
- `last_login_at timestamp null`
- `created_at timestamp not null default now()`
- `updated_at timestamp not null default now()`

## Seeds obrigatorios

- Role `adm` com acesso total.
- Role `basic` com permissao apenas para `/`.
- Usuario inicial:
  - `login: adm@vercel`
  - `senha inicial: galo1908#`
  - `role: adm`

## Ajustes estruturais previstos no codigo

- `lib/app-config.ts`: atualizar `dbVersion` padrao para `1.1`.
- `lib/bootstrap.ts`: implementar migracao `1.0 -> 1.1`, criacao das tabelas e seeds de seguranca.
- `middleware.ts`: validar cookie e acesso por rota.
- `app/login/page.tsx`: formulario de login.
- `app/logout/route.ts`: encerramento de sessao.
- `app/admin/users/page.tsx`: cadastro, edicao de role e troca de senha.
- `app/admin/roles/page.tsx`: cadastro e edicao de roles.
- `components/top-menu-dropdown.tsx`: mostrar somente links permitidos ao usuario logado.
- `app/layout.tsx`: exibir contexto do usuario autenticado e acao de logout.

## Premissas adotadas

- Como a especificacao exige email no login, o campo `Login` nao deve ficar limitado a 20 caracteres no banco; `varchar(120)` e o minimo recomendado.
- Como a rota `relatorio contabil` ainda nao existe, a implantacao deve prever uma whitelist publica configuravel para ativar essa excecao quando a rota for criada.
- Como a especificacao manda autenticar todas as rotas, `/api/health` deve ser protegida nesta sprint, salvo decisao operacional contraria.
