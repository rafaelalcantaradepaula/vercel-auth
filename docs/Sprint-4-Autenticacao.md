crie um plano de implantação para implementar autenticação na aplicacao conforme arquivo docs/Sprint-4-Autenticação.md

Salve todo o plano em arquivos markdown na pasta docs/sprints com prefixo Sprint-4-Autenticação-

# Geral

- Todas as rotas, execeto relatorio contabil deverão ter autenticação
- Implementar a pagina de login propria conforme modelo descrito.
- roles padrão:
	- adm: Acesso a todas as rotas
	- Basic: Acesso as rotas: LandingPage
- Login deve ser um endereço de email
- alterar o parametro db_version para 1.1
- Ajustar a função updatedb() para criar o modelo de dados da aplicação com autenticação.

# Modelo de dados
- Criar uma tabela no banco para armazenar usuarios. Campos:
	- Login: String[20] 
	- Nome: String [60]
	- Role: Referencia a role da colleciont de roles 
	- Senha: String -> HASH da senha do usuario

- criar tabela para armazenar as roles de usuarios. Campos:
	- Nome: String[20]
	- Permissões: ARRAY de Rotas autorizadas para a role
- defina quaisquer campos adicionais que achar necessario
- Usuario padrao: 
	- id: Adm@vercel
	- senha: s4mp13Change
	- role: adm

# Novas rotas

- Administração de usuarios: 
	- Criar/Alterar usuario e atribuir  roles
	- Permitir alterar a senha do usuario.
- Administração de roles: 
	- Criar /Alterar roles
	- Para cada role apresentar a lista de rotas disponiveis no sistema para checkar as que a role pode acessar
