# Sprint 4 - Autenticacao - Plano de implantacao

## Fase 1 - Fundacao tecnica

Objetivo: introduzir a infraestrutura de autenticacao sem alterar ainda a navegacao principal.

- Criar modulo `lib/auth` com:
  - hash e verificacao de senha
  - criacao e leitura de cookie de sessao
  - normalizacao de email
  - matriz de rotas do sistema
- Definir constantes de seguranca:
  - nome do cookie
  - TTL da sessao
  - segredo de assinatura
- Adicionar variaveis de ambiente:
  - `AUTH_SESSION_SECRET`
  - `AUTH_SESSION_TTL_HOURS` opcional

## Fase 2 - Migracao de banco para `1.1`

Objetivo: evoluir o schema atual de forma idempotente.

- Atualizar `lib/app-config.ts` para `dbVersion = "1.1"`.
- Implementar `updateDb(client, currentDbVersion)` com fluxo:
  1. Validar se a origem e `1.0`.
  2. Criar `auth_roles`.
  3. Criar `auth_users`.
  4. Inserir roles padrao.
  5. Inserir usuario admin inicial com senha em hash.
  6. Atualizar `app_meta.db_version` para `1.1`.
- Manter `app_meta` e `app_data` intactas.
- Garantir que a migracao possa rodar mais de uma vez sem duplicar seeds.

## Fase 3 - Login e sessao

Objetivo: permitir autenticacao funcional com UX propria.

- Criar `app/login/page.tsx` com formulario de email e senha.
- Implementar action ou route handler para autenticar:
  - localizar usuario ativo por login
  - validar hash
  - carregar role e permissoes
  - emitir cookie de sessao
  - registrar `last_login_at`
- Implementar `app/logout/route.ts` para limpar cookie.
- Tratar erros com mensagem generica para nao revelar se o login existe.

## Fase 4 - Protecao de rotas e navegacao

Objetivo: bloquear acesso anonimo e aplicar autorizacao por role.

- Criar `middleware.ts` com regras:
  - publico: `/login`, assets do Next e futura rota de relatorio contabil
  - privado: todas as demais rotas
  - sem sessao: redirecionar para `/login`
  - com sessao sem permissao: responder `403` ou redirecionar para pagina segura
- Ajustar o menu para exibir apenas rotas permitidas.
- Atualizar o layout para mostrar usuario atual e logout.
- Proteger tambem `/db_bootstrap` para manter o bootstrap acessivel apenas ao `adm`.

## Fase 5 - Administracao de usuarios

Objetivo: entregar operacao basica de identidade.

- Criar tela administrativa para listar e editar usuarios.
- Permitir:
  - criar usuario
  - editar nome
  - ativar/desativar usuario
  - trocar role
  - redefinir senha
- Restringir a tela ao role `adm`.
- Validar unicidade de login e formato de email.

## Fase 6 - Administracao de roles

Objetivo: permitir governanca simples de permissoes.

- Criar tela para listar, criar e editar roles.
- Exibir o catalogo de rotas do sistema com checkbox por permissao.
- Bloquear remocao ou esvaziamento inseguro da role `adm`.
- Impedir que a role `basic` perca acesso minimo a `/`.
- Salvar permissoes em formato consistente para o middleware.

## Fase 7 - Validacao em ambiente preview

Objetivo: reduzir risco antes de promover para producao.

- Fazer deploy da branch em preview no Vercel.
- Apontar preview para banco clonado ou branch separada do Neon.
- Executar `/db_bootstrap` para aplicar a migracao `1.1`.
- Validar matriz de acesso:
  - anonimo nao acessa rotas privadas
  - `basic` acessa somente `/`
  - `adm` acessa administracao e bootstrap
- Validar criacao, edicao e troca de senha.
- Validar logout e expiracao de sessao.

## Fase 8 - Implantacao em producao

Objetivo: publicar com janela controlada e validacao rapida.

- Confirmar `AUTH_SESSION_SECRET` configurado em `Preview` e `Production`.
- Publicar a versao final.
- Executar `/db_bootstrap` em producao com conta administrativa.
- Rodar smoke test imediato:
  - login admin
  - acesso a `/`
  - acesso a `/db_bootstrap`
  - acesso a administracao de usuarios
  - acesso a administracao de roles
  - logout

## Dependencias e ordem recomendada

1. Infra de auth.
2. Migracao `1.0 -> 1.1`.
3. Login e sessao.
4. Middleware e menu.
5. Admin de usuarios.
6. Admin de roles.
7. Preview.
8. Producao.

## Riscos principais

- Rollback simples para a versao `1.0` nao sera seguro depois que o banco subir para `1.1`, porque a app atual considera versao divergente como bootstrap pendente.
- Permissoes carregadas no cookie simplificam o middleware, mas alteracoes de role so entram em vigor no proximo login.
- A rota publica de relatorio contabil ainda nao existe; a excecao deve ser configurada de forma centralizada para nao abrir rotas indevidas.
