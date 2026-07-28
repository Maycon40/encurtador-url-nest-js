# Encurtador de URL (URL Shortener API)

API RESTful desenvolvida em NestJS para criação, gerenciamento e acompanhamento de URLs encurtadas, com redirecionamento automático e coleta de métricas/estatísticas de acesso.

---

## 🛠️ Tecnologias Utilizadas

- **Node.js** & **TypeScript**
- **NestJS** - Framework Node.js para construção de aplicações server-side eficientes e escaláveis
- **PostgreSQL** - Banco de dados relacional para persistência dos links e estatísticas
- **Jest** - Framework de testes em JavaScript para execução das suítes de testes automatizados

---

## 📌 Endpoints da API

### 1. Encurtar URL

- **POST** `/shorten`
- **Body:** `{ "original_url": "https://exemplo.com" }`
- **Respostas:**
  - `201 Created`: Retorna o código gerado, URL encurtada e datas de criação/expiração.
  - `400 Bad Request`: Parâmetros inválidos ou URL ausente.

### 2. Redirecionar URL

- **GET** `/:code`
- **Respostas:**
  - `302 Found`: Redireciona para a URL original e incrementa o contador de cliques.
  - `401 Unauthorized`: Link expirado.
  - `404 Not Found`: Código de URL encurtada não encontrado.

### 3. Estatísticas da URL

- **GET** `/static/:code`
- **Respostas:**
  - `200 OK`: Retorna métricas como número de cliques, datas de criação, atualização e expiração.
  - `404 Not Found`: Código não encontrado.

### 4. Atualizar URL Original

- **PUT** `/:code`
- **Body:** `{ "original_url": "https://nova-url.com" }`
- **Respostas:**
  - `200 OK`: URL original atualizada com sucesso.
  - `404 Not Found`: Código não encontrado.

### 5. Deletar URL Encurtada

- **DELETE** `/:code`
- **Respostas:**
  - `200 OK`: Link encurtado removido.
  - `404 Not Found`: Código não encontrado.

### 6. Status do Sistema

- **GET** `/api/v1/status`
- **Respostas:**
  - `200 OK`: Retorna o status da aplicação e estatísticas das conexões do banco de dados PostgreSQL.

---

## 🧪 Testes Automatizados

O projeto conta com suítes de testes e2e (end-to-end) que validam a integração completa da aplicação, testando tanto os cenários de sucesso quanto os de erro.

### Executando os testes:

```bash
# Testes e2e (End-to-End)
$ npm run test

# Testes unitários
$ npm run test:unit

# Cobertura de testes
$ npm run test:cov
```

---

## 🚀 Como Executar o Projeto

```bash
# Instalar dependências
$ npm install

# Executar em modo de desenvolvimento
$ npm run dev

# Executar em modo de produção
$ npm run build
$ npm run start:prod
```
