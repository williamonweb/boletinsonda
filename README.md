# Boletins de Internação — Onda Animal

Sistema de boletins felinos e caninos com imagem, PDF, compartilhamento, histórico central no Neon e painel administrativo protegido.

## Funcionalidades

- Boletins separados para felinos e caninos.
- Salvamento em imagem PNG e impressão/PDF.
- Compartilhamento pelo menu do celular ou abertura do WhatsApp no computador.
- Identificação interna obrigatória do funcionário.
- Armazenamento centralizado no Neon.
- Painel `/admin` com pesquisa, filtros, detalhes, exclusão e relatório CSV.
- O nome do funcionário não aparece na imagem ou no PDF enviado ao tutor.

## 1. Enviar para o GitHub

Abra o Git Bash dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "Sistema de boletins Onda Animal com painel admin"
git branch -M main
git remote add origin https://github.com/williamonweb/boletinsonda.git
git push -u origin main
```

## 2. Criar o banco no Neon

1. Crie um projeto no Neon.
2. Abra **Connection Details** e copie a URL PostgreSQL.
3. O sistema cria a tabela `boletins` automaticamente no primeiro uso.

O arquivo `database/schema.sql` também está disponível caso prefira criar a estrutura pelo SQL Editor.

## 3. Configurar a Vercel

Importe o repositório `boletinsonda` e cadastre estas variáveis em **Settings → Environment Variables**:

| Variável | Conteúdo |
|---|---|
| `DATABASE_URL` | URL copiada do Neon |
| `ADMIN_USER` | Usuário escolhido para a gerência |
| `ADMIN_PASSWORD` | Senha forte escolhida para a gerência |
| `SESSION_SECRET` | Chave aleatória com pelo menos 24 caracteres |

Depois clique em **Deploy**. Se as variáveis forem adicionadas após a primeira publicação, faça um novo deploy.

## Acessos

- Formulário da equipe: `https://seu-dominio.vercel.app/`
- Painel da gerência: `https://seu-dominio.vercel.app/admin`

As credenciais administrativas ficam somente nas variáveis protegidas da Vercel e não são enviadas ao GitHub.
